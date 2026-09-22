// src/services/rewardsService.js
const Reward = require('../models/Reward');
const Redemption = require('../models/Redemption');
const Points = require('../models/Points');

class RewardsService { 
  constructor() {
    this.pointsModel = new Points();
  }

  // ==================== SERVICIOS PRINCIPALES ====================

  /**
   * Procesar canje de recompensa completo
   * @param {number} userId - ID del usuario
   * @param {number} rewardId - ID de la recompensa
   */
  async processRewardRedemption(userId, rewardId) {
    try {
      console.log(`🎁 Procesando canje: Usuario ${userId}, Recompensa ${rewardId}`);
      
      // Verificar elegibilidad completa
      const eligibility = await this.checkRedemptionEligibility(userId, rewardId);
      if (!eligibility.eligible) {
        throw new Error(eligibility.reason);
      }
      
      const reward = eligibility.reward;
      
      // Crear el canje
      const redemption = await Redemption.create(userId, rewardId, reward.puntos_requeridos);
      
      console.log(`✅ Canje exitoso - Código: ${redemption.codigo_canje}`);
      
      // Procesar acciones post-canje
      await this.processPostRedemptionActions(userId, reward, redemption);
      
      return {
        success: true,
        redemption,
        reward,
        message: 'Recompensa canjeada exitosamente'
      };
    } catch (error) {
      console.error('❌ Error procesando canje:', error);
      throw error;
    }
  }

  /**
   * Verificar elegibilidad completa para canje
   * @param {number} userId - ID del usuario
   * @param {number} rewardId - ID de la recompensa
   */
  async checkRedemptionEligibility(userId, rewardId) {
    try {
      // Verificar si la recompensa existe y está disponible
      const canRedeem = await Reward.canUserRedeem(userId, rewardId);
      
      if (!canRedeem.canRedeem) {
        return {
          eligible: false,
          reason: canRedeem.reason,
          pointsNeeded: canRedeem.pointsNeeded
        };
      }
      
      const reward = canRedeem.reward;
      
      // Verificaciones adicionales de negocio
      const businessChecks = await this.performBusinessValidations(userId, reward);
      if (!businessChecks.valid) {
        return {
          eligible: false,
          reason: businessChecks.reason
        };
      }
      
      return {
        eligible: true,
        reward,
        userPoints: await this.pointsModel.getUserPoints(userId)
      };
    } catch (error) {
      console.error('❌ Error verificando elegibilidad:', error);
      return {
        eligible: false,
        reason: 'Error interno verificando elegibilidad'
      };
    }
  }

  /**
   * Validaciones de negocio adicionales
   * @param {number} userId - ID del usuario
   * @param {Object} reward - Datos de la recompensa
   */
  async performBusinessValidations(userId, reward) {
    try {
      // Validar horarios de canje (ejemplo: solo entre 6 AM y 11 PM)
      const currentHour = new Date().getHours();
      if (currentHour < 6 || currentHour > 23) {
        return {
          valid: false,
          reason: 'Los canjes solo están disponibles entre 6:00 AM y 11:00 PM'
        };
      }
      
      // Validar límites diarios por usuario
      const dailyLimit = await this.checkDailyRedemptionLimit(userId);
      if (!dailyLimit.valid) {
        return {
          valid: false,
          reason: dailyLimit.reason
        };
      }
      
      // Validar tipo específico de recompensa
      const typeValidation = await this.validateRewardType(userId, reward);
      if (!typeValidation.valid) {
        return typeValidation;
      }
      
      return { valid: true };
    } catch (error) {
      console.error('❌ Error en validaciones de negocio:', error);
      return {
        valid: false,
        reason: 'Error validando reglas de negocio'
      };
    }
  }

  /**
   * Verificar límite diario de canjes
   * @param {number} userId - ID del usuario
   */
  async checkDailyRedemptionLimit(userId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const userRedemptions = await Redemption.getUserRedemptions(userId, true);
      const todayRedemptions = userRedemptions.filter(r => 
        new Date(r.fecha_canje) >= today
      );
      
      const DAILY_LIMIT = 5; // Máximo 5 canjes por día
      
      if (todayRedemptions.length >= DAILY_LIMIT) {
        return {
          valid: false,
          reason: `Límite diario de canjes alcanzado (${DAILY_LIMIT} por día)`
        };
      }
      
      return { valid: true };
    } catch (error) {
      console.error('❌ Error verificando límite diario:', error);
      return { valid: true }; // En caso de error, permitir el canje
    }
  }

  /**
   * Validar tipo específico de recompensa
   * @param {number} userId - ID del usuario
   * @param {Object} reward - Datos de la recompensa
   */
  async validateRewardType(userId, reward) {
    try {
      switch (reward.tipo) {
        case 'descuento':
          // Validar que el usuario tenga compras previas para descuentos
          const hasHistory = await this.userHasPurchaseHistory(userId);
          if (!hasHistory) {
            return {
              valid: false,
              reason: 'Necesitas al menos una compra previa para canjear descuentos'
            };
          }
          break;
          
        case 'experiencia':
          // Validar edad mínima para experiencias especiales
          const userAge = await this.getUserAge(userId);
          if (userAge < 18) {
            return {
              valid: false,
              reason: 'Debes ser mayor de 18 años para canjear experiencias'
            };
          }
          break;
          
        case 'producto':
          // Validar disponibilidad en inventario
          if (reward.stock !== null && reward.stock <= 0) {
            return {
              valid: false,
              reason: 'Producto sin stock disponible'
            };
          }
          break;
      }
      
      return { valid: true };
    } catch (error) {
      console.error('❌ Error validando tipo de recompensa:', error);
      return { valid: true }; // En caso de error, permitir el canje
    }
  }

  // ==================== SERVICIOS POST-CANJE ====================

  /**
   * Procesar acciones después del canje exitoso
   * @param {number} userId - ID del usuario
   * @param {Object} reward - Datos de la recompensa
   * @param {Object} redemption - Datos del canje
   */
  async processPostRedemptionActions(userId, reward, redemption) {
    try {
      console.log(`📋 Procesando acciones post-canje para ${redemption.codigo_canje}`);
      
      // Registrar evento para analytics
      await this.logRedemptionEvent(userId, reward, redemption);
      
      // Procesar acciones específicas por tipo
      await this.processRewardTypeActions(userId, reward, redemption);
      
      // Verificar y otorgar bonus por canjes frecuentes
      await this.checkFrequentRedeemerBonus(userId);
      
      // Enviar notificación (simulado)
      await this.sendRedemptionNotification(userId, reward, redemption);
      
      console.log(`✅ Acciones post-canje completadas para ${redemption.codigo_canje}`);
    } catch (error) {
      console.error('❌ Error en acciones post-canje:', error);
      // No lanzar error para no afectar el canje principal
    }
  }

  /**
   * Procesar acciones específicas por tipo de recompensa
   * @param {number} userId - ID del usuario
   * @param {Object} reward - Datos de la recompensa
   * @param {Object} redemption - Datos del canje
   */
  async processRewardTypeActions(userId, reward, redemption) {
    try {
      switch (reward.tipo) {
        case 'descuento':
          // Programar aplicación automática del descuento
          await this.scheduleDiscountApplication(userId, reward, redemption);
          break;
          
        case 'producto':
          // Registrar en inventario o envío
          await this.processProductRedemption(userId, reward, redemption);
          break;
          
        case 'experiencia':
          // Programar experiencia o generar voucher especial
          await this.processExperienceRedemption(userId, reward, redemption);
          break;
          
        case 'bonus':
          // Otorgar puntos adicionales inmediatamente
          await this.processBonusRedemption(userId, reward, redemption);
          break;
      }
    } catch (error) {
      console.error('❌ Error procesando acciones por tipo:', error);
    }
  }

  // ==================== SERVICIOS DE ANALYTICS ====================

  /**
   * Registrar evento de canje para analytics
   * @param {number} userId - ID del usuario
   * @param {Object} reward - Datos de la recompensa
   * @param {Object} redemption - Datos del canje
   */
  async logRedemptionEvent(userId, reward, redemption) {
    try {
      const eventData = {
        event_type: 'reward_redemption',
        user_id: userId,
        reward_id: reward.id,
        reward_name: reward.nombre,
        reward_category: reward.categoria,
        reward_type: reward.tipo,
        points_used: redemption.puntos_usados,
        redemption_code: redemption.codigo_canje,
        timestamp: new Date().toISOString()
      };
      
      console.log('📊 Evento de canje registrado:', eventData);
      
      // Aquí podrías enviar a un servicio de analytics externo
      // await analyticsService.track(eventData);
    } catch (error) {
      console.error('❌ Error registrando evento:', error);
    }
  }

  /**
   * Generar reporte de canjes del usuario
   * @param {number} userId - ID del usuario
   * @param {string} period - Período (week, month, year)
   */
  async generateUserRedemptionReport(userId, period = 'month') {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }
      
      const allRedemptions = await Redemption.getUserRedemptions(userId, true);
      const periodRedemptions = allRedemptions.filter(r => 
        new Date(r.fecha_canje) >= startDate && new Date(r.fecha_canje) <= endDate
      );
      
      const totalPointsUsed = periodRedemptions.reduce((sum, r) => sum + r.puntos_usados, 0);
      const categoriesUsed = [...new Set(periodRedemptions.map(r => r.recompensa_categoria))];
      const mostUsedType = this.getMostFrequentValue(periodRedemptions.map(r => r.recompensa_tipo));
      
      return {
        period,
        date_range: { start: startDate, end: endDate },
        summary: {
          total_redemptions: periodRedemptions.length,
          total_points_used: totalPointsUsed,
          average_points_per_redemption: periodRedemptions.length > 0 ? 
            Math.round(totalPointsUsed / periodRedemptions.length) : 0,
          categories_explored: categoriesUsed.length,
          most_used_type: mostUsedType
        },
        redemptions: periodRedemptions.slice(0, 10), // Últimos 10
        categories_breakdown: this.categorizeRedemptions(periodRedemptions),
        recommendations: await this.generateRecommendations(userId, periodRedemptions)
      };
    } catch (error) {
      console.error('❌ Error generando reporte de canjes:', error);
      throw error;
    }
  }

  // ==================== SERVICIOS DE RECOMENDACIONES ====================

  /**
   * Generar recomendaciones personalizadas de recompensas
   * @param {number} userId - ID del usuario
   * @param {Array} recentRedemptions - Canjes recientes del usuario
   */
  async generateRecommendations(userId, recentRedemptions = []) {
    try {
      const userPoints = await this.pointsModel.getUserPoints(userId);
      const availablePoints = userPoints.puntos_actuales || 0;
      
      // Obtener todas las recompensas disponibles
      const allRewards = await Reward.getAll();
      
      // Filtrar por puntos disponibles
      const affordableRewards = allRewards.filter(r => r.puntos_requeridos <= availablePoints);
      
      // Analizar preferencias del usuario
      const userPreferences = this.analyzeUserPreferences(recentRedemptions);
      
      // Generar recomendaciones basadas en preferencias
      const recommendations = affordableRewards
        .map(reward => ({
          ...reward,
          score: this.calculateRecommendationScore(reward, userPreferences, availablePoints)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      
      return {
        affordable_count: affordableRewards.length,
        user_preferences: userPreferences,
        recommendations: recommendations.map(r => ({
          id: r.id,
          nombre: r.nombre,
          descripcion: r.descripcion,
          categoria: r.categoria,
          tipo: r.tipo,
          puntos_requeridos: r.puntos_requeridos,
          valor: r.valor,
          reason: this.getRecommendationReason(r, userPreferences),
          score: r.score
        }))
      };
    } catch (error) {
      console.error('❌ Error generando recomendaciones:', error);
      return {
        affordable_count: 0,
        recommendations: []
      };
    }
  }

  /**
   * Analizar preferencias del usuario basado en canjes previos
   * @param {Array} redemptions - Canjes del usuario
   */
  analyzeUserPreferences(redemptions) {
    if (redemptions.length === 0) {
      return {
        favorite_category: null,
        favorite_type: null,
        avg_points_spent: 0,
        redemption_frequency: 'new_user'
      };
    }
    
    const categories = redemptions.map(r => r.recompensa_categoria);
    const types = redemptions.map(r => r.recompensa_tipo);
    const pointsSpent = redemptions.map(r => r.puntos_usados);
    
    return {
      favorite_category: this.getMostFrequentValue(categories),
      favorite_type: this.getMostFrequentValue(types),
      avg_points_spent: Math.round(pointsSpent.reduce((sum, p) => sum + p, 0) / pointsSpent.length),
      redemption_frequency: this.calculateRedemptionFrequency(redemptions),
      total_redemptions: redemptions.length
    };
  }

  /**
   * Calcular score de recomendación para una recompensa
   * @param {Object} reward - Recompensa
   * @param {Object} preferences - Preferencias del usuario
   * @param {number} availablePoints - Puntos disponibles
   */
  calculateRecommendationScore(reward, preferences, availablePoints) {
    let score = 50; // Score base
    
    // Bonus por categoría favorita
    if (preferences.favorite_category === reward.categoria) {
      score += 30;
    }
    
    // Bonus por tipo favorito
    if (preferences.favorite_type === reward.tipo) {
      score += 20;
    }
    
    // Bonus por rango de puntos similar al promedio
    if (preferences.avg_points_spent > 0) {
      const pointsDifference = Math.abs(reward.puntos_requeridos - preferences.avg_points_spent);
      const maxDifference = preferences.avg_points_spent * 0.5; // 50% de diferencia máxima
      if (pointsDifference <= maxDifference) {
        score += 15;
      }
    }
    
    // Bonus por relación calidad-precio (más valor por menos puntos)
    if (reward.valor > 0) {
      const valueRatio = reward.valor / reward.puntos_requeridos;
      score += Math.min(valueRatio * 10, 25); // Máximo 25 puntos de bonus
    }
    
    // Penalty por estar cerca del límite de puntos
    const pointsUsageRatio = reward.puntos_requeridos / availablePoints;
    if (pointsUsageRatio > 0.8) { // Usa más del 80% de puntos
      score -= 10;
    }
    
    // Bonus por stock limitado (crear urgencia)
    if (reward.stock !== null && reward.stock > 0 && reward.stock <= 10) {
      score += 10;
    }
    
    return Math.max(0, Math.min(100, score)); // Entre 0 y 100
  }

  // ==================== UTILIDADES Y HELPERS ====================

  /**
   * Obtener el valor más frecuente en un array
   * @param {Array} arr - Array de valores
   */
  getMostFrequentValue(arr) {
    if (arr.length === 0) return null;
    
    const frequency = {};
    arr.forEach(item => {
      frequency[item] = (frequency[item] || 0) + 1;
    });
    
    return Object.keys(frequency).reduce((a, b) => frequency[a] > frequency[b] ? a : b);
  }

  /**
   * Calcular frecuencia de canjes del usuario
   * @param {Array} redemptions - Canjes del usuario
   */
  calculateRedemptionFrequency(redemptions) {
    if (redemptions.length === 0) return 'new_user';
    if (redemptions.length >= 20) return 'very_active';
    if (redemptions.length >= 10) return 'active';
    if (redemptions.length >= 5) return 'moderate';
    return 'casual';
  }

  /**
   * Categorizar canjes por tipo/categoría
   * @param {Array} redemptions - Canjes a categorizar
   */
  categorizeRedemptions(redemptions) {
    const categories = {};
    
    redemptions.forEach(redemption => {
      const category = redemption.recompensa_categoria;
      if (!categories[category]) {
        categories[category] = {
          count: 0,
          total_points: 0,
          types: {}
        };
      }
      
      categories[category].count++;
      categories[category].total_points += redemption.puntos_usados;
      
      const type = redemption.recompensa_tipo;
      categories[category].types[type] = (categories[category].types[type] || 0) + 1;
    });
    
    return categories;
  }

  /**
   * Obtener razón de recomendación
   * @param {Object} reward - Recompensa recomendada
   * @param {Object} preferences - Preferencias del usuario
   */
  getRecommendationReason(reward, preferences) {
    const reasons = [];
    
    if (preferences.favorite_category === reward.categoria) {
      reasons.push(`Tu categoría favorita: ${reward.categoria}`);
    }
    
    if (preferences.favorite_type === reward.tipo) {
      reasons.push(`Tu tipo preferido: ${reward.tipo}`);
    }
    
    if (reward.stock !== null && reward.stock <= 10) {
      reasons.push('Stock limitado');
    }
    
    if (reward.valor > 0) {
      const valueRatio = reward.valor / reward.puntos_requeridos;
      if (valueRatio > 0.1) {
        reasons.push('Excelente relación valor-puntos');
      }
    }
    
    if (reasons.length === 0) {
      reasons.push('Perfecta para tus puntos actuales');
    }
    
    return reasons.join(' • ');
  }

  // ==================== SERVICIOS AUXILIARES ====================

  async userHasPurchaseHistory(userId) {
    // Simular verificación de historial de compras
    // En implementación real, consultar tabla de órdenes
    return true;
  }

  async getUserAge(userId) {
    // Simular obtención de edad del usuario
    // En implementación real, calcular desde fecha de nacimiento
    return 25;
  }

  async scheduleDiscountApplication(userId, reward, redemption) {
    console.log(`💰 Programando descuento para usuario ${userId}: ${reward.nombre}`);
  }

  async processProductRedemption(userId, reward, redemption) {
    console.log(`📦 Procesando producto para usuario ${userId}: ${reward.nombre}`);
  }

  async processExperienceRedemption(userId, reward, redemption) {
    console.log(`🎭 Procesando experiencia para usuario ${userId}: ${reward.nombre}`);
  }

  async processBonusRedemption(userId, reward, redemption) {
    if (reward.valor > 0) {
      await this.pointsModel.addPoints(
        userId,
        reward.valor,
        `Bonus por canje: ${reward.nombre}`,
        { 
          redemption_code: redemption.codigo_canje,
          bonus_type: 'reward_redemption'
        }
      );
      console.log(`🎁 Bonus de ${reward.valor} puntos otorgado a usuario ${userId}`);
    }
  }

  async checkFrequentRedeemerBonus(userId) {
    try {
      const userRedemptions = await Redemption.getUserRedemptions(userId, true);
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      
      const monthlyRedemptions = userRedemptions.filter(r => 
        new Date(r.fecha_canje) >= thisMonth
      );
      
      // Bonus por 5 canjes en un mes
      if (monthlyRedemptions.length === 5) {
        await this.pointsModel.addPoints(
          userId,
          50,
          'Bonus: 5 canjes en un mes',
          { bonus_type: 'frequent_redeemer_monthly' }
        );
        console.log(`🏆 Bonus frequent redeemer otorgado a usuario ${userId}`);
      }
    } catch (error) {
      console.error('❌ Error verificando bonus frequent redeemer:', error);
    }
  }

  async sendRedemptionNotification(userId, reward, redemption) {
    console.log(`📧 Enviando notificación de canje a usuario ${userId}: ${reward.nombre}`);
    // Aquí se implementaría el envío real de notificación
  }
}

module.exports = RewardsService;
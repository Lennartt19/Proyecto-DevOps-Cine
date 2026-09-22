const Points = require('../models/Points');

class PointsService {
  constructor() {
    this.pointsModel = new Points();
  }

  // ==================== SERVICIOS PRINCIPALES ====================

  /**
   * Procesar puntos automáticamente por compra
   * @param {number} userId - ID del usuario
   * @param {number} totalCompra - Total de la compra
   * @param {Object} orderDetails - Detalles de la orden
   */
  async processPointsForPurchase(userId, totalCompra, orderDetails = {}) {
    try {
      console.log(`💰 Procesando puntos por compra: Usuario ${userId}, Total $${totalCompra}`);
      
      const result = await this.pointsModel.processPointsForPurchase(
        userId,
        totalCompra,
        {
          order_id: orderDetails.orderId,
          payment_method: orderDetails.paymentMethod,
          items_count: orderDetails.itemsCount,
          purchase_date: new Date().toISOString(),
          ...orderDetails
        }
      );
      
      if (result.success && result.puntos_agregados > 0) {
        console.log(`✅ ${result.puntos_agregados} puntos otorgados al usuario ${userId}`);
        
        // Aquí podrías agregar lógica adicional como:
        // - Enviar notificación al usuario
        // - Registrar evento en analytics
        // - Verificar si el usuario alcanzó algún nivel/milestone
        
        await this.checkPointsMilestones(userId, result.puntos_nuevos);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error procesando puntos por compra:', error);
      throw error;
    }
  }

  /**
   * Dar puntos de bienvenida a nuevo usuario
   * @param {number} userId - ID del usuario
   */
  async giveWelcomePoints(userId) {
    try {
      console.log(`🎉 Otorgando puntos de bienvenida al usuario ${userId}`);
      
      const result = await this.pointsModel.giveWelcomePoints(userId);
      
      if (result.success) {
        console.log(`✅ Puntos de bienvenida otorgados: ${result.puntos_agregados}`);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error otorgando puntos de bienvenida:', error);
      throw error;
    }
  }

  /**
   * Procesar código de referido
   * @param {number} newUserId - ID del nuevo usuario
   * @param {string} referralCode - Código de referido
   */
  async processReferral(newUserId, referralCode) {
    try {
      console.log(`🔗 Procesando referido: Usuario ${newUserId}, Código ${referralCode}`);
      
      const result = await this.pointsModel.applyReferralCode(newUserId, referralCode);
      
      if (result.success) {
        console.log(`✅ Referido procesado exitosamente`);
        
        // Aquí podrías agregar:
        // - Notificación al referidor
        // - Evento de analytics
        // - Bonus adicionales por referidos múltiples
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error procesando referido:', error);
      throw error;
    }
  }

  // ==================== SERVICIOS DE VALIDACIÓN ====================

  /**
   * Validar si el usuario puede usar cierta cantidad de puntos
   * @param {number} userId - ID del usuario
   * @param {number} puntos - Cantidad de puntos a usar
   */
  async validatePointsUsage(userId, puntos) {
    try {
      const userPoints = await this.pointsModel.getUserPoints(userId);
      const available = userPoints.puntos_actuales || 0;
      
      return {
        valid: available >= puntos,
        available,
        required: puntos,
        difference: available - puntos
      };
    } catch (error) {
      console.error('❌ Error validando uso de puntos:', error);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Calcular descuento basado en puntos
   * @param {number} puntos - Cantidad de puntos
   */
  calculatePointsDiscount(puntos) {
    const pointsValue = this.pointsModel.getPointsValue(puntos);
    
    return {
      puntos,
      descuento: pointsValue,
      formatted: `$${pointsValue.toFixed(2)}`
    };
  }

  // ==================== SERVICIOS DE ANALYTICS ====================

  /**
   * Obtener resumen de puntos del usuario
   * @param {number} userId - ID del usuario
   */
  async getUserPointsSummary(userId) {
    try {
      const [stats, history, referrals] = await Promise.all([
        this.pointsModel.getUserPointsStats(userId),
        this.pointsModel.getPointsHistory(userId, 10, 0),
        this.pointsModel.getUserReferrals(userId)
      ]);
      
      return {
        stats,
        recent_activity: history.slice(0, 5),
        referrals_count: referrals.length,
        level: this.calculateUserLevel(stats.puntos_actuales),
        next_milestone: this.getNextMilestone(stats.puntos_actuales)
      };
    } catch (error) {
      console.error('❌ Error obteniendo resumen de puntos:', error);
      throw error;
    }
  }

  /**
   * Calcular nivel del usuario basado en puntos
   * @param {number} totalPoints - Total de puntos del usuario
   */
  calculateUserLevel(totalPoints) {
    const levels = [
      { name: 'Bronce', min: 0, max: 499, benefits: ['Descuentos básicos'] },
      { name: 'Plata', min: 500, max: 1499, benefits: ['Descuentos mejorados', 'Acceso anticipado'] },
      { name: 'Oro', min: 1500, max: 2999, benefits: ['Descuentos premium', 'Eventos exclusivos'] },
      { name: 'Platino', min: 3000, max: 4999, benefits: ['Máximos descuentos', 'Concierge personal'] },
      { name: 'Diamante', min: 5000, max: Infinity, benefits: ['Beneficios VIP', 'Experiencias únicas'] }
    ];
    
    for (const level of levels) {
      if (totalPoints >= level.min && totalPoints <= level.max) {
        return {
          ...level,
          progress: totalPoints - level.min,
          progressPercent: level.max === Infinity ? 100 : 
            ((totalPoints - level.min) / (level.max - level.min)) * 100
        };
      }
    }
    
    return levels[0]; // Default a Bronce
  }

  /**
   * Obtener siguiente milestone de puntos
   * @param {number} currentPoints - Puntos actuales
   */
  getNextMilestone(currentPoints) {
    const milestones = [500, 1500, 3000, 5000, 10000];
    
    for (const milestone of milestones) {
      if (currentPoints < milestone) {
        return {
          points: milestone,
          remaining: milestone - currentPoints,
          reward: this.getMilestoneReward(milestone)
        };
      }
    }
    
    return null; // Ya alcanzó todos los milestones
  }

  /**
   * Obtener recompensa por milestone
   * @param {number} milestone - Puntos del milestone
   */
  getMilestoneReward(milestone) {
    const rewards = {
      500: 'Nivel Plata + 50 puntos bonus',
      1500: 'Nivel Oro + 100 puntos bonus',
      3000: 'Nivel Platino + 200 puntos bonus',
      5000: 'Nivel Diamante + 500 puntos bonus',
      10000: 'Entrada VIP gratis + 1000 puntos bonus'
    };
    
    return rewards[milestone] || 'Recompensa especial';
  }

  // ==================== SERVICIOS DE NOTIFICACIONES ====================

  /**
   * Verificar y otorgar bonus por milestones
   * @param {number} userId - ID del usuario
   * @param {number} newPointsTotal - Nuevo total de puntos
   */
  async checkPointsMilestones(userId, newPointsTotal) {
    try {
      const milestones = [500, 1500, 3000, 5000, 10000];
      
      // Obtener historial para ver qué milestones ya fueron alcanzados
      const history = await this.pointsModel.getPointsHistory(userId, 100, 0);
      const achievedMilestones = history
        .filter(t => t.concepto.includes('Milestone'))
        .map(t => t.metadata?.milestone)
        .filter(m => m);
      
      for (const milestone of milestones) {
        if (newPointsTotal >= milestone && !achievedMilestones.includes(milestone)) {
          // Otorgar bonus por milestone
          const bonus = Math.floor(milestone * 0.1); // 10% del milestone como bonus
          
          await this.pointsModel.addPoints(
            userId,
            bonus,
            `Milestone alcanzado: ${milestone} puntos`,
            { 
              milestone,
              bonus_percent: 10,
              achievement_date: new Date().toISOString()
            }
          );
          
          console.log(`🏆 Usuario ${userId} alcanzó milestone ${milestone} - Bonus: ${bonus} puntos`);
        }
      }
    } catch (error) {
      console.error('❌ Error verificando milestones:', error);
    }
  }

  // ==================== SERVICIOS DE REPORTES ====================

  /**
   * Generar reporte de actividad de puntos
   * @param {number} userId - ID del usuario
   * @param {string} period - Período (week, month, year)
   */
  async generatePointsReport(userId, period = 'month') {
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
      
      const history = await this.pointsModel.getPointsHistory(userId, 1000, 0);
      const periodHistory = history.filter(t => 
        new Date(t.fecha) >= startDate && new Date(t.fecha) <= endDate
      );
      
      const earned = periodHistory
        .filter(t => t.tipo === 'ganancia')
        .reduce((sum, t) => sum + t.puntos, 0);
        
      const used = periodHistory
        .filter(t => t.tipo === 'uso')
        .reduce((sum, t) => sum + t.puntos, 0);
      
      const activities = this.categorizeActivities(periodHistory);
      
      return {
        period,
        date_range: { start: startDate, end: endDate },
        summary: {
          total_earned: earned,
          total_used: used,
          net_change: earned - used,
          transactions_count: periodHistory.length
        },
        activities,
        top_activities: this.getTopActivities(activities)
      };
    } catch (error) {
      console.error('❌ Error generando reporte de puntos:', error);
      throw error;
    }
  }

  /**
   * Categorizar actividades de puntos
   * @param {Array} history - Historial de transacciones
   */
  categorizeActivities(history) {
    const categories = {
      purchases: { count: 0, points: 0 },
      referrals: { count: 0, points: 0 },
      milestones: { count: 0, points: 0 },
      welcome: { count: 0, points: 0 },
      redemptions: { count: 0, points: 0 },
      other: { count: 0, points: 0 }
    };
    
    history.forEach(transaction => {
      let category = 'other';
      
      if (transaction.concepto.includes('Compra')) {
        category = 'purchases';
      } else if (transaction.concepto.includes('referido') || transaction.concepto.includes('Referido')) {
        category = 'referrals';
      } else if (transaction.concepto.includes('Milestone')) {
        category = 'milestones';
      } else if (transaction.concepto.includes('bienvenida')) {
        category = 'welcome';
      } else if (transaction.tipo === 'uso') {
        category = 'redemptions';
      }
      
      categories[category].count++;
      categories[category].points += transaction.tipo === 'ganancia' ? 
        transaction.puntos : -transaction.puntos;
    });
    
    return categories;
  }

  /**
   * Obtener top actividades
   * @param {Object} activities - Actividades categorizadas
   */
  getTopActivities(activities) {
    return Object.entries(activities)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
      .slice(0, 3);
  }

  // ==================== SERVICIOS DE CONFIGURACIÓN ====================

  /**
   * Obtener configuración del sistema con valores por defecto
   */
  async getSystemConfiguration() {
    try {
      const config = await this.pointsModel.getSystemConfig();
      
      return {
        ...config,
        features: {
          referral_system: true,
          welcome_bonus: true,
          purchase_rewards: true,
          milestone_bonuses: true,
          redemption_system: true
        },
        limits: {
          max_points_per_transaction: 10000,
          max_referrals_per_user: 50,
          points_expiry_months: null // null = no expiran
        }
      };
    } catch (error) {
      console.error('❌ Error obteniendo configuración:', error);
      throw error;
    }
  }

  // ==================== SERVICIOS DE VALIDACIÓN DE NEGOCIO ====================

  /**
   * Validar reglas de negocio para transacción de puntos
   * @param {number} userId - ID del usuario
   * @param {string} action - Acción (add, use)
   * @param {number} points - Cantidad de puntos
   * @param {string} reason - Razón de la transacción
   */
  async validatePointsTransaction(userId, action, points, reason) {
    const errors = [];
    
    try {
      // Validar límites básicos
      if (points <= 0) {
        errors.push('La cantidad de puntos debe ser mayor a 0');
      }
      
      if (points > 10000) {
        errors.push('No se pueden procesar más de 10,000 puntos por transacción');
      }
      
      // Validar puntos disponibles para uso
      if (action === 'use') {
        const userPoints = await this.pointsModel.getUserPoints(userId);
        if ((userPoints.puntos_actuales || 0) < points) {
          errors.push('Puntos insuficientes');
        }
      }
      
      // Validar razón
      if (!reason || reason.trim().length < 3) {
        errors.push('Se requiere una razón válida (mínimo 3 caracteres)');
      }
      
      // Validar límites por usuario (ejemplo: máximo 1000 puntos ganados por día)
      if (action === 'add') {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        const history = await this.pointsModel.getPointsHistory(userId, 100, 0);
        const todayEarned = history
          .filter(t => 
            t.tipo === 'ganancia' && 
            new Date(t.fecha) >= todayStart &&
            !t.concepto.includes('Milestone') // Excluir bonus de milestones
          )
          .reduce((sum, t) => sum + t.puntos, 0);
        
        if (todayEarned + points > 1000) {
          errors.push('Límite diario de puntos ganados excedido (1000 puntos)');
        }
      }
      
      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      console.error('❌ Error validando transacción de puntos:', error);
      return {
        valid: false,
        errors: ['Error interno validando transacción']
      };
    }
  }

  // ==================== UTILIDADES ====================

  /**
   * Formatear cantidad de puntos para mostrar
   * @param {number} points - Cantidad de puntos
   */
  formatPoints(points) {
    if (points >= 1000000) {
      return `${(points / 1000000).toFixed(1)}M`;
    } else if (points >= 1000) {
      return `${(points / 1000).toFixed(1)}K`;
    }
    return points.toString();
  }

  /**
   * Calcular tiempo estimado para alcanzar cierta cantidad de puntos
   * @param {number} userId - ID del usuario
   * @param {number} targetPoints - Puntos objetivo
   */
  async estimateTimeToTarget(userId, targetPoints) {
    try {
      const userStats = await this.pointsModel.getUserPointsStats(userId);
      const currentPoints = userStats.puntos_actuales || 0;
      
      if (currentPoints >= targetPoints) {
        return { achieved: true, message: 'Objetivo ya alcanzado' };
      }
      
      const pointsNeeded = targetPoints - currentPoints;
      
      // Calcular promedio de puntos ganados por mes basado en historial
      const history = await this.pointsModel.getPointsHistory(userId, 100, 0);
      const monthlyEarnings = this.calculateMonthlyAverage(history);
      
      if (monthlyEarnings <= 0) {
        return { 
          achieved: false, 
          message: 'No hay suficiente historial para estimar',
          points_needed: pointsNeeded
        };
      }
      
      const monthsNeeded = Math.ceil(pointsNeeded / monthlyEarnings);
      
      return {
        achieved: false,
        points_needed: pointsNeeded,
        monthly_average: monthlyEarnings,
        estimated_months: monthsNeeded,
        estimated_date: new Date(Date.now() + (monthsNeeded * 30 * 24 * 60 * 60 * 1000))
      };
    } catch (error) {
      console.error('❌ Error estimando tiempo objetivo:', error);
      throw error;
    }
  }

  /**
   * Calcular promedio mensual de puntos ganados
   * @param {Array} history - Historial de transacciones
   */
  calculateMonthlyAverage(history) {
    const earnings = history.filter(t => t.tipo === 'ganancia');
    
    if (earnings.length === 0) return 0;
    
    const oldestTransaction = new Date(earnings[earnings.length - 1].fecha);
    const newestTransaction = new Date(earnings[0].fecha);
    const monthsDiff = Math.max(1, 
      (newestTransaction.getTime() - oldestTransaction.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    
    const totalEarned = earnings.reduce((sum, t) => sum + t.puntos, 0);
    
    return Math.round(totalEarned / monthsDiff);
  }
}

module.exports = PointsService;
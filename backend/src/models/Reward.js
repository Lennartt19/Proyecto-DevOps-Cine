// backend/src/models/Reward.js - VERSIÓN COMPLETAMENTE CORREGIDA
const db = require('../config/database');

class Reward {
  
  // ==================== MÉTODOS DE CONSULTA ====================

  /**
   * Obtener todas las recompensas disponibles
   */
  static async getAll() {
    try {
      const query = `
        SELECT 
          id,
          nombre,
          descripcion,
          categoria,
          puntos_requeridos,
          imagen,
          disponible,
          stock,
          tipo,
          valor,
          limite_por_usuario,
          validez_dias,
          terminos,
          fecha_creacion
        FROM recompensas 
        WHERE disponible = true 
        ORDER BY categoria, puntos_requeridos ASC
      `;
      
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      console.error('❌ Error en Reward.getAll:', error);
      throw error;
    }
  }

  /**
   * Obtener recompensas por categoría
   */
  static async getByCategory(categoria) {
    try {
      const query = `
        SELECT 
          id,
          nombre,
          descripcion,
          categoria,
          puntos_requeridos,
          imagen,
          disponible,
          stock,
          tipo,
          valor,
          limite_por_usuario,
          validez_dias,
          terminos,
          fecha_creacion
        FROM recompensas 
        WHERE categoria = $1 AND disponible = true 
        ORDER BY puntos_requeridos ASC
      `;
      
      const result = await db.query(query, [categoria]);
      return result.rows;
    } catch (error) {
      console.error('❌ Error en Reward.getByCategory:', error);
      throw error;
    }
  }

  /**
   * Obtener recompensa por ID
   */
  static async getById(id) {
    try {
      const query = `
        SELECT 
          id,
          nombre,
          descripcion,
          categoria,
          puntos_requeridos,
          imagen,
          disponible,
          stock,
          tipo,
          valor,
          limite_por_usuario,
          validez_dias,
          terminos,
          fecha_creacion
        FROM recompensas 
        WHERE id = $1
      `;
      
      const result = await db.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error en Reward.getById:', error);
      throw error;
    }
  }

  /**
   * Obtener categorías disponibles
   */
  static async getCategories() {
    try {
      const query = `
        SELECT DISTINCT categoria 
        FROM recompensas 
        WHERE disponible = true 
        ORDER BY categoria
      `;
      
      const result = await db.query(query);
      return result.rows.map(row => row.categoria);
    } catch (error) {
      console.error('❌ Error en Reward.getCategories:', error);
      throw error;
    }
  }

  /**
   * 🔧 CORRECCIÓN PRINCIPAL: Verificar si un usuario puede canjear una recompensa
   */
  static async canUserRedeem(userId, rewardId) {
    try {
      // Obtener la recompensa
      const reward = await this.getById(rewardId);
      if (!reward) {
        return {
          canRedeem: false,
          reason: 'Recompensa no encontrada',
          reward: null
        };
      }

      // Verificar disponibilidad
      if (!reward.disponible) {
        return {
          canRedeem: false,
          reason: 'Esta recompensa no está disponible',
          reward
        };
      }

      // 🔧 CORRECCIÓN CRÍTICA: Verificar stock solo para tipos que lo necesitan
      const tiposConStock = ['producto', 'paquete', 'experiencia'];
      
      if (tiposConStock.includes(reward.tipo)) {
        // Solo verificar stock si el tipo lo requiere Y tiene stock definido
        if (reward.stock !== null && reward.stock !== undefined && reward.stock <= 0) {
          return {
            canRedeem: false,
            reason: 'Esta recompensa está agotada',
            reward
          };
        }
      }
      // Para tipos sin stock (descuento, codigo, bonus), no verificar stock

      // Obtener puntos del usuario desde la tabla puntos_usuario
      const userPointsQuery = `
        SELECT puntos_actuales 
        FROM puntos_usuario 
        WHERE usuario_id = $1
      `;
      const userPointsResult = await db.query(userPointsQuery, [userId]);
      const userPoints = userPointsResult.rows[0]?.puntos_actuales || 0;

      // Verificar puntos suficientes
      if (userPoints < reward.puntos_requeridos) {
        return {
          canRedeem: false,
          reason: `Puntos insuficientes. Tienes ${userPoints}, necesitas ${reward.puntos_requeridos}`,
          pointsNeeded: reward.puntos_requeridos - userPoints,
          reward
        };
      }

      // Verificar límite por usuario
      const redemptionsQuery = `
        SELECT COUNT(*) as count 
        FROM canjes_recompensas 
        WHERE usuario_id = $1 AND recompensa_id = $2
      `;
      const redemptionsResult = await db.query(redemptionsQuery, [userId, rewardId]);
      const userRedemptions = parseInt(redemptionsResult.rows[0].count);

      if (userRedemptions >= reward.limite_por_usuario) {
        return {
          canRedeem: false,
          reason: `Has alcanzado el límite de ${reward.limite_por_usuario} canjes para esta recompensa`,
          reward
        };
      }

      return {
        canRedeem: true,
        reason: 'Puede canjear',
        reward
      };
      
    } catch (error) {
      console.error('❌ Error en Reward.canUserRedeem:', error);
      throw error;
    }
  }

  // ==================== MÉTODOS DE ADMINISTRACIÓN ====================

  /**
   * 🔧 CORRECCIÓN PRINCIPAL: Crear nueva recompensa
   */
  static async create(rewardData) {
    try {
      const {
        nombre,
        descripcion,
        categoria,
        puntos_requeridos,
        imagen = null, // 🔧 Este campo es el que recibe la URL de imagen
        disponible = true,
        stock = null, // 🔧 Por defecto NULL para tipos que no necesitan stock
        tipo,
        valor = 0,
        limite_por_usuario = 1,
        validez_dias = 30,
        terminos = []
      } = rewardData;

      // 🔧 CORRECCIÓN: Manejar stock según el tipo
      let finalStock = stock;
      const tiposConStock = ['producto', 'paquete', 'experiencia'];
      
      if (!tiposConStock.includes(tipo)) {
        // Para tipos que NO necesitan stock (descuento, codigo, bonus), establecer como NULL
        finalStock = null;
      } else {
        // Para tipos que SÍ necesitan stock, usar el valor proporcionado o 0 por defecto
        if (finalStock === undefined || finalStock === null || finalStock === '') {
          finalStock = 0;
        }
      }

      console.log('📝 Creando recompensa en BD:', {
        nombre,
        descripcion,
        categoria,
        puntos_requeridos,
        imagen, // 🔧 Este debe tener la URL
        disponible,
        stock: finalStock,
        tipo,
        valor,
        limite_por_usuario,
        validez_dias,
        terminos
      });

      const query = `
        INSERT INTO recompensas (
          nombre, descripcion, categoria, puntos_requeridos, imagen,
          disponible, stock, tipo, valor, limite_por_usuario, validez_dias, terminos
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const values = [
        nombre, descripcion, categoria, puntos_requeridos, imagen,
        disponible, finalStock, tipo, valor, limite_por_usuario, validez_dias, terminos
      ];

      const result = await db.query(query, values);
      console.log('✅ Recompensa creada exitosamente en BD:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error en Reward.create:', error);
      throw error;
    }
  }

  /**
   * 🔧 CORRECCIÓN: Actualizar recompensa
   */
  static async update(id, rewardData) {
    try {
      const reward = await this.getById(id);
      if (!reward) {
        return null;
      }

      // 🔧 CORRECCIÓN: Procesar stock según el tipo antes de actualizar
      if (rewardData.tipo) {
        const tiposConStock = ['producto', 'paquete', 'experiencia'];
        
        if (!tiposConStock.includes(rewardData.tipo)) {
          // Si cambia a un tipo que NO necesita stock, establecer como NULL
          rewardData.stock = null;
        } else if (rewardData.stock === undefined || rewardData.stock === null) {
          // Si cambia a un tipo que SÍ necesita stock pero no se proporciona, usar 0
          rewardData.stock = 0;
        }
      }

      const fields = [];
      const values = [];
      let paramCount = 1;

      // Campos actualizables
      const updateableFields = [
        'nombre', 'descripcion', 'categoria', 'puntos_requeridos', 'imagen',
        'disponible', 'stock', 'tipo', 'valor', 'limite_por_usuario', 'validez_dias', 'terminos'
      ];

      updateableFields.forEach(field => {
        if (rewardData.hasOwnProperty(field)) {
          fields.push(`${field} = $${paramCount}`);
          values.push(rewardData[field]);
          paramCount++;
        }
      });

      if (fields.length === 0) {
        return reward; // No hay campos para actualizar
      }

      values.push(id);
      const query = `
        UPDATE recompensas 
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      console.log('📝 Actualizando recompensa con query:', query);
      console.log('📝 Valores:', values);

      const result = await db.query(query, values);
      console.log('✅ Recompensa actualizada exitosamente:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error en Reward.update:', error);
      throw error;
    }
  }

  /**
   * Eliminar recompensa (soft delete)
   */
  static async delete(id) {
    try {
      const query = `
        UPDATE recompensas 
        SET disponible = false 
        WHERE id = $1 
        RETURNING *
      `;

      const result = await db.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error en Reward.delete:', error);
      throw error;
    }
  }

  // ==================== MÉTODOS DE ESTADÍSTICAS ====================

  /**
   * 🔧 CORRECCIÓN: Obtener estadísticas de recompensas (corregir conteo de stock)
   */
  static async getStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_recompensas,
          COUNT(CASE WHEN disponible = true THEN 1 END) as recompensas_disponibles,
          COUNT(CASE WHEN stock > 0 OR stock IS NULL THEN 1 END) as recompensas_con_stock,
          COUNT(DISTINCT categoria) as total_categorias,
          AVG(puntos_requeridos) as promedio_puntos_requeridos,
          MIN(puntos_requeridos) as min_puntos_requeridos,
          MAX(puntos_requeridos) as max_puntos_requeridos,
          SUM(COALESCE(stock, 0)) as stock_total
        FROM recompensas
      `;

      const result = await db.query(query);
      const stats = result.rows[0];
      
      // Convertir a números donde sea necesario
      return {
        total_recompensas: parseInt(stats.total_recompensas),
        recompensas_disponibles: parseInt(stats.recompensas_disponibles),
        recompensas_con_stock: parseInt(stats.recompensas_con_stock),
        total_categorias: parseInt(stats.total_categorias),
        promedio_puntos_requeridos: Math.round(parseFloat(stats.promedio_puntos_requeridos || 0)),
        min_puntos_requeridos: parseInt(stats.min_puntos_requeridos || 0),
        max_puntos_requeridos: parseInt(stats.max_puntos_requeridos || 0),
        stock_total: parseInt(stats.stock_total || 0)
      };
    } catch (error) {
      console.error('❌ Error en Reward.getStats:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas por categoría
   */
  static async getStatsByCategory() {
    try {
      const query = `
        SELECT 
          categoria,
          COUNT(*) as total,
          COUNT(CASE WHEN disponible = true THEN 1 END) as disponibles,
          AVG(puntos_requeridos) as promedio_puntos,
          SUM(COALESCE(stock, 0)) as stock_total
        FROM recompensas
        GROUP BY categoria
        ORDER BY categoria
      `;

      const result = await db.query(query);
      return result.rows.map(row => ({
        categoria: row.categoria,
        total: parseInt(row.total),
        disponibles: parseInt(row.disponibles),
        promedio_puntos: Math.round(parseFloat(row.promedio_puntos || 0)),
        stock_total: parseInt(row.stock_total || 0)
      }));
    } catch (error) {
      console.error('❌ Error en Reward.getStatsByCategory:', error);
      throw error;
    }
  }

  // ==================== MÉTODOS DE BÚSQUEDA ====================

  /**
   * Buscar recompensas por término
   */
  static async search(searchTerm, categoria = null) {
    try {
      let query = `
        SELECT 
          id,
          nombre,
          descripcion,
          categoria,
          puntos_requeridos,
          imagen,
          disponible,
          stock,
          tipo,
          valor,
          limite_por_usuario,
          validez_dias,
          terminos,
          fecha_creacion
        FROM recompensas 
        WHERE disponible = true 
        AND (
          LOWER(nombre) LIKE LOWER($1) 
          OR LOWER(descripcion) LIKE LOWER($1)
        )
      `;

      const values = [`%${searchTerm}%`];

      if (categoria) {
        query += ` AND categoria = $2`;
        values.push(categoria);
      }

      query += ` ORDER BY puntos_requeridos ASC`;

      const result = await db.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('❌ Error en Reward.search:', error);
      throw error;
    }
  }

  // ==================== MÉTODOS DE UTILIDAD ====================

  /**
   * 🔧 CORRECCIÓN: Reducir stock de recompensa (solo para tipos que lo necesitan)
   */
  static async reduceStock(id, cantidad = 1) {
    try {
      // Primero verificar si el tipo necesita stock
      const reward = await this.getById(id);
      if (!reward) {
        return null;
      }

      const tiposConStock = ['producto', 'paquete', 'experiencia'];
      
      if (!tiposConStock.includes(reward.tipo)) {
        // Si el tipo no necesita stock, no hacer nada
        console.log(`ℹ️ Tipo ${reward.tipo} no requiere stock, no se reduce`);
        return { stock: null };
      }

      const query = `
        UPDATE recompensas 
        SET stock = GREATEST(stock - $1, 0)
        WHERE id = $2 AND stock >= $1
        RETURNING stock
      `;

      const result = await db.query(query, [cantidad, id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error en Reward.reduceStock:', error);
      throw error;
    }
  }

  /**
   * Verificar si existe una recompensa
   */
  static async exists(id) {
    try {
      const query = `SELECT EXISTS(SELECT 1 FROM recompensas WHERE id = $1)`;
      const result = await db.query(query, [id]);
      return result.rows[0].exists;
    } catch (error) {
      console.error('❌ Error en Reward.exists:', error);
      throw error;
    }
  }
}

module.exports = Reward;
// backend/src/models/Redemption.js - VERSIÓN FINAL CORREGIDA
const db = require('../config/database');
const Reward = require('./Reward');
const Points = require('./Points');

class Redemption {

  // ==================== MÉTODOS DE CANJE ====================

  /**
   * Crear un nuevo canje de recompensa
   */
  static async create(userId, rewardId, pointsUsed) {
    let client = null;
    let isUsingPool = false;
    
    try {
      // Intentar usar pool si está disponible
      if (db.pool) {
        client = await db.pool.connect();
        isUsingPool = true;
        await client.query('BEGIN');
      } else if (db.getClient) {
        client = await db.getClient();
        await client.query('BEGIN');
      } else {
        // Usar db.query directamente
        await db.query('BEGIN');
      }

      // 1. Verificar que el usuario puede canjear
      const canRedeem = await Reward.canUserRedeem(userId, rewardId);
      if (!canRedeem.canRedeem) {
        throw new Error(canRedeem.reason);
      }

      const reward = canRedeem.reward;

      // 2. Generar código único de canje
      const codigoCanje = await this.generateUniqueCode();

      // 3. Calcular fecha de expiración
      const fechaExpiracion = new Date();
      fechaExpiracion.setDate(fechaExpiracion.getDate() + reward.validez_dias);

      // 4. Crear el canje
      const createRedemptionQuery = `
        INSERT INTO canjes_recompensas (
          usuario_id, recompensa_id, codigo_canje, puntos_usados, 
          fecha_expiracion, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const metadata = {
        recompensa_nombre: reward.nombre,
        recompensa_tipo: reward.tipo,
        recompensa_categoria: reward.categoria,
        recompensa_valor: reward.valor
      };

      const redemptionResult = client ? 
        await client.query(createRedemptionQuery, [
          userId, rewardId, codigoCanje, pointsUsed, fechaExpiracion, JSON.stringify(metadata)
        ]) : 
        await db.query(createRedemptionQuery, [
          userId, rewardId, codigoCanje, pointsUsed, fechaExpiracion, JSON.stringify(metadata)
        ]);

      const redemption = redemptionResult.rows[0];

      // 5. 🔧 CORRECCIÓN: Usar instancia de Points y método usePoints correcto
      const pointsInstance = new Points();
      await pointsInstance.usePoints(
        userId, 
        pointsUsed, 
        `Canje de recompensa: ${reward.nombre}`,
        { 
          redemption_id: redemption.id,
          reward_id: rewardId,
          codigo_canje: codigoCanje
        }
      );

      // 6. Reducir stock de la recompensa
      if (reward.stock > 0) {
        const reduceStockQuery = `
          UPDATE recompensas 
          SET stock = stock - 1 
          WHERE id = $1 AND stock > 0
        `;
        
        if (client) {
          await client.query(reduceStockQuery, [rewardId]);
        } else {
          await db.query(reduceStockQuery, [rewardId]);
        }
      }

      // Confirmar transacción
      if (client) {
        await client.query('COMMIT');
      } else {
        await db.query('COMMIT');
      }

      // 7. Formatear respuesta
      return {
        id: redemption.id,
        codigo_canje: redemption.codigo_canje,
        puntos_usados: redemption.puntos_usados,
        fecha_canje: redemption.fecha_canje,
        fecha_expiracion: redemption.fecha_expiracion,
        recompensa: {
          id: reward.id,
          nombre: reward.nombre,
          descripcion: reward.descripcion,
          tipo: reward.tipo,
          valor: reward.valor
        }
      };

    } catch (error) {
      // Rollback en caso de error
      try {
        if (client) {
          await client.query('ROLLBACK');
        } else {
          await db.query('ROLLBACK');
        }
      } catch (rollbackError) {
        console.error('❌ Error en rollback:', rollbackError);
      }
      
      console.error('❌ Error en Redemption.create:', error);
      throw error;
    } finally {
      // Liberar cliente si se usó pool
      if (client) {
        if (isUsingPool && client.release) {
          client.release();
        } else if (client.release) {
          client.release();
        }
      }
    }
  }

  /**
   * Obtener canjes del usuario
   */
  static async getUserRedemptions(userId, includeUsed = true) {
    try {
      let query = `
        SELECT 
          cr.id,
          cr.recompensa_id,
          cr.codigo_canje,
          cr.puntos_usados,
          cr.usado,
          cr.fecha_canje,
          cr.fecha_expiracion,
          cr.fecha_uso,
          cr.metadata,
          r.nombre as recompensa_nombre,
          r.descripcion as recompensa_descripcion,
          r.tipo as recompensa_tipo,
          r.categoria as recompensa_categoria,
          r.valor as recompensa_valor,
          r.imagen as recompensa_imagen
        FROM canjes_recompensas cr
        LEFT JOIN recompensas r ON cr.recompensa_id = r.id
        WHERE cr.usuario_id = $1
      `;

      if (!includeUsed) {
        query += ` AND cr.usado = false`;
      }

      query += ` ORDER BY cr.fecha_canje DESC`;

      const result = await db.query(query, [userId]);
      
      return result.rows.map(row => ({
        id: row.id,
        recompensaId: row.recompensa_id,
        nombreRecompensa: row.recompensa_nombre,
        descripcion: row.recompensa_descripcion,
        tipo: row.recompensa_tipo,
        categoria: row.recompensa_categoria,
        valor: parseFloat(row.recompensa_valor) || 0,
        imagen: row.recompensa_imagen,
        codigo: row.codigo_canje,
        puntosUsados: row.puntos_usados,
        usado: row.usado,
        fechaCanje: row.fecha_canje,
        fechaExpiracion: row.fecha_expiracion,
        fechaUso: row.fecha_uso,
        metadata: row.metadata
      }));

    } catch (error) {
      console.error('❌ Error en Redemption.getUserRedemptions:', error);
      throw error;
    }
  }

  /**
   * Obtener canjes por recompensa
   */
  static async getByReward(rewardId) {
    try {
      const query = `
        SELECT 
          cr.*,
          u.nombre as usuario_nombre,
          u.email as usuario_email,
          r.nombre as recompensa_nombre
        FROM canjes_recompensas cr
        JOIN usuarios u ON cr.usuario_id = u.id
        JOIN recompensas r ON cr.recompensa_id = r.id
        WHERE cr.recompensa_id = $1
        ORDER BY cr.fecha_canje DESC
      `;

      const result = await db.query(query, [rewardId]);
      return result.rows;
    } catch (error) {
      console.error('❌ Error en Redemption.getByReward:', error);
      throw error;
    }
  }

  // ==================== VALIDACIÓN Y USO DE CÓDIGOS ====================

  /**
   * Validar código de canje
   */
  static async validateCode(codigo) {
    try {
      const query = `
        SELECT 
          cr.*,
          r.nombre as recompensa_nombre,
          r.descripcion as recompensa_descripcion,
          r.tipo as recompensa_tipo,
          r.valor as recompensa_valor,
          u.nombre as usuario_nombre
        FROM canjes_recompensas cr
        JOIN recompensas r ON cr.recompensa_id = r.id
        JOIN usuarios u ON cr.usuario_id = u.id
        WHERE cr.codigo_canje = $1
      `;

      const result = await db.query(query, [codigo]);

      if (result.rows.length === 0) {
        return {
          valid: false,
          exists: false,
          message: 'Código de canje no encontrado'
        };
      }

      const redemption = result.rows[0];
      const now = new Date();
      const expirationDate = new Date(redemption.fecha_expiracion);

      // Verificar si ya fue usado
      if (redemption.usado) {
        return {
          valid: false,
          exists: true,
          used: true,
          message: 'Este código ya fue utilizado',
          usedDate: redemption.fecha_uso,
          redemption: {
            codigo: redemption.codigo_canje,
            recompensa: redemption.recompensa_nombre,
            usuario: redemption.usuario_nombre,
            fechaUso: redemption.fecha_uso
          }
        };
      }

      // Verificar si está expirado
      if (now > expirationDate) {
        return {
          valid: false,
          exists: true,
          expired: true,
          message: 'Este código ha expirado',
          expirationDate: redemption.fecha_expiracion
        };
      }

      // Código válido
      return {
        valid: true,
        exists: true,
        used: false,
        expired: false,
        message: 'Código válido',
        redemption: {
          id: redemption.id,
          codigo: redemption.codigo_canje,
          recompensa: redemption.recompensa_nombre,
          descripcion: redemption.recompensa_descripcion,
          tipo: redemption.recompensa_tipo,
          valor: parseFloat(redemption.recompensa_valor) || 0,
          usuario: redemption.usuario_nombre,
          fechaCanje: redemption.fecha_canje,
          fechaExpiracion: redemption.fecha_expiracion,
          puntosUsados: redemption.puntos_usados
        }
      };

    } catch (error) {
      console.error('❌ Error en Redemption.validateCode:', error);
      throw error;
    }
  }

  /**
   * Marcar código como usado
   */
  static async markAsUsed(codigo) {
    try {
      // Primero validar que el código existe y es válido
      const validation = await this.validateCode(codigo);
      
      if (!validation.exists) {
        throw new Error('Código de canje no encontrado');
      }

      if (validation.used) {
        throw new Error('Este código ya fue utilizado');
      }

      if (validation.expired) {
        throw new Error('Este código ha expirado');
      }

      // Marcar como usado
      const query = `
        UPDATE canjes_recompensas 
        SET usado = true, fecha_uso = CURRENT_TIMESTAMP
        WHERE codigo_canje = $1
        RETURNING *
      `;

      const result = await db.query(query, [codigo]);
      const redemption = result.rows[0];

      return {
        codigo_canje: redemption.codigo_canje,
        fecha_uso: redemption.fecha_uso,
        mensaje: 'Código marcado como utilizado exitosamente'
      };

    } catch (error) {
      console.error('❌ Error en Redemption.markAsUsed:', error);
      throw error;
    }
  }

  // ==================== MÉTODOS DE ADMINISTRACIÓN ====================

  /**
   * Obtener todos los canjes (para admin)
   */
  static async getAll(page = 1, limit = 50, rewardId = null) {
    try {
      const offset = (page - 1) * limit;
      
      let query = `
        SELECT 
          cr.id,
          cr.codigo_canje,
          cr.puntos_usados,
          cr.usado,
          cr.fecha_canje,
          cr.fecha_expiracion,
          cr.fecha_uso,
          u.nombre as usuario_nombre,
          u.email as usuario_email,
          r.nombre as recompensa_nombre,
          r.categoria as recompensa_categoria,
          r.tipo as recompensa_tipo,
          r.valor as recompensa_valor
        FROM canjes_recompensas cr
        JOIN usuarios u ON cr.usuario_id = u.id
        JOIN recompensas r ON cr.recompensa_id = r.id
      `;

      const values = [];
      let paramCount = 1;

      if (rewardId) {
        query += ` WHERE cr.recompensa_id = $${paramCount}`;
        values.push(rewardId);
        paramCount++;
      }

      query += ` ORDER BY cr.fecha_canje DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      values.push(limit, offset);

      const result = await db.query(query, values);
      return result.rows;

    } catch (error) {
      console.error('❌ Error en Redemption.getAll:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de canjes
   */
  static async getStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_canjes,
          COUNT(CASE WHEN usado = true THEN 1 END) as canjes_usados,
          COUNT(CASE WHEN usado = false AND fecha_expiracion > CURRENT_TIMESTAMP THEN 1 END) as canjes_activos,
          COUNT(CASE WHEN usado = false AND fecha_expiracion <= CURRENT_TIMESTAMP THEN 1 END) as canjes_expirados,
          SUM(puntos_usados) as total_puntos_canjeados,
          AVG(puntos_usados) as promedio_puntos_por_canje
        FROM canjes_recompensas
      `;

      const result = await db.query(query);
      const stats = result.rows[0];

      return {
        total_canjes: parseInt(stats.total_canjes),
        canjes_usados: parseInt(stats.canjes_usados),
        canjes_activos: parseInt(stats.canjes_activos),
        canjes_expirados: parseInt(stats.canjes_expirados),
        total_puntos_canjeados: parseInt(stats.total_puntos_canjeados || 0),
        promedio_puntos_por_canje: Math.round(parseFloat(stats.promedio_puntos_por_canje || 0))
      };

    } catch (error) {
      console.error('❌ Error en Redemption.getStats:', error);
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
          r.categoria,
          COUNT(cr.id) as total_canjes,
          COUNT(CASE WHEN cr.usado = true THEN 1 END) as canjes_usados,
          SUM(cr.puntos_usados) as puntos_totales,
          AVG(cr.puntos_usados) as promedio_puntos
        FROM canjes_recompensas cr
        JOIN recompensas r ON cr.recompensa_id = r.id
        GROUP BY r.categoria
        ORDER BY total_canjes DESC
      `;

      const result = await db.query(query);
      return result.rows.map(row => ({
        categoria: row.categoria,
        total_canjes: parseInt(row.total_canjes),
        canjes_usados: parseInt(row.canjes_usados),
        puntos_totales: parseInt(row.puntos_totales || 0),
        promedio_puntos: Math.round(parseFloat(row.promedio_puntos || 0))
      }));

    } catch (error) {
      console.error('❌ Error en Redemption.getStatsByCategory:', error);
      throw error;
    }
  }

  // ==================== MÉTODOS DE UTILIDAD ====================

  /**
   * Generar código único de canje
   */
  static async generateUniqueCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigo;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      // Generar código de 8 caracteres
      codigo = '';
      for (let i = 0; i < 8; i++) {
        codigo += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // Verificar si es único
      const checkQuery = `SELECT EXISTS(SELECT 1 FROM canjes_recompensas WHERE codigo_canje = $1)`;
      const result = await db.query(checkQuery, [codigo]);
      isUnique = !result.rows[0].exists;
      attempts++;
    }

    if (!isUnique) {
      throw new Error('No se pudo generar un código único después de varios intentos');
    }

    return codigo;
  }

  /**
   * Obtener canjes próximos a expirar
   */
  static async getExpiringRedemptions(days = 7) {
    try {
      const query = `
        SELECT 
          cr.*,
          u.nombre as usuario_nombre,
          u.email as usuario_email,
          r.nombre as recompensa_nombre
        FROM canjes_recompensas cr
        JOIN usuarios u ON cr.usuario_id = u.id
        JOIN recompensas r ON cr.recompensa_id = r.id
        WHERE cr.usado = false 
        AND cr.fecha_expiracion BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '${days} days'
        ORDER BY cr.fecha_expiracion ASC
      `;

      const result = await db.query(query);
      return result.rows;

    } catch (error) {
      console.error('❌ Error en Redemption.getExpiringRedemptions:', error);
      throw error;
    }
  }

  /**
   * Limpiar canjes expirados (marcar como expirados)
   */
  static async cleanExpiredRedemptions() {
    try {
      const query = `
        UPDATE canjes_recompensas 
        SET metadata = COALESCE(metadata, '{}')::jsonb || '{"expired_cleanup": true}'::jsonb
        WHERE usado = false 
        AND fecha_expiracion < CURRENT_TIMESTAMP
        AND NOT (metadata ? 'expired_cleanup')
        RETURNING COUNT(*)
      `;

      const result = await db.query(query);
      return result.rowCount;

    } catch (error) {
      console.error('❌ Error en Redemption.cleanExpiredRedemptions:', error);
      throw error;
    }
  }

  /**
   * Buscar canjes por término
   */
  static async search(searchTerm) {
    try {
      const query = `
        SELECT 
          cr.*,
          u.nombre as usuario_nombre,
          u.email as usuario_email,
          r.nombre as recompensa_nombre,
          r.categoria as recompensa_categoria
        FROM canjes_recompensas cr
        JOIN usuarios u ON cr.usuario_id = u.id
        JOIN recompensas r ON cr.recompensa_id = r.id
        WHERE 
          LOWER(cr.codigo_canje) LIKE LOWER($1) OR
          LOWER(u.nombre) LIKE LOWER($1) OR
          LOWER(u.email) LIKE LOWER($1) OR
          LOWER(r.nombre) LIKE LOWER($1)
        ORDER BY cr.fecha_canje DESC
        LIMIT 100
      `;

      const result = await db.query(query, [`%${searchTerm}%`]);
      return result.rows;

    } catch (error) {
      console.error('❌ Error en Redemption.search:', error);
      throw error;
    }
  }

  /**
   * Verificar si existe un canje
   */
  static async exists(id) {
    try {
      const query = `SELECT EXISTS(SELECT 1 FROM canjes_recompensas WHERE id = $1)`;
      const result = await db.query(query, [id]);
      return result.rows[0].exists;
    } catch (error) {
      console.error('❌ Error en Redemption.exists:', error);
      throw error;
    }
  }

  /**
   * Obtener canje por ID
   */
  static async getById(id) {
    try {
      const query = `
        SELECT 
          cr.*,
          u.nombre as usuario_nombre,
          u.email as usuario_email,
          r.nombre as recompensa_nombre,
          r.descripcion as recompensa_descripcion,
          r.tipo as recompensa_tipo,
          r.categoria as recompensa_categoria,
          r.valor as recompensa_valor
        FROM canjes_recompensas cr
        JOIN usuarios u ON cr.usuario_id = u.id
        JOIN recompensas r ON cr.recompensa_id = r.id
        WHERE cr.id = $1
      `;

      const result = await db.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error en Redemption.getById:', error);
      throw error;
    }
  }
}

module.exports = Redemption;
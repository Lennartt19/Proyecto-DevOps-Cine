const Points = require('../../models/Points');

class PointsController {
  constructor() {
    this.pointsModel = new Points();
  }

  // ==================== OBTENER PUNTOS DEL USUARIO ====================

  async getUserPoints(req, res) {
    try {
      const userId = req.user?.id;
      
      console.log(`💰 Obteniendo puntos del usuario ${userId}`);
      
      const points = await this.pointsModel.getUserPoints(userId);
      
      res.json({
        success: true,
        data: points
      });

    } catch (error) {
      console.error('❌ Error al obtener puntos del usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener puntos',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // ==================== ESTADÍSTICAS DE PUNTOS ====================

  async getUserPointsStats(req, res) {
    try {
      const userId = req.user?.id;
      
      console.log(`📊 Obteniendo estadísticas de puntos del usuario ${userId}`);
      
      const stats = await this.pointsModel.getUserPointsStats(userId);
      
      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('❌ Error al obtener estadísticas de puntos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // ==================== HISTORIAL DE TRANSACCIONES ====================

  async getPointsHistory(req, res) {
    try {
      const userId = req.user?.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      
      console.log(`📋 Obteniendo historial de puntos del usuario ${userId}, página ${page}`);
      
      const history = await this.pointsModel.getPointsHistory(userId, limit, offset);
      
      res.json({
        success: true,
        data: history,
        pagination: {
          page,
          limit,
          total: history.length,
          hasMore: history.length === limit
        }
      });

    } catch (error) {
      console.error('❌ Error al obtener historial de puntos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener historial',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // ==================== SISTEMA DE REFERIDOS ====================

  async createReferralCode(req, res) {
    try {
      const userId = req.user?.id;
      
      console.log(`🔗 Creando código de referido para usuario ${userId}`);
      
      const result = await this.pointsModel.createReferralCode(userId);
      
      res.json({
        success: result.success,
        data: {
          codigo: result.codigo,
          message: result.message
        }
      });

    } catch (error) {
      console.error('❌ Error al crear código de referido:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear código de referido',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  async getReferralCode(req, res) {
    try {
      const userId = req.user?.id;
      
      console.log(`🔍 Obteniendo código de referido del usuario ${userId}`);
      
      // Intentar obtener código existente o crear uno nuevo
      const result = await this.pointsModel.createReferralCode(userId);
      
      res.json({
        success: true,
        data: {
          codigo: result.codigo,
          url: `${req.protocol}://${req.get('host')}/register?ref=${result.codigo}`
        }
      });

    } catch (error) {
      console.error('❌ Error al obtener código de referido:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener código de referido',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  async applyReferralCode(req, res) {
    try {
      const userId = req.user?.id;
      const { codigo } = req.body;
      
      if (!codigo?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Código de referido requerido'
        });
      }
      
      console.log(`🎁 Aplicando código de referido ${codigo} para usuario ${userId}`);
      
      const result = await this.pointsModel.applyReferralCode(userId, codigo.trim());
      
      res.json({
        success: result.success,
        message: result.message,
        data: {
          puntos_ganados: result.puntos_nuevo_usuario,
          puntos_otorgados_referidor: result.puntos_referidor
        }
      });

    } catch (error) {
      console.error('❌ Error al aplicar código de referido:', error);
      
      if (error.message.includes('inválido') || error.message.includes('propio') || error.message.includes('ya usó')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error al aplicar código de referido',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  async getUserReferrals(req, res) {
    try {
      const userId = req.user?.id;
      
      console.log(`👥 Obteniendo referidos del usuario ${userId}`);
      
      const referrals = await this.pointsModel.getUserReferrals(userId);
      
      res.json({
        success: true,
        data: referrals
      });

    } catch (error) {
      console.error('❌ Error al obtener referidos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener referidos',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // ==================== PUNTOS DE BIENVENIDA ====================

  async giveWelcomePoints(req, res) {
    try {
      const userId = req.user?.id;
      
      console.log(`🎉 Otorgando puntos de bienvenida al usuario ${userId}`);
      
      const result = await this.pointsModel.giveWelcomePoints(userId);
      
      if (result.success) {
        res.json({
          success: true,
          message: 'Puntos de bienvenida otorgados',
          data: {
            puntos_ganados: result.puntos_agregados,
            puntos_totales: result.puntos_nuevos
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }

    } catch (error) {
      console.error('❌ Error al otorgar puntos de bienvenida:', error);
      res.status(500).json({
        success: false,
        message: 'Error al otorgar puntos de bienvenida',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // ==================== AGREGAR/USAR PUNTOS MANUALMENTE ====================

  async addPointsManually(req, res) {
    try {
      const { userId, puntos, concepto, metadata } = req.body;
      const adminId = req.user?.id;
      
      // Solo admins pueden agregar puntos manualmente
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para agregar puntos'
        });
      }
      
      if (!userId || !puntos || puntos <= 0 || !concepto) {
        return res.status(400).json({
          success: false,
          message: 'Datos requeridos: userId, puntos (>0), concepto'
        });
      }
      
      console.log(`➕ Admin ${adminId} agregando ${puntos} puntos al usuario ${userId}: ${concepto}`);
      
      const result = await this.pointsModel.addPoints(
        userId,
        puntos,
        concepto,
        { ...metadata, added_by_admin: adminId }
      );
      
      res.json({
        success: result.success,
        message: `${puntos} puntos agregados exitosamente`,
        data: {
          puntos_agregados: result.puntos_agregados,
          puntos_anteriores: result.puntos_anteriores,
          puntos_nuevos: result.puntos_nuevos,
          transaccion_id: result.transaccion_id
        }
      });

    } catch (error) {
      console.error('❌ Error al agregar puntos manualmente:', error);
      res.status(500).json({
        success: false,
        message: 'Error al agregar puntos',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  async usePoints(req, res) {
    try {
      const userId = req.user?.id;
      const { puntos, concepto, metadata } = req.body;
      
      if (!puntos || puntos <= 0 || !concepto) {
        return res.status(400).json({
          success: false,
          message: 'Datos requeridos: puntos (>0), concepto'
        });
      }
      
      console.log(`➖ Usuario ${userId} usando ${puntos} puntos: ${concepto}`);
      
      const result = await this.pointsModel.usePoints(userId, puntos, concepto, metadata);
      
      res.json({
        success: result.success,
        message: `${puntos} puntos usados exitosamente`,
        data: {
          puntos_usados: result.puntos_usados,
          puntos_anteriores: result.puntos_anteriores,
          puntos_restantes: result.puntos_nuevos,
          transaccion_id: result.transaccion_id
        }
      });

    } catch (error) {
      console.error('❌ Error al usar puntos:', error);
      
      if (error.message.includes('insuficientes')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error al usar puntos',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // ==================== VERIFICAR PUNTOS DISPONIBLES ====================

  async checkPointsAvailability(req, res) {
    try {
      const userId = req.user?.id;
      const { puntos } = req.query;
      
      if (!puntos || isNaN(puntos)) {
        return res.status(400).json({
          success: false,
          message: 'Cantidad de puntos requerida'
        });
      }
      
      const puntosRequeridos = parseInt(puntos);
      const canUse = await this.pointsModel.canUsePoints(userId, puntosRequeridos);
      const userPoints = await this.pointsModel.getUserPoints(userId);
      
      res.json({
        success: true,
        data: {
          puede_usar: canUse,
          puntos_disponibles: userPoints.puntos_actuales || 0,
          puntos_requeridos: puntosRequeridos,
          diferencia: (userPoints.puntos_actuales || 0) - puntosRequeridos
        }
      });

    } catch (error) {
      console.error('❌ Error al verificar disponibilidad de puntos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al verificar puntos',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // ==================== CONFIGURACIÓN DEL SISTEMA ====================

  async getSystemConfig(req, res) {
    try {
      console.log('⚙️ Obteniendo configuración del sistema de puntos');
      
      const config = await this.pointsModel.getSystemConfig();
      
      res.json({
        success: true,
        data: config
      });

    } catch (error) {
      console.error('❌ Error al obtener configuración:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener configuración',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // ==================== ANALYTICS Y REPORTES (ADMIN) ====================

  async getPointsAnalytics(req, res) {
    try {
      // Solo admins pueden ver analytics
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver analytics'
        });
      }
      
      const { start_date, end_date } = req.query;
      
      console.log('📈 Obteniendo analytics de puntos...');
      
      const analytics = await this.pointsModel.getPointsAnalytics(start_date, end_date);
      
      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      console.error('❌ Error al obtener analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener analytics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  async getTopUsers(req, res) {
    try {
      // Solo admins pueden ver top users
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver esta información'
        });
      }
      
      const limit = parseInt(req.query.limit) || 10;
      
      console.log(`🏆 Obteniendo top ${limit} usuarios por puntos...`);
      
      const topUsers = await this.pointsModel.getTopUsersPoints(limit);
      
      res.json({
        success: true,
        data: topUsers
      });

    } catch (error) {
      console.error('❌ Error al obtener top usuarios:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener top usuarios',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }
}

module.exports = new PointsController();
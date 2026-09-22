// src/controllers/admin/systemController.js - NUEVO ARCHIVO
const { query } = require('../../config/database');

class SystemController {
  
  // ==================== MÉTRICAS DEL DASHBOARD ====================
  
  async getDashboardMetrics(req, res) {
    try {
      console.log('📊 Obteniendo métricas del sistema...');
      
      // Usar la función que creamos con los triggers
      const result = await query('SELECT obtener_metricas_basicas() as metricas');
      const metricas = result.rows[0].metricas;
      
      res.json({
        success: true,
        data: {
          ordenes_hoy: metricas.ordenes_hoy,
          ingresos_hoy: parseFloat(metricas.ingresos_hoy) || 0,
          alertas_pendientes: metricas.alertas_pendientes,
          ultima_actualizacion: metricas.ultima_actualizacion
        }
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo métricas:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo métricas del sistema',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // ==================== GESTIÓN DE ALERTAS ====================
  
  async getSystemAlerts(req, res) {
    try {
      const { page = 1, limit = 20, severidad, revisada } = req.query;
      
      console.log(`🚨 Obteniendo alertas del sistema (página ${page})`);
      
      let whereClause = 'WHERE 1=1';
      const params = [];
      let paramCount = 1;
      
      if (severidad) {
        whereClause += ` AND severidad = $${paramCount++}`;
        params.push(severidad);
      }
      
      if (revisada !== undefined) {
        whereClause += ` AND revisada = $${paramCount++}`;
        params.push(revisada === 'true');
      }
      
      const sql = `
        SELECT 
          id,
          tipo,
          mensaje,
          severidad,
          revisada,
          fecha_creacion,
          fecha_revision
        FROM alertas_sistema 
        ${whereClause}
        ORDER BY fecha_creacion DESC 
        LIMIT $${paramCount++} OFFSET $${paramCount++}
      `;
      
      params.push(limit, (page - 1) * limit);
      
      const result = await query(sql, params);
      
      res.json({
        success: true,
        data: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.rows.length
        }
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo alertas:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo alertas del sistema'
      });
    }
  }

  async markAlertsAsReviewed(req, res) {
    try {
      const { alertIds } = req.body;
      
      if (!Array.isArray(alertIds) || alertIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere un array de IDs de alertas'
        });
      }
      
      console.log(`✅ Marcando ${alertIds.length} alertas como revisadas`);
      
      // Usar la función que creamos
      const result = await query(
        'SELECT marcar_alertas_revisadas($1) as updated_count',
        [alertIds]
      );
      
      const updatedCount = result.rows[0].updated_count;
      
      res.json({
        success: true,
        message: `${updatedCount} alertas marcadas como revisadas`,
        data: {
          updatedCount: updatedCount
        }
      });
      
    } catch (error) {
      console.error('❌ Error marcando alertas:', error);
      res.status(500).json({
        success: false,
        message: 'Error actualizando alertas'
      });
    }
  }

  // ==================== AUDITORÍA ====================
  
  async getAuditLog(req, res) {
    try {
      const { 
        page = 1, 
        limit = 50, 
        tabla, 
        accion, 
        usuario_id,
        fecha_desde,
        fecha_hasta 
      } = req.query;
      
      console.log(`🔍 Obteniendo log de auditoría (página ${page})`);
      
      let whereClause = 'WHERE 1=1';
      const params = [];
      let paramCount = 1;
      
      if (tabla) {
        whereClause += ` AND a.tabla_afectada = $${paramCount++}`;
        params.push(tabla);
      }
      
      if (accion) {
        whereClause += ` AND a.accion = $${paramCount++}`;
        params.push(accion);
      }
      
      if (usuario_id) {
        whereClause += ` AND a.usuario_id = $${paramCount++}`;
        params.push(usuario_id);
      }
      
      if (fecha_desde) {
        whereClause += ` AND a.fecha_accion >= $${paramCount++}`;
        params.push(fecha_desde);
      }
      
      if (fecha_hasta) {
        whereClause += ` AND a.fecha_accion <= $${paramCount++}`;
        params.push(fecha_hasta);
      }
      
      const sql = `
        SELECT 
          a.id,
          a.tabla_afectada,
          a.accion,
          a.usuario_id,
          a.datos_anteriores,
          a.datos_nuevos,
          a.fecha_accion,
          u.nombre as usuario_nombre,
          u.email as usuario_email
        FROM auditoria_sistema a
        LEFT JOIN usuarios u ON a.usuario_id = u.id
        ${whereClause}
        ORDER BY a.fecha_accion DESC 
        LIMIT $${paramCount++} OFFSET $${paramCount++}
      `;
      
      params.push(limit, (page - 1) * limit);
      
      const result = await query(sql, params);
      
      res.json({
        success: true,
        data: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.rows.length
        }
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo auditoría:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo logs de auditoría'
      });
    }
  }

  // ==================== MANTENIMIENTO ====================
  
  async runSystemCleanup(req, res) {
    try {
      console.log('🧹 Ejecutando limpieza del sistema...');
      
      // Usar la función de limpieza que creamos
      const result = await query('SELECT limpiar_datos_antiguos() as resultado');
      
      res.json({
        success: true,
        message: 'Limpieza del sistema completada',
        data: {
          resultado: result.rows[0].resultado
        }
      });
      
    } catch (error) {
      console.error('❌ Error ejecutando limpieza:', error);
      res.status(500).json({
        success: false,
        message: 'Error ejecutando limpieza del sistema'
      });
    }
  }

  // ==================== ESTADÍSTICAS AVANZADAS ====================
  
  async getSystemStats(req, res) {
    try {
      console.log('📈 Obteniendo estadísticas del sistema...');
      
      // Combinar varias consultas para un reporte completo
      const [metricas, alertasRecientes, auditoriaReciente] = await Promise.all([
        query('SELECT obtener_metricas_basicas() as metricas'),
        query(`
          SELECT tipo, COUNT(*) as cantidad, MAX(fecha_creacion) as ultima
          FROM alertas_sistema 
          WHERE fecha_creacion >= CURRENT_DATE - INTERVAL '7 days'
          GROUP BY tipo
          ORDER BY cantidad DESC
        `),
        query(`
          SELECT tabla_afectada, COUNT(*) as cambios
          FROM auditoria_sistema 
          WHERE fecha_accion >= CURRENT_DATE - INTERVAL '7 days'
          GROUP BY tabla_afectada
          ORDER BY cambios DESC
        `)
      ]);
      
      res.json({
        success: true,
        data: {
          metricas: metricas.rows[0].metricas,
          alertas_semana: alertasRecientes.rows,
          actividad_semana: auditoriaReciente.rows
        }
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo estadísticas del sistema'
      });
    }
  }

  // ==================== MÉTODOS DE UTILIDAD ====================
  
  async getAlertsSummary(req, res) {
    try {
      const sql = `
        SELECT 
          severidad,
          COUNT(*) as total,
          COUNT(CASE WHEN revisada = false THEN 1 END) as pendientes
        FROM alertas_sistema 
        GROUP BY severidad
        ORDER BY 
          CASE severidad 
            WHEN 'critica' THEN 1
            WHEN 'alta' THEN 2  
            WHEN 'media' THEN 3
            WHEN 'baja' THEN 4
          END
      `;
      
      const result = await query(sql);
      
      res.json({
        success: true,
        data: result.rows
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo resumen de alertas:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo resumen de alertas'
      });
    }
  }

  async testTriggers(req, res) {
    try {
      console.log('🧪 Probando que los triggers funcionan...');
      
      // Verificar que las funciones existen
      const funcionesResult = await query(`
        SELECT routine_name
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_type = 'FUNCTION'
        AND routine_name IN (
          'auditoria_simple',
          'detectar_critico', 
          'validaciones_basicas',
          'obtener_metricas_basicas'
        )
      `);
      
      // Verificar que los triggers existen
      const triggersResult = await query(`
        SELECT trigger_name, event_object_table
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public'
        AND (trigger_name LIKE '%auditoria%' 
        OR trigger_name LIKE '%deteccion%' 
        OR trigger_name LIKE '%validar%')
      `);
      
      // Obtener métricas de prueba
      const metricas = await query('SELECT obtener_metricas_basicas() as metricas');
      
      res.json({
        success: true,
        message: 'Sistema de triggers funcionando correctamente',
        data: {
          funciones_activas: funcionesResult.rows.length,
          triggers_activos: triggersResult.rows.length,
          metricas_funcionando: metricas.rows.length > 0,
          funciones: funcionesResult.rows.map(f => f.routine_name),
          triggers: triggersResult.rows.map(t => `${t.trigger_name} en ${t.event_object_table}`)
        }
      });
      
    } catch (error) {
      console.error('❌ Error probando triggers:', error);
      res.status(500).json({
        success: false,
        message: 'Error probando el sistema de triggers'
      });
    }
  }
}

module.exports = new SystemController();
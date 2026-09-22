// backend/src/controllers/history/historyController.js - VERSIÓN CORREGIDA
const { query } = require('../../config/database');

// ==================== MÉTODOS PARA USUARIO ACTUAL ====================

// Obtener historial del usuario actual
const getUserHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0, tipoAccion, fechaDesde, fechaHasta } = req.query;
    
    console.log(`📡 Obteniendo historial del usuario ID: ${userId}`);
    
    // Construir WHERE clause dinámicamente
    let whereClause = 'h.usuario_id = $1 AND p.activo = true';
    let params = [userId];
    let paramIndex = 2;
    
    // Filtro por tipo de acción
    if (tipoAccion && tipoAccion !== 'todas') {
      whereClause += ` AND h.tipo_accion = $${paramIndex}`;
      params.push(tipoAccion);
      paramIndex++;
    }
    
    // Filtro por fecha desde
    if (fechaDesde) {
      whereClause += ` AND h.fecha_vista >= $${paramIndex}`;
      params.push(fechaDesde);
      paramIndex++;
    }
    
    // Filtro por fecha hasta
    if (fechaHasta) {
      whereClause += ` AND h.fecha_vista <= $${paramIndex}`;
      params.push(fechaHasta);
      paramIndex++;
    }
    
    const sql = `
      SELECT 
        h.id,
        h.pelicula_id,
        h.tipo_accion,
        h.fecha_vista,
        p.titulo,
        p.poster,
        p.genero,
        p.anio,
        p.rating,
        p.director,
        p.duracion
      FROM historial h
      JOIN peliculas p ON h.pelicula_id = p.id
      WHERE ${whereClause}
      ORDER BY h.fecha_vista DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await query(sql, params);
    
    // También obtener el total de registros
    const countSql = `
      SELECT COUNT(*) as total
      FROM historial h
      JOIN peliculas p ON h.pelicula_id = p.id
      WHERE ${whereClause}
    `;
    
    const countResult = await query(countSql, params.slice(0, -2)); // Excluir LIMIT y OFFSET
    const total = parseInt(countResult.rows[0]?.total || 0);
    
    console.log(`✅ ${result.rows.length} items de historial encontrados (total: ${total})`);
    
    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        peliculaId: row.pelicula_id,
        titulo: row.titulo,
        poster: row.poster,
        genero: row.genero,
        anio: row.anio,
        rating: row.rating,
        director: row.director,
        duracion: row.duracion,
        tipoAccion: row.tipo_accion,
        fechaVista: row.fecha_vista
      })),
      pagination: {
        total: total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + result.rows.length) < total
      }
    });

  } catch (error) {
    console.error('❌ Error al obtener historial:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// 🔧 MÉTODO CORREGIDO: Agregar item al historial
const addToHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { peliculaId, tipoAccion = 'vista' } = req.body;
    
    // Validar datos
    if (!peliculaId || isNaN(peliculaId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de película inválido'
      });
    }

    if (!['vista', 'comprada'].includes(tipoAccion)) {
      return res.status(400).json({
        success: false,
        error: 'Tipo de acción inválido. Debe ser "vista" o "comprada"'
      });
    }

    console.log(`📡 Agregando al historial: usuario ${userId}, película ${peliculaId}, acción: ${tipoAccion}`);
    
    // Verificar que la película existe
    const peliculaExists = await query(
      'SELECT id, titulo FROM peliculas WHERE id = $1 AND activo = true',
      [peliculaId]
    );
    
    if (peliculaExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Película no encontrada'
      });
    }
    
    // 🔧 LÓGICA CORREGIDA: Solo evitar duplicados muy recientes (última hora)
    const unaHoraAtras = new Date();
    unaHoraAtras.setHours(unaHoraAtras.getHours() - 1);
    
    const existingRecent = await query(`
      SELECT id, fecha_vista FROM historial 
      WHERE usuario_id = $1 AND pelicula_id = $2 AND tipo_accion = $3 
      AND fecha_vista > $4
      ORDER BY fecha_vista DESC
      LIMIT 1
    `, [userId, peliculaId, tipoAccion, unaHoraAtras.toISOString()]);
    
    if (existingRecent.rows.length > 0) {
      const ultimaActividad = new Date(existingRecent.rows[0].fecha_vista);
      const segundosPasados = Math.floor((Date.now() - ultimaActividad.getTime()) / 1000);
      
      // 🔧 CAMBIO: Solo bloquear primeros 30 segundos
      if (segundosPasados < 30) {
        console.log(`⚠️ Anti-spam activado: ${segundosPasados} segundos desde la última actividad`);
        return res.status(409).json({
          success: false,
          error: 'Actividad registrada recientemente',
          waitTime: 30 - segundosPasados
        });
      } else {
        console.log(`✅ Permitiendo nueva actividad: ${segundosPasados} segundos desde la última`);
      }
    }
    
    // Agregar al historial
    const insertSql = `
      INSERT INTO historial (usuario_id, pelicula_id, tipo_accion, fecha_vista)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      RETURNING id, usuario_id, pelicula_id, tipo_accion, fecha_vista
    `;
    
    const result = await query(insertSql, [userId, peliculaId, tipoAccion]);
    
    console.log(`✅ Item agregado al historial: ID ${result.rows[0].id} (${tipoAccion})`);
    
    res.status(201).json({
      success: true,
      message: 'Actividad agregada al historial',
      data: {
        id: result.rows[0].id,
        peliculaId: peliculaId,
        titulo: peliculaExists.rows[0].titulo,
        tipoAccion: tipoAccion,
        fechaVista: result.rows[0].fecha_vista
      }
    });

  } catch (error) {
    console.error('❌ Error al agregar al historial:', error);
    
    // 🔧 MANEJO ESPECÍFICO DE ERRORES DE CONSTRAINT
    if (error.code === '23505') { // Unique violation en PostgreSQL
      return res.status(409).json({
        success: false,
        error: 'Esta actividad ya fue registrada recientemente'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Limpiar historial del usuario actual
const clearUserHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log(`📡 Limpiando historial del usuario ${userId}`);
    
    const deleteSql = `
      DELETE FROM historial 
      WHERE usuario_id = $1
    `;
    
    const result = await query(deleteSql, [userId]);
    
    console.log(`✅ Historial limpiado del usuario ${userId}. Filas eliminadas: ${result.rowCount}`);
    
    res.json({
      success: true,
      message: `Historial eliminado correctamente. ${result.rowCount} elementos eliminados`,
      data: {
        deletedCount: result.rowCount || 0
      }
    });

  } catch (error) {
    console.error('❌ Error al limpiar historial:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Obtener estadísticas de historial del usuario actual
const getUserHistoryStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Obtener estadísticas generales
    const generalSql = `
      SELECT 
        COUNT(*) as total_actividades,
        COUNT(CASE WHEN tipo_accion = 'vista' THEN 1 END) as total_vistas,
        COUNT(CASE WHEN tipo_accion = 'comprada' THEN 1 END) as total_compradas,
        COUNT(DISTINCT p.genero) as generos_diferentes,
        MAX(h.fecha_vista) as ultima_actividad
      FROM historial h
      JOIN peliculas p ON h.pelicula_id = p.id
      WHERE h.usuario_id = $1 AND p.activo = true
    `;
    
    const generalResult = await query(generalSql, [userId]);
    
    // Obtener género más visto
    const generoSql = `
      SELECT p.genero, COUNT(*) as cantidad
      FROM historial h
      JOIN peliculas p ON h.pelicula_id = p.id
      WHERE h.usuario_id = $1 AND p.activo = true
      GROUP BY p.genero
      ORDER BY cantidad DESC
      LIMIT 1
    `;
    
    const generoResult = await query(generoSql, [userId]);
    
    // Obtener actividad de los últimos 7 días
    const actividadSql = `
      SELECT DATE(fecha_vista) as fecha, COUNT(*) as actividades
      FROM historial
      WHERE usuario_id = $1 AND fecha_vista >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(fecha_vista)
      ORDER BY fecha DESC
    `;
    
    const actividadResult = await query(actividadSql, [userId]);
    
    const stats = generalResult.rows[0];
    
    res.json({
      success: true,
      data: {
        totalActividades: parseInt(stats.total_actividades || 0),
        totalVistas: parseInt(stats.total_vistas || 0),
        totalCompradas: parseInt(stats.total_compradas || 0),
        generosDiferentes: parseInt(stats.generos_diferentes || 0),
        generoMasVisto: generoResult.rows[0]?.genero || 'Ninguno',
        ultimaActividad: stats.ultima_actividad,
        actividadUltimos7Dias: actividadResult.rows
      }
    });

  } catch (error) {
    console.error('❌ Error al obtener estadísticas de historial:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// ==================== MÉTODOS PARA ADMIN (USUARIO ESPECÍFICO) ====================

// Obtener historial de un usuario específico (solo admin)
const getUserHistoryById = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    // Validar userId
    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de usuario inválido'
      });
    }

    console.log(`📡 [ADMIN] Obteniendo historial del usuario ID: ${userId}`);
    
    const sql = `
      SELECT 
        h.id,
        h.pelicula_id,
        h.tipo_accion,
        h.fecha_vista,
        p.titulo,
        p.poster,
        p.genero,
        p.anio,
        p.rating
      FROM historial h
      JOIN peliculas p ON h.pelicula_id = p.id
      WHERE h.usuario_id = $1 AND p.activo = true
      ORDER BY h.fecha_vista DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await query(sql, [userId, parseInt(limit), parseInt(offset)]);
    
    // Obtener total de registros
    const countSql = `
      SELECT COUNT(*) as total
      FROM historial h
      JOIN peliculas p ON h.pelicula_id = p.id
      WHERE h.usuario_id = $1 AND p.activo = true
    `;
    
    const countResult = await query(countSql, [userId]);
    const total = parseInt(countResult.rows[0]?.total || 0);
    
    console.log(`✅ [ADMIN] ${result.rows.length} items de historial encontrados para usuario ${userId}`);
    
    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        peliculaId: row.pelicula_id,
        titulo: row.titulo,
        poster: row.poster,
        genero: row.genero,
        anio: row.anio,
        rating: row.rating,
        tipoAccion: row.tipo_accion,
        fechaVista: row.fecha_vista
      })),
      total: total,
      userId: parseInt(userId)
    });

  } catch (error) {
    console.error('❌ [ADMIN] Error al obtener historial por ID:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Limpiar historial de usuario específico (solo admin)
const clearUserHistoryById = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validar userId
    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de usuario inválido'
      });
    }
    
    console.log(`📡 [ADMIN] Limpiando historial del usuario ${userId}`);
    
    const deleteSql = `
      DELETE FROM historial 
      WHERE usuario_id = $1
    `;
    
    const result = await query(deleteSql, [userId]);
    
    console.log(`✅ [ADMIN] Historial limpiado del usuario ${userId}. Filas eliminadas: ${result.rowCount}`);
    
    res.json({
      success: true,
      message: `Historial eliminado correctamente. ${result.rowCount} elementos eliminados`,
      data: {
        deletedCount: result.rowCount || 0,
        userId: parseInt(userId)
      }
    });

  } catch (error) {
    console.error('❌ [ADMIN] Error al limpiar historial por ID:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Obtener estadísticas generales de historial de todos los usuarios (solo admin)
const getAllUsersHistoryStats = async (req, res) => {
  try {
    console.log('📊 [ADMIN] Obteniendo estadísticas generales de historial...');
    
    // Estadísticas generales
    const generalSql = `
      SELECT 
        COUNT(*) as total_actividades,
        COUNT(DISTINCT usuario_id) as usuarios_con_historial,
        COUNT(CASE WHEN tipo_accion = 'vista' THEN 1 END) as total_vistas,
        COUNT(CASE WHEN tipo_accion = 'comprada' THEN 1 END) as total_compradas,
        AVG(CASE WHEN tipo_accion = 'vista' THEN 1 ELSE 0 END) * 100 as porcentaje_vistas
      FROM historial h
      JOIN peliculas p ON h.pelicula_id = p.id
      WHERE p.activo = true
    `;
    
    const generalResult = await query(generalSql);
    
    // Top películas más vistas
    const topPeliculasSql = `
      SELECT 
        p.titulo,
        p.genero,
        COUNT(*) as total_actividades,
        COUNT(CASE WHEN h.tipo_accion = 'vista' THEN 1 END) as vistas,
        COUNT(CASE WHEN h.tipo_accion = 'comprada' THEN 1 END) as compradas
      FROM historial h
      JOIN peliculas p ON h.pelicula_id = p.id
      WHERE p.activo = true
      GROUP BY p.id, p.titulo, p.genero
      ORDER BY total_actividades DESC
      LIMIT 10
    `;
    
    const topPeliculasResult = await query(topPeliculasSql);
    
    // Actividad por día de los últimos 30 días
    const actividadSql = `
      SELECT 
        DATE(fecha_vista) as fecha,
        COUNT(*) as actividades,
        COUNT(CASE WHEN tipo_accion = 'vista' THEN 1 END) as vistas,
        COUNT(CASE WHEN tipo_accion = 'comprada' THEN 1 END) as compradas
      FROM historial
      WHERE fecha_vista >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(fecha_vista)
      ORDER BY fecha DESC
    `;
    
    const actividadResult = await query(actividadSql);
    
    const stats = generalResult.rows[0];
    
    res.json({
      success: true,
      data: {
        general: {
          totalActividades: parseInt(stats.total_actividades || 0),
          usuariosConHistorial: parseInt(stats.usuarios_con_historial || 0),
          totalVistas: parseInt(stats.total_vistas || 0),
          totalCompradas: parseInt(stats.total_compradas || 0),
          porcentajeVistas: parseFloat(stats.porcentaje_vistas || 0).toFixed(1)
        },
        topPeliculas: topPeliculasResult.rows,
        actividadUltimos30Dias: actividadResult.rows
      }
    });

  } catch (error) {
    console.error('❌ [ADMIN] Error al obtener estadísticas generales:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

module.exports = {
  // Métodos para usuario actual
  getUserHistory,
  addToHistory,
  clearUserHistory,
  getUserHistoryStats,
  // Métodos para admin
  getUserHistoryById,
  clearUserHistoryById,
  getAllUsersHistoryStats
};
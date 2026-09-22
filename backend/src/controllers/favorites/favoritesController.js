// backend/src/controllers/favorites/favoritesController.js
const { query } = require('../../config/database');

// ==================== MÉTODOS PARA USUARIO ACTUAL ====================

// Obtener favoritas del usuario actual
const getUserFavorites = async (req, res) => {
  try {
    const userId = req.user.id; // Del middleware de autenticación
    
    console.log(`📡 Obteniendo favoritas del usuario ID: ${userId}`);
    
    const sql = `
      SELECT 
        f.id,
        f.pelicula_id,
        f.fecha_agregada,
        p.titulo,
        p.poster,
        p.genero,
        p.anio,
        p.rating,
        p.director,
        p.duracion
      FROM favoritas f
      JOIN peliculas p ON f.pelicula_id = p.id
      WHERE f.usuario_id = $1 AND p.activo = true
      ORDER BY f.fecha_agregada DESC
    `;
    
    const result = await query(sql, [userId]);
    
    console.log(`✅ ${result.rows.length} favoritas encontradas`);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('❌ Error al obtener favoritas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Agregar película a favoritas del usuario actual
const addToFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const { peliculaId } = req.body;
    
    // Validar datos
    if (!peliculaId || isNaN(peliculaId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de película inválido'
      });
    }

    console.log(`📡 Agregando película ${peliculaId} a favoritas del usuario ${userId}`);
    
    // Verificar que la película existe
    const peliculaExists = await query(
      'SELECT id FROM peliculas WHERE id = $1 AND activo = true',
      [peliculaId]
    );
    
    if (peliculaExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Película no encontrada'
      });
    }
    
    // Verificar si ya está en favoritas
    const alreadyFavorite = await query(
      'SELECT id FROM favoritas WHERE usuario_id = $1 AND pelicula_id = $2',
      [userId, peliculaId]
    );
    
    if (alreadyFavorite.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'La película ya está en favoritas'
      });
    }
    
    // Agregar a favoritas
    const insertSql = `
      INSERT INTO favoritas (usuario_id, pelicula_id, fecha_agregada)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      RETURNING id, usuario_id, pelicula_id, fecha_agregada
    `;
    
    const result = await query(insertSql, [userId, peliculaId]);
    
    console.log(`✅ Película agregada a favoritas: ID ${result.rows[0].id}`);
    
    res.status(201).json({
      success: true,
      message: 'Película agregada a favoritas',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error al agregar a favoritas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Remover película de favoritas del usuario actual
const removeFromFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const { peliculaId } = req.params;
    
    // Validar ID
    if (!peliculaId || isNaN(peliculaId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de película inválido'
      });
    }

    console.log(`📡 Removiendo película ${peliculaId} de favoritas del usuario ${userId}`);
    
    // Remover de favoritas
    const deleteSql = `
      DELETE FROM favoritas 
      WHERE usuario_id = $1 AND pelicula_id = $2
      RETURNING id, pelicula_id
    `;
    
    const result = await query(deleteSql, [userId, peliculaId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'La película no está en favoritas'
      });
    }
    
    console.log(`✅ Película removida de favoritas: ${peliculaId}`);
    
    res.json({
      success: true,
      message: 'Película removida de favoritas',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error al remover de favoritas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Verificar si una película está en favoritas del usuario actual
const checkIfFavorite = async (req, res) => {
  try {
    const userId = req.user.id;
    const { peliculaId } = req.params;
    
    // Validar ID
    if (!peliculaId || isNaN(peliculaId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de película inválido'
      });
    }
    
    const sql = `
      SELECT id FROM favoritas 
      WHERE usuario_id = $1 AND pelicula_id = $2
    `;
    
    const result = await query(sql, [userId, peliculaId]);
    
    res.json({
      success: true,
      data: {
        isFavorite: result.rows.length > 0,
        peliculaId: parseInt(peliculaId)
      }
    });

  } catch (error) {
    console.error('❌ Error al verificar favorita:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Limpiar todas las favoritas del usuario actual
const clearAllFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log(`📡 Limpiando todas las favoritas del usuario ${userId}`);
    
    const deleteSql = `
      DELETE FROM favoritas 
      WHERE usuario_id = $1
      RETURNING COUNT(*) as deleted_count
    `;
    
    const result = await query(deleteSql, [userId]);
    
    console.log(`✅ Favoritas limpiadas del usuario ${userId}`);
    
    res.json({
      success: true,
      message: 'Todas las favoritas han sido eliminadas',
      data: {
        deletedCount: result.rowCount || 0
      }
    });

  } catch (error) {
    console.error('❌ Error al limpiar favoritas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Obtener estadísticas de favoritas del usuario actual
const getFavoritesStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const sql = `
      SELECT 
        COUNT(*) as total_favoritas,
        COUNT(DISTINCT p.genero) as generos_diferentes,
        p.genero as genero_favorito,
        COUNT(*) as count
      FROM favoritas f
      JOIN peliculas p ON f.pelicula_id = p.id
      WHERE f.usuario_id = $1 AND p.activo = true
      GROUP BY p.genero
      ORDER BY count DESC
      LIMIT 1
    `;
    
    const result = await query(sql, [userId]);
    
    // También obtener total general
    const totalSql = `
      SELECT COUNT(*) as total
      FROM favoritas f
      JOIN peliculas p ON f.pelicula_id = p.id
      WHERE f.usuario_id = $1 AND p.activo = true
    `;
    
    const totalResult = await query(totalSql, [userId]);
    
    res.json({
      success: true,
      data: {
        totalFavoritas: parseInt(totalResult.rows[0]?.total || 0),
        generoFavorito: result.rows[0]?.genero_favorito || 'Ninguno'
      }
    });

  } catch (error) {
    console.error('❌ Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// ==================== MÉTODOS PARA ADMIN (USUARIO ESPECÍFICO) ====================

// Obtener favoritas de un usuario específico (solo admin)
const getUserFavoritesById = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validar userId
    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de usuario inválido'
      });
    }

    console.log(`📡 [ADMIN] Obteniendo favoritas del usuario ID: ${userId}`);
    
    const sql = `
      SELECT 
        f.id,
        f.pelicula_id,
        f.fecha_agregada,
        p.titulo,
        p.poster,
        p.genero,
        p.anio,
        p.rating,
        p.director,
        p.duracion
      FROM favoritas f
      JOIN peliculas p ON f.pelicula_id = p.id
      WHERE f.usuario_id = $1 AND p.activo = true
      ORDER BY f.fecha_agregada DESC
    `;
    
    const result = await query(sql, [userId]);
    
    console.log(`✅ [ADMIN] ${result.rows.length} favoritas encontradas para usuario ${userId}`);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      userId: parseInt(userId)
    });

  } catch (error) {
    console.error('❌ [ADMIN] Error al obtener favoritas por ID:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Remover película de favoritas de usuario específico (solo admin)
const removeFromFavoritesById = async (req, res) => {
  try {
    const { userId, peliculaId } = req.params;
    
    // Validar IDs
    if (!userId || isNaN(userId) || !peliculaId || isNaN(peliculaId)) {
      return res.status(400).json({
        success: false,
        error: 'IDs de usuario o película inválidos'
      });
    }

    console.log(`📡 [ADMIN] Removiendo película ${peliculaId} de favoritas del usuario ${userId}`);
    
    // Remover de favoritas
    const deleteSql = `
      DELETE FROM favoritas 
      WHERE usuario_id = $1 AND pelicula_id = $2
      RETURNING id, pelicula_id, usuario_id
    `;
    
    const result = await query(deleteSql, [userId, peliculaId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'La película no está en favoritas de este usuario'
      });
    }
    
    console.log(`✅ [ADMIN] Película removida de favoritas: usuario ${userId}, película ${peliculaId}`);
    
    res.json({
      success: true,
      message: 'Película removida de favoritas',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ [ADMIN] Error al remover de favoritas por ID:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Verificar si una película está en favoritas de usuario específico (solo admin)
const checkIfFavoriteById = async (req, res) => {
  try {
    const { userId, peliculaId } = req.params;
    
    // Validar IDs
    if (!userId || isNaN(userId) || !peliculaId || isNaN(peliculaId)) {
      return res.status(400).json({
        success: false,
        error: 'IDs de usuario o película inválidos'
      });
    }
    
    const sql = `
      SELECT id FROM favoritas 
      WHERE usuario_id = $1 AND pelicula_id = $2
    `;
    
    const result = await query(sql, [userId, peliculaId]);
    
    console.log(`🔍 [ADMIN] Verificando favorita: usuario ${userId}, película ${peliculaId} = ${result.rows.length > 0}`);
    
    res.json({
      success: true,
      data: {
        isFavorite: result.rows.length > 0,
        peliculaId: parseInt(peliculaId),
        userId: parseInt(userId)
      }
    });

  } catch (error) {
    console.error('❌ [ADMIN] Error al verificar favorita por ID:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Limpiar todas las favoritas de usuario específico (solo admin)
const clearAllFavoritesById = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validar userId
    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de usuario inválido'
      });
    }
    
    console.log(`📡 [ADMIN] Limpiando todas las favoritas del usuario ${userId}`);
    
    const deleteSql = `
      DELETE FROM favoritas 
      WHERE usuario_id = $1
      RETURNING COUNT(*) as deleted_count
    `;
    
    const result = await query(deleteSql, [userId]);
    
    console.log(`✅ [ADMIN] Favoritas limpiadas del usuario ${userId}`);
    
    res.json({
      success: true,
      message: 'Todas las favoritas han sido eliminadas',
      data: {
        deletedCount: result.rowCount || 0,
        userId: parseInt(userId)
      }
    });

  } catch (error) {
    console.error('❌ [ADMIN] Error al limpiar favoritas por ID:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// ==================== EXPORTACIONES ====================

module.exports = {
  // Métodos para usuario actual
  getUserFavorites,
  addToFavorites,
  removeFromFavorites,
  checkIfFavorite,
  clearAllFavorites,
  getFavoritesStats,
  // Métodos para admin (usuario específico)
  getUserFavoritesById,
  removeFromFavoritesById,
  checkIfFavoriteById,
  clearAllFavoritesById
};
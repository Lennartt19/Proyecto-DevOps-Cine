// backend/src/routes/favorites.js
const express = require('express');
const router = express.Router();
const {
  getUserFavorites,
  addToFavorites,
  removeFromFavorites,
  checkIfFavorite,
  clearAllFavorites,
  getFavoritesStats,
  // 🆕 NUEVOS CONTROLADORES PARA ADMIN
  getUserFavoritesById,
  removeFromFavoritesById,
  checkIfFavoriteById,
  clearAllFavoritesById
} = require('../controllers/favorites/favoritesController');

const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// ==================== RUTAS ESPECÍFICAS PRIMERO ====================

// GET /api/favorites/stats - Estadísticas de favoritas del usuario actual
router.get('/stats', getFavoritesStats);

// DELETE /api/favorites/clear - Limpiar todas las favoritas del usuario actual
router.delete('/clear', clearAllFavorites);

// GET /api/favorites/check/:peliculaId - Verificar si está en favoritas (usuario actual)
router.get('/check/:peliculaId', checkIfFavorite);

// ==================== RUTAS DE ADMIN (ESPECÍFICAS POR USUARIO) ====================

// 🆕 GET /api/favorites/:userId - Obtener favoritas de usuario específico (solo admin)
router.get('/:userId', requireAdmin, getUserFavoritesById);

// 🆕 DELETE /api/favorites/:userId/clear - Limpiar favoritas de usuario específico (solo admin)
router.delete('/:userId/clear', requireAdmin, clearAllFavoritesById);

// 🆕 GET /api/favorites/:userId/check/:peliculaId - Verificar favorita de usuario específico (solo admin)
router.get('/:userId/check/:peliculaId', requireAdmin, checkIfFavoriteById);

// 🆕 DELETE /api/favorites/:userId/:peliculaId - Remover favorita de usuario específico (solo admin)
router.delete('/:userId/:peliculaId', requireAdmin, removeFromFavoritesById);

// ==================== RUTAS GENERALES (USUARIO ACTUAL) ====================

// GET /api/favorites - Obtener favoritas del usuario actual
router.get('/', getUserFavorites);

// POST /api/favorites - Agregar película a favoritas del usuario actual
router.post('/', addToFavorites);

// DELETE /api/favorites/:peliculaId - Remover película de favoritas del usuario actual
router.delete('/:peliculaId', removeFromFavorites);

module.exports = router;
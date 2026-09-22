// backend/src/routes/history.js
const express = require('express');
const router = express.Router();
const {
  getUserHistory,
  addToHistory,
  clearUserHistory,
  getUserHistoryStats,
  // Métodos para admin
  getUserHistoryById,
  clearUserHistoryById,
  getAllUsersHistoryStats
} = require('../controllers/history/historyController');

const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// ==================== RUTAS ESPECÍFICAS PRIMERO ====================

// GET /api/history/stats - Estadísticas de historial del usuario actual
router.get('/stats', getUserHistoryStats);

// DELETE /api/history/clear - Limpiar historial del usuario actual
router.delete('/clear', clearUserHistory);

// ==================== RUTAS DE ADMIN (ESPECÍFICAS POR USUARIO) ====================

// GET /api/history/admin/stats - Estadísticas generales de historial (solo admin)
router.get('/admin/stats', requireAdmin, getAllUsersHistoryStats);

// GET /api/history/:userId - Obtener historial de usuario específico (solo admin)
router.get('/:userId', requireAdmin, getUserHistoryById);

// DELETE /api/history/:userId/clear - Limpiar historial de usuario específico (solo admin)
router.delete('/:userId/clear', requireAdmin, clearUserHistoryById);

// ==================== RUTAS GENERALES (USUARIO ACTUAL) ====================

// GET /api/history - Obtener historial del usuario actual
router.get('/', getUserHistory);

// POST /api/history - Agregar item al historial del usuario actual
router.post('/', addToHistory);

module.exports = router;
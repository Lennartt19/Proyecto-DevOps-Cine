// backend/src/routes/logs.js
const express = require('express');
const router = express.Router();
const logsController = require('../controllers/admin/logsController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

// Todas las rutas requieren autenticación y permisos de admin
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/logs/activity - Obtener actividad reciente
router.get('/activity', logsController.getRecentActivity);

// GET /api/logs/orders - Obtener logs de órdenes
router.get('/orders', logsController.getOrderLogs);

// GET /api/logs/users - Obtener logs de usuarios
router.get('/users', logsController.getUserLogs);

// GET /api/logs/errors - Obtener logs de errores
router.get('/errors', logsController.getErrorLogs);

// GET /api/logs/stats - Obtener estadísticas del sistema
router.get('/stats', logsController.getSystemStats);

module.exports = router;
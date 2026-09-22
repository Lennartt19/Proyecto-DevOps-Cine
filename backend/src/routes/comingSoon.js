// backend/src/routes/comingSoon.js
const express = require('express');
const router = express.Router();
const {
  getAllComingSoon,
  getComingSoonById,
  createComingSoon,
  updateComingSoon,
  deleteComingSoon,
  searchComingSoon,
  getComingSoonByGenero,
  getUpcomingDays,
  getComingSoonStats,
  toggleComingSoonStatus
} = require('../controllers/comingSoon/comingSoonController');

const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

// ==================== RUTAS PÚBLICAS ====================

// GET /api/coming-soon/search?q=termino - Buscar próximos estrenos
router.get('/search', searchComingSoon);

// GET /api/coming-soon/stats - Obtener estadísticas
router.get('/stats', getComingSoonStats);

// GET /api/coming-soon/upcoming?days=30 - Obtener próximos N días
router.get('/upcoming', getUpcomingDays);

// GET /api/coming-soon/genero/:genero - Obtener por género
router.get('/genero/:genero', getComingSoonByGenero);

// GET /api/coming-soon - Obtener todos los próximos estrenos
router.get('/', getAllComingSoon);

// GET /api/coming-soon/:id - Obtener próximo estreno por ID
router.get('/:id', getComingSoonById);

// ==================== RUTAS PROTEGIDAS (ADMIN) ====================

// POST /api/coming-soon - Crear nuevo próximo estreno (solo admin)
router.post('/', authenticateToken, requireAdmin, createComingSoon);

// PUT /api/coming-soon/:id - Actualizar próximo estreno (solo admin)
router.put('/:id', authenticateToken, requireAdmin, updateComingSoon);

// PATCH /api/coming-soon/:id/status - Cambiar estado (solo admin)
router.patch('/:id/status', authenticateToken, requireAdmin, toggleComingSoonStatus);

// DELETE /api/coming-soon/:id - Eliminar próximo estreno (solo admin)
router.delete('/:id', authenticateToken, requireAdmin, deleteComingSoon);

module.exports = router;
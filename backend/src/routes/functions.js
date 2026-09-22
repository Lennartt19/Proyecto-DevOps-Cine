// backend/src/routes/functions.js
const express = require('express');
const router = express.Router();

// Importar controladores de funciones
const {
  getAllFunctions,
  getFunctionsByMovie,
  getFunctionById,
  createFunction,
  updateFunction,
  deleteFunction,
  getFunctionsByDate
} = require('../controllers/functions/functionController');

// 🆕 IMPORTAR CONTROLADOR DE ASIENTOS (tu versión existente)
const {
  generateSeatsForFunction,
  getSeatsForFunction,
  reserveSeats,
  releaseSeats
} = require('../controllers/functions/seatController');

// Importar middleware
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

// ==================== RUTAS PÚBLICAS ====================

// GET /api/functions - Obtener todas las funciones
router.get('/', getAllFunctions);

// GET /api/functions/movie/:peliculaId - Funciones por película
router.get('/movie/:peliculaId', getFunctionsByMovie);

// GET /api/functions/date/:fecha - Funciones por fecha (YYYY-MM-DD)
router.get('/date/:fecha', getFunctionsByDate);

// GET /api/functions/:funcionId - Obtener función específica
router.get('/:funcionId', getFunctionById);

// 🆕 RUTAS DE ASIENTOS PÚBLICAS
// GET /api/functions/:funcionId/seats - Obtener asientos de una función
router.get('/:funcionId/seats', getSeatsForFunction);

// ==================== RUTAS PROTEGIDAS (ADMIN) ====================

// POST /api/functions - Crear nueva función (solo admin)
router.post('/', authenticateToken, requireAdmin, createFunction);

// PUT /api/functions/:funcionId - Actualizar función (solo admin)
router.put('/:funcionId', authenticateToken, requireAdmin, updateFunction);

// DELETE /api/functions/:funcionId - Eliminar función (solo admin)
router.delete('/:funcionId', authenticateToken, requireAdmin, deleteFunction);

// 🆕 RUTAS DE ASIENTOS PROTEGIDAS (ADMIN)
// POST /api/functions/:funcionId/seats/generate - Generar asientos (solo admin)
router.post('/:funcionId/seats/generate', authenticateToken, requireAdmin, generateSeatsForFunction);

// ==================== RUTAS PROTEGIDAS (USUARIO AUTENTICADO) ====================

// 🆕 RUTAS DE RESERVAS (USUARIO AUTENTICADO)
// POST /api/functions/:funcionId/seats/reserve - Reservar asientos
router.post('/:funcionId/seats/reserve', authenticateToken, reserveSeats);

// POST /api/functions/:funcionId/seats/release - Liberar asientos
router.post('/:funcionId/seats/release', authenticateToken, releaseSeats);

module.exports = router;
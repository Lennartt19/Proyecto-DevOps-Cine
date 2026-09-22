const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  updateUser,
  toggleUserStatus,
  deleteUser,
  searchUsers,
  getUserStats
} = require('../controllers/auth/userController');

const { authenticateToken, requireAdmin, requireAdminOrSelf } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// ==================== RUTAS ESPECÍFICAS PRIMERO ====================

// GET /api/users/search?q=termino - Buscar usuarios (solo admin)
router.get('/search', requireAdmin, searchUsers);

// GET /api/users/stats - Estadísticas de usuarios (solo admin)
router.get('/stats', requireAdmin, getUserStats);

// ==================== RUTAS GENERALES ====================

// GET /api/users - Obtener todos los usuarios (solo admin)
router.get('/', requireAdmin, getAllUsers);

// GET /api/users/:id - Obtener usuario por ID (admin o el mismo usuario)
router.get('/:id', requireAdminOrSelf, getUserById);

// PUT /api/users/:id - Actualizar usuario (admin o el mismo usuario)
router.put('/:id', requireAdminOrSelf, updateUser);

// PATCH /api/users/:id/status - Cambiar estado del usuario (solo admin)
router.patch('/:id/status', requireAdmin, toggleUserStatus);

// DELETE /api/users/:id - Eliminar usuario (solo admin)
router.delete('/:id', requireAdmin, deleteUser);

module.exports = router;
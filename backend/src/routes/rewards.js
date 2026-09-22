// backend/src/routes/rewards.js - VERSIÓN CORREGIDA
const express = require('express');
const router = express.Router();
const rewardsController = require('../controllers/rewards/rewardsController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const validation = require('../middleware/validation');
const { body, param, query } = require('express-validator');

// ==================== RUTAS PÚBLICAS/GENERALES ====================

/**
 * GET /api/rewards
 * Obtener todas las recompensas disponibles
 */
router.get('/', 
  authenticateToken, // Usuario debe estar autenticado
  rewardsController.getAllRewards
);

/**
 * GET /api/rewards/categories
 * Obtener categorías de recompensas
 */
router.get('/categories', 
  authenticateToken,
  rewardsController.getCategories
);

/**
 * GET /api/rewards/:id
 * Obtener recompensa específica por ID
 */
router.get('/:id',
  authenticateToken,
  [
    param('id').isInt().withMessage('ID debe ser un número entero')
  ],
  validation,
  rewardsController.getRewardById
);

// ==================== RUTAS DE CANJE ====================

/**
 * POST /api/rewards/redeem/:id
 * Canjear una recompensa
 */
router.post('/redeem/:id',
  authenticateToken,
  [
    param('id').isInt().withMessage('ID de recompensa inválido')
  ],
  validation,
  rewardsController.redeemReward
);

/**
 * GET /api/rewards/check/:points
 * Verificar disponibilidad de puntos para canje
 */
router.get('/check/:points',
  authenticateToken,
  [
    param('points').isInt({ min: 1 }).withMessage('Puntos debe ser un número positivo')
  ],
  validation,
  rewardsController.checkRedeemAvailability
);

// ==================== RUTAS DE MIS CANJES ====================

/**
 * GET /api/rewards/my/redemptions
 * Obtener canjes del usuario autenticado
 */
router.get('/my/redemptions',
  authenticateToken,
  [
    query('incluir_usados').optional().isBoolean().withMessage('incluir_usados debe ser boolean')
  ],
  validation,
  rewardsController.getUserRedemptions
);

/**
 * GET /api/rewards/validate/:codigo
 * Validar código de canje
 */
router.get('/validate/:codigo',
  authenticateToken,
  [
    param('codigo').isLength({ min: 6, max: 50 }).withMessage('Código de canje inválido')
  ],
  validation,
  rewardsController.validateRedemptionCode
);

/**
 * PATCH /api/rewards/use/:codigo
 * Marcar código de canje como usado
 */
router.patch('/use/:codigo',
  authenticateToken,
  [
    param('codigo').isLength({ min: 6, max: 50 }).withMessage('Código de canje inválido')
  ],
  validation,
  rewardsController.markCodeAsUsed
);

// ==================== RUTAS DE ADMINISTRACIÓN ====================

/**
 * POST /api/rewards
 * Crear nueva recompensa (ADMIN)
 */
router.post('/',
  authenticateToken,
  requireAdmin,
  [
    body('nombre').isLength({ min: 3, max: 255 }).withMessage('Nombre debe tener entre 3 y 255 caracteres'),
    body('descripcion').isLength({ min: 10, max: 1000 }).withMessage('Descripción debe tener entre 10 y 1000 caracteres'),
    body('categoria').isIn(['peliculas', 'bar', 'especial', 'descuentos']).withMessage('Categoría inválida'),
    body('puntos_requeridos').isInt({ min: 1 }).withMessage('Puntos requeridos debe ser un número positivo'),
    body('tipo').isIn(['descuento', 'producto', 'paquete', 'experiencia', 'codigo', 'bonus']).withMessage('Tipo inválido'),
    
    // 🔧 CORRECCIÓN CRÍTICA: Stock es completamente opcional
    body('stock').optional({ checkFalsy: true }).isInt({ min: 0 }).withMessage('Stock debe ser un número no negativo'),
    
    // 🔧 CORRECCIÓN CRÍTICA: Valor es completamente opcional
    body('valor').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Valor debe ser un número positivo o cero'),
    
    body('limite_por_usuario').optional().isInt({ min: 1 }).withMessage('Límite por usuario debe ser positivo'),
    body('validez_dias').optional().isInt({ min: 1 }).withMessage('Validez en días debe ser positiva'),
    
    // 🔧 CORRECCIÓN CRÍTICA: Imagen URL más flexible
    body('imagen_url').optional({ checkFalsy: true }).custom((value, { req }) => {
      // Si no hay valor, está bien
      if (!value) {
        return true;
      }
      
      // Permitir URLs que empiecen con http, https, o assets/
      if (typeof value === 'string' && 
          (value.startsWith('http://') || 
           value.startsWith('https://') || 
           value.startsWith('assets/') ||
           value.startsWith('data:'))) {
        return true;
      }
      
      throw new Error('URL de imagen debe ser válida (http/https/assets/data)');
    }),
    
    // 🔧 CORRECCIÓN: Imagen también flexible
    body('imagen').optional({ checkFalsy: true }).custom((value, { req }) => {
      // Si no hay valor, está bien
      if (!value) {
        return true;
      }
      
      // Permitir URLs que empiecen con http, https, o assets/
      if (typeof value === 'string' && 
          (value.startsWith('http://') || 
           value.startsWith('https://') || 
           value.startsWith('assets/') ||
           value.startsWith('data:'))) {
        return true;
      }
      
      throw new Error('URL de imagen debe ser válida (http/https/assets/data)');
    })
  ],
  validation,
  rewardsController.createReward
);
/**
 * PUT /api/rewards/:id
 * Actualizar recompensa (ADMIN)
 */
router.put('/:id',
  authenticateToken,
  requireAdmin,
  [
    param('id').isInt().withMessage('ID debe ser un número entero'),
    body('nombre').optional().isLength({ min: 3, max: 255 }).withMessage('Nombre debe tener entre 3 y 255 caracteres'),
    body('descripcion').optional().isLength({ min: 10, max: 1000 }).withMessage('Descripción debe tener entre 10 y 1000 caracteres'),
    body('categoria').optional().isIn(['peliculas', 'bar', 'especial', 'descuentos']).withMessage('Categoría inválida'),
    body('puntos_requeridos').optional().isInt({ min: 1 }).withMessage('Puntos requeridos debe ser un número positivo'),
    body('tipo').optional().isIn(['descuento', 'producto', 'paquete', 'experiencia', 'codigo', 'bonus']).withMessage('Tipo inválido'),
    
    // 🔧 CORRECCIÓN: Stock completamente opcional en actualización
    body('stock').optional({ checkFalsy: true }).custom((value, { req }) => {
      // Si es null, undefined, vacío o 0, está bien
      if (value === null || value === undefined || value === '' || value === 0) {
        return true;
      }
      // Si es un número positivo, está bien
      if (typeof value === 'number' && value >= 0) {
        return true;
      }
      // Si es string que se puede convertir a número >= 0
      if (typeof value === 'string' && !isNaN(Number(value)) && Number(value) >= 0) {
        return true;
      }
      throw new Error('Stock debe ser un número no negativo');
    }),
    
    // 🔧 CORRECCIÓN: Valor completamente opcional en actualización
    body('valor').optional({ checkFalsy: true }).custom((value, { req }) => {
      // Si es null, undefined, vacío o 0, está bien
      if (value === null || value === undefined || value === '' || value === 0) {
        return true;
      }
      // Si es un número no negativo, está bien
      if (typeof value === 'number' && value >= 0) {
        return true;
      }
      // Si es string que se puede convertir a número >= 0
      if (typeof value === 'string' && !isNaN(Number(value)) && Number(value) >= 0) {
        return true;
      }
      throw new Error('Valor debe ser un número positivo o cero');
    }),
    
    // 🔧 CORRECCIÓN: Imagen URL flexible en actualización
    body('imagen_url').optional({ checkFalsy: true }).custom((value, { req }) => {
      // Si no hay valor, está bien
      if (!value || value === null || value === undefined || value === '') {
        return true;
      }
      
      // Permitir URLs válidas
      if (typeof value === 'string' && 
          (value.startsWith('http://') || 
           value.startsWith('https://') || 
           value.startsWith('assets/') ||
           value.startsWith('data:'))) {
        return true;
      }
      
      throw new Error('URL de imagen debe ser válida');
    }),
    
    body('imagen').optional({ checkFalsy: true }).custom((value, { req }) => {
      // Si no hay valor, está bien
      if (!value || value === null || value === undefined || value === '') {
        return true;
      }
      
      // Permitir URLs válidas
      if (typeof value === 'string' && 
          (value.startsWith('http://') || 
           value.startsWith('https://') || 
           value.startsWith('assets/') ||
           value.startsWith('data:'))) {
        return true;
      }
      
      throw new Error('URL de imagen debe ser válida');
    })
  ],
  validation,
  rewardsController.updateReward
);

/**
 * DELETE /api/rewards/:id
 * Eliminar recompensa (ADMIN)
 */
router.delete('/:id',
  authenticateToken,
  requireAdmin,
  [
    param('id').isInt().withMessage('ID debe ser un número entero')
  ],
  validation,
  rewardsController.deleteReward
);

/**
 * GET /api/rewards/admin/stats
 * Obtener estadísticas de recompensas (ADMIN)
 */
router.get('/admin/stats',
  authenticateToken,
  requireAdmin,
  rewardsController.getRewardsStats
);

/**
 * GET /api/rewards/admin/redemptions
 * Obtener todos los canjes para administración (ADMIN)
 */
router.get('/admin/redemptions',
  authenticateToken,
  requireAdmin,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Página debe ser un número positivo'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite debe estar entre 1 y 100'),
    query('recompensa_id').optional().isInt().withMessage('ID de recompensa debe ser un número')
  ],
  validation,
  rewardsController.getAllRedemptions
);

// ==================== RUTA DE HEALTH CHECK ====================

/**
 * GET /api/rewards/health
 * Health check del servicio de recompensas
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Servicio de recompensas funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
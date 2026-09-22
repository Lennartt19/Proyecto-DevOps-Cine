const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orders/orderController');
const checkoutController = require('../controllers/orders/checkoutController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const { body, param, query } = require('express-validator');
const validation = require('../middleware/validation');

// ==================== MIDDLEWARE GLOBAL ====================
// Todas las rutas requieren autenticación
router.use(authenticateToken);

// ==================== RUTAS DE CHECKOUT ====================

/**
 * @route POST /api/orders/checkout/initialize
 * @desc Inicializar proceso de checkout
 * @access Private
 */
router.post('/checkout/initialize',
  [
    body('cartItems')
      .isArray({ min: 1 })
      .withMessage('El carrito debe contener al menos un item'),
    body('cartItems.*.tipo')
      .isIn(['pelicula', 'bar'])
      .withMessage('Tipo de item inválido'),
    body('cartItems.*.cantidad')
      .isInt({ min: 1, max: 20 })
      .withMessage('Cantidad debe estar entre 1 y 20'),
    body('cartItems.*.precio')
      .isFloat({ min: 0.01 })
      .withMessage('Precio debe ser mayor a 0')
  ],
  validation,
  checkoutController.initializeCheckout
);

/**
 * @route POST /api/orders/checkout/validate
 * @desc Validar disponibilidad de items del carrito
 * @access Private
 */
router.post('/checkout/validate',
  [
    body('cartItems')
      .isArray({ min: 1 })
      .withMessage('Items del carrito requeridos')
  ],
  validation,
  checkoutController.validateAvailability
);

/**
 * @route POST /api/orders/checkout/apply-points
 * @desc Aplicar puntos al checkout
 * @access Private
 */
router.post('/checkout/apply-points',
  [
    body('puntosAUsar')
      .isInt({ min: 1 })
      .withMessage('Cantidad de puntos debe ser mayor a 0'),
    body('total')
      .isFloat({ min: 0.01 })
      .withMessage('Total requerido')
  ],
  validation,
  checkoutController.applyPoints
);

/**
 * @route POST /api/orders/checkout/paypal/simulate
 * @desc Simular proceso de PayPal
 * @access Private
 */
router.post('/checkout/paypal/simulate',
  [
    body('orderData.total')
      .isFloat({ min: 0.01 })
      .withMessage('Total de orden requerido'),
    body('returnUrl')
      .optional()
      .isURL()
      .withMessage('URL de retorno inválida'),
    body('cancelUrl')
      .optional()
      .isURL()
      .withMessage('URL de cancelación inválida')
  ],
  validation,
  checkoutController.simulatePayPal
);

/**
 * @route POST /api/orders/checkout/process
 * @desc Procesar pago y crear orden
 * @access Private
 */
router.post('/checkout/process',
  [
    body('nombre_cliente')
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('Nombre del cliente requerido (2-255 caracteres)'),
    body('email_cliente')
      .isEmail()
      .normalizeEmail()
      .withMessage('Email válido requerido'),
    body('telefono_cliente')
      .optional({ checkFalsy: true })
      .matches(/^[+\d][\d\s-]{6,19}$/)
      .withMessage('Número de teléfono inválido (7-15 dígitos, puede incluir +, espacios y guiones)'),
    body('metodo_pago')
      .isIn(['tarjeta', 'paypal'])
      .withMessage('Método de pago inválido'),
    body('cartItems')
      .isArray({ min: 1 })
      .withMessage('Carrito no puede estar vacío'),
    // Validaciones condicionales para tarjeta
    body('tarjeta.numero')
      .if(body('metodo_pago').equals('tarjeta'))
      .notEmpty()
      .withMessage('Número de tarjeta requerido'),
    body('tarjeta.cvv')
      .if(body('metodo_pago').equals('tarjeta'))
      .isLength({ min: 3, max: 4 })
      .withMessage('CVV inválido'),
    // Validaciones condicionales para PayPal
    body('paypal.transaction_id')
      .if(body('metodo_pago').equals('paypal'))
      .notEmpty()
      .withMessage('ID de transacción de PayPal requerido')
  ],
  validation,
  checkoutController.processPayment
);

// ==================== RUTAS DE ÓRDENES ====================

/**
 * @route POST /api/orders
 * @desc Crear nueva orden
 * @access Private
 */
router.post('/',
  [
    body('total')
      .isFloat({ min: 0.01 })
      .withMessage('Total debe ser mayor a 0'),
    body('subtotal')
      .isFloat({ min: 0.01 })
      .withMessage('Subtotal debe ser mayor a 0'),
    body('metodo_pago')
      .notEmpty()
      .withMessage('Método de pago requerido'),
    body('email_cliente')
      .isEmail()
      .withMessage('Email válido requerido'),
    body('nombre_cliente')
      .trim()
      .isLength({ min: 2 })
      .withMessage('Nombre del cliente requerido')
  ],
  validation,
  orderController.createOrder
);

/**
 * @route POST /api/orders/purchase
 * @desc Procesar compra completa (crear orden + procesar puntos)
 * @access Private
 */
router.post('/purchase',
  [
    body('total')
      .isFloat({ min: 0.01 })
      .withMessage('Total debe ser mayor a 0'),
    body('metodo_pago')
      .notEmpty()
      .withMessage('Método de pago requerido'),
    body('email_cliente')
      .isEmail()
      .withMessage('Email válido requerido'),
    body('nombre_cliente')
      .trim()
      .isLength({ min: 2 })
      .withMessage('Nombre del cliente requerido')
  ],
  validation,
  orderController.processPurchase
);

/**
 * @route GET /api/orders
 * @desc Obtener órdenes del usuario actual
 * @access Private
 */
router.get('/',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Página debe ser un número mayor a 0'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Límite debe estar entre 1 y 100')
  ],
  validation,
  orderController.getUserOrders
);

/**
 * @route GET /api/orders/stats
 * @desc Obtener estadísticas de órdenes del usuario
 * @access Private
 */
router.get('/stats',
  orderController.getOrderStats
);

/**
 * @route GET /api/orders/:orderId
 * @desc Obtener orden específica por ID
 * @access Private
 */
router.get('/:orderId',
  [
    param('orderId')
      .isUUID()
      .withMessage('ID de orden inválido')
  ],
  validation,
  orderController.getOrderById
);

/**
 * @route PUT /api/orders/:orderId/status
 * @desc Actualizar estado de orden
 * @access Private (Admin para ciertos estados)
 */
router.put('/:orderId/status',
  [
    param('orderId')
      .isUUID()
      .withMessage('ID de orden inválido'),
    body('estado')
      .isIn(['pendiente', 'completada', 'cancelada', 'reembolsada'])
      .withMessage('Estado inválido')
  ],
  validation,
  orderController.updateOrderStatus
);

/**
 * @route POST /api/orders/:orderId/cancel
 * @desc Cancelar orden
 * @access Private
 */
router.post('/:orderId/cancel',
  [
    param('orderId')
      .isUUID()
      .withMessage('ID de orden inválido')
  ],
  validation,
  orderController.cancelOrder
);

// ==================== RUTAS DE ADMINISTRACIÓN ====================

/**
 * @route GET /api/orders/admin/all
 * @desc Obtener todas las órdenes (solo admin)
 * @access Admin
 */
router.get('/admin/all',
  requireAdmin,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Página debe ser un número mayor a 0'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Límite debe estar entre 1 y 100'),
    query('estado')
      .optional()
      .isIn(['pendiente', 'completada', 'cancelada', 'reembolsada'])
      .withMessage('Estado inválido'),
    query('metodo_pago')
      .optional()
      .isIn(['Tarjeta de Crédito', 'PayPal'])
      .withMessage('Método de pago inválido')
  ],
  validation,
  async (req, res) => {
    // Esta ruta necesitaría un método específico en el controlador
    // Por ahora responde con un placeholder
    res.json({
      success: true,
      message: 'Ruta de administración - implementar en orderController',
      data: []
    });
  }
);

/**
 * @route GET /api/orders/admin/stats
 * @desc Obtener estadísticas globales de órdenes (solo admin)
 * @access Admin
 */
router.get('/admin/stats',
  requireAdmin,
  [
    query('start_date')
      .optional()
      .isISO8601()
      .withMessage('Fecha de inicio inválida'),
    query('end_date')
      .optional()
      .isISO8601()
      .withMessage('Fecha de fin inválida')
  ],
  validation,
  orderController.getOrderStats
);

/**
 * @route PUT /api/orders/admin/:orderId/status
 * @desc Actualizar estado de cualquier orden (solo admin)
 * @access Admin
 */
router.put('/admin/:orderId/status',
  requireAdmin,
  [
    param('orderId')
      .isUUID()
      .withMessage('ID de orden inválido'),
    body('estado')
      .isIn(['pendiente', 'completada', 'cancelada', 'reembolsada'])
      .withMessage('Estado inválido'),
    body('razon')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Razón no puede exceder 500 caracteres')
  ],
  validation,
  orderController.updateOrderStatus
);

// ==================== MANEJO DE ERRORES ====================

// Middleware para capturar errores no manejados en las rutas
router.use((error, req, res, next) => {
  console.error('❌ Error en rutas de órdenes:', error);
  
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Error en el procesamiento de órdenes'
  });
});

module.exports = router;
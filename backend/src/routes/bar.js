const express = require('express');
const router = express.Router();
const BarController = require('../controllers/bar/barController');
const { body } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Validaciones para productos
const productValidation = [
  body('nombre')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('El nombre debe tener entre 2 y 255 caracteres'),
  
  body('descripcion')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('La descripción es requerida y no puede exceder 1000 caracteres'),
  
  body('precio')
    .isFloat({ min: 0.01 })
    .withMessage('El precio debe ser un número positivo'),
  
  body('categoria')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('La categoría debe tener entre 2 y 100 caracteres'),
  
  body('imagen')
    .optional()
    .trim()
    .custom((value) => {
      if (!value) return true;
      
      if (value.startsWith('assets/')) {
        return true;
      }
      
      try {
        new URL(value);
        return true;
      } catch {
        throw new Error('La imagen debe ser una URL válida o una ruta de assets');
      }
    }),
  
  body('disponible')
    .optional()
    .isBoolean()
    .withMessage('Disponible debe ser verdadero o falso'),
  
  body('es_combo')
    .optional()
    .isBoolean()
    .withMessage('Es combo debe ser verdadero o falso'),
  
  body('descuento')
    .optional()
    .isFloat({ min: 0, max: 999.99 })
    .withMessage('El descuento debe estar entre 0 y 999.99'),
  
  body('tamanos')
    .optional()
    .custom((value) => {
      if (value === undefined || value === null) return true;
      if (!Array.isArray(value)) {
        throw new Error('Tamaños debe ser un array');
      }
      return true;
    }),
  
  body('tamanos.*.nombre')
    .if((value, { req }) => req.body.tamanos && Array.isArray(req.body.tamanos) && req.body.tamanos.length > 0)
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('El nombre del tamaño es requerido y no puede exceder 100 caracteres'),
  
  body('tamanos.*.precio')
    .if((value, { req }) => req.body.tamanos && Array.isArray(req.body.tamanos) && req.body.tamanos.length > 0)
    .isFloat({ min: 0.01 })
    .withMessage('El precio del tamaño debe ser un número positivo'),
  
  body('extras')
    .optional()
    .custom((value) => {
      if (value === undefined || value === null) return true;
      if (!Array.isArray(value)) {
        throw new Error('Extras debe ser un array');
      }
      return true;
    }),
  
  body('extras.*.nombre')
    .if((value, { req }) => req.body.extras && Array.isArray(req.body.extras) && req.body.extras.length > 0)
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('El nombre del extra es requerido y no puede exceder 100 caracteres'),
  
  body('extras.*.precio')
    .if((value, { req }) => req.body.extras && Array.isArray(req.body.extras) && req.body.extras.length > 0)
    .isFloat({ min: 0.01 })
    .withMessage('El precio del extra debe ser un número positivo'),
  
  body('combo_items')
    .optional()
    .custom((value) => {
      if (value === undefined || value === null) return true;
      if (!Array.isArray(value)) {
        throw new Error('Items del combo debe ser un array');
      }
      return true;
    }),
  
  body('combo_items.*.item_nombre')
    .if((value, { req }) => req.body.combo_items && Array.isArray(req.body.combo_items) && req.body.combo_items.length > 0)
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('El nombre del item del combo es requerido y no puede exceder 255 caracteres')
];

// Validaciones más permisivas para testing
const productValidationPermissive = [
  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('El nombre es requerido'),
  
  body('descripcion')
    .trim()
    .notEmpty()
    .withMessage('La descripción es requerida'),
  
  body('precio')
    .isNumeric()
    .custom(value => value > 0)
    .withMessage('El precio debe ser mayor a 0'),
  
  body('categoria')
    .trim()
    .notEmpty()
    .withMessage('La categoría es requerida')
];

// ============================================
// RUTAS PÚBLICAS (sin autenticación)
// ============================================

router.get('/', BarController.getAllProducts);
router.get('/search', BarController.searchProducts);
router.get('/categories', BarController.getCategories);
router.get('/combos', BarController.getCombos);
router.get('/category/:categoria', BarController.getProductsByCategory);
router.get('/:id', BarController.getProductById);

// ============================================
// RUTAS PROTEGIDAS (requieren autenticación de admin)
// ============================================

// Crear producto
router.post('/', 
  authenticateToken, 
  requireAdmin, 
  productValidationPermissive,
  BarController.createProduct
);

// Actualizar producto
router.put('/:id', 
  authenticateToken, 
  requireAdmin, 
  productValidationPermissive,
  BarController.updateProduct
);

// Cambiar disponibilidad (activar/desactivar)
router.patch('/:id/toggle-disponibilidad', 
  authenticateToken, 
  requireAdmin, 
  BarController.toggleDisponibilidad
);

// ✅ SIMPLIFICADO: Solo eliminar (soft delete directo)
router.delete('/:id', 
  authenticateToken, 
  requireAdmin, 
  BarController.deleteProduct
);

module.exports = router;
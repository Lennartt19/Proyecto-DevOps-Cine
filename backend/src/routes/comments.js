// backend/src/routes/comments.js - CON RESPUESTAS
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const commentController = require('../controllers/comments/commentController');

const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

// ==================== VALIDACIONES ====================

const validateComment = [
    body('tipo')
        .isIn(['pelicula', 'sistema', 'sugerencia'])
        .withMessage('Tipo de comentario inválido'),
    body('titulo')
        .trim()
        .isLength({ min: 3, max: 255 })
        .withMessage('El título debe tener entre 3 y 255 caracteres'),
    body('contenido')
        .trim()
        .isLength({ min: 10, max: 2000 })
        .withMessage('El contenido debe tener entre 10 y 2000 caracteres'),
    body('pelicula_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('ID de película inválido'),
    body('puntuacion')
        .optional()
        .isInt({ min: 1, max: 5 })
        .withMessage('La puntuación debe ser entre 1 y 5')
];

const validateUpdate = [
    body('titulo')
        .optional()
        .trim()
        .isLength({ min: 3, max: 255 })
        .withMessage('El título debe tener entre 3 y 255 caracteres'),
    body('contenido')
        .optional()
        .trim()
        .isLength({ min: 10, max: 2000 })
        .withMessage('El contenido debe tener entre 10 y 2000 caracteres'),
    // 🔥 CORREGIDO: puntuacion es opcional y solo se valida si está presente
    body('puntuacion')
        .optional({ nullable: true, checkFalsy: false })
        .custom((value, { req }) => {
            // Si no hay puntuación, está bien (para sugerencias)
            if (value === null || value === undefined || value === '') {
                return true;
            }
            // Si hay puntuación, debe ser válida
            if (!Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 5) {
                throw new Error('La puntuación debe ser entre 1 y 5');
            }
            return true;
        })
];

const validateId = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('ID inválido')
];

const validateReaction = [
    body('tipo')
        .isIn(['like', 'dislike'])
        .withMessage('Tipo de reacción inválido')
];

// 🆕 VALIDACIÓN PARA RESPUESTAS
const validateReply = [
    body('contenido')
        .trim()
        .isLength({ min: 5, max: 1000 })
        .withMessage('La respuesta debe tener entre 5 y 1000 caracteres')
];

const validateCommentId = [
    param('comentario_id')
        .isInt({ min: 1 })
        .withMessage('ID de comentario inválido')
];

const validateReplyId = [
    param('reply_id')
        .isInt({ min: 1 })
        .withMessage('ID de respuesta inválido')
];

// ==================== RUTAS ESPECÍFICAS PRIMERO ====================

/**
 * @route   GET /api/comments/user/my-comments
 * @desc    Obtener comentarios del usuario actual (SIN reacciones)
 * @access  Private
 */
router.get('/user/my-comments', authenticateToken, commentController.getMyComments);

/**
 * @route   GET /api/comments/user/my-comments-with-reactions
 * @desc    Obtener comentarios del usuario actual CON reacciones
 * @access  Private
 */
router.get('/user/my-comments-with-reactions', authenticateToken, commentController.getMyCommentsWithReactions);

/**
 * @route   GET /api/comments/suggestions
 * @desc    Obtener sugerencias del sistema (SIN reacciones)
 * @access  Public
 */
router.get('/suggestions', commentController.getSystemFeedback);

/**
 * @route   GET /api/comments/suggestions-with-reactions
 * @desc    Obtener sugerencias del sistema CON reacciones
 * @access  Public (pero con reacciones del usuario si está logueado)
 */
router.get('/suggestions-with-reactions', commentController.getSystemFeedbackWithReactions);

/**
 * @route   GET /api/comments/movie/:pelicula_id
 * @desc    Obtener comentarios de una película (SIN reacciones)
 * @access  Public
 */
router.get('/movie/:pelicula_id', commentController.getByMovie);

/**
 * @route   GET /api/comments/movie/:pelicula_id/with-reactions
 * @desc    Obtener comentarios de una película CON reacciones
 * @access  Public (pero con reacciones del usuario si está logueado)
 */
router.get('/movie/:pelicula_id/with-reactions', commentController.getByMovieWithReactions);

// ==================== 🆕 RUTAS DE RESPUESTAS ====================

/**
 * @route   POST /api/comments/:comentario_id/replies
 * @desc    Crear respuesta a un comentario
 * @access  Private
 */
router.post('/:comentario_id/replies', 
    authenticateToken,
    validateCommentId,
    validateReply,
    commentController.createReply
);

/**
 * @route   GET /api/comments/:comentario_id/replies
 * @desc    Obtener respuestas de un comentario
 * @access  Public
 */
router.get('/:comentario_id/replies', 
    validateCommentId,
    commentController.getReplies
);

/**
 * @route   DELETE /api/comments/replies/:reply_id
 * @desc    Eliminar una respuesta
 * @access  Private (solo el autor)
 */
router.delete('/replies/:reply_id', 
    authenticateToken,
    validateReplyId,
    commentController.deleteReply
);

// ==================== RUTAS ADMIN ESPECÍFICAS ====================

/**
 * @route   GET /api/comments/admin/all
 * @desc    Obtener todos los comentarios (admin)
 * @access  Admin
 */
router.get('/admin/all', authenticateToken, requireAdmin, commentController.getAllForAdmin);

/**
 * @route   PUT /api/comments/admin/:id/status
 * @desc    Cambiar estado del comentario
 * @access  Admin
 */
router.put('/admin/:id/status', 
    authenticateToken, 
    requireAdmin,
    validateId,
    [body('estado').isIn(['activo', 'oculto', 'moderacion', 'rechazado']).withMessage('Estado inválido')],
    commentController.updateStatus
);

/**
 * @route   PUT /api/comments/admin/:id/featured
 * @desc    Destacar/quitar destaque de comentario
 * @access  Admin
 */
router.put('/admin/:id/featured', 
    authenticateToken, 
    requireAdmin,
    validateId,
    commentController.toggleFeatured
);

// ==================== RUTAS DE REACCIONES ====================

/**
 * @route   POST /api/comments/:id/reactions
 * @desc    Agregar o cambiar reacción a comentario
 * @access  Private
 */
router.post('/:id/reactions', 
    authenticateToken,
    validateId,
    validateReaction,
    commentController.addReaction
);

/**
 * @route   GET /api/comments/:id/reactions
 * @desc    Obtener estadísticas de reacciones de un comentario
 * @access  Public (pero con reacción del usuario si está logueado)
 */
router.get('/:id/reactions', validateId, commentController.getReactionStats);

// ==================== RUTAS GENERALES ====================

/**
 * @route   POST /api/comments
 * @desc    Crear nuevo comentario
 * @access  Private
 */
router.post('/', authenticateToken, validateComment, commentController.create);

/**
 * @route   GET /api/comments/:id
 * @desc    Obtener comentario por ID
 * @access  Private
 */
router.get('/:id', authenticateToken, validateId, commentController.getById);

/**
 * @route   PUT /api/comments/:id
 * @desc    Actualizar comentario
 * @access  Private (solo el autor)
 */
router.put('/:id', authenticateToken, validateId, validateUpdate, commentController.update);

/**
 * @route   DELETE /api/comments/:id
 * @desc    Eliminar comentario
 * @access  Private (solo el autor)
 */
router.delete('/:id', authenticateToken, validateId, commentController.delete);

module.exports = router;
// backend/src/controllers/comments/commentController.js - CON RESPUESTAS
const Comment = require('../../models/Comment');
const { validationResult } = require('express-validator');

class CommentController {
    
    // ==================== MÉTODOS PÚBLICOS ====================

    /**
     * Crear nuevo comentario
     */
    async create(req, res) {
        try {
            if (!req.user || !req.user.id) {
                console.error('❌ Usuario no autenticado:', {
                    hasReqUser: !!req.user,
                    userId: req.user?.id,
                    headers: req.headers.authorization ? 'Present' : 'Missing'
                });
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no autenticado'
                });
            }

            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos inválidos',
                    errors: errors.array()
                });
            }

            const { tipo, pelicula_id, titulo, contenido, puntuacion } = req.body;
            const usuario_id = req.user.id;

            console.log('📝 Datos del comentario:', {
                usuario_id,
                tipo,
                pelicula_id,
                titulo: titulo?.substring(0, 50),
                puntuacion
            });

            if (tipo === 'pelicula' && (!puntuacion || puntuacion < 1 || puntuacion > 5)) {
                return res.status(400).json({
                    success: false,
                    message: 'Las reseñas de películas requieren puntuación entre 1 y 5 estrellas'
                });
            }

            if (tipo === 'pelicula') {
                const hasCommented = await Comment.hasUserCommented(usuario_id, pelicula_id);
                if (hasCommented) {
                    return res.status(400).json({
                        success: false,
                        message: 'Ya has comentado esta película. Puedes editar tu comentario existente.'
                    });
                }
            }

            const comentarioData = {
                usuario_id,
                tipo,
                pelicula_id: tipo === 'pelicula' ? pelicula_id : null,
                titulo,
                contenido,
                puntuacion: tipo === 'pelicula' ? puntuacion : null
            };

            const nuevoComentario = await Comment.create(comentarioData);

            res.status(201).json({
                success: true,
                message: 'Comentario creado exitosamente',
                data: nuevoComentario
            });

        } catch (error) {
            console.error('Error al crear comentario:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    /**
     * 🆕 CREAR RESPUESTA A COMENTARIO
     */
    async createReply(req, res) {
        try {
            if (!req.user || !req.user.id) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no autenticado'
                });
            }

            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos inválidos',
                    errors: errors.array()
                });
            }

            const { comentario_id } = req.params;
            const { contenido } = req.body;
            const usuario_id = req.user.id;

            console.log('💬 Creando respuesta:', {
                comentario_id,
                usuario_id,
                contenido: contenido?.substring(0, 50)
            });

            // Verificar que el comentario padre existe
            const comentarioPadre = await Comment.findById(comentario_id);
            if (!comentarioPadre) {
                return res.status(404).json({
                    success: false,
                    message: 'Comentario no encontrado'
                });
            }

            const nuevaRespuesta = await Comment.createReply({
                comentario_id: parseInt(comentario_id),
                usuario_id,
                contenido
            });

            res.status(201).json({
                success: true,
                message: 'Respuesta creada exitosamente',
                data: nuevaRespuesta
            });

        } catch (error) {
            console.error('Error al crear respuesta:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    /**
     * 🆕 OBTENER RESPUESTAS DE UN COMENTARIO
     */
    async getReplies(req, res) {
        try {
            const { comentario_id } = req.params;
            const { page = 1, limit = 10 } = req.query;
            
            const offset = (page - 1) * limit;
            const respuestas = await Comment.getReplies(comentario_id, parseInt(limit), offset);

            res.json({
                success: true,
                data: {
                    respuestas,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: respuestas.length
                    }
                }
            });

        } catch (error) {
            console.error('Error al obtener respuestas:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    /**
     * 🆕 ELIMINAR RESPUESTA
     */
    async deleteReply(req, res) {
        try {
            if (!req.user || !req.user.id) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no autenticado'
                });
            }

            const { reply_id } = req.params;
            const usuario_id = req.user.id;

            const respuestaEliminada = await Comment.deleteReply(reply_id, usuario_id);

            if (!respuestaEliminada) {
                return res.status(404).json({
                    success: false,
                    message: 'Respuesta no encontrada o no tienes permisos para eliminarla'
                });
            }

            res.json({
                success: true,
                message: 'Respuesta eliminada exitosamente'
            });

        } catch (error) {
            console.error('Error al eliminar respuesta:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // ==================== MÉTODOS EXISTENTES (sin cambios) ====================

    async getByMovie(req, res) {
        try {
            const { pelicula_id } = req.params;
            const { page = 1, limit = 20 } = req.query;
            
            const offset = (page - 1) * limit;
            const comentarios = await Comment.getByMovie(pelicula_id, parseInt(limit), offset);

            let stats;
            try {
                stats = await Comment.getSimpleMovieStats(pelicula_id);
            } catch (error) {
                console.error('❌ Error en getSimpleMovieStats:', error);
                stats = {
                    total_comentarios: 0,
                    puntuacion_promedio: 0,
                    distribucion_puntuaciones: {
                        '5_estrellas': 0,
                        '4_estrellas': 0,
                        '3_estrellas': 0,
                        '2_estrellas': 0,
                        '1_estrella': 0
                    }
                };
            }

            res.json({
                success: true,
                data: {
                    comentarios,
                    estadisticas: stats,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: stats.total_comentarios || 0
                    }
                }
            });

        } catch (error) {
            console.error('Error al obtener comentarios de película:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    async getByMovieWithReactions(req, res) {
        try {
            const { pelicula_id } = req.params;
            const { page = 1, limit = 20 } = req.query;
            const usuario_id = req.user?.id;
            
            const offset = (page - 1) * limit;
            
            // 🔥 ACTUALIZADO: Ahora incluye conteo de respuestas
            const comentarios = await Comment.getByMovieWithReactionsAndReplies(
                pelicula_id, 
                usuario_id, 
                parseInt(limit), 
                offset
            );

            let stats;
            try {
                stats = await Comment.getSimpleMovieStats(pelicula_id);
            } catch (error) {
                console.error('❌ Error con función de stats:', error);
                stats = await Comment.getSimpleMovieStats(pelicula_id);
            }

            res.json({
                success: true,
                data: {
                    comentarios,
                    estadisticas: stats,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: stats.total_comentarios || 0
                    }
                }
            });

        } catch (error) {
            console.error('Error al obtener comentarios de película:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    async getMyCommentsWithReactions(req, res) {
        try {
            if (!req.user || !req.user.id) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no autenticado'
                });
            }

            const usuario_id = req.user.id;
            const { page = 1, limit = 20 } = req.query;
            
            const offset = (page - 1) * limit;
            const comentarios = await Comment.getByUserWithReactions(usuario_id, parseInt(limit), offset);

            res.json({
                success: true,
                data: {
                    comentarios,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: comentarios.length
                    }
                }
            });

        } catch (error) {
            console.error('Error al obtener comentarios del usuario:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    async getSystemFeedbackWithReactions(req, res) {
        try {
            const { page = 1, limit = 50 } = req.query;
            const usuario_id = req.user?.id;
            const offset = (page - 1) * limit;
            
            const sugerencias = await Comment.getSystemFeedbackWithReactions(
                usuario_id,
                parseInt(limit), 
                offset
            );

            res.json({
                success: true,
                data: {
                    sugerencias,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: sugerencias.length
                    }
                }
            });

        } catch (error) {
            console.error('Error al obtener sugerencias:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    async getById(req, res) {
        try {
            const { id } = req.params;
            const comentario = await Comment.findById(id);

            if (!comentario) {
                return res.status(404).json({
                    success: false,
                    message: 'Comentario no encontrado'
                });
            }

            res.json({
                success: true,
                data: comentario
            });

        } catch (error) {
            console.error('Error al obtener comentario:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    async getMyComments(req, res) {
        try {
            if (!req.user || !req.user.id) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no autenticado'
                });
            }

            const usuario_id = req.user.id;
            const { page = 1, limit = 20 } = req.query;
            
            const offset = (page - 1) * limit;
            const comentarios = await Comment.getByUser(usuario_id, parseInt(limit), offset);

            res.json({
                success: true,
                data: {
                    comentarios,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: comentarios.length
                    }
                }
            });

        } catch (error) {
            console.error('Error al obtener comentarios del usuario:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    async getSystemFeedback(req, res) {
        try {
            const { page = 1, limit = 50 } = req.query;
            const offset = (page - 1) * limit;
            
            const sugerencias = await Comment.getSystemFeedback(parseInt(limit), offset);

            res.json({
                success: true,
                data: {
                    sugerencias,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: sugerencias.length
                    }
                }
            });

        } catch (error) {
            console.error('Error al obtener sugerencias:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    async update(req, res) {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no autenticado'
            });
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('❌ Errores de validación:', errors.array());
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errors: errors.array()
            });
        }

        const { id } = req.params;
        const { titulo, contenido, puntuacion } = req.body;
        const usuario_id = req.user.id;

        console.log('📝 Actualizando comentario:', {
            id,
            usuario_id,
            titulo: titulo?.substring(0, 30),
            contenido: contenido?.substring(0, 50),
            puntuacion,
            puntuacionType: typeof puntuacion
        });

        // 🔥 OBTENER EL COMENTARIO EXISTENTE PARA VERIFICAR TIPO
        const comentarioExistente = await Comment.findById(id);
        if (!comentarioExistente) {
            return res.status(404).json({
                success: false,
                message: 'Comentario no encontrado'
            });
        }

        // 🔥 VERIFICAR PERMISOS DE EDICIÓN
        if (comentarioExistente.usuario_id !== usuario_id) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para editar este comentario'
            });
        }

        // 🔥 PREPARAR DATOS DE ACTUALIZACIÓN SEGÚN EL TIPO
        const updateData = {
            titulo,
            contenido
        };

        // 🔥 SOLO AGREGAR PUNTUACIÓN SI ES PELÍCULA
        if (comentarioExistente.tipo === 'pelicula') {
            // Para películas, la puntuación es requerida
            if (!puntuacion || puntuacion < 1 || puntuacion > 5) {
                return res.status(400).json({
                    success: false,
                    message: 'Las reseñas de películas requieren puntuación entre 1 y 5 estrellas'
                });
            }
            updateData.puntuacion = puntuacion;
        } else {
            // Para sugerencias/sistema, puntuación siempre es null
            updateData.puntuacion = null;
        }

        console.log('🔄 Datos finales para actualización:', updateData);

        const comentarioActualizado = await Comment.update(id, usuario_id, updateData);

        if (!comentarioActualizado) {
            return res.status(404).json({
                success: false,
                message: 'Error al actualizar el comentario'
            });
        }

        res.json({
            success: true,
            message: 'Comentario actualizado exitosamente',
            data: comentarioActualizado
        });

    } catch (error) {
        console.error('❌ Error al actualizar comentario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

    async delete(req, res) {
        try {
            if (!req.user || !req.user.id) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no autenticado'
                });
            }

            const { id } = req.params;
            const usuario_id = req.user.id;

            const comentarioEliminado = await Comment.delete(id, usuario_id);

            if (!comentarioEliminado) {
                return res.status(404).json({
                    success: false,
                    message: 'Comentario no encontrado o no tienes permisos para eliminarlo'
                });
            }

            res.json({
                success: true,
                message: 'Comentario eliminado exitosamente'
            });

        } catch (error) {
            console.error('Error al eliminar comentario:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    async addReaction(req, res) {
        try {
            if (!req.user || !req.user.id) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no autenticado'
                });
            }

            const { id: comentario_id } = req.params;
            const { tipo } = req.body;
            const usuario_id = req.user.id;

            if (!tipo || !['like', 'dislike'].includes(tipo)) {
                return res.status(400).json({
                    success: false,
                    message: 'Tipo de reacción inválido. Debe ser "like" o "dislike"'
                });
            }

            const comentario = await Comment.findById(comentario_id);
            if (!comentario) {
                return res.status(404).json({
                    success: false,
                    message: 'Comentario no encontrado'
                });
            }

            const reactionResult = await Comment.addReaction(comentario_id, usuario_id, tipo);
            const stats = await Comment.getReactionStats(comentario_id);

            res.json({
                success: true,
                message: `Reacción ${reactionResult.action === 'removed' ? 'eliminada' : 'agregada'} exitosamente`,
                data: {
                    action: reactionResult.action,
                    reaction: reactionResult.reaction,
                    stats: stats
                }
            });

        } catch (error) {
            console.error('Error al agregar reacción:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    async getReactionStats(req, res) {
        try {
            const { id: comentario_id } = req.params;
            const usuario_id = req.user?.id;

            const stats = await Comment.getReactionStats(comentario_id); 
            let userReaction = null;

            if (usuario_id) {
                userReaction = await Comment.getUserReaction(comentario_id, usuario_id);
            }

            res.json({
                success: true,
                data: {
                    ...stats,
                    userReaction
                }
            });

        } catch (error) {
            console.error('Error al obtener estadísticas de reacciones:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // ==================== MÉTODOS ADMIN ====================

    async getAllForAdmin(req, res) {
        try {
            const { tipo, estado, usuario_id, page = 1, limit = 50 } = req.query;
            const filters = {};
            
            if (tipo) filters.tipo = tipo;
            if (estado) filters.estado = estado;
            if (usuario_id) filters.usuario_id = usuario_id;

            const offset = (page - 1) * limit;
            const comentarios = await Comment.getAllForAdmin(filters, parseInt(limit), offset);

            let stats;
            try {
                stats = await Comment.getStats();
            } catch (error) {
                console.error('❌ Error en getStats, usando fallback:', error);
                stats = { total_comentarios: comentarios.length };
            }

            res.json({
                success: true,
                data: {
                    comentarios,
                    estadisticas: stats,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: comentarios.length
                    }
                }
            });

        } catch (error) {
            console.error('Error al obtener comentarios (admin):', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const { estado } = req.body;

            if (!['activo', 'oculto', 'moderacion', 'rechazado'].includes(estado)) {
                return res.status(400).json({
                    success: false,
                    message: 'Estado inválido'
                });
            }

            const comentarioActualizado = await Comment.updateStatus(id, estado);

            if (!comentarioActualizado) {
                return res.status(404).json({
                    success: false,
                    message: 'Comentario no encontrado'
                });
            }

            res.json({
                success: true,
                message: `Estado cambiado a: ${estado}`,
                data: comentarioActualizado
            });

        } catch (error) {
            console.error('Error al cambiar estado del comentario:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    async toggleFeatured(req, res) {
        try {
            const { id } = req.params;

            const comentarioActualizado = await Comment.toggleFeatured(id);

            if (!comentarioActualizado) {
                return res.status(404).json({
                    success: false,
                    message: 'Comentario no encontrado'
                });
            }

            const mensaje = comentarioActualizado.es_destacado 
                ? 'Comentario destacado' 
                : 'Destaque removido';

            res.json({
                success: true,
                message: mensaje,
                data: comentarioActualizado
            });

        } catch (error) {
            console.error('Error al cambiar destaque del comentario:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
}

// Crear instancia y exportar métodos
const commentController = new CommentController();

module.exports = {
    // Métodos básicos
    create: commentController.create.bind(commentController),
    getById: commentController.getById.bind(commentController),
    getByMovie: commentController.getByMovie.bind(commentController),
    getMyComments: commentController.getMyComments.bind(commentController),
    getSystemFeedback: commentController.getSystemFeedback.bind(commentController),
    update: commentController.update.bind(commentController),
    delete: commentController.delete.bind(commentController),
    
    // Métodos con reacciones
    getByMovieWithReactions: commentController.getByMovieWithReactions.bind(commentController),
    getMyCommentsWithReactions: commentController.getMyCommentsWithReactions.bind(commentController),
    getSystemFeedbackWithReactions: commentController.getSystemFeedbackWithReactions.bind(commentController),
    addReaction: commentController.addReaction.bind(commentController),
    getReactionStats: commentController.getReactionStats.bind(commentController),
    
    // 🆕 Métodos de respuestas
    createReply: commentController.createReply.bind(commentController),
    getReplies: commentController.getReplies.bind(commentController),
    deleteReply: commentController.deleteReply.bind(commentController),
    
    // Métodos admin
    getAllForAdmin: commentController.getAllForAdmin.bind(commentController),
    updateStatus: commentController.updateStatus.bind(commentController),
    toggleFeatured: commentController.toggleFeatured.bind(commentController)
};
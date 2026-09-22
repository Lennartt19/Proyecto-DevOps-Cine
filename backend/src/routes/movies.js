// routes/movies.js - ORDEN CORREGIDO
const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const recommendationsController = require('../controllers/movies/recommendationsController');
const {
  getAllMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
  getGenres,
  getPopularMovies,
  getMovieStats,
  searchMovies
} = require('../controllers/movies/movieController');

// ✅ RUTAS ESPECÍFICAS PRIMERO (antes de /:id)

// GET /api/movies/search?q=termino - Buscar películas
router.get('/search', searchMovies);

// GET /api/movies/genres - Obtener todos los géneros disponibles
router.get('/genres', getGenres);

// GET /api/movies/popular - Obtener películas más populares
router.get('/popular', getPopularMovies);

// 🎯 NUEVA: GET /api/movies/recommendations - Obtener recomendaciones (DEBE IR ANTES DE /:id)
router.get('/recommendations', authenticateToken, recommendationsController.getUserRecommendations);

// ✅ RUTAS GENERALES DESPUÉS

// GET /api/movies - Obtener todas las películas (con filtros opcionales)
router.get('/', getAllMovies);

// GET /api/movies/:id - Obtener película por ID
router.get('/:id', getMovieById);

// GET /api/movies/:id/stats - Obtener estadísticas de una película
router.get('/:id/stats', getMovieStats);

// Rutas para administradores (crear/editar/eliminar exigen login + rol admin,
// igual que bar, funciones y próximos estrenos)
// POST /api/movies - Crear nueva película
router.post('/', authenticateToken, requireAdmin, createMovie);

// PUT /api/movies/:id - Actualizar película
router.put('/:id', authenticateToken, requireAdmin, updateMovie);

// DELETE /api/movies/:id - Eliminar película (soft delete)
router.delete('/:id', authenticateToken, requireAdmin, deleteMovie);

module.exports = router;
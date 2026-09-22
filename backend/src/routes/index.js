// backend/src/routes/index.js
const express = require('express');
const router = express.Router();

// Ruta de prueba inicial
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Bienvenido a ParkyFilms API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    // 🆕 AGREGADO: Lista de endpoints disponibles
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      movies: '/api/movies',
      functions: '/api/functions',
      favorites: '/api/favorites',
      history: '/api/history',
      comingSoon: '/api/coming-soon',
      bar: '/api/bar',
      orders: '/api/orders',
      points: '/api/points',
      rewards: '/api/rewards',
      admin: '/api/admin',
      comments: '/api/comments' // 🆕 NUEVO
    }
  });
});

// Ruta de prueba para la base de datos
router.get('/test-db', async (req, res, next) => {
  try {
    const { query } = require('../config/database');
    
    // Probar la conexión con una consulta simple
    const result = await query('SELECT NOW() as servidor_tiempo, version() as version_postgresql');
    
    res.json({
      success: true,
      message: '✅ Conexión a base de datos exitosa',
      data: {
        servidor_tiempo: result.rows[0].servidor_tiempo,
        version_postgresql: result.rows[0].version_postgresql.split(' ')[0] + ' ' + result.rows[0].version_postgresql.split(' ')[1]
      }
    });
  } catch (error) {
    next(error);
  }
});

// 🆕 NUEVA RUTA: Health check para monitoreo
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Parky Films API funcionando correctamente',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      auth: 'OK',
      movies: 'OK',
      functions: 'OK',
      favorites: 'OK',
      history: 'OK',
      comingSoon: 'OK',
      bar: 'OK',
      orders: 'OK',
      points: 'OK',
      rewards: 'OK',
      admin: 'OK',
      comments: 'OK' // 🆕 NUEVO
    }
  });
});

// ==================== RUTAS DE MÓDULOS EXISTENTES ====================
// Rutas de autenticación
router.use('/auth', require('./auth'));

// Rutas de usuarios 
router.use('/users', require('./users'));

// Rutas de películas
router.use('/movies', require('./movies'));

// Rutas de funciones de cine
router.use('/functions', require('./functions'));

// Rutas de favoritas
router.use('/favorites', require('./favorites'));

// Rutas de historial
router.use('/history', require('./history'));

// Rutas de próximos estrenos
router.use('/coming-soon', require('./comingSoon'));

// Rutas de productos del bar
router.use('/bar', require('./bar'));

// ==================== RUTAS DE ÓRDENES Y PUNTOS ====================
// Rutas de órdenes y checkout
router.use('/orders', require('./orders'));

// Rutas de puntos y referidos
router.use('/points', require('./points'));

// ==================== RUTAS DE RECOMPENSAS ====================
// Rutas de recompensas y canjes
router.use('/rewards', require('./rewards'));

// ==================== RUTAS DE ADMINISTRACIÓN ====================
// Rutas de administración
router.use('/admin', require('./admin'));
router.use('/reports', require('./reports'));
router.use('/logs', require('./logs'));

// ==================== 🆕 NUEVA RUTA - SISTEMA DE COMENTARIOS ====================
// 🆕 NUEVA - Rutas de comentarios y feedback
router.use('/comments', require('./comments'));

// ==================== MANEJO DE RUTAS NO ENCONTRADAS ====================
// Middleware para rutas no encontradas
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado',
    requested_url: req.originalUrl,
    method: req.method,
    available_endpoints: [
      '/api',
      '/api/health',
      '/api/test-db',
      '/api/auth',
      '/api/users',
      '/api/movies',
      '/api/functions',
      '/api/favorites',
      '/api/history',
      '/api/coming-soon',
      '/api/bar',
      '/api/orders',
      '/api/points',
      '/api/rewards',
      '/api/admin',
      '/api/comments' // 🆕 NUEVO
    ],
    suggestion: 'Verifica la URL y el método HTTP'
  });
});

module.exports = router;
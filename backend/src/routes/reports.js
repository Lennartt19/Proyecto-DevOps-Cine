// src/routes/reports.js
const express = require('express');
const router = express.Router();
const {
    getVentasReport,
    getPeliculasReport,
    getBarReport,
    getUsuariosReport,
    getActividadReciente,
    getReporteEjecutivo,
    getDashboardStats,
    getReporteCombinado
} = require('../controllers/admin/reportsController');

const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

// Todas las rutas requieren autenticación y permisos de admin
router.use(authenticateToken);
router.use(requireAdmin);

// ==================== REPORTES ESPECÍFICOS ====================

// GET /api/reports/ventas - Reporte de ventas
// Query params: fechaInicio, fechaFin, formato (json/pdf)
router.get('/ventas', getVentasReport);

// GET /api/reports/peliculas - Reporte de películas populares
// Query params: limit, formato (json/pdf)
router.get('/peliculas', getPeliculasReport);

// GET /api/reports/bar - Reporte del bar
// Query params: limit, formato (json/pdf)
router.get('/bar', getBarReport);

// GET /api/reports/usuarios - Reporte de usuarios
// Query params: limit, formato (json/pdf)
router.get('/usuarios', getUsuariosReport);

// GET /api/reports/actividad - Actividad reciente
// Query params: limit
router.get('/actividad', getActividadReciente);

// ==================== REPORTES COMBINADOS ====================

// GET /api/reports/combinado - Reporte combinado (Cine + Bar)
// Query params: formato (json/pdf)
router.get('/combinado', getReporteCombinado);

// GET /api/reports/ejecutivo - Reporte ejecutivo completo
// Query params: formato (json/pdf)
router.get('/ejecutivo', getReporteEjecutivo);

// GET /api/reports/dashboard - Estadísticas para dashboard (reemplaza admin/stats)
router.get('/dashboard', getDashboardStats);

module.exports = router;
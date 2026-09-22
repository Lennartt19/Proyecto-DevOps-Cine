// src/controllers/admin/reportsController.js - VERSIÓN CORREGIDA
const Reports = require('../../models/Reports');
const pdfService = require('../../services/pdfService');
const { query } = require('../../config/database');

/**
 * Obtener reporte de ventas
 */
const getVentasReport = async (req, res) => {
    try {
        const { fechaInicio, fechaFin, formato } = req.query;

        const reporte = await Reports.getVentasReport(fechaInicio, fechaFin);

        // Si se solicita PDF
        if (formato === 'pdf') {
            const pdfBuffer = await pdfService.generateVentasReportPDF(reporte);
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="reporte-ventas-${new Date().toISOString().split('T')[0]}.pdf"`);
            return res.send(pdfBuffer);
        }

        res.json({
            success: true,
            data: reporte,
            meta: {
                generadoEn: new Date().toISOString(),
                formato: formato || 'json',
                periodo: reporte.periodo
            }
        });

    } catch (error) {
        console.error('Error en getVentasReport:', error);
        res.status(500).json({
            success: false,
            error: 'Error al generar reporte de ventas'
        });
    }
};

/**
 * Obtener reporte de películas populares
 */
const getPeliculasReport = async (req, res) => {
    try {
        const { limit, formato } = req.query;

        const reporte = await Reports.getPeliculasPopularesReport(parseInt(limit) || 10);

        // Si se solicita PDF
        if (formato === 'pdf') {
            const pdfBuffer = await pdfService.generatePeliculasReportPDF(reporte);
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="reporte-peliculas-${new Date().toISOString().split('T')[0]}.pdf"`);
            return res.send(pdfBuffer);
        }

        res.json({
            success: true,
            data: reporte,
            meta: {
                generadoEn: new Date().toISOString(),
                totalPeliculas: reporte.estadisticas.totalPeliculas
            }
        });

    } catch (error) {
        console.error('Error en getPeliculasReport:', error);
        res.status(500).json({
            success: false,
            error: 'Error al generar reporte de películas'
        });
    }
};

/**
 * Obtener reporte del bar
 */
const getBarReport = async (req, res) => {
    try {
        const { limit, formato } = req.query;

        const reporte = await Reports.getBarReport(parseInt(limit) || 15);

        // Si se solicita PDF
        if (formato === 'pdf') {
            const pdfBuffer = await pdfService.generateBarReportPDF(reporte);
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="reporte-bar-${new Date().toISOString().split('T')[0]}.pdf"`);
            return res.send(pdfBuffer);
        }

        res.json({
            success: true,
            data: reporte,
            meta: {
                generadoEn: new Date().toISOString(),
                totalProductos: reporte.estadisticas.totalProductos
            }
        });

    } catch (error) {
        console.error('Error en getBarReport:', error);
        res.status(500).json({
            success: false,
            error: 'Error al generar reporte del bar'
        });
    }
};

/**
 * Obtener reporte de usuarios
 */
const getUsuariosReport = async (req, res) => {
    try {
        const { limit, formato } = req.query;

        const reporte = await Reports.getUsuariosReport(parseInt(limit) || 20);

        // Si se solicita PDF
        if (formato === 'pdf') {
            const pdfBuffer = await pdfService.generateUsuariosReportPDF(reporte);
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="reporte-usuarios-${new Date().toISOString().split('T')[0]}.pdf"`);
            return res.send(pdfBuffer);
        }

        res.json({
            success: true,
            data: reporte,
            meta: {
                generadoEn: new Date().toISOString(),
                totalUsuarios: reporte.estadisticas.totalUsuarios
            }
        });

    } catch (error) {
        console.error('Error en getUsuariosReport:', error);
        res.status(500).json({
            success: false,
            error: 'Error al generar reporte de usuarios'
        });
    }
};

/**
 * Obtener actividad reciente
 */
const getActividadReciente = async (req, res) => {
    try {
        const { limit } = req.query;

        const actividad = await Reports.getActividadReciente(parseInt(limit) || 20);

        res.json({
            success: true,
            data: actividad,
            meta: {
                generadoEn: new Date().toISOString(),
                totalActividades: actividad.total
            }
        });

    } catch (error) {
        console.error('Error en getActividadReciente:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener actividad reciente'
        });
    }
};

/**
 * Generar reporte ejecutivo completo
 */
const getReporteEjecutivo = async (req, res) => {
    try {
        const { formato } = req.query;

        const reporte = await Reports.getReporteEjecutivo();

        // Si se solicita PDF
        if (formato === 'pdf') {
            const pdfBuffer = await pdfService.generateReporteEjecutivoPDF(reporte);
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="reporte-ejecutivo-${new Date().toISOString().split('T')[0]}.pdf"`);
            return res.send(pdfBuffer);
        }

        res.json({
            success: true,
            data: reporte,
            meta: {
                generadoEn: reporte.timestamp,
                tipo: 'reporte_ejecutivo',
                secciones: ['ventas', 'peliculas', 'bar', 'usuarios', 'actividad']
            }
        });

    } catch (error) {
        console.error('Error en getReporteEjecutivo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al generar reporte ejecutivo'
        });
    }
};

/**
 * 🔧 CORREGIDO: Endpoint para generar reporte combinado (Cine + Bar)
 */
const getReporteCombinado = async (req, res) => {
    try {
        const { formato } = req.query;

        // Obtener datos de películas y bar
        const [peliculasData, barData] = await Promise.all([
            Reports.getPeliculasPopularesReport(10),
            Reports.getBarReport(10)
        ]);

        // 🔧 OBTENER INGRESOS REALES SEPARADOS POR CATEGORÍA
        const ingresosQuery = await query(`
            WITH ingresos_peliculas AS (
                SELECT COALESCE(SUM(oip.subtotal), 0) as total_peliculas
                FROM orden_items_peliculas oip
                JOIN ordenes o ON oip.orden_id = o.id
                WHERE o.estado = 'completada'
            ),
            ingresos_bar AS (
                SELECT COALESCE(SUM(oib.subtotal), 0) as total_bar
                FROM orden_items_bar oib
                JOIN ordenes o ON oib.orden_id = o.id
                WHERE o.estado = 'completada'
            ),
            ingresos_totales AS (
                SELECT COALESCE(SUM(total), 0) as total_general
                FROM ordenes 
                WHERE estado = 'completada'
            )
            SELECT 
                ip.total_peliculas,
                ib.total_bar,
                it.total_general
            FROM ingresos_peliculas ip, ingresos_bar ib, ingresos_totales it
        `);

        const ingresos = ingresosQuery.rows[0];
        const totalIngresosPeliculas = parseFloat(ingresos.total_peliculas);
        const totalIngresosBar = parseFloat(ingresos.total_bar);
        const totalIngresosReales = parseFloat(ingresos.total_general);

        const reporteCombinado = {
            timestamp: new Date().toISOString(),
            peliculas: peliculasData,
            bar: barData,
            resumenCombinado: {
                totalIngresosPeliculas: totalIngresosPeliculas, // 🔧 Ingresos reales de películas
                totalIngresosBar: totalIngresosBar, // 🔧 Ingresos reales del bar
                ingresosTotales: totalIngresosReales, // 🔧 Total real de ingresos
                entradasVendidas: peliculasData.estadisticas.totalEntradas,
                productosVendidos: barData.estadisticas.totalVentas,
                peliculasActivas: peliculasData.estadisticas.totalPeliculas, // 🔧 Ya incluye todas las películas
                productosActivos: barData.estadisticas.totalProductos // 🔧 Ya incluye todos los productos
            }
        };

        // Si se solicita PDF
        if (formato === 'pdf') {
            const pdfBuffer = await pdfService.generateReporteCombinado(reporteCombinado);
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="reporte-combinado-${new Date().toISOString().split('T')[0]}.pdf"`);
            return res.send(pdfBuffer);
        }

        res.json({
            success: true,
            data: reporteCombinado,
            meta: {
                generadoEn: reporteCombinado.timestamp,
                tipo: 'reporte_combinado',
                secciones: ['peliculas', 'bar', 'resumen'],
                debug: {
                    ingresosPeliculas: totalIngresosPeliculas,
                    ingresosBar: totalIngresosBar,
                    ingresosReales: totalIngresosReales
                }
            }
        });

    } catch (error) {
        console.error('Error en getReporteCombinado:', error);
        res.status(500).json({
            success: false,
            error: 'Error al generar reporte combinado'
        });
    }
};

/**
 * 🔧 CORREGIDO: Obtener estadísticas del dashboard usando vistas
 */
const getDashboardStats = async (req, res) => {
    try {
        // Usar las vistas para obtener datos reales
        const [ventasHoy, peliculasPopulares, barStats, usuariosStats, actividad] = await Promise.all([
            Reports.getVentasReport(new Date().toISOString().split('T')[0], new Date().toISOString().split('T')[0]),
            Reports.getPeliculasPopularesReport(5),
            Reports.getBarReport(5),
            Reports.getUsuariosReport(5),
            Reports.getActividadReciente(8)
        ]);

        // 🔧 OBTENER TOTALES REALES ADICIONALES
        const totalesQuery = await query(`
            SELECT 
                (SELECT COUNT(*) FROM usuarios WHERE is_active = true) as total_usuarios_activos,
                (SELECT COUNT(*) FROM peliculas WHERE activo = true) as total_peliculas_activas,
                (SELECT COUNT(*) FROM productos_bar WHERE disponible = true) as total_productos_activos,
                (SELECT COALESCE(SUM(total), 0) FROM ordenes WHERE estado = 'completada') as ingresos_totales_reales,
                (SELECT COUNT(*) FROM ordenes WHERE estado = 'completada') as ordenes_completadas
        `);

        const totales = totalesQuery.rows[0];

        // Formatear para el dashboard
        const stats = {
            totalPeliculas: parseInt(totales.total_peliculas_activas), // 🔧 Usar conteo real
            totalUsuarios: parseInt(totales.total_usuarios_activos), // 🔧 Usar conteo real
            totalVentas: parseInt(totales.ordenes_completadas), // 🔧 Usar conteo real
            ingresosMes: parseFloat(totales.ingresos_totales_reales), // 🔧 Usar ingresos reales
            usuariosActivos: parseInt(totales.total_usuarios_activos),
            ticketPromedio: ventasHoy.resumen.promedioTicket,
            
            // Películas populares
            peliculasPopulares: peliculasPopulares.peliculas.map(p => ({
                titulo: p.titulo,
                genero: p.genero,
                rating: parseFloat(p.rating) || 0,
                vistas: parseInt(p.total_entradas_vendidas) || 0
            })),

            // Géneros más populares
            generosMasPopulares: peliculasPopulares.generos.map(g => ({
                genero: g.nombre,
                cantidad: g.cantidad,
                porcentaje: parseFloat(g.porcentaje)
            })),

            // Ventas recientes (simuladas a partir de datos)
            ventasRecientes: usuariosStats.usuarios.filter(u => u.total_compras > 0).slice(0, 5).map(u => ({
                usuario: u.nombre,
                pelicula: 'Compra de entradas',
                entradas: u.total_compras,
                total: parseFloat(u.total_gastado),
                estado: 'completada',
                fecha: new Date().toISOString()
            })),

            // Actividad reciente
            actividadReciente: actividad.actividades.map(a => ({
                tipo: a.tipo,
                descripcion: a.descripcion,
                fecha: a.fecha,
                icono: a.icono,
                color: a.color
            })),

            // Stats del bar
            barStats: {
                totalProductos: parseInt(totales.total_productos_activos), // 🔧 Usar conteo real
                totalVentas: barStats.estadisticas.totalVentas,
                totalIngresos: barStats.estadisticas.totalIngresos,
                productosPopulares: barStats.productos.slice(0, 5).map(p => ({
                    nombre: p.nombre,
                    categoria: p.categoria,
                    ventas: parseInt(p.veces_vendido) || 0,
                    ingresos: parseFloat(p.ingresos_generados) || 0
                }))
            }
        };

        res.json({
            success: true,
            data: stats,
            meta: {
                fuente: 'vistas_database_corregidas',
                generadoEn: new Date().toISOString(),
                datosReales: true,
                debug: {
                    peliculasActivas: totales.total_peliculas_activas,
                    productosActivos: totales.total_productos_activos,
                    usuariosActivos: totales.total_usuarios_activos,
                    ingresosReales: totales.ingresos_totales_reales
                }
            }
        });

    } catch (error) {
        console.error('Error en getDashboardStats:', error);
        
        // Fallback con datos básicos
        res.json({
            success: true,
            data: {
                totalPeliculas: 0,
                totalUsuarios: 0,
                totalVentas: 0,
                ingresosMes: 0,
                usuariosActivos: 0,
                peliculasPopulares: [],
                ventasRecientes: [],
                generosMasPopulares: [],
                actividadReciente: []
            },
            meta: {
                fuente: 'fallback',
                error: 'Sin datos disponibles',
                datosReales: false
            }
        });
    }
};

module.exports = {
    getVentasReport,
    getPeliculasReport,
    getBarReport,
    getUsuariosReport,
    getActividadReciente,
    getReporteEjecutivo,
    getDashboardStats,
    getReporteCombinado
};
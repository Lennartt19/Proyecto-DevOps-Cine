// src/models/Reports.js - VERSIÓN CORREGIDA
const { query } = require('../config/database');

class Reports {

    /**
     * Obtener reporte de ventas usando vista_reporte_ventas
     */
    static async getVentasReport(fechaInicio = null, fechaFin = null) {
        try {
            let sql = `
                SELECT 
                    fecha,
                    total_ordenes,
                    ingresos_total,
                    subtotal_total,
                    impuestos_total,
                    ticket_promedio,
                    pagos_paypal,
                    pagos_tarjeta
                FROM vista_reporte_ventas
            `;
            
            let values = [];
            
            if (fechaInicio && fechaFin) {
                sql += ` WHERE fecha BETWEEN $1 AND $2`;
                values = [fechaInicio, fechaFin];
            }
            
            sql += ` ORDER BY fecha DESC LIMIT 30`;
            
            const result = await query(sql, values);
            
            // Calcular totales
            const totales = result.rows.reduce((acc, row) => ({
                totalOrdenes: acc.totalOrdenes + parseInt(row.total_ordenes),
                totalIngresos: acc.totalIngresos + parseFloat(row.ingresos_total || 0),
                totalSubtotal: acc.totalSubtotal + parseFloat(row.subtotal_total || 0),
                totalImpuestos: acc.totalImpuestos + parseFloat(row.impuestos_total || 0),
                promedioTicket: acc.promedioTicket + parseFloat(row.ticket_promedio || 0)
            }), {
                totalOrdenes: 0,
                totalIngresos: 0,
                totalSubtotal: 0,
                totalImpuestos: 0,
                promedioTicket: 0
            });
            
            if (result.rows.length > 0) {
                totales.promedioTicket = totales.promedioTicket / result.rows.length;
            }

            return {
                ventasPorDia: result.rows,
                resumen: totales,
                periodo: {
                    desde: fechaInicio || 'Inicio',
                    hasta: fechaFin || 'Hoy',
                    totalDias: result.rows.length
                }
            };

        } catch (error) {
            console.error('Error en getVentasReport:', error);
            throw error;
        }
    }

    /**
     * 🔧 CORREGIDO: Obtener películas populares - incluye TODAS las películas
     */
    static async getPeliculasPopularesReport(limit = 10) {
        try {
            // 🆕 CONSULTA CORREGIDA: Obtener TODAS las películas activas, no solo las vendidas
            const sql = `
                SELECT 
                    p.id,
                    p.titulo,
                    p.genero,
                    p.rating,
                    COALESCE(vpp.total_entradas_vendidas, 0) as total_entradas_vendidas,
                    COALESCE(vpp.ingresos_generados, 0) as ingresos_generados,
                    COALESCE(vpp.usuarios_unicos, 0) as usuarios_unicos,
                    COALESCE(vpp.precio_promedio, 0) as precio_promedio,
                    CASE 
                        WHEN COALESCE(vpp.total_entradas_vendidas, 0) > 100 THEN 'Muy Popular'
                        WHEN COALESCE(vpp.total_entradas_vendidas, 0) > 50 THEN 'Popular'
                        WHEN COALESCE(vpp.total_entradas_vendidas, 0) > 10 THEN 'Moderada'
                        ELSE 'Baja'
                    END as popularidad
                FROM peliculas p
                LEFT JOIN vista_peliculas_populares vpp ON p.id = vpp.id
                WHERE p.activo = true
                ORDER BY COALESCE(vpp.total_entradas_vendidas, 0) DESC, p.titulo ASC
                LIMIT $1
            `;

            const result = await query(sql, [limit]);
            
            // 🔧 CORREGIDO: Obtener el total REAL de películas activas
            const totalPeliculasQuery = await query('SELECT COUNT(*) as total FROM peliculas WHERE activo = true');
            const totalPeliculasReales = parseInt(totalPeliculasQuery.rows[0].total);
            
            // Estadísticas generales
            const estadisticas = {
                totalPeliculas: totalPeliculasReales, // 🔧 Usar el conteo real
                totalEntradas: result.rows.reduce((sum, p) => sum + (parseInt(p.total_entradas_vendidas) || 0), 0),
                totalIngresos: result.rows.reduce((sum, p) => sum + (parseFloat(p.ingresos_generados) || 0), 0),
                ratingPromedio: result.rows.length > 0 ? 
                    result.rows.reduce((sum, p) => sum + (parseFloat(p.rating) || 0), 0) / result.rows.length : 0,
                precioPromedio: result.rows.filter(p => parseFloat(p.precio_promedio) > 0).length > 0 ?
                    result.rows.reduce((sum, p) => sum + (parseFloat(p.precio_promedio) || 0), 0) / 
                    result.rows.filter(p => parseFloat(p.precio_promedio) > 0).length : 0
            };

            // Distribución por géneros
            const generos = result.rows.reduce((acc, pelicula) => {
                const genero = pelicula.genero || 'Sin género';
                if (!acc[genero]) {
                    acc[genero] = { cantidad: 0, entradas: 0, ingresos: 0 };
                }
                acc[genero].cantidad++;
                acc[genero].entradas += parseInt(pelicula.total_entradas_vendidas) || 0;
                acc[genero].ingresos += parseFloat(pelicula.ingresos_generados) || 0;
                return acc;
            }, {});

            return {
                peliculas: result.rows,
                estadisticas,
                generos: Object.entries(generos).map(([nombre, datos]) => ({
                    nombre,
                    ...datos,
                    porcentaje: estadisticas.totalEntradas > 0 ? 
                        ((datos.entradas / estadisticas.totalEntradas) * 100).toFixed(1) : 0
                })).sort((a, b) => b.entradas - a.entradas)
            };

        } catch (error) {
            console.error('Error en getPeliculasPopularesReport:', error);
            throw error;
        }
    }

    /**
     * 🔧 CORREGIDO: Obtener reporte del bar - incluye TODOS los productos
     */
    static async getBarReport(limit = 15) {
        try {
            // 🆕 CONSULTA CORREGIDA: Obtener TODOS los productos disponibles
            const sql = `
                SELECT 
                    pb.id,
                    pb.nombre,
                    pb.categoria,
                    pb.precio,
                    pb.es_combo,
                    COALESCE(vpbp.veces_vendido, 0) as veces_vendido,
                    COALESCE(vpbp.cantidad_total_vendida, 0) as cantidad_total_vendida,
                    COALESCE(vpbp.ingresos_generados, 0) as ingresos_generados,
                    COALESCE(vpbp.precio_promedio_venta, pb.precio) as precio_promedio_venta,
                    CASE 
                        WHEN COALESCE(vpbp.veces_vendido, 0) > 50 THEN 'Muy Popular'
                        WHEN COALESCE(vpbp.veces_vendido, 0) > 20 THEN 'Popular'
                        WHEN COALESCE(vpbp.veces_vendido, 0) > 5 THEN 'Moderado'
                        ELSE 'Bajo'
                    END as nivel_popularidad
                FROM productos_bar pb
                LEFT JOIN vista_productos_bar_populares vpbp ON pb.id = vpbp.id
                WHERE pb.disponible = true
                ORDER BY COALESCE(vpbp.veces_vendido, 0) DESC, pb.nombre ASC
                LIMIT $1
            `;

            const result = await query(sql, [limit]);

            // 🔧 CORREGIDO: Obtener el total REAL de productos disponibles
            const totalProductosQuery = await query('SELECT COUNT(*) as total FROM productos_bar WHERE disponible = true');
            const totalProductosReales = parseInt(totalProductosQuery.rows[0].total);
            
            // 🔧 CORREGIDO: Obtener el total REAL de combos
            const totalCombosQuery = await query('SELECT COUNT(*) as total FROM productos_bar WHERE disponible = true AND es_combo = true');
            const totalCombosReales = parseInt(totalCombosQuery.rows[0].total);

            // Estadísticas del bar
            const estadisticas = {
                totalProductos: totalProductosReales, // 🔧 Usar el conteo real
                totalVentas: result.rows.reduce((sum, p) => sum + (parseInt(p.veces_vendido) || 0), 0),
                totalIngresos: result.rows.reduce((sum, p) => sum + (parseFloat(p.ingresos_generados) || 0), 0),
                cantidadVendida: result.rows.reduce((sum, p) => sum + (parseInt(p.cantidad_total_vendida) || 0), 0),
                precioPromedio: result.rows.length > 0 ?
                    result.rows.reduce((sum, p) => sum + (parseFloat(p.precio_promedio_venta) || 0), 0) / result.rows.length : 0
            };

            // Análisis por categorías
            const categorias = result.rows.reduce((acc, producto) => {
                const categoria = producto.categoria || 'Sin categoría';
                if (!acc[categoria]) {
                    acc[categoria] = { productos: 0, ventas: 0, ingresos: 0 };
                }
                acc[categoria].productos++;
                acc[categoria].ventas += parseInt(producto.veces_vendido) || 0;
                acc[categoria].ingresos += parseFloat(producto.ingresos_generados) || 0;
                return acc;
            }, {});

            // Análisis de combos vs individuales
            const combos = result.rows.filter(p => p.es_combo);
            const individuales = result.rows.filter(p => !p.es_combo);

            return {
                productos: result.rows,
                estadisticas,
                categorias: Object.entries(categorias).map(([nombre, datos]) => ({
                    nombre,
                    ...datos,
                    porcentajeVentas: estadisticas.totalVentas > 0 ? 
                        ((datos.ventas / estadisticas.totalVentas) * 100).toFixed(1) : 0
                })).sort((a, b) => b.ventas - a.ventas),
                analisisCombos: {
                    totalCombos: totalCombosReales, // 🔧 Usar el conteo real
                    totalIndividuales: totalProductosReales - totalCombosReales, // 🔧 Calcular correctamente
                    ventasCombos: combos.reduce((sum, p) => sum + (parseInt(p.veces_vendido) || 0), 0),
                    ventasIndividuales: individuales.reduce((sum, p) => sum + (parseInt(p.veces_vendido) || 0), 0),
                    ingresosCombos: combos.reduce((sum, p) => sum + (parseFloat(p.ingresos_generados) || 0), 0),
                    ingresosIndividuales: individuales.reduce((sum, p) => sum + (parseFloat(p.ingresos_generados) || 0), 0)
                }
            };

        } catch (error) {
            console.error('Error en getBarReport:', error);
            throw error;
        }
    }

    /**
     * Obtener estadísticas de usuarios usando vista_estadisticas_usuarios
     */
    static async getUsuariosReport(limit = 20) {
        try {
            const sql = `
                SELECT 
                    id,
                    nombre,
                    email,
                    fecha_registro,
                    puntos_actuales,
                    total_favoritas,
                    total_historial,
                    total_compras,
                    total_gastado,
                    total_referidos,
                    CASE 
                        WHEN total_gastado > 200 THEN 'VIP'
                        WHEN total_gastado > 100 THEN 'Premium'
                        WHEN total_gastado > 50 THEN 'Regular'
                        ELSE 'Básico'
                    END as categoria_cliente,
                    DATE_PART('day', CURRENT_DATE - fecha_registro) as dias_desde_registro
                FROM vista_estadisticas_usuarios
                ORDER BY total_gastado DESC
                LIMIT $1
            `;

            const result = await query(sql, [limit]);

            // Estadísticas generales de usuarios
            const estadisticas = {
                totalUsuarios: result.rows.length,
                totalCompras: result.rows.reduce((sum, u) => sum + (parseInt(u.total_compras) || 0), 0),
                totalGastado: result.rows.reduce((sum, u) => sum + (parseFloat(u.total_gastado) || 0), 0),
                totalPuntos: result.rows.reduce((sum, u) => sum + (parseInt(u.puntos_actuales) || 0), 0),
                totalReferidos: result.rows.reduce((sum, u) => sum + (parseInt(u.total_referidos) || 0), 0),
                promedioGasto: 0,
                promedioCompras: 0
            };

            if (result.rows.length > 0) {
                estadisticas.promedioGasto = estadisticas.totalGastado / result.rows.length;
                estadisticas.promedioCompras = estadisticas.totalCompras / result.rows.length;
            }

            // Análisis por categorías de cliente
            const categorias = result.rows.reduce((acc, usuario) => {
                const categoria = usuario.categoria_cliente;
                if (!acc[categoria]) {
                    acc[categoria] = { cantidad: 0, gastoTotal: 0, comprasTotal: 0 };
                }
                acc[categoria].cantidad++;
                acc[categoria].gastoTotal += parseFloat(usuario.total_gastado) || 0;
                acc[categoria].comprasTotal += parseInt(usuario.total_compras) || 0;
                return acc;
            }, {});

            return {
                usuarios: result.rows,
                estadisticas,
                categorias: Object.entries(categorias).map(([nombre, datos]) => ({
                    nombre,
                    ...datos,
                    porcentaje: estadisticas.totalUsuarios > 0 ? 
                        ((datos.cantidad / estadisticas.totalUsuarios) * 100).toFixed(1) : 0,
                    gastoPromedio: datos.cantidad > 0 ? (datos.gastoTotal / datos.cantidad).toFixed(2) : 0
                })).sort((a, b) => b.gastoTotal - a.gastoTotal)
            };

        } catch (error) {
            console.error('Error en getUsuariosReport:', error);
            throw error;
        }
    }

    /**
     * Obtener actividad reciente usando vista_actividad_reciente
     */
    static async getActividadReciente(limit = 20) {
        try {
            const sql = `
                SELECT 
                    tipo,
                    descripcion,
                    fecha,
                    icono,
                    color
                FROM vista_actividad_reciente
                ORDER BY fecha DESC
                LIMIT $1
            `;

            const result = await query(sql, [limit]);

            return {
                actividades: result.rows,
                total: result.rows.length,
                ultimaActividad: result.rows.length > 0 ? result.rows[0].fecha : null
            };

        } catch (error) {
            console.error('Error en getActividadReciente:', error);
            throw error;
        }
    }

    /**
     * 🔧 CORREGIDO: Generar reporte ejecutivo - con cálculos correctos
     */
    static async getReporteEjecutivo() {
        try {
            const [ventas, peliculas, bar, usuarios, actividad] = await Promise.all([
                this.getVentasReport(),
                this.getPeliculasPopularesReport(5),
                this.getBarReport(10),
                this.getUsuariosReport(10),
                this.getActividadReciente(10)
            ]);

            // 🔧 OBTENER TOTALES REALES DE INGRESOS
            const totalIngresosQuery = await query(`
                SELECT 
                    COALESCE(SUM(total), 0) as total_ingresos_reales
                FROM ordenes 
                WHERE estado = 'completada'
            `);
            const totalIngresosReales = parseFloat(totalIngresosQuery.rows[0].total_ingresos_reales);

            return {
                timestamp: new Date().toISOString(),
                resumenEjecutivo: {
                    totalIngresos: totalIngresosReales, // 🔧 Usar ingresos reales
                    totalOrdenes: ventas.resumen.totalOrdenes,
                    ticketPromedio: ventas.resumen.promedioTicket,
                    peliculasActivas: peliculas.estadisticas.totalPeliculas, // 🔧 Ya corregido arriba
                    productosBar: bar.estadisticas.totalProductos, // 🔧 Ya corregido arriba
                    usuariosActivos: usuarios.estadisticas.totalUsuarios
                },
                ventas,
                peliculas,
                bar,
                usuarios,
                actividad,
                generadoEn: new Date().toLocaleString('es-ES')
            };

        } catch (error) {
            console.error('Error en getReporteEjecutivo:', error);
            throw error;
        }
    }
}

module.exports = Reports;
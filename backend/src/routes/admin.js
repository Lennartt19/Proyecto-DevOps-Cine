// backend/src/routes/admin.js - ACTUALIZADO CON SISTEMA DE AUDITORÍA Y ALERTAS
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const { pool } = require('../config/database');

// 🆕 IMPORTAR EL NUEVO SISTEMA CONTROLLER
const systemController = require('../controllers/admin/systemController');

// Middleware global: requiere autenticación y admin
router.use(authenticateToken);
router.use(requireAdmin);

// ==================== RUTAS EXISTENTES (MANTENER) ====================

/**
 * @route GET /api/admin/stats
 * @desc Obtener estadísticas generales del dashboard CON DATOS REALES
 */
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 Obteniendo estadísticas administrativas REALES...');

    // ========== ESTADÍSTICAS PRINCIPALES ==========
    
    // Películas
    const peliculasQuery = await pool.query(`
      SELECT 
        COUNT(*) as total_peliculas,
        COALESCE(AVG(rating), 0) as rating_promedio,
        COUNT(DISTINCT genero) as total_generos
      FROM peliculas 
      WHERE activo = true
    `);

    // Usuarios
    const usuariosQuery = await pool.query(`
      SELECT 
        COUNT(*) as total_usuarios,
        COUNT(CASE WHEN is_active = true THEN 1 END) as usuarios_activos,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as total_admins,
        COUNT(CASE WHEN role = 'cliente' THEN 1 END) as total_clientes
      FROM usuarios
    `);

    // Órdenes y ventas REALES
    const ordenesQuery = await pool.query(`
      SELECT 
        COUNT(*) as total_ordenes,
        COUNT(CASE WHEN estado = 'completada' THEN 1 END) as ordenes_completadas,
        COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as ordenes_pendientes,
        COUNT(CASE WHEN estado = 'cancelada' THEN 1 END) as ordenes_canceladas,
        COALESCE(SUM(CASE WHEN estado = 'completada' THEN total ELSE 0 END), 0) as ingresos_totales,
        COALESCE(SUM(CASE WHEN estado = 'completada' AND fecha_creacion >= NOW() - INTERVAL '30 days' THEN total ELSE 0 END), 0) as ingresos_mes,
        COALESCE(AVG(CASE WHEN estado = 'completada' THEN total ELSE NULL END), 0) as ticket_promedio
      FROM ordenes
    `);

    // Favoritas
    const favoritasQuery = await pool.query(`
      SELECT COUNT(*) as total_favoritas
      FROM favoritas
    `);

    // ========== GÉNEROS MÁS POPULARES REALES ==========
    const generosQuery = await pool.query(`
      SELECT 
        genero,
        COUNT(*) as cantidad,
        ROUND((COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM peliculas WHERE activo = true), 0)), 1) as porcentaje
      FROM peliculas 
      WHERE activo = true
      GROUP BY genero
      ORDER BY cantidad DESC
      LIMIT 8
    `);

    // ========== PELÍCULAS MÁS POPULARES REALES CORREGIDA ==========
    const peliculasPopularesQuery = await pool.query(`
    SELECT 
      p.titulo,
      p.genero,
      p.rating,
      -- ✅ CONTAR DATOS REALES DEL HISTORIAL (SIN FAVORITAS PARA EVITAR DUPLICADOS)
      COALESCE(COUNT(CASE WHEN h.tipo_accion = 'vista' THEN 1 END), 0) as total_vistas_reales,
      COALESCE(COUNT(CASE WHEN h.tipo_accion = 'comprada' THEN 1 END), 0) as total_compradas_reales,
      COALESCE(COUNT(h.id), 0) as total_interacciones,
      -- ✅ CALCULAR POPULARIDAD: vistas + compradas*3
      COALESCE(
        COUNT(CASE WHEN h.tipo_accion = 'vista' THEN 1 END) + 
        (COUNT(CASE WHEN h.tipo_accion = 'comprada' THEN 1 END) * 3)
      , 0) as popularidad_calculada
    FROM peliculas p
    LEFT JOIN historial h ON p.id = h.pelicula_id
    WHERE p.activo = true
    GROUP BY p.id, p.titulo, p.genero, p.rating
    -- ✅ ORDENAR IGUAL QUE TU CONSULTA MANUAL
    ORDER BY 
      total_interacciones DESC, 
      total_vistas_reales DESC, 
      total_compradas_reales DESC,
      p.rating DESC
    LIMIT 5
`);

    // ========== VENTAS RECIENTES REALES CORREGIDA ==========
    const ventasRecientesQuery = await pool.query(`
      SELECT 
        o.id,
        o.nombre_cliente as usuario,
        o.total,
        o.estado,
        o.fecha_creacion as fecha,
        COALESCE(
          (SELECT SUM(cantidad) FROM orden_items_peliculas WHERE orden_id = o.id), 0
        ) + COALESCE(
          (SELECT SUM(cantidad) FROM orden_items_bar WHERE orden_id = o.id), 0
        ) as total_items,
        CASE 
          WHEN EXISTS(SELECT 1 FROM orden_items_peliculas WHERE orden_id = o.id) 
           AND EXISTS(SELECT 1 FROM orden_items_bar WHERE orden_id = o.id) THEN 
            'Cine + Bar'
          WHEN EXISTS(SELECT 1 FROM orden_items_peliculas WHERE orden_id = o.id) THEN 
            COALESCE((
              SELECT p.titulo 
              FROM orden_items_peliculas oip
              JOIN funciones_cine fc ON oip.funcion_id = fc.id
              JOIN peliculas p ON fc.pelicula_id = p.id 
              WHERE oip.orden_id = o.id 
              LIMIT 1
            ), 'Película')
          WHEN EXISTS(SELECT 1 FROM orden_items_bar WHERE orden_id = o.id) THEN 
            'Productos del Bar'
          ELSE 'Compra sin detalles'
        END as descripcion_compra
      FROM ordenes o
      WHERE o.estado = 'completada'
      ORDER BY o.fecha_creacion DESC
      LIMIT 8
    `);

    // ========== ACTIVIDAD RECIENTE REAL CORREGIDA ==========
    const actividadRecienteQuery = await pool.query(`
      SELECT * FROM (
        (
          SELECT 
            'orden' as tipo,
            CONCAT('Nueva orden de $', ROUND(total::numeric, 2), ' - ', nombre_cliente) as descripcion,
            fecha_creacion as fecha,
            'fas fa-shopping-cart' as icono,
            'primary' as color
          FROM ordenes 
          WHERE estado = 'completada'
          ORDER BY fecha_creacion DESC 
          LIMIT 5
        )
        UNION ALL
        (
          SELECT 
            'usuario' as tipo,
            CONCAT('Nuevo usuario: ', nombre) as descripcion,
            fecha_registro as fecha,
            'fas fa-user-plus' as icono,
            'success' as color
          FROM usuarios 
          WHERE is_active = true
          ORDER BY fecha_registro DESC 
          LIMIT 3
        )
        UNION ALL
        (
          SELECT 
            'favorita' as tipo,
            CONCAT('Nueva favorita: ', p.titulo) as descripcion,
            f.fecha_agregada as fecha,
            'fas fa-heart' as icono,
            'danger' as color
          FROM favoritas f
          JOIN peliculas p ON f.pelicula_id = p.id
          WHERE p.activo = true
          ORDER BY f.fecha_agregada DESC 
          LIMIT 4
        )
      ) AS actividad_combinada
      ORDER BY fecha DESC
      LIMIT 12
    `);

    // ========== CONSTRUIR RESPUESTA CON DATOS REALES ==========
    const peliculasData = peliculasQuery.rows[0];
    const usuariosData = usuariosQuery.rows[0];
    const ordenesData = ordenesQuery.rows[0];
    const favoritasData = favoritasQuery.rows[0];

    const stats = {
      // Datos principales REALES
      totalPeliculas: parseInt(peliculasData.total_peliculas) || 0,
      totalUsuarios: parseInt(usuariosData.total_usuarios) || 0,
      usuariosActivos: parseInt(usuariosData.usuarios_activos) || 0,
      totalVentas: parseInt(ordenesData.total_ordenes) || 0,
      ingresosMes: parseFloat(ordenesData.ingresos_mes) || 0,
      
      // Datos adicionales REALES
      ratingPromedio: parseFloat(peliculasData.rating_promedio) || 0,
      totalGeneros: parseInt(peliculasData.total_generos) || 0,
      ordenesCompletadas: parseInt(ordenesData.ordenes_completadas) || 0,
      ordenesPendientes: parseInt(ordenesData.ordenes_pendientes) || 0,
      ordenesCanceladas: parseInt(ordenesData.ordenes_canceladas) || 0,
      ingresosTotales: parseFloat(ordenesData.ingresos_totales) || 0,
      ticketPromedio: parseFloat(ordenesData.ticket_promedio) || 0,
      totalFavoritas: parseInt(favoritasData.total_favoritas) || 0,
      
      // Arrays con datos REALES
      generosMasPopulares: generosQuery.rows.map(row => ({
        genero: row.genero,
        cantidad: parseInt(row.cantidad),
        porcentaje: parseFloat(row.porcentaje) || 0
      })),
      
     peliculasPopulares: peliculasPopularesQuery.rows.map(row => ({
  titulo: row.titulo,
  genero: row.genero,
  rating: parseFloat(row.rating),
  // ✅ USAR LOS DATOS REALES DEL HISTORIAL
  vistas: parseInt(row.total_vistas_reales) || 0,
  // 🆕 AGREGAR DETALLES PARA DEBUG
  total_vistas: parseInt(row.total_vistas_reales) || 0,
  total_compradas: parseInt(row.total_compradas_reales) || 0,
  total_interacciones: parseInt(row.total_interacciones) || 0,
  popularidad_calculada: parseInt(row.popularidad_calculada) || 0
})),
      ventasRecientes: ventasRecientesQuery.rows.map(row => ({
        id: row.id,
        usuario: row.usuario || 'Usuario Anónimo',
        pelicula: row.descripcion_compra,
        total: parseFloat(row.total),
        estado: row.estado,
        fecha: row.fecha,
        entradas: parseInt(row.total_items) || 1
      })),
      
      actividadReciente: actividadRecienteQuery.rows.map(row => ({
        tipo: row.tipo,
        descripcion: row.descripcion,
        fecha: row.fecha,
        icono: row.icono,
        color: row.color
      }))
    };

    console.log('✅ Estadísticas REALES obtenidas:', {
      peliculas: stats.totalPeliculas,
      usuarios: stats.totalUsuarios,
      ventas: stats.totalVentas,
      ingresosMes: stats.ingresosMes
    });

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
      source: 'database' // Indicador de que son datos reales
    });

  } catch (error) {
    console.error('❌ Error al obtener estadísticas REALES:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
});

/**
 * @route GET /api/admin/bar-stats
 * @desc Obtener estadísticas específicas del bar CON DATOS REALES
 */
router.get('/bar-stats', async (req, res) => {
  try {
    console.log('🍿 Obteniendo estadísticas del bar REALES...');

    // ========== ESTADÍSTICAS GENERALES DEL BAR CORREGIDAS ==========
    const barStatsQuery = await pool.query(`
      SELECT 
        COUNT(*) as total_productos,
        COUNT(CASE WHEN disponible = true THEN 1 END) as productos_disponibles,
        COUNT(CASE WHEN es_combo = true THEN 1 END) as total_combos,
        COUNT(DISTINCT categoria) as total_categorias,
        COALESCE(ROUND(AVG(precio)::numeric, 2), 0) as precio_promedio,
        COALESCE(MIN(precio), 0) as precio_minimo,
        COALESCE(MAX(precio), 0) as precio_maximo,
        COALESCE(SUM(CASE WHEN es_combo = true THEN descuento ELSE 0 END), 0) as ahorro_total_combos
      FROM productos_bar
      WHERE disponible = true
    `);

    // ========== PRODUCTOS POR CATEGORÍA REALES ==========
    const categoriaStatsQuery = await pool.query(`
      SELECT 
        categoria,
        COUNT(*) as cantidad,
        COUNT(CASE WHEN disponible = true THEN 1 END) as disponibles,
        COUNT(CASE WHEN es_combo = true THEN 1 END) as combos,
        COALESCE(ROUND(AVG(precio)::numeric, 2), 0) as precio_promedio,
        COALESCE(MIN(precio), 0) as precio_minimo,
        COALESCE(MAX(precio), 0) as precio_maximo,
        ROUND((COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM productos_bar WHERE disponible = true), 0)), 1) as porcentaje
      FROM productos_bar
      WHERE disponible = true
      GROUP BY categoria
      ORDER BY cantidad DESC
    `);

    // ========== PRODUCTOS MÁS VENDIDOS REALES ==========
    const productosPopularesQuery = await pool.query(`
      SELECT 
        pb.nombre,
        pb.categoria,
        pb.precio,
        pb.es_combo,
        pb.disponible,
        COALESCE(COUNT(oib.id), 0) as ventas_reales,
        COALESCE(SUM(oib.cantidad), 0) as cantidad_vendida,
        COALESCE(SUM(oib.subtotal), 0) as ingresos_reales
      FROM productos_bar pb
      LEFT JOIN orden_items_bar oib ON pb.id = oib.producto_id
      LEFT JOIN ordenes o ON oib.orden_id = o.id AND o.estado = 'completada'
      WHERE pb.disponible = true
      GROUP BY pb.id, pb.nombre, pb.categoria, pb.precio, pb.es_combo, pb.disponible
      ORDER BY ventas_reales DESC, cantidad_vendida DESC, ingresos_reales DESC, pb.nombre ASC
      LIMIT 15
    `);

    // ========== VENTAS RECIENTES DEL BAR REALES ==========
    const ventasBarRecientesQuery = await pool.query(`
      SELECT 
        o.nombre_cliente as cliente,
        pb.nombre as producto,
        pb.categoria,
        oib.cantidad,
        oib.precio_unitario,
        oib.subtotal as total,
        o.fecha_creacion as fecha,
        pb.es_combo,
        o.metodo_pago
      FROM orden_items_bar oib
      JOIN ordenes o ON oib.orden_id = o.id
      JOIN productos_bar pb ON oib.producto_id = pb.id
      WHERE o.estado = 'completada'
      ORDER BY o.fecha_creacion DESC
      LIMIT 20
    `);

    // ========== TENDENCIAS DEL BAR REALES ==========
    const tendenciasBarQuery = await pool.query(`
      SELECT 
        COUNT(oib.id) as ventas_total,
        COALESCE(SUM(oib.subtotal), 0) as ingresos_total,
        COUNT(CASE WHEN o.fecha_creacion >= NOW() - INTERVAL '7 days' THEN 1 END) as ventas_7_dias,
        COALESCE(SUM(CASE WHEN o.fecha_creacion >= NOW() - INTERVAL '7 days' THEN oib.subtotal ELSE 0 END), 0) as ingresos_7_dias,
        COUNT(CASE WHEN o.fecha_creacion >= NOW() - INTERVAL '30 days' THEN 1 END) as ventas_30_dias,
        COALESCE(SUM(CASE WHEN o.fecha_creacion >= NOW() - INTERVAL '30 days' THEN oib.subtotal ELSE 0 END), 0) as ingresos_30_dias
      FROM orden_items_bar oib
      JOIN ordenes o ON oib.orden_id = o.id
      WHERE o.estado = 'completada'
    `);

    // Producto más vendido REAL
    const productoMasVendidoQuery = await pool.query(`
      SELECT pb.nombre
      FROM orden_items_bar oib
      JOIN productos_bar pb ON oib.producto_id = pb.id
      JOIN ordenes o ON oib.orden_id = o.id
      WHERE o.estado = 'completada'
      GROUP BY pb.id, pb.nombre
      ORDER BY SUM(oib.cantidad) DESC
      LIMIT 1
    `);

    // Categoría más popular REAL
    const categoriaMasPopularQuery = await pool.query(`
      SELECT pb.categoria
      FROM orden_items_bar oib
      JOIN productos_bar pb ON oib.producto_id = pb.id
      JOIN ordenes o ON oib.orden_id = o.id
      WHERE o.estado = 'completada'
      GROUP BY pb.categoria
      ORDER BY SUM(oib.cantidad) DESC
      LIMIT 1
    `);

    // ========== CONSTRUIR RESPUESTA CON DATOS REALES ==========
    const barData = barStatsQuery.rows[0];
    const tendenciasData = tendenciasBarQuery.rows[0];

    // 🔧 DEBUG: Log de los datos obtenidos
    console.log('🔍 Datos del bar obtenidos:', {
      totalProductos: barData.total_productos,
      precioPromedio: barData.precio_promedio,
      precioMinimo: barData.precio_minimo,
      precioMaximo: barData.precio_maximo
    });

    const stats = {
      // Estadísticas generales REALES
      totalProductos: parseInt(barData.total_productos) || 0,
      productosDisponibles: parseInt(barData.productos_disponibles) || 0,
      productosNoDisponibles: (parseInt(barData.total_productos) || 0) - (parseInt(barData.productos_disponibles) || 0),
      totalCombos: parseInt(barData.total_combos) || 0,
      totalCategorias: parseInt(barData.total_categorias) || 0,
      precioPromedio: parseFloat(barData.precio_promedio) || 0, // 🔧 CORREGIDO: Usar precio real
      precioMinimo: parseFloat(barData.precio_minimo) || 0,
      precioMaximo: parseFloat(barData.precio_maximo) || 0,
      ahorroTotalCombos: parseFloat(barData.ahorro_total_combos) || 0,
      
      // Categorías REALES
      productosPorCategoria: categoriaStatsQuery.rows.map(row => ({
        categoria: row.categoria,
        cantidad: parseInt(row.cantidad),
        disponibles: parseInt(row.disponibles),
        combos: parseInt(row.combos),
        precioPromedio: parseFloat(row.precio_promedio),
        precioMinimo: parseFloat(row.precio_minimo),
        precioMaximo: parseFloat(row.precio_maximo),
        porcentaje: parseFloat(row.porcentaje) || 0
      })),
      
      // Productos populares REALES
      productosPopularesBar: productosPopularesQuery.rows.map(row => ({
        nombre: row.nombre,
        categoria: row.categoria,
        precio: parseFloat(row.precio),
        esCombo: row.es_combo,
        disponible: row.disponible,
        ventasSimuladas: parseInt(row.ventas_reales) || 0,
        ingresoSimulado: parseFloat(row.ingresos_reales) || 0
      })),
      
      // Ventas del bar REALES
      ventasSimuladasBar: ventasBarRecientesQuery.rows.map(row => ({
        id: `VB${Date.now()}${Math.floor(Math.random() * 1000)}`,
        producto: row.producto,
        categoria: row.categoria,
        cantidad: parseInt(row.cantidad),
        precioUnitario: parseFloat(row.precio_unitario),
        total: parseFloat(row.total),
        fecha: new Date(row.fecha).toISOString().split('T')[0],
        esCombo: row.es_combo,
        cliente: row.cliente || 'Cliente Anónimo',
        metodoPago: row.metodo_pago || 'No especificado'
      })),
      
      // Tendencias REALES
      tendenciasBar: {
        ventasUltimos7Dias: parseInt(tendenciasData.ventas_7_dias) || 0,
        ingresoUltimos7Dias: parseFloat(tendenciasData.ingresos_7_dias) || 0,
        ventasUltimos30Dias: parseInt(tendenciasData.ventas_30_dias) || 0,
        ingresoUltimos30Dias: parseFloat(tendenciasData.ingresos_30_dias) || 0,
        productoMasVendido: productoMasVendidoQuery.rows[0]?.nombre || 'N/A',
        categoriaMasPopular: categoriaMasPopularQuery.rows[0]?.categoria || 'N/A',
        promedioVentaDiaria: Math.round((parseInt(tendenciasData.ventas_30_dias) || 0) / 30),
        promedioIngresoDiario: Math.round(((parseFloat(tendenciasData.ingresos_30_dias) || 0) / 30) * 100) / 100
      }
    };

    console.log('✅ Estadísticas del bar REALES obtenidas:', {
      productos: stats.totalProductos,
      precioPromedio: stats.precioPromedio,
      ventasReales: stats.ventasSimuladasBar.length,
      ingresosReales: stats.tendenciasBar.ingresoUltimos30Dias
    });

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
      source: 'database' // Indicador de que son datos reales
    });

  } catch (error) {
    console.error('❌ Error al obtener estadísticas del bar REALES:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas del bar',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
});

/**
 * @route GET /api/admin/ventas-report
 * @desc Obtener reporte de ventas por rango de fechas
 */
router.get('/ventas-report', async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    
    console.log(`📊 Generando reporte de ventas REAL: ${fechaInicio} - ${fechaFin}`);

    const reportQuery = await pool.query(`
      SELECT 
        COUNT(*) as total_ventas,
        COUNT(CASE WHEN estado = 'completada' THEN 1 END) as ventas_completadas,
        COALESCE(SUM(CASE WHEN estado = 'completada' THEN total ELSE 0 END), 0) as ingreso_total,
        COALESCE(AVG(CASE WHEN estado = 'completada' THEN total ELSE NULL END), 0) as ticket_promedio,
        COUNT(DISTINCT usuario_id) as clientes_unicos,
        COALESCE((
          SELECT SUM(
            COALESCE((SELECT SUM(cantidad) FROM orden_items_peliculas WHERE orden_id = ordenes.id), 0) +
            COALESCE((SELECT SUM(cantidad) FROM orden_items_bar WHERE orden_id = ordenes.id), 0)
          )
        ), 0) as items_vendidos
      FROM ordenes
      WHERE fecha_creacion::date BETWEEN $1 AND $2
    `, [fechaInicio, fechaFin]);

    const reportData = reportQuery.rows[0];

    res.json({
      success: true,
      data: {
        totalVentas: parseInt(reportData.total_ventas) || 0,
        ventasCompletadas: parseInt(reportData.ventas_completadas) || 0,
        ingresoTotal: parseFloat(reportData.ingreso_total) || 0,
        ticketPromedio: parseFloat(reportData.ticket_promedio) || 0,
        clientesUnicos: parseInt(reportData.clientes_unicos) || 0,
        itemsVendidos: parseInt(reportData.items_vendidos) || 0,
        fechaInicio,
        fechaFin,
        generadoEn: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error al generar reporte de ventas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar reporte de ventas'
    });
  }
});

/**
 * @route GET /api/health
 * @desc Verificar que el servidor esté funcionando
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Backend funcionando correctamente',
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// ==================== 🆕 NUEVAS RUTAS DEL SISTEMA DE AUDITORÍA Y ALERTAS ====================

/**
 * @route GET /api/admin/system/metrics
 * @desc Obtener métricas del dashboard del sistema
 */
router.get('/system/metrics', systemController.getDashboardMetrics);

/**
 * @route GET /api/admin/system/alerts
 * @desc Obtener alertas del sistema con paginación
 */
router.get('/system/alerts', systemController.getSystemAlerts);

/**
 * @route POST /api/admin/system/alerts/mark-reviewed
 * @desc Marcar alertas como revisadas
 */
router.post('/system/alerts/mark-reviewed', systemController.markAlertsAsReviewed);

/**
 * @route GET /api/admin/system/alerts/summary
 * @desc Obtener resumen de alertas por severidad
 */
router.get('/system/alerts/summary', systemController.getAlertsSummary);

/**
 * @route GET /api/admin/system/audit
 * @desc Obtener logs de auditoría con filtros
 */
router.get('/system/audit', systemController.getAuditLog);

/**
 * @route POST /api/admin/system/cleanup
 * @desc Ejecutar limpieza del sistema
 */
router.post('/system/cleanup', systemController.runSystemCleanup);

/**
 * @route GET /api/admin/system/stats
 * @desc Obtener estadísticas avanzadas del sistema
 */
router.get('/system/stats', systemController.getSystemStats);

/**
 * @route GET /api/admin/system/test-triggers
 * @desc Probar que los triggers del sistema funcionan
 */
router.get('/system/test-triggers', systemController.testTriggers);

module.exports = router;
// orderController.js - CORRECCIÓN DE PRECIOS VIP EN BACKEND

const Order = require('../../models/Order');
const Points = require('../../models/Points');
const User = require('../../models/User');

class OrderController {
  constructor() {
    this.orderModel = new Order();
    this.pointsModel = new Points();
    
    this.getUserOrders = this.getUserOrders.bind(this);
    this.getOrderById = this.getOrderById.bind(this);
    this.createOrder = this.createOrder.bind(this);
    this.getOrderStats = this.getOrderStats.bind(this);
    this.cancelOrder = this.cancelOrder.bind(this);
    this.updateOrderStatus = this.updateOrderStatus.bind(this);
    this.processPurchase = this.processPurchase.bind(this);
  }

  // ==================== CREAR NUEVA ORDEN CORREGIDA ====================

  async createOrder(req, res) {
    try {
      console.log('📦 Creando nueva orden...');
      console.log('Datos recibidos:', JSON.stringify(req.body, null, 2));
      
      const userId = req.user?.id;
      
      // Buscar datos reales del usuario en la BD
      const userData = await User.findById(userId);
      if (!userData) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }
      
      console.log('👤 Datos del usuario desde BD:', {
        id: userData.id,
        nombre: userData.nombre,
        email: userData.email
      });
      
      // 🔧 VALIDAR Y PROCESAR ITEMS CON PRECIOS VIP CORRECTOS
      const orderData = await this.processOrderDataWithVipPricing({
        ...req.body,
        usuario_id: userId,
        email_cliente: userData.email,
        nombre_cliente: userData.nombre,
        telefono_cliente: req.body.telefono_cliente || null
      });

      console.log('📋 Datos de orden con precios corregidos:', {
        usuario_id: orderData.usuario_id,
        email_cliente: orderData.email_cliente,
        nombre_cliente: orderData.nombre_cliente,
        total: orderData.total,
        items_peliculas: orderData.items_peliculas?.length || 0,
        items_bar: orderData.items_bar?.length || 0
      });

      // Validar datos de la orden
      const validation = await this.orderModel.validateOrderData(orderData);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Datos de orden inválidos',
          errors: validation.errors
        });
      }

      // Crear la orden
      const result = await this.orderModel.createOrder(orderData);
      
      if (result.success) {
        console.log(`✅ Orden creada exitosamente: ${result.orderId} para ${userData.nombre} (${userData.email})`);
        
        // Procesar puntos por la compra (async, no bloquear respuesta)
        this.processPointsForOrder(userId, orderData.total, result.orderId)
          .catch(error => console.error('Error procesando puntos:', error));
        
        res.status(201).json({
          success: true,
          message: 'Orden creada exitosamente',
          orderId: result.orderId,
          fechaCreacion: result.fechaCreacion,
          data: {
            id: result.orderId,
            usuario_id: userId,
            total: orderData.total,
            subtotal: orderData.subtotal,
            estado: orderData.estado || 'pendiente',
            metodo_pago: orderData.metodo_pago,
            email_cliente: userData.email,
            nombre_cliente: userData.nombre,
            fecha_creacion: result.fechaCreacion
          }
        });
      } else {
        throw new Error('Error al crear la orden');
      }

    } catch (error) {
      console.error('❌ Error al crear orden:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error al procesar la orden'
      });
    }
  }

  // ==================== PROCESAR COMPRA COMPLETA CORREGIDA ====================

  async processPurchase(req, res) {
    try {
      console.log('🛒 Procesando compra completa...');
      
      const userId = req.user?.id;
      const purchaseData = req.body;
      
      // Buscar datos reales del usuario
      const userData = await User.findById(userId);
      if (!userData) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }
      
      console.log('👤 Procesando compra para usuario:', {
        id: userData.id,
        nombre: userData.nombre,
        email: userData.email
      });
      
      // 🔧 PROCESAR DATOS CON PRECIOS VIP CORRECTOS
      const orderData = await this.processOrderDataWithVipPricing({
        usuario_id: userId,
        total: purchaseData.total,
        subtotal: purchaseData.subtotal,
        impuestos: purchaseData.impuestos || 0,
        cargo_servicio: purchaseData.cargo_servicio || 0,
        metodo_pago: purchaseData.metodo_pago,
        estado: 'completada',
        email_cliente: userData.email,
        nombre_cliente: userData.nombre,
        telefono_cliente: purchaseData.telefono_cliente || null,
        paypal_transaction_id: purchaseData.paypal_transaction_id,
        paypal_payer_id: purchaseData.paypal_payer_id,
        paypal_status: purchaseData.paypal_status,
        items_peliculas: purchaseData.items_peliculas || [],
        items_bar: purchaseData.items_bar || []
      });
      
      console.log('💰 Datos de compra con precios VIP corregidos:', {
        usuario_id: orderData.usuario_id,
        email_cliente: orderData.email_cliente,
        nombre_cliente: orderData.nombre_cliente,
        total: orderData.total,
        subtotal: orderData.subtotal,
        metodo_pago: orderData.metodo_pago,
        items_peliculas: orderData.items_peliculas?.length || 0,
        items_bar: orderData.items_bar?.length || 0
      });
      
      // Validar y crear orden
      const validation = await this.orderModel.validateOrderData(orderData);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Datos de compra inválidos',
          errors: validation.errors
        });
      }
      
      const orderResult = await this.orderModel.createOrder(orderData);
      
      if (!orderResult.success) {
        throw new Error('Error al crear la orden');
      }
      
      console.log(`✅ Compra procesada exitosamente para ${userData.nombre}: Orden ${orderResult.orderId}`);
      
      // Procesar puntos por la compra
      let pointsResult = null;
      try {
        pointsResult = await this.pointsModel.processPointsForPurchase(
          userId, 
          orderData.total, // 🔧 USAR TOTAL CORREGIDO
          {
            order_id: orderResult.orderId,
            items_count: (orderData.items_peliculas?.length || 0) + (orderData.items_bar?.length || 0),
            payment_method: orderData.metodo_pago
          }
        );
      } catch (pointsError) {
        console.error('⚠️ Error procesando puntos (no crítico):', pointsError);
      }
      
      // Responder con éxito
      res.status(201).json({
        success: true,
        message: 'Compra procesada exitosamente',
        data: {
          order: {
            id: orderResult.orderId,
            fecha_creacion: orderResult.fechaCreacion,
            total: orderData.total, // 🔧 TOTAL CORREGIDO
            estado: 'completada',
            usuario: {
              id: userData.id,
              nombre: userData.nombre,
              email: userData.email
            }
          },
          points: pointsResult ? {
            puntos_ganados: pointsResult.puntos_agregados,
            puntos_totales: pointsResult.puntos_nuevos
          } : null
        }
      });
      
    } catch (error) {
      console.error('❌ Error al procesar compra:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar la compra',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor'
      });
    }
  }

  // ==================== NUEVO MÉTODO: PROCESAR PRECIOS VIP ====================

  async processOrderDataWithVipPricing(rawOrderData) {
    try {
      console.log('🔧 Procesando precios VIP en orden...');
      
      const orderData = { ...rawOrderData };
      
      // Procesar items de películas con precios VIP correctos
      if (orderData.items_peliculas && Array.isArray(orderData.items_peliculas)) {
        console.log(`🎬 Procesando ${orderData.items_peliculas.length} items de películas...`);
        
        for (let i = 0; i < orderData.items_peliculas.length; i++) {
          const item = orderData.items_peliculas[i];
          
          console.log(`🎬 Item ${i + 1}:`, {
            funcion_id: item.funcion_id,
            cantidad: item.cantidad,
            precio_unitario_original: item.precio_unitario,
            asientos_seleccionados: item.asientos_seleccionados,
            asientos_info: item.asientos_info
          });
          
          // 🔧 RECALCULAR PRECIO BASADO EN ASIENTOS REALES
          if (item.asientos_info && Array.isArray(item.asientos_info) && item.asientos_info.length > 0) {
            // Usar precios reales de los asientos seleccionados
            const totalPrecioReal = item.asientos_info.reduce((sum, asiento) => sum + parseFloat(asiento.precio || 0), 0);
            const precioUnitarioReal = totalPrecioReal / item.cantidad;
            
            console.log(`💰 Recalculando precios con asientos reales:`, {
              asientos_info: item.asientos_info.map(a => ({ seat_id: a.seat_id, precio: a.precio, es_vip: a.es_vip })),
              totalPrecioReal: totalPrecioReal,
              precioUnitarioReal: precioUnitarioReal,
              cantidad: item.cantidad
            });
            
            // Actualizar precios en el item
            orderData.items_peliculas[i].precio_unitario = precioUnitarioReal;
            orderData.items_peliculas[i].subtotal = totalPrecioReal;
            
            // Marcar tipo de asiento para la BD
            const tieneAsientosVip = item.asientos_info.some(a => a.es_vip);
            orderData.items_peliculas[i].tipo_asiento = tieneAsientosVip ? 'vip' : 'estandar';
            
          } else if (item.tipo_asiento === 'vip' || item.tiene_asientos_vip) {
            // 🔧 FALLBACK: Si no hay asientos_info pero se indica que es VIP
            console.log('💰 Aplicando precio VIP (fallback)...');
            
            // Obtener precio base de la función y aplicar multiplicador VIP
            const precioBase = parseFloat(item.precio_unitario);
            const precioVip = precioBase * 1.5;
            
            orderData.items_peliculas[i].precio_unitario = precioVip;
            orderData.items_peliculas[i].subtotal = precioVip * item.cantidad;
            orderData.items_peliculas[i].tipo_asiento = 'vip';
          } else {
            // 🔧 ASIENTOS ESTÁNDAR
            orderData.items_peliculas[i].tipo_asiento = 'estandar';
            // El precio ya está correcto, no cambiar
          }
          
          console.log(`✅ Item ${i + 1} procesado:`, {
            precio_unitario_final: orderData.items_peliculas[i].precio_unitario,
            subtotal_final: orderData.items_peliculas[i].subtotal,
            tipo_asiento: orderData.items_peliculas[i].tipo_asiento
          });
        }
      }
      
      // Procesar items del bar (sin cambios)
      if (orderData.items_bar && Array.isArray(orderData.items_bar)) {
        console.log(`🍿 Procesando ${orderData.items_bar.length} items del bar...`);
        // Los items del bar no necesitan procesamiento especial de precios VIP
        orderData.items_bar.forEach((item, index) => {
          console.log(`🍿 Item bar ${index + 1}:`, {
            producto_id: item.producto_id,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            subtotal: item.subtotal
          });
        });
      }
      
      // 🔧 RECALCULAR TOTALES CON PRECIOS CORREGIDOS
      const nuevosCalculos = this.recalculateTotals(orderData);
      
      console.log('💰 Totales recalculados:', nuevosCalculos);
      
      return {
        ...orderData,
        ...nuevosCalculos
      };
      
    } catch (error) {
      console.error('❌ Error procesando precios VIP:', error);
      throw error;
    }
  }

  // ==================== RECALCULAR TOTALES CON PRECIOS CORREGIDOS ====================

  recalculateTotals(orderData) {
    try {
      let subtotal = 0;
      
      // Sumar subtotales de películas
      if (orderData.items_peliculas && Array.isArray(orderData.items_peliculas)) {
        subtotal += orderData.items_peliculas.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0);
      }
      
      // Sumar subtotales del bar
      if (orderData.items_bar && Array.isArray(orderData.items_bar)) {
        subtotal += orderData.items_bar.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0);
      }
      
      // Calcular cargos e impuestos
      const cargo_servicio = subtotal * 0.05; // 5%
      const impuestos = (subtotal + cargo_servicio) * 0.08; // 8%
      const total = subtotal + cargo_servicio + impuestos;
      
      const totales = {
        subtotal: Math.round(subtotal * 100) / 100,
        cargo_servicio: Math.round(cargo_servicio * 100) / 100,
        impuestos: Math.round(impuestos * 100) / 100,
        total: Math.round(total * 100) / 100
      };
      
      console.log('💰 Totales calculados:', totales);
      
      return totales;
      
    } catch (error) {
      console.error('❌ Error recalculando totales:', error);
      throw error;
    }
  }

  // ==================== RESTO DE MÉTODOS (SIN CAMBIOS) ====================

  async getOrderById(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;
      
      console.log(`🔍 Buscando orden: ${orderId} para usuario: ${userId}`);
      
      const order = await this.orderModel.getOrderById(orderId);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Orden no encontrada'
        });
      }
      
      // Verificar que la orden pertenece al usuario (si no es admin)
      if (req.user.role !== 'admin' && order.usuario_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver esta orden'
        });
      }
      
      res.json({
        success: true,
        data: order
      });

    } catch (error) {
      console.error('❌ Error al obtener orden:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener la orden',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  async getUserOrders(req, res) {
    try {
      const userId = req.user?.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      
      console.log(`📋 Obteniendo órdenes del usuario ${userId}, página ${page}`);
      
      const orders = await this.orderModel.getOrdersByUser(userId, limit, offset);
      
      res.json({
        success: true,
        data: orders,
        pagination: {
          page,
          limit,
          total: orders.length,
          hasMore: orders.length === limit
        }
      });

    } catch (error) {
      console.error('❌ Error al obtener órdenes del usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener las órdenes',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  async updateOrderStatus(req, res) {
    try {
      const { orderId } = req.params;
      const { estado, paypal_data } = req.body;
      
      console.log(`🔄 Actualizando estado de orden ${orderId} a: ${estado}`);
      
      const validStates = ['pendiente', 'completada', 'cancelada', 'reembolsada'];
      if (!validStates.includes(estado)) {
        return res.status(400).json({
          success: false,
          message: 'Estado de orden inválido',
          validStates
        });
      }
      
      const updatedOrder = await this.orderModel.updateOrderStatus(orderId, estado, paypal_data);
      
      if (!updatedOrder) {
        return res.status(404).json({
          success: false,
          message: 'Orden no encontrada'
        });
      }
      
      res.json({
        success: true,
        message: `Estado actualizado a: ${estado}`,
        data: updatedOrder
      });

    } catch (error) {
      console.error('❌ Error al actualizar estado de orden:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar la orden',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  async cancelOrder(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';
      
      console.log(`❌ Cancelando orden ${orderId} por usuario ${userId}`);
      
      const result = await this.orderModel.cancelOrder(orderId, isAdmin ? null : userId);
      
      if (result.success) {
        res.json({
          success: true,
          message: 'Orden cancelada exitosamente'
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || 'Error al cancelar la orden'
        });
      }

    } catch (error) {
      console.error('❌ Error al cancelar orden:', error);
      
      if (error.message === 'Orden no encontrada') {
        return res.status(404).json({
          success: false,
          message: 'Orden no encontrada'
        });
      }
      
      if (error.message === 'Solo se pueden cancelar órdenes pendientes') {
        return res.status(400).json({
          success: false,
          message: 'Solo se pueden cancelar órdenes pendientes'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error al cancelar la orden',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  async getOrderStats(req, res) {
    try {
      const userId = req.user?.role === 'admin' ? null : req.user?.id;
      
      console.log(`📊 Obteniendo estadísticas de órdenes ${userId ? `para usuario ${userId}` : '(global)'}`);
      
      const stats = await this.orderModel.getOrderStats(userId);
      
      console.log('📈 Estadísticas calculadas:', {
        userId: userId,
        stats: stats,
        totalOrdenes: stats.totalOrdenes,
        completadas: stats.ordenesCompletadas,
        pendientes: stats.ordenesPendientes,
        totalIngresos: stats.totalIngresos
      });
      
      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('❌ Error al obtener estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        data: {
          totalOrdenes: 0,
          ordenesCompletadas: 0,
          ordenesPendientes: 0,
          ordenesCanceladas: 0,
          totalIngresos: 0,
          ticketPromedio: 0
        },
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // ==================== MÉTODOS AUXILIARES PRIVADOS ====================

  async processPointsForOrder(userId, total, orderId) {
    try {
      console.log(`💰 Procesando puntos para orden ${orderId}, total: ${total}`);
      
      const result = await this.pointsModel.processPointsForPurchase(
        userId, 
        total,
        { order_id: orderId }
      );
      
      if (result.success && result.puntos_agregados > 0) {
        console.log(`✅ ${result.puntos_agregados} puntos agregados al usuario ${userId}`);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error procesando puntos para orden:', error);
      throw error;
    }
  }

  validateCartItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return { valid: false, message: 'El carrito debe contener al menos un item' };
    }
    
    for (const item of items) {
      if (!item.tipo || !['pelicula', 'bar'].includes(item.tipo)) {
        return { valid: false, message: 'Tipo de item inválido' };
      }
      
      if (!item.cantidad || item.cantidad <= 0) {
        return { valid: false, message: 'Cantidad debe ser mayor a 0' };
      }
      
      if (!item.precio || item.precio <= 0) {
        return { valid: false, message: 'Precio debe ser mayor a 0' };
      }
    }
    
    return { valid: true };
  }

  calculateTotals(items) {
    let subtotal = 0;
    
    for (const item of items) {
      subtotal += item.precio * item.cantidad;
    }
    
    const serviceFee = subtotal * 0.05; // 5% cargo por servicio
    const taxes = (subtotal + serviceFee) * 0.08; // 8% impuestos
    const total = subtotal + serviceFee + taxes;
    
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      serviceFee: Math.round(serviceFee * 100) / 100,
      taxes: Math.round(taxes * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  }

  // ==================== NUEVO MÉTODO: VALIDAR PRECIOS VIP ====================

  async validateVipPricing(items_peliculas) {
    try {
      console.log('🔍 Validando precios VIP...');
      
      if (!items_peliculas || !Array.isArray(items_peliculas)) {
        return { valid: true, corrected_items: [] };
      }
      
      const corrected_items = [];
      
      for (const item of items_peliculas) {
        const corrected_item = { ...item };
        
        // Si tiene información de asientos, validar precios
        if (item.asientos_info && Array.isArray(item.asientos_info)) {
          const tieneAsientosVip = item.asientos_info.some(a => a.es_vip);
          const totalPrecioReal = item.asientos_info.reduce((sum, asiento) => sum + parseFloat(asiento.precio || 0), 0);
          
          if (tieneAsientosVip) {
            console.log(`🎭 Item con asientos VIP detectado:`, {
              funcion_id: item.funcion_id,
              precio_original: item.precio_unitario,
              precio_calculado: totalPrecioReal / item.cantidad,
              asientos_vip: item.asientos_info.filter(a => a.es_vip).length
            });
            
            corrected_item.precio_unitario = totalPrecioReal / item.cantidad;
            corrected_item.subtotal = totalPrecioReal;
            corrected_item.tipo_asiento = 'vip';
          }
        }
        
        corrected_items.push(corrected_item);
      }
      
      return { valid: true, corrected_items };
      
    } catch (error) {
      console.error('❌ Error validando precios VIP:', error);
      return { valid: false, error: error.message };
    }
  }

  // ==================== DEBUGGING Y LOGGING ====================

  logOrderData(orderData, stage = 'unknown') {
    console.log(`📋 [${stage.toUpperCase()}] Datos de orden:`, {
      usuario_id: orderData.usuario_id,
      total: orderData.total,
      subtotal: orderData.subtotal,
      items_peliculas: orderData.items_peliculas?.length || 0,
      items_bar: orderData.items_bar?.length || 0,
      metodo_pago: orderData.metodo_pago,
      estado: orderData.estado
    });
    
    if (orderData.items_peliculas && orderData.items_peliculas.length > 0) {
      console.log(`🎬 Items de películas en ${stage}:`, orderData.items_peliculas.map((item, index) => ({
        item: index + 1,
        funcion_id: item.funcion_id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal,
        tipo_asiento: item.tipo_asiento,
        tiene_asientos_vip: item.asientos_info?.some(a => a.es_vip) || false
      })));
    }
  }
}

module.exports = new OrderController();
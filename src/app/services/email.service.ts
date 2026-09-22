// email.service.ts - Versión CDN actualizada
import { Injectable } from '@angular/core';
import { CartItem } from './cart.service';

// ✅ Declarar emailjs como variable global
declare var emailjs: any;

@Injectable({
  providedIn: 'root'
})
export class EmailService {

  // ✅ CONFIGURACIÓN CON TUS DATOS REALES
  private readonly SERVICE_ID = 'service_qv9d88e';
  private readonly TEMPLATE_ID = 'template_w6435yp';

  constructor() {
    console.log('📧 EmailJS cargado desde CDN para Parky Films');
  }

  // ✅ ENVIAR EMAIL CON ENTRADAS Y PRODUCTOS DEL BAR
  async sendTicketEmail(orderData: any, cartItems: CartItem[]): Promise<boolean> {
    try {
      console.log('📧 Enviando email real con EmailJS CDN...');
      
      // Verificar que emailjs esté disponible
      if (typeof emailjs === 'undefined') {
        throw new Error('EmailJS no está cargado desde el CDN');
      }

      // Separar items por tipo
      const peliculaItems = cartItems.filter(item => item.tipo === 'pelicula');
      const barItems = cartItems.filter(item => item.tipo === 'bar');
      
      // Preparar datos para el template
      const templateParams = {
        to_email: orderData.email,
        to_name: orderData.nombre,
        order_id: orderData.orderId,
        total_amount: orderData.total,
        purchase_date: new Date().toLocaleDateString('es-ES'),
        payment_method: orderData.metodoPago,
        
        // Información detallada de las películas
        movies_details: peliculaItems.length > 0 ? this.formatMoviesForEmail(peliculaItems) : 'No se compraron entradas',
        
        // Información detallada de productos del bar
        bar_details: barItems.length > 0 ? this.formatBarItemsForEmail(barItems) : 'No se compraron productos del bar',
        
        // Desglose de precios
        subtotal: orderData.subtotal,
        service_fee: orderData.serviceFee,
        taxes: orderData.taxes,
        
        // Info adicional
        phone: orderData.telefono || 'No proporcionado',
        
        // Resumen de compra
        has_movies: peliculaItems.length > 0,
        has_bar_items: barItems.length > 0,
        total_tickets: peliculaItems.reduce((sum, item) => sum + item.cantidad, 0),
        total_bar_items: barItems.reduce((sum, item) => sum + item.cantidad, 0)
      };

      console.log('📋 Datos a enviar:', templateParams);

      const result = await emailjs.send(
        this.SERVICE_ID,
        this.TEMPLATE_ID,
        templateParams
      );

      console.log('✅ Email enviado exitosamente:', result);
      return true;

    } catch (error) {
      console.error('❌ Error enviando email:', error);
      return false;
    }
  }

  // ✅ FORMATEAR INFORMACIÓN DE PELÍCULAS PARA EMAIL
  private formatMoviesForEmail(cartItems: CartItem[]): string {
    return cartItems
      .filter(item => item.tipo === 'pelicula' && item.pelicula && item.funcion)
      .map((item, index) => `
🎬 ENTRADA ${index + 1}:
   • Película: ${item.pelicula!.titulo}
   • Género: ${item.pelicula!.genero}
   • Sala: ${item.funcion!.sala}
   • Fecha: ${item.funcion!.fecha}
   • Hora: ${item.funcion!.hora}
   • Formato: ${item.funcion!.formato}
   • Asientos: ${item.cantidad}
   • Precio: $${item.subtotal.toFixed(2)}
   ${item.precio > item.funcion!.precio ? '👑 ASIENTOS VIP' : '🪑 ASIENTOS ESTÁNDAR'}
`).join('\n');
  }

  // 🍿 NUEVO: FORMATEAR INFORMACIÓN DE PRODUCTOS DEL BAR PARA EMAIL
  private formatBarItemsForEmail(cartItems: CartItem[]): string {
    return cartItems
      .filter(item => item.tipo === 'bar' && item.barProduct)
      .map((item, index) => {
        let details = `
🍿 PRODUCTO ${index + 1}:
   • Producto: ${item.nombre || item.barProduct!.nombre}
   • Categoría: ${item.barProduct!.categoria}
   • Cantidad: ${item.cantidad}
   • Precio unitario: $${item.precio.toFixed(2)}
   • Subtotal: $${item.subtotal.toFixed(2)}`;

        // Agregar información de opciones si las hay
        if (item.barOptions) {
          if (item.barOptions.tamano) {
            details += `\n   • Tamaño: ${item.barOptions.tamano.nombre}`;
          }
          
          if (item.barOptions.extras && item.barOptions.extras.length > 0) {
            const extras = item.barOptions.extras.map(extra => extra.nombre).join(', ');
            details += `\n   • Extras: ${extras}`;
          }
          
          if (item.barOptions.notas && item.barOptions.notas.trim()) {
            details += `\n   • Notas: ${item.barOptions.notas}`;
          }
        }

        if (item.barProduct!.es_combo) {
          details += '\n   🎁 COMBO ESPECIAL';
        }

        return details;
      }).join('\n');
  }

  // ✅ VALIDAR CONFIGURACIÓN
  isConfigured(): boolean {
    return typeof emailjs !== 'undefined';
  }

  // ✅ TEST EMAIL ACTUALIZADO (para probar con ambos tipos de productos)
  async sendTestEmail(testEmail: string): Promise<boolean> {
    try {
      if (typeof emailjs === 'undefined') {
        throw new Error('EmailJS no está disponible');
      }

      const testParams = {
        to_email: testEmail,
        to_name: 'Usuario de Prueba',
        order_id: 'TEST-001',
        total_amount: '35.50',
        purchase_date: new Date().toLocaleDateString('es-ES'),
        payment_method: 'Tarjeta de Crédito',
        
        movies_details: `
🎬 ENTRADA 1:
   • Película: Avatar: El Camino del Agua
   • Género: Aventura
   • Sala: Sala 1 - IMAX
   • Fecha: 2024-12-20
   • Hora: 14:30
   • Formato: IMAX 3D
   • Asientos: 2
   • Precio: $25.00
   🪑 ASIENTOS ESTÁNDAR`,
   
        bar_details: `
🍿 PRODUCTO 1:
   • Producto: Combo Clásico
   • Categoría: Combos
   • Cantidad: 1
   • Precio unitario: $12.00
   • Subtotal: $12.00
   • Tamaño: Mediano
   🎁 COMBO ESPECIAL`,
   
        subtotal: '30.00',
        service_fee: '1.50',
        taxes: '2.40',
        phone: '+1 234 567 8900',
        has_movies: true,
        has_bar_items: true,
        total_tickets: 2,
        total_bar_items: 1
      };

      const result = await emailjs.send(
        this.SERVICE_ID,
        this.TEMPLATE_ID,
        testParams
      );

      console.log('✅ Email de prueba enviado:', result);
      return true;
    } catch (error) {
      console.error('❌ Error en email de prueba:', error);
      return false;
    }
  }

  // 🆕 NUEVO: Obtener resumen de compra para mostrar en la app
  getOrderSummary(cartItems: CartItem[]): {
    peliculas: any[],
    productosBar: any[],
    totalEntradas: number,
    totalProductosBar: number,
    tieneAmbos: boolean
  } {
    const peliculaItems = cartItems.filter(item => item.tipo === 'pelicula');
    const barItems = cartItems.filter(item => item.tipo === 'bar');
    
    return {
      peliculas: peliculaItems.map(item => ({
        titulo: item.pelicula?.titulo || 'Película desconocida',
        cantidad: item.cantidad,
        precio: item.subtotal
      })),
      productosBar: barItems.map(item => ({
        nombre: item.nombre || item.barProduct?.nombre || 'Producto desconocido',
        cantidad: item.cantidad,
        precio: item.subtotal
      })),
      totalEntradas: peliculaItems.reduce((sum, item) => sum + item.cantidad, 0),
      totalProductosBar: barItems.reduce((sum, item) => sum + item.cantidad, 0),
      tieneAmbos: peliculaItems.length > 0 && barItems.length > 0
    };
  }
}
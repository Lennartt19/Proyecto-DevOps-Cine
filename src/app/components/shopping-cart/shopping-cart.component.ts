import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CartService, CartItem } from '../../services/cart.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-shopping-cart',
  standalone: false,
  templateUrl: './shopping-cart.component.html',
  styleUrls: ['./shopping-cart.component.css']
})
export class ShoppingCartComponent implements OnInit, OnDestroy {

  cartItems: CartItem[] = [];
  cargando: boolean = true;
  procesandoPago: boolean = false;
  private cartSubscription: Subscription = new Subscription();

  constructor(
    private cartService: CartService,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.cargarCarrito();
  }

  ngOnDestroy(): void {
    this.cartSubscription.unsubscribe();
  }

  cargarCarrito(): void {
    this.cargando = true;
    
    // Suscribirse a los cambios del carrito
    this.cartSubscription = this.cartService.cart$.subscribe(items => {
      this.cartItems = items;
      this.cargando = false;
      console.log('Carrito actualizado:', this.cartItems);
    });
  }

  // ==================== MÉTODOS DE GESTIÓN DE ITEMS ====================

  eliminarItem(itemId: string): void {
    this.cartService.removeFromCart(itemId);
    this.toastService.showInfo('Item eliminado del carrito');
  }

  /**
   * 🆕 NUEVO: Cambiar cantidad de productos del bar
   */
  cambiarCantidad(itemId: string, nuevaCantidad: number): void {
    if (nuevaCantidad < 1 || nuevaCantidad > 10) {
      this.toastService.showWarning('La cantidad debe estar entre 1 y 10');
      return;
    }

    this.cartService.updateQuantity(itemId, nuevaCantidad);
    this.toastService.showSuccess('Cantidad actualizada');
  }

  limpiarCarrito(): void {
    // Mostrar modal de Bootstrap
    const modalElement = document.getElementById('limpiarCarritoModal');
    if (modalElement) {
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  confirmarLimpiarCarrito(): void {
    this.cartService.clearCart();
    this.toastService.showSuccess('Carrito vaciado completamente');
    
    // Cerrar modal
    const modalElement = document.getElementById('limpiarCarritoModal');
    if (modalElement) {
      const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
      if (modal) {
        modal.hide();
      }
    }
  }

  procederAlPago(): void {
    if (this.cartItems.length === 0) {
      this.toastService.showWarning('Tu carrito está vacío');
      return;
    }

    this.procesandoPago = true;

    // Simular validación
    setTimeout(() => {
      this.procesandoPago = false;
      this.router.navigate(['/checkout']);
    }, 1500);
  }

  // ==================== MÉTODOS DE CÁLCULO GENERALES ====================

  getTotalItems(): number {
    return this.cartService.getTotalItems();
  }

  getTotal(): number {
    return this.cartService.getTotal();
  }

  getServiceFee(): number {
    // Cargo por servicio del 5%
    return this.getTotal() * 0.05;
  }

  getTaxes(): number {
    // Impuestos del 8%
    return (this.getTotal() + this.getServiceFee()) * 0.08;
  }

  getFinalTotal(): number {
    return this.getTotal() + this.getServiceFee() + this.getTaxes();
  }

  // ==================== MÉTODOS ESPECÍFICOS POR TIPO ====================

  /**
   * 🆕 NUEVO: Verificar si hay películas en el carrito
   */
  tienePeliculas(): boolean {
    return this.cartItems.some(item => item.tipo === 'pelicula');
  }

  /**
   * 🆕 NUEVO: Verificar si hay productos del bar en el carrito
   */
  tieneProductosBar(): boolean {
    return this.cartItems.some(item => item.tipo === 'bar');
  }

  /**
   * 🆕 NUEVO: Obtener total de películas
   */
  getTotalPeliculas(): number {
    return this.cartItems
      .filter(item => item.tipo === 'pelicula')
      .reduce((total, item) => total + item.cantidad, 0);
  }

  /**
   * 🆕 NUEVO: Obtener total de productos del bar
   */
  getTotalProductosBar(): number {
    return this.cartItems
      .filter(item => item.tipo === 'bar')
      .reduce((total, item) => total + item.cantidad, 0);
  }

  /**
   * 🆕 NUEVO: Obtener subtotal de películas
   */
  getSubtotalPeliculas(): number {
    return this.cartItems
      .filter(item => item.tipo === 'pelicula')
      .reduce((total, item) => total + item.subtotal, 0);
  }

  /**
   * 🆕 NUEVO: Obtener subtotal de productos del bar
   */
  getSubtotalBar(): number {
    return this.cartItems
      .filter(item => item.tipo === 'bar')
      .reduce((total, item) => total + item.subtotal, 0);
  }

  // ==================== MÉTODOS AUXILIARES PARA EL TEMPLATE ====================

  /**
   * 🆕 NUEVO: Obtener nombre del item para mostrar
   */
  getItemDisplayName(item: CartItem): string {
    if (item.tipo === 'pelicula' && item.pelicula) {
      return item.pelicula.titulo;
    } else if (item.tipo === 'bar') {
      return item.nombre || item.barProduct?.nombre || 'Producto del bar';
    }
    return 'Item desconocido';
  }

  /**
   * 🆕 NUEVO: Obtener descripción del item
   */
  getItemDescription(item: CartItem): string {
    if (item.tipo === 'pelicula' && item.funcion) {
      return `${item.funcion.fecha} - ${item.funcion.hora} - ${item.funcion.sala}`;
    } else if (item.tipo === 'bar' && item.barOptions) {
      let description = '';
      
      if (item.barOptions.tamano) {
        description += `Tamaño: ${item.barOptions.tamano.nombre}`;
      }
      
      if (item.barOptions.extras && item.barOptions.extras.length > 0) {
        if (description) description += ' | ';
        description += `Extras: ${item.barOptions.extras.map(e => e.nombre).join(', ')}`;
      }
      
      return description;
    }
    return '';
  }

  /**
   * 🆕 NUEVO: Verificar si un producto del bar se puede editar la cantidad
   */
  puedeEditarCantidad(item: CartItem): boolean {
    return item.tipo === 'bar';
  }

  /**
   * 🆕 NUEVO: Obtener resumen del carrito
   */
  getCartSummary() {
    return this.cartService.getCartSummary();
  }

  // ==================== MÉTODOS EXISTENTES ====================

  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    
    const fechaObj = new Date(fecha + 'T00:00:00');
    return fechaObj.toLocaleDateString('es-ES', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * 🆕 NUEVO: Obtener icono según el tipo de item
   */
  getItemIcon(item: CartItem): string {
    switch (item.tipo) {
      case 'pelicula':
        return 'fas fa-film';
      case 'bar':
        return 'fas fa-utensils';
      default:
        return 'fas fa-question-circle';
    }
  }

  /**
   * 🆕 NUEVO: Obtener color del badge según categoría del bar
   */
  getBadgeClass(categoria: string): string {
    switch (categoria) {
      case 'Bebidas':
        return 'bg-primary';
      case 'Snacks':
        return 'bg-warning text-dark';
      case 'Dulces':
        return 'bg-info';
      case 'Combos':
        return 'bg-danger';
      case 'Helados':
        return 'bg-secondary';
      default:
        return 'bg-secondary';
    }
  }

  /**
   * 🆕 NUEVO: Navegar a un producto específico
   */
  verProducto(item: CartItem): void {
    if (item.tipo === 'pelicula' && item.pelicula) {
      // Necesitarías el índice de la película, esto podría requerir ajustes
      this.router.navigate(['/movies']); // Por ahora va a la lista
    } else if (item.tipo === 'bar' && item.barProduct) {
      this.router.navigate(['/bar', item.barProduct.id]);
    }
  }

  /**
   * 🆕 NUEVO: Obtener texto del botón de continuar comprando
   */
  getContinuarComprandoTexto(): string {
    if (this.tienePeliculas() && !this.tieneProductosBar()) {
      return 'Ver más películas';
    } else if (!this.tienePeliculas() && this.tieneProductosBar()) {
      return 'Ver más productos';
    } else {
      return 'Seguir comprando';
    }
  }

  /**
   * 🆕 NUEVO: Obtener mensaje del botón de checkout según el contenido
   */
  getCheckoutButtonText(): string {
    if (this.tienePeliculas() && !this.tieneProductosBar()) {
      return 'Comprar Entradas';
    } else if (!this.tienePeliculas() && this.tieneProductosBar()) {
      return 'Comprar Productos';
    } else {
      return 'Proceder al Pago';
    }
  }
}
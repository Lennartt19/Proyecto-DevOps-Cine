import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductoBar, TamañoProducto, ExtraProducto, BarService, ProductoCreateRequest } from '../../services/bar.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { CartService } from '../../services/cart.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-bar-detail',
  standalone: false,
  templateUrl: './bar-detail.component.html',
  styleUrl: './bar-detail.component.css'
})
export class BarDetailComponent implements OnInit, OnDestroy {

  producto: ProductoBar | null = null;
  productoId: number = -1;
  productoEditando: ProductoBar | null = null;
  
  // Estados booleanos
  guardandoEdicion = false;
  cargando = false;
  agregandoAlCarrito = false;
  
  // Mensajes
  errorEdicion = '';
  exitoEdicion = '';

  // Personalización
  tamanoSeleccionado: TamañoProducto | null = null;
  extrasSeleccionados: ExtraProducto[] = [];
  cantidad = 1;
  notasEspeciales = '';

  private subscriptions = new Subscription();

  constructor(
    private activatedRoute: ActivatedRoute,
    private barService: BarService,
    private router: Router,
    public authService: AuthService,
    private toastService: ToastService,
    private cartService: CartService
  ) {
    this.activatedRoute.params.subscribe(params => {
      this.productoId = +params['id'];
      this.cargarProducto();
    });
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private cargarProducto(): void {
    this.cargando = true;

    // Intentar cargar desde cache primero
    this.producto = this.barService.getProducto(this.productoId);
    
    if (this.producto) {
      this.inicializarSelecciones();
      this.cargando = false;
      return;
    }

    // Si no está en cache, cargar desde API
    const sub = this.barService.getProductoDesdeAPI(this.productoId).subscribe({
      next: (producto) => {
        this.producto = producto;
        this.inicializarSelecciones();
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar producto:', error);
        this.toastService.showError('Producto no encontrado');
        this.router.navigate(['/bar']);
        this.cargando = false;
      }
    });

    this.subscriptions.add(sub);
  }

  private inicializarSelecciones(): void {
    if (!this.producto) return;

    this.tamanoSeleccionado = this.producto.tamanos?.[0] || null;
    this.extrasSeleccionados = [];
    this.cantidad = 1;
    this.notasEspeciales = '';
  }

  seleccionarTamano(tamano: TamañoProducto): void {
    this.tamanoSeleccionado = tamano;
  }

  toggleExtra(extra: ExtraProducto): void {
    const index = this.extrasSeleccionados.findIndex(e => e.nombre === extra.nombre);
    index >= 0 ? this.extrasSeleccionados.splice(index, 1) : this.extrasSeleccionados.push(extra);
  }

  estaExtraSeleccionado(extra: ExtraProducto): boolean {
    return this.extrasSeleccionados.some(e => e.nombre === extra.nombre);
  }

  cambiarCantidad(incremento: number): void {
    const nuevaCantidad = this.cantidad + incremento;
    if (nuevaCantidad >= 1 && nuevaCantidad <= 10) {
      this.cantidad = nuevaCantidad;
    }
  }

  getPrecioBase(): number {
    if (!this.producto) return 0;
    if (this.tamanoSeleccionado) return this.tamanoSeleccionado.precio;
    
    // Usar es_combo en lugar de esCombo
    return this.producto.es_combo && this.producto.descuento 
      ? this.producto.precio - this.producto.descuento 
      : this.producto.precio;
  }

  getPrecioExtras(): number {
    return this.extrasSeleccionados.reduce((total, extra) => total + extra.precio, 0);
  }

  getPrecioPorUnidad(): number {
    return this.getPrecioBase() + this.getPrecioExtras();
  }

  getPrecioTotal(): number {
    return this.getPrecioPorUnidad() * this.cantidad;
  }

  tieneDescuento(): boolean {
    // Cambiar esCombo por es_combo
    return !!(this.producto?.es_combo && this.producto?.descuento);
  }

  getPrecioOriginal(): number {
    return this.producto?.precio || 0;
  }

  private crearProductoCarrito() {
    return {
      tipo: 'bar',
      producto: this.producto,
      cantidad: this.cantidad,
      precioTotal: this.getPrecioTotal(),
      opciones: {
        tamano: this.tamanoSeleccionado,
        extras: [...this.extrasSeleccionados],
        notas: this.notasEspeciales.trim()
      }
    };
  }

  private procesarCarrito(callback: () => void): void {
    if (!this.producto?.disponible) {
      this.toastService.showWarning('Este producto no está disponible');
      return;
    }

    this.agregandoAlCarrito = true;
    
    // 🆕 USAR Observable CORRECTAMENTE
    this.cartService.addToCart(this.crearProductoCarrito()).subscribe({
      next: (agregado) => {
        this.agregandoAlCarrito = false;
        
        if (agregado) {
          callback();
        } else {
          this.toastService.showError('Error al agregar al carrito');
        }
      },
      error: (error) => {
        console.error('❌ Error agregando al carrito:', error);
        this.agregandoAlCarrito = false;
        this.toastService.showError('Error al agregar al carrito');
      }
    });
  }

  agregarAlCarrito(): void {
    this.procesarCarrito(() => {
      const mensaje = this.cantidad === 1 
        ? `"${this.producto!.nombre}" agregado al carrito`
        : `${this.cantidad}x "${this.producto!.nombre}" agregados al carrito`;
      
      this.toastService.showSuccess(mensaje);
      this.mostrarOpcionesPostAgregar();
    });
  }

  private mostrarOpcionesPostAgregar(): void {
    const continuar = confirm(
      'Producto agregado al carrito!\n\nQué te gustaría hacer?\n\nAceptar = Ver carrito\nCancelar = Seguir comprando'
    );
    continuar ? this.irAlCarrito() : this.inicializarSelecciones();
  }

  irAlCarrito(): void {
    this.router.navigate(['/cart']);
  }

  comprarAhora(): void {
    this.procesarCarrito(() => this.router.navigate(['/checkout']));
  }

  private validarAdmin(): boolean {
    if (!this.authService.isAdmin()) {
      this.toastService.showError('No tienes permisos para realizar esta acción');
      return false;
    }
    return true;
  }

  editarProducto(): void {
    if (!this.validarAdmin() || !this.producto) return;

    // Crear una copia compatible con el formulario de edición
    this.productoEditando = { ...this.producto };
    this.resetearMensajes();
  }

  private resetearMensajes(): void {
    this.errorEdicion = '';
    this.exitoEdicion = '';
    this.guardandoEdicion = false;
  }

  guardarEdicionProducto(formulario: any): void {
    if (!this.validarAdmin() || !formulario.valid || !this.productoEditando) {
      this.errorEdicion = 'Por favor completa todos los campos requeridos';
      return;
    }

    this.guardandoEdicion = true;
    this.resetearMensajes();

    const validacion = this.barService.validateProductoData(this.productoEditando);
    if (!validacion.valid) {
      this.errorEdicion = validacion.errors.join(', ');
      this.guardandoEdicion = false;
      return;
    }

    // Convertir a formato de backend para la actualización
    const productoParaActualizar: Partial<ProductoCreateRequest> = {
      nombre: this.productoEditando.nombre,
      descripcion: this.productoEditando.descripcion,
      precio: this.productoEditando.precio,
      categoria: this.productoEditando.categoria,
      imagen: this.productoEditando.imagen || undefined,
      disponible: this.productoEditando.disponible,
      es_combo: this.productoEditando.es_combo,
      descuento: this.productoEditando.descuento,
      tamanos: this.productoEditando.tamanos?.map(t => ({ 
        nombre: t.nombre, 
        precio: t.precio 
      })) || [],
      extras: this.productoEditando.extras?.map(e => ({ 
        nombre: e.nombre, 
        precio: e.precio 
      })) || [],
      combo_items: this.productoEditando.combo_items?.map(c => ({ 
        item_nombre: c.item_nombre 
      })) || []
    };

    setTimeout(() => {
      const exito = this.barService.updateProducto(this.productoId, productoParaActualizar);
      
      if (exito) {
        this.exitoEdicion = `Producto "${this.productoEditando!.nombre}" actualizado exitosamente`;
        this.toastService.showSuccess('Producto actualizado exitosamente');
        this.recargarProducto();
        
        setTimeout(() => {
          this.cerrarModalEdicion();
          this.resetearEdicion();
        }, 2000);
      } else {
        this.errorEdicion = 'Error al actualizar el producto. Por favor intenta de nuevo.';
        this.toastService.showError('Error al actualizar el producto');
      }
      
      this.guardandoEdicion = false;
    }, 1500);
  }

  confirmarEliminarProducto(): void {
    if (!this.validarAdmin() || !this.producto) return;

    const confirmar = confirm(
      `Estás seguro de que quieres eliminar "${this.producto.nombre}"?\n\nEsta acción no se puede deshacer.\nSerás redirigido a la lista de productos.`
    );

    if (confirmar) {
      const nombreProducto = this.producto.nombre;
      const exito = this.barService.deleteProducto(this.productoId);
      
      if (exito) {
        this.toastService.showSuccess(`Producto "${nombreProducto}" eliminado exitosamente`);
        setTimeout(() => this.router.navigate(['/bar']), 1500);
      } else {
        this.toastService.showError('Error al eliminar el producto');
      }
    }
  }

  toggleDisponibilidad(): void {
    if (!this.validarAdmin() || !this.producto) return;

    const exito = this.barService.toggleDisponibilidad(this.producto.id);
    
    if (exito) {
      const estado = this.producto.disponible ? 'deshabilitado' : 'habilitado';
      this.toastService.showSuccess(`Producto ${estado} exitosamente`);
      this.recargarProducto();
    } else {
      this.toastService.showError('Error al cambiar disponibilidad');
    }
  }

  private recargarProducto(): void {
    // Recargar desde la API para obtener los datos más recientes
    const sub = this.barService.getProductoDesdeAPI(this.productoId).subscribe({
      next: (producto) => {
        this.producto = producto;
        this.inicializarSelecciones();
      },
      error: (error) => {
        console.error('Error al recargar producto:', error);
        // Fallback al cache local
        this.producto = this.barService.getProducto(this.productoId);
      }
    });

    this.subscriptions.add(sub);
  }

  private resetearEdicion(): void {
    this.productoEditando = null;
    this.resetearMensajes();
  }

  private cerrarModalEdicion(): void {
    const modalElement = document.getElementById('modalEditarProducto');
    const modal = modalElement ? (window as any).bootstrap.Modal.getInstance(modalElement) : null;
    modal?.hide();
  }

  volverALista(): void {
    this.router.navigate(['/bar']);
  }

  irAAdminBar(): void {
    if (this.validarAdmin()) {
      this.router.navigate(['/admin/bar']);
    }
  }

  esFormularioValido(): boolean {
    if (!this.producto) return false;
    if (this.producto.tamanos?.length && !this.tamanoSeleccionado) return false;
    return this.cantidad >= 1 && this.cantidad <= 10;
  }

  getResumenSelecciones(): string {
    const partes: string[] = [];
    
    if (this.tamanoSeleccionado) {
      partes.push(`Tamaño: ${this.tamanoSeleccionado.nombre}`);
    }
    
    if (this.extrasSeleccionados.length) {
      partes.push(`Extras: ${this.extrasSeleccionados.map(e => e.nombre).join(', ')}`);
    }
    
    if (this.notasEspeciales.trim()) {
      partes.push(`Notas: ${this.notasEspeciales.trim()}`);
    }

    return partes.join('\n');
  }

  getResumenSeleccionesHTML(): string {
    return this.getResumenSelecciones().replace(/\n/g, '<br>');
  }
}
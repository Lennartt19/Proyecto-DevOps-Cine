// src/app/components/admin/admin-bar/admin-bar.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { ProductoBar, BarService, ProductoCreateRequest } from '../../../services/bar.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-admin-bar',
  standalone: false,
  templateUrl: './admin-bar.component.html',
  styleUrl: './admin-bar.component.css'
})
export class AdminBarComponent implements OnInit, OnDestroy {
  // ==================== PROPIEDADES DE IMAGEN ====================
  imageLoaded = false;
  imageError = false;

  // ==================== DATOS PRINCIPALES ====================
  productos: ProductoBar[] = [];
  productosFiltrados: ProductoBar[] = [];
  
  // ==================== ESTADOS DE VISTA ====================
  vistaActual: 'lista' | 'agregar' | 'editar' = 'lista';
  cargando = true;
  procesando = false;
  
  // ==================== FORMULARIO DE PRODUCTO ====================
  productoForm: Partial<ProductoCreateRequest> = {};
  productoEditandoId = -1;
  erroresValidacion: string[] = [];
  
  // ==================== FILTROS Y BÚSQUEDA ====================
  filtroCategoria = '';
  filtroDisponibilidad = '';
  terminoBusqueda = '';
  
  // ==================== PAGINACIÓN ====================
  paginaActual = 1;
  productosPorPagina = 10;
  totalPaginas = 1;
  
  // ==================== MODAL DE CONFIRMACIÓN ====================
  mostrarModalConfirmacion = false;
  productoParaEliminar = -1;
  
  // ==================== SUBSCRIPCIONES ====================
  private subscriptions = new Subscription();
  
  // ==================== ESTADÍSTICAS ====================
  estadisticas = {
    total: 0,
    disponibles: 0,
    noDisponibles: 0,
    combos: 0,
    porCategoria: {} as { [key: string]: number }
  };
  
  // ==================== CONSTANTES ====================
  readonly categoriasDisponibles = [
    'bebidas', 'snacks', 'dulces', 'combos', 'helados', 'comida', 'otros'
  ];

  constructor(
    private barService: BarService,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  // ==================== LIFECYCLE HOOKS ====================
  
  ngOnInit(): void {
    if (!this.authService.isAdmin()) {
      this.toastService.showError('No tienes permisos para gestionar productos del bar');
      this.router.navigate(['/home']);
      return;
    }

    this.cargarProductos();
    this.suscribirQueryParams();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // ==================== MANEJO DE IMAGEN ====================

  onImageError(event: any): void {
    this.imageError = true;
    this.imageLoaded = false;
  }

  onImageLoad(event: any): void {
    this.imageError = false;
    this.imageLoaded = true;
  }

  setExampleImage(url: string): void {
    this.productoForm.imagen = url;
    this.imageError = false;
    this.imageLoaded = false;
  }

  // ==================== INICIALIZACIÓN ====================

  private suscribirQueryParams(): void {
    const sub = this.route.queryParams.subscribe(params => {
      if (params['action'] === 'add') {
        setTimeout(() => {
          this.mostrarFormularioAgregar();
          this.toastService.showSuccess('Formulario de agregar producto activado');
        }, 800);
      }
    });
    this.subscriptions.add(sub);
  }

  private cargarProductos(): void {
    this.cargando = true;
    
    const sub = this.barService.getProductosObservable().subscribe({
      next: (productos) => {
        this.productos = productos;
        this.aplicarFiltros();
        this.calcularEstadisticas();
        this.cargando = false;
        console.log('Productos del bar cargados:', this.productos.length);
      },
      error: (error) => {
        console.error('Error al cargar productos:', error);
        this.toastService.showError('Error al cargar los productos del bar');
        this.cargando = false;
        
        // Fallback a datos locales si falla la API
        this.productos = this.barService.getProductos();
        this.aplicarFiltros();
        this.calcularEstadisticas();
      }
    });
    
    this.subscriptions.add(sub);
  }

  // ==================== GESTIÓN DE VISTA ====================

  cambiarVista(vista: 'lista' | 'agregar' | 'editar'): void {
    this.vistaActual = vista;
    
    if (vista === 'lista') {
      this.resetearFormulario();
      this.router.navigate(['/admin/bar']);
    }
  }

  mostrarFormularioAgregar(): void {
    this.resetearFormulario();
    this.vistaActual = 'agregar';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  mostrarFormularioEditar(producto: ProductoBar): void {
    this.prepararFormularioParaEdicion(producto);
    this.productoEditandoId = producto.id;
    this.vistaActual = 'editar';
    this.erroresValidacion = [];
    this.resetearEstadosImagen();
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    console.log('Editando producto:', producto.nombre);
  }

  private prepararFormularioParaEdicion(producto: ProductoBar): void {
    this.productoForm = {
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      precio: producto.precio,
      categoria: producto.categoria,
      imagen: producto.imagen || undefined,
      disponible: producto.disponible,
      es_combo: producto.es_combo,
      descuento: producto.descuento,
      tamanos: producto.tamanos?.map(t => ({ nombre: t.nombre, precio: t.precio })) || [],
      extras: producto.extras?.map(e => ({ nombre: e.nombre, precio: e.precio })) || [],
      combo_items: producto.combo_items?.map(c => ({ item_nombre: c.item_nombre })) || []
    };
  }

  // ==================== CRUD DE PRODUCTOS ====================

  async guardarProducto(): Promise<void> {
    console.log('🔍 Estado actual del formulario:', this.productoForm);
    
    const validacion = this.validarFormulario();
    if (!validacion.esValido) {
      this.manejarErroresValidacion(validacion.errores);
      return;
    }

    const productoParaEnviar = this.limpiarFormularioParaEnvio();
    console.log('📤 Datos que se enviarán:', productoParaEnviar);

    this.procesando = true;
    this.erroresValidacion = [];

    try {
      const esAgregar = this.vistaActual === 'agregar';
      
      if (esAgregar) {
        await this.crearProducto(productoParaEnviar);
      } else {
        await this.actualizarProducto(productoParaEnviar);
      }
        
    } catch (error) {
      console.error('❌ Error inesperado:', error);
      this.toastService.showError('Error inesperado al guardar el producto');
      this.procesando = false;
    }
  }

  private validarFormulario(): { esValido: boolean; errores: string[] } {
    const validacion = this.barService.validateProductoData(this.productoForm as ProductoBar);
    
    if (!validacion.valid) {
      console.log('❌ Errores de validación:', validacion.errors);
      return { esValido: false, errores: validacion.errors };
    }
    
    return { esValido: true, errores: [] };
  }

  private manejarErroresValidacion(errores: string[]): void {
    this.erroresValidacion = errores;
    this.toastService.showError('Por favor corrige los errores en el formulario');
  }

  private async crearProducto(productoParaEnviar: ProductoCreateRequest): Promise<void> {
    console.log('➕ Creando nuevo producto...');
    
    const sub = this.barService.addProducto(productoParaEnviar).subscribe({
      next: (resultado) => this.manejarExitoCreacion(resultado),
      error: (error) => this.manejarErrorCreacion(error)
    });
    this.subscriptions.add(sub);
  }

  private async actualizarProducto(productoParaEnviar: ProductoCreateRequest): Promise<void> {
    console.log('✏️ Actualizando producto existente...');
    
    const sub = this.barService.updateProducto(this.productoEditandoId, productoParaEnviar).subscribe({
      next: (resultado) => this.manejarExitoActualizacion(resultado),
      error: (error) => this.manejarErrorActualizacion(error)
    });
    this.subscriptions.add(sub);
  }

  private manejarExitoCreacion(resultado: any): void {
    console.log('✅ Producto creado exitosamente:', resultado);
    if (resultado) {
      this.toastService.showSuccess('Producto agregado exitosamente');
      this.finalizarOperacionExitosa();
    }
    this.procesando = false;
  }

  private manejarExitoActualizacion(resultado: any): void {
    console.log('✅ Producto actualizado exitosamente:', resultado);
    if (resultado) {
      this.toastService.showSuccess('Producto actualizado exitosamente');
      this.finalizarOperacionExitosa();
    } else {
      this.toastService.showError('Error al actualizar el producto');
    }
    this.procesando = false;
  }

  private finalizarOperacionExitosa(): void {
    this.cargarProductos();
    this.vistaActual = 'lista';
    this.router.navigate(['/admin/bar']);
  }

  private manejarErrorCreacion(error: any): void {
    console.error('❌ Error completo al crear producto:', error);
    const mensajeError = this.obtenerMensajeError(error, 'Error al crear el producto');
    this.procesarErrorOperacion(error, mensajeError);
  }

  private manejarErrorActualizacion(error: any): void {
    console.error('❌ Error completo al actualizar producto:', error);
    let mensajeError = this.obtenerMensajeError(error, 'Error al actualizar el producto');
    
    if (error.status === 404) {
      mensajeError = 'El producto que intentas actualizar no existe';
    }
    
    this.procesarErrorOperacion(error, mensajeError);
  }

  private obtenerMensajeError(error: any, mensajePorDefecto: string): string {
    if (error.status === 400) {
      return this.procesarErrorBadRequest(error);
    } else if (error.status === 401) {
      return 'No tienes permisos para realizar esta acción';
    } else if (error.status === 500) {
      return 'Error interno del servidor';
    } else if (error.status === 0) {
      return 'No se puede conectar con el servidor';
    }
    
    return mensajePorDefecto;
  }

  private procesarErrorBadRequest(error: any): string {
    if (error.error && error.error.errors) {
      if (Array.isArray(error.error.errors)) {
        this.erroresValidacion = error.error.errors.map((err: any) => err.msg || err.message || err);
      } else {
        this.erroresValidacion = [error.error.errors];
      }
      return 'Datos del formulario inválidos';
    } else if (error.error && error.error.message) {
      return error.error.message;
    }
    
    return 'Datos del formulario inválidos';
  }

  private procesarErrorOperacion(error: any, mensajeError: string): void {
    this.toastService.showError(mensajeError);
    this.procesando = false;
  }

  // ==================== ELIMINACIÓN DE PRODUCTOS ====================

  confirmarEliminarProducto(producto: ProductoBar): void {
    this.productoParaEliminar = producto.id;
    this.mostrarModalConfirmacion = true;
  }

  async eliminarProducto(): Promise<void> {
    if (this.productoParaEliminar <= 0) return;
    
    this.procesando = true;
    
    try {
      await this.delay(1000);
      
      const nombreProducto = this.obtenerNombreProducto();
      const resultado = this.barService.deleteProducto(this.productoParaEliminar);
      
      if (resultado) {
        this.actualizarDatosDespuesEliminacion(nombreProducto);
      } else {
        this.toastService.showError('Error al eliminar el producto');
      }
      
      this.procesando = false;
      
    } catch (error) {
      console.error('Error al procesar eliminación:', error);
      this.toastService.showError('Error inesperado al eliminar el producto');
      this.procesando = false;
    } finally {
      this.cerrarModalConfirmacion();
    }
  }

  private obtenerNombreProducto(): string {
    return this.productos.find(p => p.id === this.productoParaEliminar)?.nombre || 'Producto';
  }

  private actualizarDatosDespuesEliminacion(nombreProducto: string): void {
    this.productos = this.productos.filter(p => p.id !== this.productoParaEliminar);
    this.aplicarFiltros();
    this.calcularEstadisticas();
    
    this.toastService.showSuccess(`"${nombreProducto}" eliminado exitosamente`);
    
    setTimeout(() => {
      this.cargarProductos();
    }, 500);
  }

  cerrarModalConfirmacion(): void {
    this.mostrarModalConfirmacion = false;
    this.productoParaEliminar = -1;
  }

  toggleDisponibilidad(producto: ProductoBar): void {
    const exito = this.barService.toggleDisponibilidad(producto.id);
    
    if (exito) {
      setTimeout(() => this.cargarProductos(), 500);
    }
  }

  // ==================== FILTROS Y BÚSQUEDA ====================

  aplicarFiltros(): void {
    this.productosFiltrados = this.productos.filter(producto => {
      return this.cumpleFiltroTexto(producto) && 
             this.cumpleFiltroCategoria(producto) && 
             this.cumpleFiltroDisponibilidad(producto);
    });

    this.calcularPaginacion();
  }

  private cumpleFiltroTexto(producto: ProductoBar): boolean {
    if (!this.terminoBusqueda.trim()) return true;
    
    const termino = this.terminoBusqueda.toLowerCase();
    return [producto.nombre, producto.descripcion, producto.categoria]
      .some(campo => campo.toLowerCase().includes(termino));
  }

  private cumpleFiltroCategoria(producto: ProductoBar): boolean {
    return !this.filtroCategoria || 
           producto.categoria.toLowerCase() === this.filtroCategoria.toLowerCase();
  }

  private cumpleFiltroDisponibilidad(producto: ProductoBar): boolean {
    return this.filtroDisponibilidad === '' || 
           producto.disponible === (this.filtroDisponibilidad === 'true');
  }

  limpiarFiltros(): void {
    this.terminoBusqueda = '';
    this.filtroCategoria = '';
    this.filtroDisponibilidad = '';
    this.paginaActual = 1;
    
    this.aplicarFiltros();
    this.toastService.showInfo('Filtros limpiados');
  }

  // ==================== PAGINACIÓN ====================

  calcularPaginacion(): void {
    this.totalPaginas = Math.ceil(this.productosFiltrados.length / this.productosPorPagina);
    this.paginaActual = Math.min(this.paginaActual, Math.max(1, this.totalPaginas));
  }

  getProductosPaginaActual(): ProductoBar[] {
    const inicio = (this.paginaActual - 1) * this.productosPorPagina;
    return this.productosFiltrados.slice(inicio, inicio + this.productosPorPagina);
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
    }
  }

  getPaginasArray(): number[] {
    const inicio = Math.max(1, this.paginaActual - 2);
    const fin = Math.min(this.totalPaginas, this.paginaActual + 2);
    
    return Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);
  }

  // ==================== ESTADÍSTICAS ====================

  private calcularEstadisticas(): void {
    const stats = this.productos.reduce((acc, producto) => {
      acc.total++;
      if (producto.disponible) acc.disponibles++;
      else acc.noDisponibles++;
      if (producto.es_combo) acc.combos++;
      
      acc.porCategoria[producto.categoria] = (acc.porCategoria[producto.categoria] || 0) + 1;
      
      return acc;
    }, {
      total: 0,
      disponibles: 0,
      noDisponibles: 0,
      combos: 0,
      porCategoria: {} as { [key: string]: number }
    });

    this.estadisticas = stats;
  }

  // ==================== GESTIÓN DE FORMULARIO ====================

  private resetearFormulario(): void {
    this.productoForm = {
      nombre: '',
      descripcion: '',
      precio: 0,
      categoria: '',
      imagen: '',
      disponible: true,
      es_combo: false,
      descuento: 0,
      tamanos: [],
      extras: [],
      combo_items: []
    };
    this.productoEditandoId = -1;
    this.erroresValidacion = [];
    this.resetearEstadosImagen();
  }

  private resetearEstadosImagen(): void {
    this.imageError = false;
    this.imageLoaded = false;
  }

  private limpiarFormularioParaEnvio(): ProductoCreateRequest {
    const form = this.productoForm;
    
    console.log('🔧 Frontend - Formulario antes de limpiar:', JSON.stringify(form, null, 2));
    
    const resultado: any = {
      nombre: (form.nombre || '').trim(),
      descripcion: (form.descripcion || '').trim(),
      precio: Number(form.precio) || 0,
      categoria: (form.categoria || '').trim(),
      disponible: Boolean(form.disponible !== false),
      es_combo: Boolean(form.es_combo)
    };

    if (form.imagen && form.imagen.trim()) {
      resultado.imagen = form.imagen.trim();
    }

    if (form.es_combo && form.descuento !== undefined && Number(form.descuento) >= 0) {
      resultado.descuento = Number(form.descuento);
    }
    
    resultado.tamanos = this.limpiarTamanos(form.tamanos || []);
    resultado.extras = this.limpiarExtras(form.extras || []);
    resultado.combo_items = this.limpiarComboItems(form.combo_items || []);

    console.log('🔧 Frontend - Datos después de limpiar:', JSON.stringify(resultado, null, 2));
    console.log('🔧 Frontend - Extras específicamente:', resultado.extras);
    console.log('🔧 Frontend - Tamaños específicamente:', resultado.tamanos);

    return resultado;
  }
  
  private limpiarTamanos(tamanos: any[]): any[] {
    if (!Array.isArray(tamanos)) {
      console.warn('⚠️ tamanos no es un array:', tamanos);
      return [];
    }
    
    const result = tamanos
      .filter(t => {
        const isValid = t && t.nombre && t.nombre.trim() && 
                        t.precio !== undefined && t.precio >= 0;
        if (!isValid) {
          console.warn('⚠️ Tamaño inválido filtrado:', t);
        }
        return isValid;
      })
      .map(t => ({
        nombre: String(t.nombre).trim(),
        precio: Number(t.precio)
      }));
    
    console.log('🔧 Tamaños limpiados:', result);
    return result;
  }
  
  private limpiarExtras(extras: any[]): any[] {
    if (!Array.isArray(extras)) {
      console.warn('⚠️ extras no es un array:', extras);
      return [];
    }
    
    const result = extras
      .filter(e => {
        const isValid = e && e.nombre && e.nombre.trim() && 
                        e.precio !== undefined && e.precio >= 0;
        if (!isValid) {
          console.warn('⚠️ Extra inválido filtrado:', e);
        }
        return isValid;
      })
      .map(e => ({
        nombre: String(e.nombre).trim(),
        precio: Number(e.precio)
      }));
    
    console.log('🔧 Extras limpiados:', result);
    return result;
  }
  
  private limpiarComboItems(comboItems: any[]): any[] {
    if (!Array.isArray(comboItems)) {
      console.warn('⚠️ combo_items no es un array:', comboItems);
      return [];
    }
    
    const result = comboItems
      .filter(c => {
        const isValid = c && c.item_nombre && c.item_nombre.trim();
        if (!isValid) {
          console.warn('⚠️ Combo item inválido filtrado:', c);
        }
        return isValid;
      })
      .map(c => ({
        item_nombre: String(c.item_nombre).trim()
      }));
    
    console.log('🔧 Combo items limpiados:', result);
    return result;
  }

  // ==================== GESTIÓN DE ARRAYS DINÁMICOS ====================

  agregarTamano(): void {
    if (!this.productoForm.tamanos) {
      this.productoForm.tamanos = [];
    }
    this.productoForm.tamanos.push({ nombre: '', precio: 0 });
  }

  removerTamano(index: number): void {
    this.productoForm.tamanos?.splice(index, 1);
  }

  agregarExtra(): void {
    if (!this.productoForm.extras) {
      this.productoForm.extras = [];
    }
    this.productoForm.extras.push({ nombre: '', precio: 0 });
  }

  removerExtra(index: number): void {
    this.productoForm.extras?.splice(index, 1);
  }

  agregarItemCombo(): void {
    if (!this.productoForm.combo_items) {
      this.productoForm.combo_items = [];
    }
    this.productoForm.combo_items.push({ item_nombre: '' });
  }

  removerItemCombo(index: number): void {
    this.productoForm.combo_items?.splice(index, 1);
  }

  // ==================== UTILIDADES DE VISTA ====================

  getRangoElementos(): string {
    if (!this.productosFiltrados.length) return '0-0 de 0';
    
    const inicio = (this.paginaActual - 1) * this.productosPorPagina + 1;
    const fin = Math.min(this.paginaActual * this.productosPorPagina, this.productosFiltrados.length);
    
    return `${inicio}-${fin} de ${this.productosFiltrados.length}`;
  }

  getCategoriaClass(categoria: string): string {
    const clases: Record<string, string> = {
      'bebidas': 'bg-primary',
      'snacks': 'bg-warning',
      'dulces': 'bg-info',
      'combos': 'bg-danger',
      'helados': 'bg-success',
      'comida': 'bg-secondary'
    };
    
    return clases[categoria.toLowerCase()] || 'bg-secondary';
  }

  formatearPrecio(precio: number): string {
    return `${precio.toFixed(2)}`;
  }

  trackProductoFn(index: number, producto: ProductoBar): number {
    return producto.id;
  }

  // ==================== EXPORTACIÓN ====================

  exportarProductos(): void {
    this.procesando = true;
    this.toastService.showInfo('Generando exportación de productos del bar en PDF...');

    setTimeout(() => {
      try {
        const doc = new jsPDF();
        
        this.setupPDFHeader(doc, 'EXPORTACIÓN DE PRODUCTOS DEL BAR', 
          `Lista de productos del bar - ${this.productosFiltrados.length} productos`);
        
        let currentY = this.agregarFiltrosAlPDF(doc, 110);
        this.agregarTablaProductos(doc, currentY);
        
        this.setupPDFFooter(doc, 'Productos del Bar');
        doc.save(`productos-bar-export-${this.getFechaHoy()}.pdf`);
        
        this.procesando = false;
        this.toastService.showSuccess('Exportación de productos del bar completada en PDF');
        
      } catch (error) {
        console.error('Error generando exportación:', error);
        this.procesando = false;
        this.toastService.showError('Error al generar la exportación PDF');
      }
    }, 1000);
  }

  private agregarFiltrosAlPDF(doc: jsPDF, currentY: number): number {
    if (this.terminoBusqueda || this.filtroCategoria || this.filtroDisponibilidad !== '') {
      doc.setFillColor(240, 240, 240);
      doc.rect(20, currentY - 5, 170, 15, 'F');
      doc.setFontSize(12);
      doc.setTextColor(52, 73, 94);
      doc.text('FILTROS APLICADOS', 25, currentY + 5);
      currentY += 20;
      
      const filtros = this.construirArrayFiltros();
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      filtros.forEach(filtro => {
        doc.text(`• ${filtro}`, 25, currentY);
        currentY += 8;
      });
      currentY += 10;
    }
    
    return currentY;
  }

  private construirArrayFiltros(): string[] {
    const filtros = [];
    if (this.terminoBusqueda) filtros.push(`Búsqueda: "${this.terminoBusqueda}"`);
    if (this.filtroCategoria) filtros.push(`Categoría: ${this.filtroCategoria}`);
    if (this.filtroDisponibilidad !== '') {
      filtros.push(`Estado: ${this.filtroDisponibilidad === 'true' ? 'Disponibles' : 'No disponibles'}`);
    }
    return filtros;
  }

  private agregarTablaProductos(doc: jsPDF, currentY: number): void {
    const productosData = this.productosFiltrados.map((producto, index) => [
      (index + 1).toString(),
      producto.nombre.length > 25 ? producto.nombre.substring(0, 25) + '...' : producto.nombre,
      producto.categoria,
      `$${producto.precio.toFixed(2)}`,
      producto.es_combo ? 'Sí' : 'No',
      producto.disponible ? 'Disponible' : 'No disponible',
      producto.descuento ? `$${producto.descuento.toFixed(2)}` : 'N/A'
    ]);
    
    autoTable(doc, {
      head: [['#', 'Nombre', 'Categoría', 'Precio', 'Es Combo', 'Estado', 'Descuento']],
      body: productosData,
      startY: currentY,
      theme: 'striped',
      headStyles: { 
        fillColor: [255, 193, 7],
        textColor: [0, 0, 0],
        fontSize: 10,
        fontStyle: 'bold'
      },
      styles: { 
        fontSize: 8,
        cellPadding: { top: 3, right: 4, bottom: 3, left: 4 }
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 45 },
        2: { cellWidth: 25 },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 25, halign: 'center' },
        6: { cellWidth: 20, halign: 'center' }
      },
      alternateRowStyles: { fillColor: [248, 249, 250] }
    });
  }

  private setupPDFHeader(doc: jsPDF, titulo: string, subtitulo?: string): void {
    // Header amarillo
    doc.setFillColor(255, 193, 7);
    doc.rect(0, 0, 210, 45, 'F');
    
    // Logo y título principal
    doc.setFontSize(24);
    doc.setTextColor(0, 0, 0);
    doc.text('ParkyFilms', 20, 25);
    
    doc.setFontSize(12);
    doc.text('Gestión del Bar', 20, 35);
    
    // Título del reporte
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text(titulo, 20, 60);
    
    if (subtitulo) {
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(subtitulo, 20, 72);
    }
    
    // Información de generación
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    const fechaGeneracion = new Date().toLocaleString('es-ES');
    doc.text(`Generado el: ${fechaGeneracion}`, 20, 85);
    doc.text(`Por: ${this.authService.getCurrentUser()?.nombre || 'Admin'}`, 20, 95);
    
    // Línea separadora
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(20, 100, 190, 100);
  }
  
  private setupPDFFooter(doc: jsPDF, seccion: string): void {
    const pageCount = (doc as any).internal.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Línea superior del footer
      doc.setDrawColor(255, 193, 7);
      doc.setLineWidth(1);
      doc.line(20, 275, 190, 275);
      
      // Información del footer
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`ParkyFilms - ${seccion}`, 20, 282);
      doc.text('Documento Confidencial - Solo uso interno', 20, 287);
      
      // Número de página
      doc.setTextColor(255, 193, 7);
      doc.text(`Página ${i} de ${pageCount}`, 150, 282);
      
      const timestamp = new Date().toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      doc.text(`Hora: ${timestamp}`, 150, 287);
    }
  }

  // ==================== MÉTODOS AUXILIARES ====================

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private descargarJSON(data: any, filename: string): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    Object.assign(link, { href: url, download: filename });
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  private getFechaHoy(): string {
    return new Date().toISOString().split('T')[0];
  }
}
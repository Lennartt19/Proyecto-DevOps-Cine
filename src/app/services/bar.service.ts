import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { environment } from '../../environments/environment';

// ==================== INTERFACES (mantener todas las existentes) ====================
export interface ProductoBar {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  imagen: string | null;
  disponible: boolean;
  es_combo: boolean;
  descuento?: number;
  eliminado?: boolean;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
  tamanos?: TamañoProducto[];
  extras?: ExtraProducto[];
  combo_items?: ComboItem[];
}

export interface TamañoProducto {
  id?: number;
  nombre: string;
  precio: number;
}

export interface ExtraProducto {
  id?: number;
  nombre: string;
  precio: number;
}

export interface ComboItem {
  id?: number;
  item_nombre: string;
}

export interface CategoriaCount {
  categoria: string;
  total_productos: number;
}

export interface APIResponse<T> {
  success: boolean;
  message: string;
  data: T;
  total?: number;
}

export interface ProductoCreateRequest {
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  imagen?: string;
  disponible?: boolean;
  es_combo?: boolean;
  descuento?: number;
  tamanos?: Omit<TamañoProducto, 'id'>[];
  extras?: Omit<ExtraProducto, 'id'>[];
  combo_items?: Omit<ComboItem, 'id'>[];
}

@Injectable({
  providedIn: 'root'
})
export class BarService {

  private readonly API_URL = `${environment.apiUrl}/bar`;
  
  // Cache local
  private productosSubject = new BehaviorSubject<ProductoBar[]>([]);
  public productos$ = this.productosSubject.asObservable();
  
  private categoriasSubject = new BehaviorSubject<string[]>([]);
  public categorias$ = this.categoriasSubject.asObservable();
  
  // Estados
  private cargando = false;
  private productosCache: ProductoBar[] = [];
  private categoriasCache: string[] = [];

  // 🔧 FIX: Control de logs para evitar spam
  private debugMode: boolean = false;
  private logCount: number = 0;
  private maxLogs: number = 5;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private toastService: ToastService
  ) {
    console.log('🍿 BarService inicializado - API URL:', this.API_URL);
    this.cargarProductosIniciales();
  }

  // ==================== MÉTODOS DE LOG CONTROLADOS ====================

  private logDebug(message: string, data?: any): void {
    if (this.debugMode && this.logCount < this.maxLogs) {
      console.log(message, data || '');
      this.logCount++;
    }
  }

  private logInfo(message: string): void {
    if (this.logCount < this.maxLogs) {
      console.log(message);
      this.logCount++;
    }
  }

  enableDebugMode(): void {
    this.debugMode = true;
    this.logCount = 0;
    console.log('🔧 BarService: Modo debug activado');
  }

  disableDebugMode(): void {
    this.debugMode = false;
    console.log('🔧 BarService: Modo debug desactivado');
  }

  // ==================== MÉTODOS PRINCIPALES ====================

  getProductos(): ProductoBar[] {
    if (this.productosCache.length === 0) {
      this.cargarProductosDesdeAPI();
    }
    return this.productosCache;
  }

  getProductosObservable(): Observable<ProductoBar[]> {
    this.cargando = true;
    
    return this.http.get<APIResponse<ProductoBar[]>>(this.API_URL).pipe(
      map(response => {
        // 🔧 FIX: Solo log en modo debug
        this.logDebug('📡 Respuesta completa de productos:', response);
        
        if (response && response.success && response.data) {
          this.productosCache = this.adaptarProductosDesdeAPI(response.data);
          this.productosSubject.next(this.productosCache);
          return this.productosCache;
        } else {
          this.logDebug('⚠️ Respuesta inesperada:', response);
          throw new Error(response?.message || 'Error al obtener productos');
        }
      }),
      catchError(error => {
        this.logInfo('❌ Error al cargar productos desde API');
        
        if (error.status === 404) {
          this.logDebug('📝 No se encontraron productos (404) - usando array vacío');
          this.productosCache = [];
          this.productosSubject.next(this.productosCache);
          return [];
        }
        
        return this.handleError('Error al cargar productos')(error);
      }),
      tap(() => this.cargando = false)
    );
  }

  getProducto(id: number): ProductoBar | null {
    return this.productosCache.find(p => p.id === id) || null;
  }

  getProductoDesdeAPI(id: number): Observable<ProductoBar> {
    return this.http.get<APIResponse<ProductoBar>>(`${this.API_URL}/${id}`).pipe(
      map(response => {
        if (response && response.success && response.data) {
          return this.adaptarProductoDesdeAPI(response.data);
        }
        throw new Error(response?.message || 'Producto no encontrado');
      }),
      catchError(this.handleError(`Error al obtener producto ${id}`))
    );
  }

  getCategorias(): string[] {
    if (this.categoriasCache.length === 0) {
      this.cargarCategoriasDesdeAPI();
    }
    return this.categoriasCache;
  }

  getCategoriasObservable(): Observable<CategoriaCount[]> {
    return this.http.get<APIResponse<CategoriaCount[]>>(`${this.API_URL}/categories`).pipe(
      map(response => {
        if (response && response.success && response.data) {
          this.categoriasCache = ['Todas', ...response.data.map(cat => cat.categoria)];
          this.categoriasSubject.next(this.categoriasCache);
          return response.data;
        }
        throw new Error(response?.message || 'Error al obtener categorías');
      }),
      catchError(error => {
        this.logDebug('⚠️ Error al cargar categorías, usando fallback');
        this.categoriasCache = ['Todas', 'bebidas', 'snacks', 'dulces', 'combos', 'helados', 'comida'];
        this.categoriasSubject.next(this.categoriasCache);
        return [];
      })
    );
  }

  addProducto(producto: ProductoCreateRequest): Observable<boolean> {
    if (!this.authService.isAdmin()) {
      return throwError(() => new Error('No tienes permisos de administrador'));
    }

    this.logDebug('📝 Creando producto - datos originales:', producto);
    
    const productoParaEnviar: any = {
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      precio: producto.precio,
      categoria: producto.categoria,
      disponible: producto.disponible !== false,
      es_combo: Boolean(producto.es_combo)
    };
    
    if (producto.imagen) productoParaEnviar.imagen = producto.imagen;
    if (producto.descuento !== undefined) productoParaEnviar.descuento = producto.descuento;
    
    productoParaEnviar.tamanos = producto.tamanos || [];
    productoParaEnviar.extras = producto.extras || [];
    productoParaEnviar.combo_items = producto.combo_items || [];
    
    this.logDebug('📝 Datos finales para crear:', productoParaEnviar);
    
    const headers = this.getAuthHeaders();

    return this.http.post<APIResponse<ProductoBar>>(this.API_URL, productoParaEnviar, { headers }).pipe(
      map(response => {
        if (response && response.success && response.data) {
          const nuevoProducto = this.adaptarProductoDesdeAPI(response.data);
          this.productosCache.push(nuevoProducto);
          this.productosSubject.next(this.productosCache);
          
          this.toastService.showSuccess(`Producto "${nuevoProducto.nombre}" creado exitosamente`);
          return true;
        }
        throw new Error(response?.message || 'Error al crear producto');
      }),
      catchError(error => {
        this.logInfo('❌ Error al crear producto');
        return this.handleError('Error al crear producto')(error);
      })
    );
  }

  toggleDisponibilidad(id: number): boolean {
    if (!this.authService.isAdmin()) {
      this.toastService.showError('No tienes permisos de administrador');
      return false;
    }

    const headers = this.getAuthHeaders();

    this.http.patch<APIResponse<ProductoBar>>(`${this.API_URL}/${id}/toggle-disponibilidad`, {}, { headers }).pipe(
      map(response => {
        if (response && response.success && response.data) {
          const index = this.productosCache.findIndex(p => p.id === id);
          if (index !== -1) {
            this.productosCache[index] = this.adaptarProductoDesdeAPI(response.data);
            this.productosSubject.next(this.productosCache);
          }
          
          const estado = response.data.disponible ? 'disponible' : 'no disponible';
          this.toastService.showSuccess(`Producto marcado como ${estado}`);
          return true;
        }
        throw new Error(response?.message || 'Error al cambiar disponibilidad');
      }),
      catchError(this.handleError('Error al cambiar disponibilidad'))
    ).subscribe();

    return true;
  }

  deleteProducto(id: number): boolean {
    if (!this.authService.isAdmin()) {
      this.toastService.showError('No tienes permisos de administrador');
      return false;
    }

    const headers = this.getAuthHeaders();

    this.http.delete<APIResponse<any>>(`${this.API_URL}/${id}`, { headers }).pipe(
      map(response => {
        if (response && response.success) {
          this.productosCache = this.productosCache.filter(p => p.id !== id);
          this.productosSubject.next(this.productosCache);
          
          this.toastService.showSuccess('Producto eliminado exitosamente');
          return true;
        }
        throw new Error(response?.message || 'Error al eliminar producto');
      }),
      catchError(this.handleError('Error al eliminar producto'))
    ).subscribe();

    return true;
  }

  // ==================== MÉTODOS DE VALIDACIÓN ====================

  validateProductoData(producto: Partial<ProductoBar>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!producto.nombre || !String(producto.nombre).trim()) {
      errors.push('El nombre es requerido');
    }

    if (!producto.descripcion || !String(producto.descripcion).trim()) {
      errors.push('La descripción es requerida');
    }

    if (!producto.categoria || !String(producto.categoria).trim()) {
      errors.push('La categoría es requerida');
    }

    if (!producto.precio || Number(producto.precio) <= 0) {
      errors.push('El precio debe ser mayor a 0');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // ==================== MÉTODOS AUXILIARES ====================

  tieneOpciones(producto: ProductoBar): boolean {
    return !!(producto.tamanos?.length || producto.extras?.length);
  }

  calcularPrecioConDescuento(producto: ProductoBar): number {
    if (producto.es_combo && producto.descuento) {
      return producto.precio - producto.descuento;
    }
    return producto.precio;
  }

  contarProductosPorCategoria(categoria: string): number {
    if (categoria === 'Todas') {
      return this.productosCache.length;
    }
    return this.productosCache.filter(p => 
      p.categoria.toLowerCase() === categoria.toLowerCase()
    ).length;
  }

  // ==================== MÉTODOS PRIVADOS ====================

  private cargarProductosIniciales(): void {
    this.getProductosObservable().subscribe({
      next: (productos) => {
        this.logInfo(`✅ ${productos.length} productos cargados desde la API`);
      },
      error: (error) => {
        this.logInfo('❌ Error al cargar productos iniciales - usando datos locales');
        this.toastService.showWarning('Error al conectar con el servidor. Usando datos locales.');
      }
    });

    this.getCategoriasObservable().subscribe({
      next: (categorias) => {
        this.logDebug(`✅ ${categorias.length} categorías cargadas desde la API`);
      },
      error: (error) => {
        this.logDebug('❌ Error al cargar categorías');
      }
    });
  }

  private cargarProductosDesdeAPI(): void {
    this.getProductosObservable().subscribe();
  }

  private cargarCategoriasDesdeAPI(): void {
    this.getCategoriasObservable().subscribe();
  }

  private adaptarProductosDesdeAPI(productos: any[]): ProductoBar[] {
    if (!productos || !Array.isArray(productos)) {
      this.logDebug('⚠️ La respuesta no contiene un array de productos:', productos);
      return [];
    }
    
    return productos.map(p => this.adaptarProductoDesdeAPI(p));
  }

  private adaptarProductoDesdeAPI(producto: any): ProductoBar {
    if (!producto) {
      this.logDebug('⚠️ Producto vacío recibido');
      return {} as ProductoBar;
    }

    return {
      id: producto.id || 0,
      nombre: producto.nombre || '',
      descripcion: producto.descripcion || '',
      precio: parseFloat(producto.precio) || 0,
      categoria: producto.categoria || 'otros',
      imagen: producto.imagen || 'assets/bar/default.png',
      disponible: producto.disponible !== false,
      es_combo: Boolean(producto.es_combo),
      descuento: producto.descuento ? parseFloat(producto.descuento) : undefined,
      eliminado: producto.eliminado || false,
      fecha_creacion: producto.fecha_creacion,
      fecha_actualizacion: producto.fecha_actualizacion,
      tamanos: this.limpiarDuplicadosCorrectamente(producto.tamanos || []),
      extras: this.limpiarDuplicadosCorrectamente(producto.extras || []),
      combo_items: this.limpiarDuplicadosCorrectamente(producto.combo_items || [])
    };
  }

  private limpiarDuplicadosCorrectamente<T extends { id?: number; nombre?: string; item_nombre?: string }>(items: T[]): T[] {
    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }

    const seen = new Set<string>();
    const result: T[] = [];

    for (const item of items) {
      const key = item.id ? 
        `id-${item.id}` : 
        `name-${item.nombre || item.item_nombre || JSON.stringify(item)}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        result.push(item);
      }
    }

    return result;
  }

  private limpiarArray<T>(items: T[]): T[] {
    if (!Array.isArray(items)) return [];
    
    const seen = new Set<string>();
    return items
      .filter(item => item != null)
      .filter(item => {
        const key = JSON.stringify(item);
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  private handleError(mensaje: string) {
    return (error: any): Observable<never> => {
      this.logInfo(`❌ ${mensaje}`);
      
      let errorMessage = mensaje;
      if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      this.toastService.showError(errorMessage);
      return throwError(() => error);
    };
  }

  // ==================== MÉTODOS ADICIONALES REQUERIDOS ====================

  updateProducto(id: number, producto: Partial<ProductoCreateRequest>): Observable<boolean> {
    if (!this.authService.isAdmin()) {
      return throwError(() => new Error('No tienes permisos de administrador'));
    }

    const headers = this.getAuthHeaders();
    const url = `${this.API_URL}/${id}`;

    this.logDebug(`📝 Actualizando producto ${id} en:`, url);
    this.logDebug('📝 Datos ORIGINALES antes de procesar:', producto);
    
    const productoParaEnviar: any = {};
    
    // Campos básicos
    if (producto.nombre !== undefined) productoParaEnviar.nombre = producto.nombre;
    if (producto.descripcion !== undefined) productoParaEnviar.descripcion = producto.descripcion;
    if (producto.precio !== undefined) productoParaEnviar.precio = producto.precio;
    if (producto.categoria !== undefined) productoParaEnviar.categoria = producto.categoria;
    if (producto.imagen !== undefined) productoParaEnviar.imagen = producto.imagen;
    if (producto.disponible !== undefined) productoParaEnviar.disponible = producto.disponible;
    if (producto.es_combo !== undefined) productoParaEnviar.es_combo = producto.es_combo;
    if (producto.descuento !== undefined) productoParaEnviar.descuento = producto.descuento;
    
    // Arrays
    if (producto.tamanos !== undefined) {
      productoParaEnviar.tamanos = producto.tamanos;
      this.logDebug('📝 Tamaños incluidos:', producto.tamanos);
    }
    
    if (producto.extras !== undefined) {
      productoParaEnviar.extras = producto.extras;
      this.logDebug('📝 Extras incluidos:', producto.extras);
    }
    
    if (producto.combo_items !== undefined) {
      productoParaEnviar.combo_items = producto.combo_items;
      this.logDebug('📝 Combo items incluidos:', producto.combo_items);
    }

    this.logDebug('📝 Datos FINALES que se enviarán:', productoParaEnviar);

    return this.http.put<APIResponse<ProductoBar>>(url, productoParaEnviar, { headers }).pipe(
      map(response => {
        this.logDebug('✅ Respuesta de actualización de producto:', response);
        
        if (response && response.success && response.data) {
          const index = this.productosCache.findIndex(p => p.id === id);
          if (index !== -1) {
            this.productosCache[index] = this.adaptarProductoDesdeAPI(response.data);
            this.productosSubject.next(this.productosCache);
          }
          
          this.logInfo(`✅ Producto "${response.data.nombre}" actualizado exitosamente`);
          this.toastService.showSuccess(`Producto "${response.data.nombre}" actualizado exitosamente`);
          return true;
        } else if (response && !response.hasOwnProperty('success')) {
          this.logInfo('✅ Producto actualizado (formato alternativo)');
          this.cargarProductosDesdeAPI();
          this.toastService.showSuccess('Producto actualizado exitosamente');
          return true;
        }
        
        throw new Error(response?.message || 'Error al actualizar producto');
      }),
      catchError(error => {
        this.logInfo('❌ Error al actualizar producto');
        this.logDebug('❌ URL que falló:', url);
        this.logDebug('❌ Datos que se enviaron:', productoParaEnviar);
        
        if (error.status === 0) {
          this.logDebug('🚫 CONEXIÓN RECHAZADA - Verificar backend y CORS');
        } else if (error.status === 400) {
          this.logDebug('🚫 BAD REQUEST - Verificar datos del formulario');
        } else if (error.status === 401) {
          this.logDebug('🚫 NO AUTORIZADO - Verificar token de auth');
        } else if (error.status === 404) {
          this.logDebug('🚫 NO ENCONTRADO - Verificar que el producto existe');
        } else if (error.status === 500) {
          this.logDebug('🚫 ERROR INTERNO - Verificar logs del backend');
        }
        
        return this.handleError('Error al actualizar producto')(error);
      })
    );
  }

  getProductosPorCategoria(categoria: string): ProductoBar[] {
    if (categoria === 'Todas') {
      return this.productosCache;
    }
    return this.productosCache.filter(p => 
      p.categoria.toLowerCase() === categoria.toLowerCase()
    );
  }

  isCargando(): boolean {
    return this.cargando;
  }

  limpiarCache(): void {
    this.productosCache = [];
    this.categoriasCache = [];
    this.productosSubject.next([]);
    this.categoriasSubject.next([]);
  }

  recargar(): Observable<ProductoBar[]> {
    this.limpiarCache();
    return this.getProductosObservable();
  }
} 
// admin.service.ts - CORREGIDO SIN LOGS EXCESIVOS
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of, forkJoin } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { MovieService, Pelicula } from './movie.service';
import { UserService } from './user.service';
import { AuthService, Usuario } from './auth.service';
import { BarService } from './bar.service';
import { OrderService } from './order.service';
import { environment } from '../../environments/environment';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Interfaces (mantener todas las existentes)
export interface AdminStats {
  totalPeliculas: number;
  totalUsuarios: number;
  totalVentas: number;
  ingresosMes: number;
  usuariosActivos: number;
  peliculasPopulares: PeliculaPopular[];
  ventasRecientes: VentaReciente[];
  generosMasPopulares: GeneroStats[];
  actividadReciente: ActividadReciente[];
  ratingPromedio?: number;
  totalGeneros?: number;
  ordenesCompletadas?: number;
  ordenesPendientes?: number;
  ordenesCanceladas?: number;
  ingresosTotales?: number;
  ticketPromedio?: number;
  totalFavoritas?: number;
}

export interface PeliculaPopular {
  titulo: string;
  vistas: number;
  rating: number;
  genero: string;
}

export interface VentaReciente {
  id: string;
  usuario: string;
  pelicula: string;
  fecha: string;
  total: number;
  estado: 'completada' | 'pendiente' | 'cancelada';
  entradas: number;
}

export interface GeneroStats {
  genero: string;
  cantidad: number;
  porcentaje: number;
}

export interface ActividadReciente {
  tipo: 'registro' | 'compra' | 'pelicula_agregada' | 'orden' | 'usuario' | 'favorita';
  descripcion: string;
  fecha: string;
  icono: string;
  color: string;
}

export interface BarStats {
  totalProductos: number;
  productosDisponibles: number;
  productosNoDisponibles: number;
  totalCombos: number;
  totalCategorias: number;
  precioPromedio: number;
  precioMinimo: number;
  precioMaximo: number;
  ahorroTotalCombos: number;
  productosPorCategoria: CategoriaBarStats[];
  productosPopularesBar: ProductoPopularBar[];
  ventasSimuladasBar?: VentaBarSimulada[];
  tendenciasBar?: TendenciasBar;
}

export interface CategoriaBarStats {
  categoria: string;
  cantidad: number;
  disponibles: number;
  combos: number;
  precioPromedio: number;
  precioMinimo: number;
  precioMaximo: number;
  porcentaje: number;
}

export interface ProductoPopularBar {
  nombre: string;
  categoria: string;
  precio: number;
  esCombo: boolean;
  disponible: boolean;
  ventasSimuladas: number;
  ingresoSimulado: number;
}

export interface VentaBarSimulada {
  id: string;
  producto: string;
  categoria: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
  fecha: string;
  esCombo: boolean;
  cliente: string;
  metodoPago: string;
}

export interface TendenciasBar {
  ventasUltimos7Dias: number;
  ingresoUltimos7Dias: number;
  ventasUltimos30Dias: number;
  ingresoUltimos30Dias: number;
  productoMasVendido: string;
  categoriaMasPopular: string;
  promedioVentaDiaria: number;
  promedioIngresoDiario: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  
  private readonly API_URL = environment.apiUrl;
  
  private peliculasSubject = new BehaviorSubject<Pelicula[]>([]);
  public peliculas$ = this.peliculasSubject.asObservable();
  
  // Cache para estadísticas
  private statsCache: AdminStats | null = null;
  private barStatsCache: BarStats | null = null;
  private lastStatsUpdate: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
  private updatingBarStats: boolean = false;

  // 🔧 FIX: Flags para controlar logs
  private debugMode: boolean = false;
  private logCount: number = 0;
  private maxLogs: number = 10;

  constructor(
    private http: HttpClient,
    private movieService: MovieService,
    private userService: UserService,
    private authService: AuthService,
    private barService: BarService,
    private orderService: OrderService
  ) {
    // 🔧 FIX: Solo un log inicial
    console.log('🔧 AdminService inicializado');
    this.diagnosticarConexion();
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
    console.log('🔧 AdminService: Modo debug activado');
  }

  disableDebugMode(): void {
    this.debugMode = false;
    console.log('🔧 AdminService: Modo debug desactivado');
  }

  // ==================== DIAGNÓSTICO DE CONEXIÓN (SIMPLIFICADO) ====================
  
  private diagnosticarConexion(): void {
    this.logDebug('🔍 Iniciando diagnóstico de conexión...');
    this.logDebug(`📡 API URL configurada: ${this.API_URL}`);
    
    this.verificarBackend().subscribe({
      next: (disponible) => {
        if (disponible) {
          this.logInfo('✅ Backend disponible - Conexión OK');
        } else {
          this.logInfo('⚠️ Backend no disponible - Usando fallback');
        }
      },
      error: (error) => {
        this.logInfo('❌ Error en diagnóstico');
        this.mostrarSolucionesPosibles(error);
      }
    });
  }

  private verificarBackend(): Observable<boolean> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.get<any>(`${this.API_URL}/health`, { headers }).pipe(
      map(response => {
        this.logDebug('✅ Backend responde:', response);
        return true;
      }),
      catchError(error => {
        this.logDebug('⚠️ Backend no disponible:', error.message);
        return of(false);
      })
    );
  }

  private mostrarSolucionesPosibles(error: any): void {
    if (this.debugMode) {
      console.log('🛠️ POSIBLES SOLUCIONES:');
      
      if (error.status === 0) {
        console.log('1. ❌ El backend no está ejecutándose en localhost:3000');
        console.log('2. ❌ Problema de CORS');
      }
      
      if (error.status === 404) {
        console.log('3. ❌ Ruta /api/admin/stats no existe');
      }
      
      console.log('4. ℹ️ Usando datos de servicios locales como fallback');
    }
  }

  // ==================== DASHBOARD STATS CON FALLBACK INTELIGENTE ====================
  
  getAdminStats(): Observable<AdminStats> {
    // Verificar cache
    if (this.statsCache && (Date.now() - this.lastStatsUpdate) < this.CACHE_DURATION) {
      // 🔧 FIX: No log repetitivo - solo en debug
      this.logDebug('📊 Usando estadísticas desde cache');
      return of(this.statsCache);
    }

    this.logDebug('📊 Intentando obtener estadísticas desde API...');
    const headers = this.getAuthHeaders();
    
    return this.http.get<any>(`${this.API_URL}/admin/stats`, { headers }).pipe(
      map(response => {
        if (response.success && response.source === 'database') {
          this.statsCache = response.data;
          this.lastStatsUpdate = Date.now();
          this.logInfo('✅ Estadísticas REALES obtenidas de PostgreSQL');
          return response.data;
        }
        throw new Error('Respuesta inválida del servidor');
      }),
      catchError(error => {
        this.logInfo('⚠️ API no disponible, usando fallback con servicios locales');
        return this.getAdminStatsFromLocalServices();
      })
    );
  }

  private getAdminStatsFromLocalServices(): Observable<AdminStats> {
    this.logDebug('📊 Obteniendo estadísticas desde servicios locales...');
    
    return forkJoin({
      peliculas: this.movieService.getPeliculas().pipe(catchError(() => of([]))),
      usuarios: of(this.authService.getAllRegisteredUsers()),
      orders: this.orderService.getAllOrders(1, 50).pipe(catchError(() => of([])))
    }).pipe(
      map(({ peliculas, usuarios, orders }) => {
        const usuariosActivos = usuarios.filter(u => u.isActive !== false).length;
        const ordenesCompletadas = orders.filter(o => o.estado === 'completada').length;
        const ingresosMes = orders
          .filter(o => o.estado === 'completada')
          .reduce((sum, o) => sum + o.total, 0);
        
        const stats: AdminStats = {
          totalPeliculas: peliculas.length,
          totalUsuarios: usuarios.length,
          totalVentas: orders.length,
          ingresosMes: ingresosMes,
          usuariosActivos: usuariosActivos,
          peliculasPopulares: this.getPeliculasPopulares(peliculas),
          ventasRecientes: this.getVentasRecientesFromOrders(orders),
          generosMasPopulares: this.getGeneroStats(peliculas),
          actividadReciente: this.getActividadRecienteFromData(orders, usuarios),
          ordenesCompletadas: ordenesCompletadas,
          ordenesPendientes: orders.filter(o => o.estado === 'pendiente').length,
          ordenesCanceladas: orders.filter(o => o.estado === 'cancelada').length,
          ingresosTotales: ingresosMes,
          ticketPromedio: ordenesCompletadas > 0 ? ingresosMes / ordenesCompletadas : 0,
          ratingPromedio: this.calcularRatingPromedio(peliculas),
          totalGeneros: this.getGeneroStats(peliculas).length,
          totalFavoritas: 0
        };

        this.statsCache = stats;
        this.lastStatsUpdate = Date.now();
        this.logInfo('✅ Estadísticas obtenidas desde servicios locales');
        
        return stats;
      })
    );
  }

  // ==================== MÉTODOS DEL BAR (CORREGIDOS) ====================

  getBarStats(): BarStats {
    // 🔧 FIX: Verificar cache SIN log repetitivo
    if (this.barStatsCache && (Date.now() - this.lastStatsUpdate) < this.CACHE_DURATION) {
      return this.barStatsCache;
    }

    // 🔧 FIX: Solo log una vez cuando se actualiza
    this.logDebug('📊 Obteniendo estadísticas del bar desde BarService (fallback)');
    const fallbackStats = this.getBarStatsFromBarService();
    
    // Actualizar cache en segundo plano sin logs
    this.updateBarStatsCacheAsync();
    
    return fallbackStats;
  }

  private updateBarStatsCacheAsync(): void {
    if (this.updatingBarStats) {
      return;
    }
    
    this.updatingBarStats = true;
    
    this.getBarStatsObservable().subscribe({
      next: (stats) => {
        this.barStatsCache = stats;
        this.lastStatsUpdate = Date.now();
        this.logDebug('✅ Cache del bar actualizado en segundo plano');
        this.updatingBarStats = false;
      },
      error: (error) => {
        this.logDebug('⚠️ No se pudo actualizar cache del bar desde API, usando BarService');
        this.barStatsCache = this.getBarStatsFromBarService();
        this.lastStatsUpdate = Date.now();
        this.updatingBarStats = false;
      }
    });
  }

  getBarStatsObservable(): Observable<BarStats> {
    this.logDebug('🍿 Intentando obtener estadísticas del bar desde API...');
    const headers = this.getAuthHeaders();
    
    return this.http.get<any>(`${this.API_URL}/admin/bar-stats`, { headers }).pipe(
      map(response => {
        if (response.success && response.source === 'database') {
          this.barStatsCache = response.data;
          this.lastStatsUpdate = Date.now();
          this.logInfo('✅ Estadísticas del bar REALES obtenidas de PostgreSQL');
          return response.data;
        }
        throw new Error('Respuesta inválida del servidor');
      }),
      catchError(error => {
        this.logDebug('⚠️ API del bar no disponible, usando BarService');
        const barStats = this.getBarStatsFromBarService();
        return of(barStats);
      })
    );
  }

  private getBarStatsFromBarService(): BarStats {
    const productos = this.barService.getProductos();
    
    const categoriaStats: { [key: string]: number } = {};
    productos.forEach(p => {
      categoriaStats[p.categoria] = (categoriaStats[p.categoria] || 0) + 1;
    });

    const precios = productos.map(p => p.precio).sort((a, b) => a - b);
    const precioPromedio = precios.length > 0 ? precios.reduce((sum, p) => sum + p, 0) / precios.length : 0;
    const combos = productos.filter(p => p.es_combo);

    return {
      totalProductos: productos.length,
      productosDisponibles: productos.filter(p => p.disponible).length,
      productosNoDisponibles: productos.filter(p => !p.disponible).length,
      totalCombos: combos.length,
      totalCategorias: Object.keys(categoriaStats).length,
      precioPromedio: Math.round(precioPromedio * 100) / 100,
      precioMinimo: precios.length > 0 ? Math.min(...precios) : 0,
      precioMaximo: precios.length > 0 ? Math.max(...precios) : 0,
      ahorroTotalCombos: combos.reduce((sum, c) => sum + (c.descuento || 0), 0),
      productosPorCategoria: this.getProductosPorCategoria(),
      productosPopularesBar: this.getProductosPopularesBar(),
      ventasSimuladasBar: [],
      tendenciasBar: {
        ventasUltimos7Dias: 0,
        ingresoUltimos7Dias: 0,
        ventasUltimos30Dias: 0,
        ingresoUltimos30Dias: 0,
        productoMasVendido: 'Sin datos',
        categoriaMasPopular: 'Sin datos',
        promedioVentaDiaria: 0,
        promedioIngresoDiario: 0
      }
    };
  }

  // ==================== MÉTODOS AUXILIARES ====================
  
  private getPeliculasPopulares(peliculas: Pelicula[]): PeliculaPopular[] {
    return peliculas
      .map(p => ({
        titulo: p.titulo,
        vistas: Math.floor(Math.random() * 100) + 10,
        rating: p.rating,
        genero: p.genero
      }))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5);
  }

  private getVentasRecientesFromOrders(orders: any[]): VentaReciente[] {
    return orders
      .filter(o => o.estado === 'completada')
      .slice(0, 5)
      .map(order => ({
        id: order.id,
        usuario: order.nombre_cliente || 'Usuario',
        pelicula: 'Compra realizada',
        fecha: order.fecha_creacion,
        total: order.total,
        estado: order.estado,
        entradas: this.orderService.getTotalItems(order)
      }));
  }

  private getGeneroStats(peliculas: Pelicula[]): GeneroStats[] {
    const generos: { [key: string]: number } = {};
    
    peliculas.forEach(p => {
      generos[p.genero] = (generos[p.genero] || 0) + 1;
    });
    
    const total = peliculas.length;
    return Object.entries(generos).map(([genero, cantidad]) => ({
      genero,
      cantidad,
      porcentaje: total > 0 ? Math.round((cantidad / total) * 100) : 0
    }));
  }

  private getActividadRecienteFromData(orders: any[], usuarios: Usuario[]): ActividadReciente[] {
    const actividad: ActividadReciente[] = [];
    
    // Órdenes recientes
    orders.slice(0, 3).forEach(order => {
      actividad.push({
        tipo: 'orden',
        descripcion: `Nueva orden por ${order.total.toFixed(2)}`,
        fecha: order.fecha_creacion,
        icono: 'fas fa-shopping-cart',
        color: 'primary'
      });
    });
    
    // Usuarios recientes
    usuarios.slice(-2).forEach(user => {
      actividad.push({
        tipo: 'usuario',
        descripcion: `Nuevo usuario registrado: ${user.nombre}`,
        fecha: user.fechaRegistro || new Date().toISOString(),
        icono: 'fas fa-user-plus',
        color: 'success'
      });
    });
    
    return actividad.sort((a, b) => 
      new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    ).slice(0, 10);
  }

  private calcularRatingPromedio(peliculas: Pelicula[]): number {
    if (peliculas.length === 0) return 0;
    const suma = peliculas.reduce((acc, p) => acc + p.rating, 0);
    return Math.round((suma / peliculas.length) * 10) / 10;
  }

  private getProductosPorCategoria(): CategoriaBarStats[] {
    const productos = this.barService.getProductos();
    const categorias: { [key: string]: any[] } = {};
    
    productos.forEach(p => {
      if (!categorias[p.categoria]) {
        categorias[p.categoria] = [];
      }
      categorias[p.categoria].push(p);
    });

    return Object.entries(categorias).map(([categoria, prods]) => ({
      categoria,
      cantidad: prods.length,
      disponibles: prods.filter(p => p.disponible).length,
      combos: prods.filter(p => p.es_combo).length,
      precioPromedio: prods.length > 0 ? Math.round((prods.reduce((sum, p) => sum + p.precio, 0) / prods.length) * 100) / 100 : 0,
      precioMinimo: prods.length > 0 ? Math.min(...prods.map(p => p.precio)) : 0,
      precioMaximo: prods.length > 0 ? Math.max(...prods.map(p => p.precio)) : 0,
      porcentaje: productos.length > 0 ? Math.round((prods.length / productos.length) * 100) : 0
    })).sort((a, b) => b.cantidad - a.cantidad);
  }

  private getProductosPopularesBar(): ProductoPopularBar[] {
    const productos = this.barService.getProductos();
    
    return productos.map(p => ({
      nombre: p.nombre,
      categoria: p.categoria,
      precio: p.precio,
      esCombo: p.es_combo,
      disponible: p.disponible,
      ventasSimuladas: 0,
      ingresoSimulado: 0
    })).slice(0, 10);
  }

  private updateBarStatsCache(): void {
    this.getBarStatsObservable().subscribe({
      next: (stats) => {
        this.barStatsCache = stats;
        this.lastStatsUpdate = Date.now();
      },
      error: (error) => {
        this.logDebug('⚠️ No se pudo actualizar cache del bar desde API, usando BarService');
        this.barStatsCache = this.getBarStatsFromBarService();
      }
    });
  }

  private invalidateCache(): void {
    this.statsCache = null;
    this.barStatsCache = null;
    this.lastStatsUpdate = 0;
    this.logDebug('🔄 Cache invalidado');
  }

  // ==================== RESTO DE MÉTODOS ORIGINALES ====================
  
  getAllPeliculas(): Observable<Pelicula[]> {
    return this.movieService.getPeliculas();
  }

  createPelicula(peliculaData: Omit<Pelicula, 'idx' | 'id'>): Observable<boolean> {
    return this.movieService.addPelicula(peliculaData).pipe(
      tap(success => {
        if (success) {
          this.invalidateCache();
        }
      })
    );
  }

  updatePelicula(peliculaId: number, peliculaData: Partial<Pelicula>): Observable<boolean> {
    return this.movieService.updatePelicula(peliculaId, peliculaData).pipe(
      tap(success => {
        if (success) {
          this.invalidateCache();
        }
      })
    );
  }

  deletePelicula(peliculaId: number): Observable<boolean> {
    return this.movieService.deletePelicula(peliculaId).pipe(
      tap(success => {
        if (success) {
          this.invalidateCache();
        }
      })
    );
  }

  buscarPeliculas(termino: string): Observable<Pelicula[]> {
    return this.movieService.buscarPeliculas(termino);
  }

  validatePeliculaData(pelicula: Partial<Pelicula>): { valid: boolean; errors: string[] } {
    return this.movieService.validatePeliculaData(pelicula);
  }

  getAllUsers(): Usuario[] {
    return this.authService.getAllRegisteredUsers();
  }

  getAllUsersObservable(): Observable<Usuario[]> {
    return this.userService.getAllUsers();
  }

  changeUserRole(userId: number, nuevoRol: 'cliente' | 'admin'): Observable<boolean> {
    return this.userService.changeUserRole(userId, nuevoRol).pipe(
      tap(success => {
        if (success) {
          this.invalidateCache();
        }
      })
    );
  }

  toggleUserStatus(userId: number): Observable<boolean> {
    return this.userService.toggleUserStatus(userId).pipe(
      tap(success => {
        if (success) {
          this.invalidateCache();
        }
      })
    );
  }

  // ==================== REPORTES CON FALLBACK ====================
  
  generateSalesReport(): void {
    this.logDebug('📊 Generando reporte de ventas...');
    
    forkJoin({
      stats: this.getAdminStats(),
      orders: this.orderService.getAllOrders(1, 100)
    }).subscribe({
      next: ({ stats, orders }) => {
        this.logInfo('✅ Reporte generado con datos disponibles');
      },
      error: (error) => {
        console.error('❌ Error generando reporte:', error);
      }
    });
  }

  generateBarReport(): void {
    this.logDebug('🍿 Generando reporte del bar...');
    
    this.getBarStatsObservable().subscribe({
      next: (barStats) => {
        this.logInfo('✅ Reporte del bar generado');
      },
      error: (error) => {
        console.error('❌ Error generando reporte del bar:', error);
      }
    });
  }

  getVentasReport(fechaInicio: string, fechaFin: string): Observable<any> {
    const headers = this.getAuthHeaders();
    const params = { fechaInicio, fechaFin };
    
    return this.http.get<any>(`${this.API_URL}/admin/ventas-report`, { headers, params }).pipe(
      map(response => {
        if (response.success) {
          return response.data;
        }
        throw new Error('No se pudo obtener el reporte');
      }),
      catchError(error => {
        this.logDebug('⚠️ Reporte no disponible desde API');
        return of({
          totalVentas: 0,
          entradasVendidas: 0,
          ingresoTotal: 0,
          fechaInicio,
          fechaFin,
          source: 'fallback'
        });
      })
    );
  }

  refreshStats(): Observable<AdminStats> {
    this.invalidateCache();
    return this.getAdminStats();
  }

  isAdminUser(): boolean {
    return this.authService.isAdmin();
  }

  checkDatabaseConnection(): Observable<boolean> {
    return this.verificarBackend();
  }

  getDataStatus(): Observable<any> {
    return this.getAdminStats().pipe(
      map(stats => ({
        realData: false,
        dbConnected: false,
        totalPeliculas: stats.totalPeliculas,
        totalUsuarios: stats.totalUsuarios,
        totalVentas: stats.totalVentas,
        source: 'local-services',
        lastUpdate: new Date().toISOString()
      }))
    );
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    
    if (!token) {
      this.logDebug('⚠️ No hay token de autenticación');
      return new HttpHeaders({
        'Content-Type': 'application/json'
      });
    }

    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }
}
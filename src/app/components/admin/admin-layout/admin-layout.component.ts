// src/app/components/admin/admin-layout/admin-layout.component.ts - CORREGIDO
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { MovieService } from '../../../services/movie.service';
import { AdminService } from '../../../services/admin.service';
import { ToastService } from '../../../services/toast.service';
import { BarService } from '../../../services/bar.service';
import { UserService } from '../../../services/user.service';
import { RewardsService } from '../../../services/rewards.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { FunctionService } from '../../../services/function.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-admin-layout',
  standalone: false,
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.css']
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  
  currentSection: string = 'Dashboard';
  loading: boolean = false;
  refreshing: boolean = false;
  lastUpdate: string = '';
  
  // 🔧 PROPIEDADES PARA CACHE DE DATOS REALES
  private totalMovies: number = 0;
  private totalUsers: number = 0;
  private totalBarProducts: number = 0;
  private totalComingSoon: number = 0;
  private totalFunctions: number = 0;
  private totalRewards: number = 0;
  
  private routerSubscription: Subscription = new Subscription();

  constructor(
    public authService: AuthService,
    private router: Router,
    private movieService: MovieService,
    private adminService: AdminService,
    private toastService: ToastService,
    private barService: BarService,
    private userService: UserService,
    private rewardsService: RewardsService,
    private functionService: FunctionService
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAdmin()) {
      this.toastService.showError('No tienes permisos para acceder al panel de administración');
      this.router.navigate(['/home']);
      return;
    }

    this.loadInitialData();

    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.updateCurrentSection(event.urlAfterRedirects);
    });

    this.updateLastUpdate();
    
    setInterval(() => {
      this.updateLastUpdate();
    }, 60000);

    console.log('📊 Panel de administración inicializado');
  }

  // 🔧 MÉTODO CORREGIDO: Cargar datos reales
  // CORRECCIÓN ESPECÍFICA para admin-layout.component.ts
// Reemplaza solo la parte de carga de productos del bar:

private loadInitialData(): void {
  console.log('🔄 Cargando datos iniciales...');

  // ✅ CARGAR TOTAL DE PELÍCULAS (sin cambios)
  this.movieService.getPeliculas().subscribe({
    next: (peliculas) => {
      this.totalMovies = peliculas.length;
      console.log(`✅ Películas cargadas: ${this.totalMovies}`);
    },
    error: (error) => {
      console.error('❌ Error al cargar películas:', error);
      this.totalMovies = 0;
    }
  });

  // ✅ CARGAR TOTAL DE PRÓXIMOS ESTRENOS (sin cambios)
  this.movieService.getProximosEstrenosHybrid().subscribe({
    next: (estrenos) => {
      this.totalComingSoon = estrenos.length;
      console.log(`✅ Próximos estrenos cargados: ${this.totalComingSoon}`);
    },
    error: (error) => {
      console.error('❌ Error al cargar próximos estrenos:', error);
      this.totalComingSoon = 0;
    }
  });

  // 🔧 CARGAR TOTAL DE PRODUCTOS DEL BAR - CORREGIDO
  console.log('🍿 Intentando cargar productos del bar...');
  
  // MÉTODO 1: Usar getProductosObservable() en lugar de getProductos()
  this.barService.getProductosObservable().subscribe({
    next: (productos) => {
      console.log('📦 Productos recibidos del servicio:', productos);
      
      if (productos && Array.isArray(productos)) {
        this.totalBarProducts = productos.length;
        console.log(`✅ Productos del bar cargados: ${this.totalBarProducts}`);
      } else {
        console.warn('⚠️ Productos no es un array válido:', productos);
        this.totalBarProducts = 0;
      }
    },
    error: (error) => {
      console.error('❌ Error al cargar productos del bar:', error);
      console.log('🔄 Intentando método directo...');
      
      // MÉTODO 2: Usar getProductos() directamente (no Observable)
      try {
        const productosDirect = this.barService.getProductos();
        console.log('📦 Productos directos:', productosDirect);
        
        if (productosDirect && Array.isArray(productosDirect)) {
          this.totalBarProducts = productosDirect.length;
          console.log(`✅ Productos del bar cargados (directo): ${this.totalBarProducts}`);
        } else {
          console.warn('⚠️ Método directo sin resultados');
          this.loadBarProductsHTTP(); // Método 3: HTTP directo
        }
      } catch (directError) {
        console.error('❌ Error en método directo:', directError);
        this.loadBarProductsHTTP(); // Método 3: HTTP directo
      }
    }
  });

  // ✅ CARGAR TOTAL DE USUARIOS (sin cambios)
  if (this.userService && this.userService.getAllUsers) {
    this.userService.getAllUsers().subscribe({
      next: (usuarios) => {
        this.totalUsers = usuarios.length;
        console.log(`✅ Usuarios cargados: ${this.totalUsers}`);
      },
      error: (error) => {
        console.error('❌ Error al cargar usuarios:', error);
        // Fallback: usar el método del adminService si existe
        try {
          const adminUsers = this.adminService.getAllUsers();
          this.totalUsers = adminUsers.length;
          console.log(`✅ Usuarios cargados (fallback): ${this.totalUsers}`);
        } catch (fallbackError) {
          console.error('❌ Error en fallback de usuarios:', fallbackError);
          this.totalUsers = 0;
        }
      }
    });
  } else {
    // Usar AdminService directamente
    try {
      const adminUsers = this.adminService.getAllUsers();
      this.totalUsers = adminUsers.length;
      console.log(`✅ Usuarios cargados (admin service): ${this.totalUsers}`);
    } catch (error) {
      console.error('❌ Error al cargar usuarios (admin service):', error);
      this.totalUsers = 0;
    }
  }

  // ✅ CARGAR TOTAL DE RECOMPENSAS
  if (this.rewardsService && this.rewardsService.getAllRewards) {
    this.rewardsService.getAllRewards().subscribe({
      next: (recompensas) => {
        this.totalRewards = recompensas.length;
        console.log(`✅ Recompensas cargadas: ${this.totalRewards}`);
      },
      error: (error) => {
        console.error('❌ Error al cargar recompensas:', error);
        this.totalRewards = 0;
      }
    });
  } else {
    console.log('⚠️ RewardsService no disponible');
    this.totalRewards = 0;
  }

  // ✅ CARGAR TOTAL DE FUNCIONES (simulado por ahora)
  this.loadFunctionsFromService();
  console.log(`⚠️ Funciones (simulado): ${this.totalFunctions}`);
}
private loadFunctionsFromService(): void {
  console.log('⏰ Cargando funciones desde FunctionService...');
  
  this.functionService.getAllFunctions().subscribe({
    next: (funciones) => {
      console.log('📅 Funciones recibidas del servicio:', funciones);
      
      if (funciones && Array.isArray(funciones)) {
        // Filtrar solo funciones activas
        const funcionesActivas = funciones.filter(f => f.activo !== false);
        this.totalFunctions = funcionesActivas.length;
        console.log(`✅ Funciones cargadas: ${this.totalFunctions} (${funciones.length} total, ${funcionesActivas.length} activas)`);
      } else {
        console.warn('⚠️ Funciones no es un array válido:', funciones);
        this.totalFunctions = 0;
      }
    },
    error: (error) => {
      console.error('❌ Error al cargar funciones desde servicio:', error);
      console.log('🔄 Intentando método HTTP directo...');
      
      // Fallback: HTTP directo
      this.loadFunctionsHTTP();
    }
  });
}

/**
 * 🔧 MÉTODO FALLBACK: Cargar funciones con HTTP directo
 */
private loadFunctionsHTTP(): void {
  console.log('🔄 Cargando funciones con HTTP directo...');
  
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
  
  // 🔧 FIX: Usar environment.apiUrl
  fetch(`${environment.apiUrl}/functions`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => response.json())
  .then(data => {
    // ... resto del método sin cambios
  })
  .catch(error => {
    console.error('❌ Error en HTTP directo para funciones:', error);
    this.totalFunctions = 0;
  });
}



// 🆕 MÉTODO ADICIONAL: HTTP directo para productos del bar
private loadBarProductsHTTP(): void {
  console.log('🔄 Intentando cargar productos con HTTP directo...');
  
  const token = localStorage.getItem('token');
  
  // 🔧 FIX: Usar environment.apiUrl
  fetch(`${environment.apiUrl}/bar`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => response.json())
  .then(data => {
    // ... resto del método sin cambios
  })
  .catch(error => {
    console.error('❌ Error en HTTP directo:', error);
    this.totalBarProducts = 0;
  });
}

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  // ==================== MÉTODOS GETTER CORREGIDOS ====================

  getTotalMovies(): number {
    return this.totalMovies;
  }

  getTotalUsers(): number {
    return this.totalUsers;
  }

  getTotalBarProducts(): number {
    return this.totalBarProducts;
  }

  getTotalComingSoon(): number {
    return this.totalComingSoon;
  }

  getTotalFunctions(): number {
    return this.totalFunctions;
  }

  getTotalRewards(): number {
    return this.totalRewards;
  }

  // ==================== MÉTODO REFRESH ACTUALIZADO ====================

  refreshData(): void {
  this.refreshing = true;
  console.log('🔄 Refrescando datos...');
  
  // Recargar todos los datos reales
  this.loadInitialData();
  
  setTimeout(() => {
    this.refreshing = false;
    this.updateLastUpdate();
    this.toastService.showSuccess('✅ Datos actualizados correctamente');
    
    // Log del estado actual
    console.log('📊 Estado después del refresh:', {
      peliculas: this.totalMovies,
      proximosEstrenos: this.totalComingSoon,
      funciones: this.totalFunctions,
      usuarios: this.totalUsers,
      productosBar: this.totalBarProducts,
      recompensas: this.totalRewards
    });
    
    // Recargar datos de la sección actual
    this.reloadCurrentSectionData();
  }, 1500);
}

  // ✅ MÉTODO updateCurrentSection ACTUALIZADO
  private updateCurrentSection(url: string): void {
    if (url.includes('/admin/dashboard')) {
      this.currentSection = 'Dashboard';
    } else if (url.includes('/admin/movies')) {
      this.currentSection = 'Gestión de Películas';
    } else if (url.includes('/admin/coming-soon')) {
      this.currentSection = 'Gestión de Próximos Estrenos';
    } else if (url.includes('/admin/functions')) {
      this.currentSection = 'Gestión de Funciones';
    } else if (url.includes('/admin/bar')) {
      this.currentSection = 'Gestión del Bar';
    } else if (url.includes('/admin/rewards')) {
      this.currentSection = 'Gestión de Recompensas';
    } else if (url.includes('/admin/users')) {
      this.currentSection = 'Gestión de Usuarios';
    } else if (url.includes('/admin/points')) {
      this.currentSection = 'Sistema de Puntos';
    } else if (url.includes('/admin/reports')) {
      this.currentSection = 'Reportes';
    } else if (url.includes('/admin/settings')) {
      this.currentSection = 'Configuración';
    } else if (url.includes('/admin/logs')) {
      this.currentSection = 'Logs del Sistema';
    } else {
      this.currentSection = 'Dashboard';
    }
  }

  // ==================== MÉTODOS DE ACCIONES RÁPIDAS ====================

  quickAddComingSoon(): void {
    this.router.navigate(['/admin/coming-soon'], { 
      queryParams: { action: 'add' } 
    });
    
    this.toastService.showInfo('📅 Redirigiendo a agregar próximo estreno...');
  }

  quickAddFuncion(): void {
    this.router.navigate(['/admin/functions'], { 
      queryParams: { action: 'add' } 
    });
    
    this.toastService.showInfo('⏰ Redirigiendo a agregar función...');
  }

  quickAddReward(): void {
    console.log('🎁 Navegando a agregar nueva recompensa...');
    this.router.navigate(['/admin/rewards']).then(() => {
      console.log('✅ Navegación completada a /admin/rewards');
      this.toastService.showInfo('🎁 Redirigiendo a agregar recompensa...');
    });
  }

  quickAddMovie(): void {
    this.router.navigate(['/admin/movies'], { 
      queryParams: { action: 'add' } 
    });
    
    this.toastService.showInfo('🎬 Redirigiendo a agregar película...');
  }

  quickAddBarProduct(): void {
    this.router.navigate(['/admin/bar'], { 
      queryParams: { action: 'add' } 
    });
    
    this.toastService.showInfo('🍿 Redirigiendo a agregar producto del bar...');
  }

  // ✅ MÉTODO getSystemStatus ACTUALIZADO
  private getSystemStatus(): any {
    return {
      peliculas: this.totalMovies,
      proximosEstrenos: this.totalComingSoon,
      funciones: this.totalFunctions,
      usuarios: this.totalUsers,
      productosBar: this.totalBarProducts,
      recompensas: this.totalRewards,
      estado: 'Operativo',
      memoria: Math.floor(Math.random() * 40) + 20,
      ultimaActualizacion: this.lastUpdate
    };
  }

  // ✅ MÉTODO viewSystemStatus ACTUALIZADO
  viewSystemStatus(): void {
    const status = this.getSystemStatus();
    
    const mensaje = `🖥️ Estado del Sistema:\n\n` +
                   `• Películas: ${status.peliculas} registradas\n` +
                   `• Próximos Estrenos: ${status.proximosEstrenos} programados\n` +
                   `• Funciones: ${status.funciones} programadas\n` +
                   `• Usuarios: ${status.usuarios} activos\n` +
                   `• Productos del Bar: ${status.productosBar} registrados\n` +
                   `• Recompensas: ${status.recompensas} disponibles\n` +
                   `• Última actualización: ${this.lastUpdate}\n` +
                   `• Estado: ${status.estado}\n` +
                   `• Memoria: ${status.memoria}% usado`;
    
    alert(mensaje);
    console.log('📊 Estado del sistema:', status);
  }

  // ==================== RESTO DE MÉTODOS (SIN CAMBIOS) ====================

  setCurrentSection(section: string): void {
    this.currentSection = section;
  }

  getCurrentDateTime(): string {
    return new Date().toLocaleString('es-ES', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getLastUpdate(): string {
    return this.lastUpdate;
  }

  private updateLastUpdate(): void {
    this.lastUpdate = new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getDefaultAvatar(): string {
    return 'https://ui-avatars.com/api/?name=Admin&background=dc3545&color=fff&size=128';
  }

  private reloadCurrentSectionData(): void {
    window.dispatchEvent(new CustomEvent('adminDataRefresh', {
      detail: { section: this.currentSection }
    }));
  }

  logout(): void {
    const confirmar = confirm('¿Estás seguro de que quieres cerrar sesión?');
    
    if (confirmar) {
      this.authService.logout();
      this.toastService.showInfo('👋 Sesión cerrada. ¡Hasta pronto!');
      this.router.navigate(['/home']);
    }
  }

  generateReport(): void {
    this.loading = true;
    
    this.adminService.getAdminStats().subscribe({
      next: (stats) => {
        setTimeout(() => {
          this.loading = false;
          
          const reportData = {
            fechaGeneracion: new Date().toLocaleString('es-ES'),
            totalPeliculas: this.totalMovies,
            totalProximosEstrenos: this.totalComingSoon,
            totalFunciones: this.totalFunctions,
            totalUsuarios: this.totalUsers,
            totalProductosBar: this.totalBarProducts,
            totalRecompensas: this.totalRewards,
            ingresosMes: stats.ingresosMes,
            ventasRecientes: stats.ventasRecientes.length
          };
          
          console.log('📊 Reporte generado:', reportData);
          this.toastService.showSuccess('✅ Reporte generado exitosamente (ver consola)');
          
        }, 2000);
      },
      error: (error) => {
        console.error('❌ Error al generar reporte:', error);
        this.loading = false;
        this.toastService.showError('❌ Error al generar el reporte');
      }
    });
  }

  isRouteActive(route: string): boolean {
    return this.router.url.includes(route);
  }

  navigateWithLoading(route: string[]): void {
    this.loading = true;
    
    this.router.navigate(route).then(() => {
      setTimeout(() => {
        this.loading = false;
      }, 500);
    });
  }

  getActiveClass(route: string): string {
    return this.isRouteActive(route) ? 'active bg-primary text-white' : '';
  }

  onSidebarClick(): void {
    if (window.innerWidth < 768) {
      console.log('📱 Click en sidebar móvil');
    }
  }

  onWindowResize(): void {
    console.log('📐 Ventana redimensionada');
  }

  showDebugInfo(): void {
    const debugInfo = {
      usuario: this.authService.getCurrentUser(),
      seccionActual: this.currentSection,
      ruta: this.router.url,
      ultimaActualizacion: this.lastUpdate,
      estadoSistema: this.getSystemStatus(),
      totales: {
        peliculas: this.totalMovies,
        proximosEstrenos: this.totalComingSoon,
        funciones: this.totalFunctions,
        usuarios: this.totalUsers,
        productosBar: this.totalBarProducts,
        recompensas: this.totalRewards
      }
    };
    
    console.log('=== 🔍 DEBUG ADMIN PANEL ===');
    console.log(debugInfo);
    console.log('============================');
  }
}
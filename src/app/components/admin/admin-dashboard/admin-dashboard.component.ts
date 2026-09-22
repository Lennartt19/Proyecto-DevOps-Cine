// src/app/components/admin/admin-dashboard/admin-dashboard.component.ts - SOLUCIÓN HÍBRIDA
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService, AdminStats } from '../../../services/admin.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { ReportsService } from '../../../services/reports.service';
import { SystemService, SystemMetrics, SystemAlert, AlertSummary, TriggerTestResult } from '../../../services/system.service';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-admin-dashboard',
  standalone: false,
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {

  stats: AdminStats = {
    totalPeliculas: 0,
    totalUsuarios: 0,
    totalVentas: 0,
    ingresosMes: 0,
    usuariosActivos: 0,
    peliculasPopulares: [],
    ventasRecientes: [],
    generosMasPopulares: [],
    actividadReciente: []
  };

  // Estados de carga y error
  cargando: boolean = true;
  refreshingActivity: boolean = false;
  generatingReport: boolean = false;
  errorCargaDatos: boolean = false;
  
  // Estado de datos y diagnóstico
  datosRealesDisponibles: boolean = false;
  usoFallback: boolean = false;
  ultimaActualizacion: string = '';
  mensajeEstado: string = '';
  tipoError: string = '';

  // Sistema de auditoría
  systemMetrics: SystemMetrics = {
    ordenes_hoy: 0,
    ingresos_hoy: 0,
    alertas_pendientes: 0,
    ultima_actualizacion: ''
  };
  
  systemAlerts: SystemAlert[] = [];
  alertsSummary: AlertSummary[] = [];
  triggerTestResult: TriggerTestResult | null = null;
  
  // Estados de carga
  loadingSystemMetrics: boolean = false;
  loadingAlerts: boolean = false;
  testingTriggers: boolean = false;
  runningCleanup: boolean = false;
  
  // Timers
  private updateTimer: any;
  private systemUpdateTimer: any;

  // 🔧 FIX: Cache optimizado para evitar bucles pero permitir carga inicial
  private actividadCache: any[] = [];
  private barStatsCache: any = null;
  private lastActivityUpdate: number = 0;
  private lastBarStatsUpdate: number = 0;
  private readonly ACTIVITY_CACHE_DURATION = 10000; // 10 segundos (más corto)
  private readonly BAR_CACHE_DURATION = 15000; // 15 segundos (más corto)
  
  // 🆕 Flag para permitir primera carga sin restricciones
  private initialLoadCompleted: boolean = false;

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router,
    private reportsService: ReportsService,
    private http: HttpClient,
    private systemService: SystemService
  ) { }

  ngOnInit(): void {
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/home']);
      return;
    }

    this.toastService.showInfo('🔄 Cargando dashboard administrativo con sistema de auditoría...');
    this.cargarEstadisticasConDiagnostico();
    this.cargarMetricasSistema();

    // Configurar actualización automática cada 5 minutos
    this.updateTimer = setInterval(() => {
      this.cargarEstadisticasConDiagnostico(true);
    }, 300000);

    // Configurar actualización del sistema cada 2 minutos
    this.systemUpdateTimer = setInterval(() => {
      this.cargarMetricasSistema(true);
    }, 120000);

    window.addEventListener('adminDataRefresh', this.handleDataRefresh.bind(this));
    this.testTriggersOnInit();
  }
  
  ngOnDestroy(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    if (this.systemUpdateTimer) {
      clearInterval(this.systemUpdateTimer);
    }
    window.removeEventListener('adminDataRefresh', this.handleDataRefresh.bind(this));
  }

  // ==================== MÉTODOS PARA EL SISTEMA DE AUDITORÍA ====================

  cargarMetricasSistema(silencioso: boolean = false): void {
    if (!silencioso) {
      this.loadingSystemMetrics = true;
    }
    
    if (!silencioso) {
      console.log('📊 Cargando métricas del sistema de auditoría...');
    }
    
    forkJoin({
      metrics: this.systemService.getDashboardMetrics(),
      alerts: this.systemService.getSystemAlerts(1, 5, undefined, false),
      summary: this.systemService.getAlertsSummary()
    }).subscribe({
      next: ({ metrics, alerts, summary }) => {
        this.systemMetrics = metrics;
        this.systemAlerts = alerts.data;
        this.alertsSummary = summary;
        this.loadingSystemMetrics = false;
        
        if (!silencioso) {
          this.toastService.showSuccess('✅ Sistema de auditoría cargado correctamente');
          console.log('✅ Métricas del sistema cargadas:', {
            ordenesHoy: metrics.ordenes_hoy,
            ingresosHoy: metrics.ingresos_hoy,
            alertasPendientes: metrics.alertas_pendientes
          });
        }
      },
      error: (error) => {
        console.error('❌ Error cargando métricas del sistema:', error);
        this.loadingSystemMetrics = false;
        
        if (!silencioso) {
          this.toastService.showWarning('⚠️ Sistema de auditoría no disponible - usando datos básicos');
        }
      }
    });
  }

  testTriggersOnInit(): void {
    this.systemService.testTriggers().subscribe({
      next: (result) => {
        this.triggerTestResult = result;
        if (result.success) {
          console.log('✅ Sistema de triggers funcionando:', result);
        } else {
          console.warn('⚠️ Problemas con triggers:', result);
          this.toastService.showWarning('⚠️ Algunos triggers del sistema no están funcionando correctamente');
        }
      },
      error: (error) => {
        console.error('❌ Error probando triggers:', error);
        this.toastService.showError('❌ No se pudo verificar el sistema de triggers');
      }
    });
  }

  markAllAlertsAsReviewed(): void {
    if (this.systemAlerts.length === 0) {
      this.toastService.showInfo('ℹ️ No hay alertas pendientes para marcar');
      return;
    }

    const alertIds = this.systemAlerts.map(alert => alert.id);
    
    this.systemService.markAlertsAsReviewed(alertIds).subscribe({
      next: (result) => {
        if (result.updatedCount > 0) {
          this.cargarMetricasSistema(true);
          this.toastService.showSuccess(`✅ ${result.updatedCount} alertas marcadas como revisadas`);
        }
      },
      error: (error) => {
        console.error('❌ Error marcando alertas:', error);
      }
    });
  }

  ejecutarLimpiezaSistema(): void {
    const confirmLimpieza = confirm(
      '¿Ejecutar limpieza del sistema?\n\n' +
      'Esta acción:\n' +
      '• Eliminará tokens expirados\n' +
      '• Limpiará alertas antiguas revisadas\n' +
      '• Desactivará funciones pasadas\n\n' +
      '¿Continuar?'
    );
    
    if (confirmLimpieza) {
      this.runningCleanup = true;
      this.toastService.showInfo('🧹 Ejecutando limpieza del sistema...');
      
      this.systemService.runSystemCleanup().subscribe({
        next: (result) => {
          this.runningCleanup = false;
          console.log('✅ Limpieza completada:', result.resultado);
          
          setTimeout(() => {
            alert(`🧹 Limpieza del Sistema Completada:\n\n${result.resultado}`);
          }, 1000);
          
          this.cargarMetricasSistema(true);
        },
        error: (error) => {
          this.runningCleanup = false;
          console.error('❌ Error en limpieza:', error);
        }
      });
    }
  }

  verTodasLasAlertas(): void {
    this.loadingAlerts = true;
    
    this.systemService.getSystemAlerts(1, 50).subscribe({
      next: (response) => {
        this.systemAlerts = response.data;
        this.loadingAlerts = false;
        
        const alertsInfo = response.data.map(alert => 
          `${alert.severidad.toUpperCase()}: ${alert.tipo.replace('_', ' ')} - ${alert.mensaje}`
        ).join('\n\n');
        
        alert(`🚨 ALERTAS DEL SISTEMA (${response.data.length}):\n\n${alertsInfo}`);
        console.log('📋 TODAS LAS ALERTAS:', response.data);
      },
      error: (error) => {
        console.error('❌ Error cargando alertas:', error);
        this.loadingAlerts = false;
        this.toastService.showError('❌ Error al cargar alertas');
      }
    });
  }

  verLogDeAuditoria(): void {
    this.systemService.getRecentAuditActivity(20).subscribe({
      next: (auditLogs) => {
        console.log('📋 LOGS DE AUDITORÍA RECIENTES:');
        console.table(auditLogs);
        
        const auditInfo = auditLogs.map(log => 
          `${log.fecha_accion}: ${log.accion} en ${log.tabla_afectada} por ${log.usuario_nombre || 'Sistema'}`
        ).join('\n');
        
        if (auditLogs.length > 0) {
          alert(`📋 LOGS DE AUDITORÍA (${auditLogs.length}):\n\n${auditInfo}`);
        } else {
          alert('📋 No hay logs de auditoría recientes');
        }
        
        this.toastService.showInfo('📋 Logs de auditoría mostrados en consola del navegador');
      },
      error: (error) => {
        console.error('❌ Error obteniendo logs:', error);
        this.toastService.showError('❌ Error al obtener logs de auditoría');
      }
    });
  }

  markSingleAlert(alertId: number): void {
    this.systemService.markAlertsAsReviewed([alertId]).subscribe({
      next: (result) => {
        if (result.updatedCount > 0) {
          this.systemAlerts = this.systemAlerts.filter(alert => alert.id !== alertId);
          this.cargarMetricasSistema(true);
          this.toastService.showSuccess('✅ Alerta marcada como revisada');
        }
      },
      error: (error) => {
        console.error('❌ Error marcando alerta:', error);
      }
    });
  }

  crearAlertasDePrueba(): void {
    const confirmTest = confirm(
      '¿Crear alertas de prueba?\n\n' +
      'Esto insertará algunas alertas de ejemplo en la base de datos para probar el sistema.'
    );
    
    if (confirmTest) {
      this.toastService.showInfo('🧪 Debes ejecutar el SQL en la base de datos para crear alertas de prueba');
      
      const sqlQuery = `
-- Ejecutar en PostgreSQL:
INSERT INTO alertas_sistema (tipo, mensaje, severidad) VALUES
('actividad_sospechosa', 'Usuario ha realizado 6 órdenes en 1 hora', 'alta'),
('orden_grande', 'Orden de $299.50 detectada', 'media'),
('sistema', 'Sistema funcionando correctamente', 'baja'),
('seguridad', 'Intento de acceso no autorizado detectado', 'critica');
      `;
      
      console.log('🧪 SQL PARA CREAR ALERTAS DE PRUEBA:');
      console.log(sqlQuery);
      
      setTimeout(() => {
        this.cargarMetricasSistema();
        this.toastService.showInfo('🔄 Recargando métricas para ver nuevas alertas...');
      }, 3000);
    }
  }

  getSeverityClass(severidad: string): string {
    const severityMap: { [key: string]: string } = {
      'critica': 'danger',
      'alta': 'warning',
      'media': 'info',
      'baja': 'secondary'
    };
    
    return severityMap[severidad] || 'info';
  }

  getAlertIcon(tipo: string): string {
    const iconMap: { [key: string]: string } = {
      'actividad_sospechosa': 'fas fa-user-secret',
      'orden_grande': 'fas fa-dollar-sign',
      'sistema': 'fas fa-cogs',
      'seguridad': 'fas fa-shield-alt'
    };
    
    return iconMap[tipo] || 'fas fa-bell';
  }

  formatAlertDate(dateString: string): string {
    return this.systemService.formatDate(dateString);
  }

  // ==================== MÉTODOS EXISTENTES (OPTIMIZADOS) ====================

  cargarEstadisticasConDiagnostico(silencioso: boolean = false): void {
    if (!silencioso) {
      this.cargando = true;
      this.errorCargaDatos = false;
      this.mensajeEstado = 'Conectando con la base de datos...';
    }
    
    if (!silencioso) {
      console.log('📊 Iniciando carga de estadísticas con diagnóstico...');
    }
    
    this.adminService.getAdminStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.cargando = false;
        this.errorCargaDatos = false;
        this.ultimaActualizacion = new Date().toLocaleTimeString('es-ES');
        
        // 🆕 Marcar que la carga inicial está completa
        setTimeout(() => {
          this.initialLoadCompleted = true;
          console.log('✅ Carga inicial completada - cache activado');
        }, 2000); // Dar tiempo para que se rendericen los datos
        
        if (stats.totalUsuarios > 0 || stats.totalPeliculas > 0) {
          this.datosRealesDisponibles = true;
          this.usoFallback = false;
          this.mensajeEstado = 'Datos cargados exitosamente';
          this.tipoError = '';
          
          if (!silencioso) {
            this.toastService.showSuccess('✅ Dashboard cargado con datos disponibles');
          }
        } else {
          this.datosRealesDisponibles = false;
          this.usoFallback = true;
          this.mensajeEstado = 'Dashboard cargado - Sin datos en el sistema';
          
          if (!silencioso) {
            this.toastService.showWarning('⚠️ Dashboard cargado pero sin datos en el sistema');
          }
        }
        
        if (!silencioso) {
          console.log('✅ Estadísticas cargadas:', {
            peliculas: this.stats.totalPeliculas,
            usuarios: this.stats.totalUsuarios,
            ventas: this.stats.totalVentas,
            fuente: this.datosRealesDisponibles ? 'BD/Servicios' : 'Vacío'
          });
        }
      },
      error: (error) => {
        console.error('❌ Error al cargar estadísticas:', error);
        this.cargando = false;
        this.errorCargaDatos = true;
        this.datosRealesDisponibles = false;
        this.usoFallback = true;
        
        if (error.status === 0) {
          this.tipoError = 'CONEXION';
          this.mensajeEstado = 'Error de conexión - Backend no disponible';
          this.toastService.showError('❌ Backend no disponible en localhost:3000');
          this.mostrarSolucionesBackend();
        } else if (error.status === 404) {
          this.tipoError = 'RUTA';
          this.mensajeEstado = 'Error 404 - Ruta API no encontrada';
          this.toastService.showError('❌ Ruta /api/admin/stats no encontrada');
        } else {
          this.tipoError = 'DESCONOCIDO';
          this.mensajeEstado = `Error ${error.status || 'desconocido'}`;
          this.toastService.showError(`❌ Error: ${error.message}`);
        }
      }
    });
  }

  private mostrarSolucionesBackend(): void {
    setTimeout(() => {
      this.toastService.showInfo(`
        💡 Soluciones posibles:
        1. Verificar que el backend esté ejecutándose: cd backend && npm start
        2. Comprobar que PostgreSQL esté activo
        3. Revisar la URL de la API: http://localhost:3000
      `);
    }, 2000);
  }

  // 🔧 FIX: Método getBarStats optimizado con cache inteligente
  getBarStats(): any {
    const now = Date.now();
    
    // 🆕 SIEMPRE obtener datos frescos en la primera carga O si no hay cache
    if (!this.initialLoadCompleted || !this.barStatsCache) {
      console.log('🔄 Obteniendo datos frescos del bar...');
      const freshData = this.fetchBarStatsFromService();
      console.log('📊 Datos del bar obtenidos:', freshData);
      return freshData;
    }
    
    // Si tenemos cache válido y ya pasó la primera carga, usar cache
    if (this.barStatsCache && (now - this.lastBarStatsUpdate) < this.BAR_CACHE_DURATION) {
      return this.barStatsCache;
    }

    // Actualizar cache para cargas posteriores
    return this.fetchBarStatsFromService();
  }

  // 🆕 Método auxiliar para obtener datos del bar
  private fetchBarStatsFromService(): any {
    const barStats = this.adminService.getBarStats();
    console.log('🔍 AdminService.getBarStats() devolvió:', barStats);
    
    if (!barStats || barStats.totalProductos === 0) {
      console.log('⚠️ No hay productos en el bar o respuesta vacía');
      this.barStatsCache = {
        totalProductos: 0,
        productosDisponibles: 0,
        combosEspeciales: 0,
        categorias: 0,
        precioPromedio: 0,
        productoMasPopular: 'Sin productos registrados',
        ventasSimuladas: 0,
        ingresoSimulado: 0,
        datosReales: false,
        mensaje: 'No hay productos en el bar'
      };
    } else {
      console.log('✅ Productos encontrados:', barStats.totalProductos);
      const ventasReales = barStats.ventasSimuladasBar || [];
      const productosPopulares = barStats.productosPopularesBar || [];
      
      this.barStatsCache = {
        totalProductos: barStats.totalProductos,
        productosDisponibles: barStats.productosDisponibles,
        combosEspeciales: barStats.totalCombos,
        categorias: barStats.totalCategorias,
        precioPromedio: barStats.precioPromedio,
        productoMasPopular: productosPopulares[0]?.nombre || 'Sin datos de ventas',
        ventasSimuladas: ventasReales.length,
        ingresoSimulado: ventasReales.reduce((sum, v) => sum + v.total, 0),
        datosReales: barStats.totalProductos > 0,
        mensaje: barStats.totalProductos > 0 ? 'Datos del bar disponibles' : 'Sin productos'
      };
    }

    this.lastBarStatsUpdate = Date.now();
    console.log('💾 Cache del bar actualizado:', this.barStatsCache);
    return this.barStatsCache;
  }

  // 🔧 FIX: Método getActividadRecienteCombinada optimizado
  getActividadRecienteCombinada(): any[] {
    const now = Date.now();
    
    // 🆕 SIEMPRE obtener datos frescos en la primera carga O si no hay cache
    if (!this.initialLoadCompleted || this.actividadCache.length === 0) {
      console.log('🔄 Obteniendo actividad fresca...');
      const freshActivity = this.fetchActivityFromService();
      console.log('📊 Actividad obtenida:', freshActivity.length, 'items');
      return freshActivity;
    }
    
    // Si tenemos cache válido, usar cache
    if (this.actividadCache.length > 0 && (now - this.lastActivityUpdate) < this.ACTIVITY_CACHE_DURATION) {
      return this.actividadCache;
    }

    // Actualizar cache para cargas posteriores
    return this.fetchActivityFromService();
  }

  // 🆕 Método auxiliar para obtener actividad
  private fetchActivityFromService(): any[] {
    // Usar actividad real del AdminService
    const actividadReal = this.stats.actividadReciente || [];
    
    // Complementar con actividad del bar si existe
    const actividadBar = this.getBarActivity().filter(act => act.datosReales !== false);
    
    // Combinar y ordenar por fecha
    this.actividadCache = [...actividadReal, ...actividadBar]
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 8);
    
    if (this.actividadCache.length === 0) {
      this.actividadCache = [{
        tipo: 'sin_actividad',
        descripcion: 'No hay actividad reciente registrada',
        fecha: new Date().toISOString(),
        icono: 'fas fa-info-circle',
        color: 'secondary',
        datosReales: false
      }];
    }
    
    this.lastActivityUpdate = Date.now();
    
    // Solo log una vez cuando se actualiza el cache Y es primera carga
    if (!this.initialLoadCompleted) {
      console.log('📊 Actividad reciente combinada:', this.actividadCache.length, 'items');
    }
    
    return this.actividadCache;
  }

  getTopBarProducts(): any[] {
    const barStats = this.adminService.getBarStats();
    
    if (!barStats.productosPopularesBar || barStats.productosPopularesBar.length === 0) {
      return [{
        ranking: 1,
        nombre: 'Sin productos registrados',
        categoria: 'N/A',
        ventas: 0,
        ingresos: 0,
        esCombo: false,
        datosReales: false,
        mensaje: 'No hay productos en el bar'
      }];
    }
    
    return barStats.productosPopularesBar.slice(0, 5).map((prod, index) => ({
      ranking: index + 1,
      nombre: prod.nombre,
      categoria: prod.categoria,
      ventas: prod.ventasSimuladas,
      ingresos: prod.ingresoSimulado,
      esCombo: prod.esCombo,
      datosReales: true
    }));
  }

  getBarActivity(): any[] {
    const barStats = this.adminService.getBarStats();
    const ventasReales = barStats.ventasSimuladasBar || [];
    
    if (ventasReales.length === 0) {
      return [{
        tipo: 'sin_ventas',
        descripcion: 'No hay ventas del bar registradas',
        fecha: new Date().toISOString(),
        icono: 'fas fa-info-circle',
        color: 'secondary',
        monto: 0,
        datosReales: false
      }];
    }
    
    return ventasReales.slice(0, 5).map(venta => ({
      tipo: 'venta_bar',
      descripcion: `${venta.cliente} compró ${venta.cantidad}x ${venta.producto}`,
      fecha: venta.fecha,
      icono: venta.esCombo ? 'fas fa-gift' : 'fas fa-utensils',
      color: venta.esCombo ? 'danger' : 'warning',
      monto: venta.total,
      datosReales: true
    }));
  }

  getTendenciasBar(): any {
    const barStats = this.adminService.getBarStats();
    const tendencias = barStats.tendenciasBar;
    
    if (!tendencias) {
      return {
        ventasUltimos7Dias: 0,
        ingresoUltimos7Dias: 0,
        ventasUltimos30Dias: 0,
        ingresoUltimos30Dias: 0,
        productoMasVendido: 'Sin datos',
        categoriaMasPopular: 'Sin datos',
        promedioVentaDiaria: 0,
        promedioIngresoDiario: 0,
        datosReales: false
      };
    }
    
    return {
      ...tendencias,
      datosReales: true
    };
  }

  irAGestionBar(): void {
    this.router.navigate(['/admin/bar']);
  }

  private handleDataRefresh(event: any): void {
    if (event.detail.section === 'Dashboard') {
      // 🔧 Limpiar caches cuando se hace refresh manual
      this.clearCaches();
      this.cargarEstadisticasConDiagnostico(true);
      this.cargarMetricasSistema(true);
    }
  }

  // 🆕 Método para limpiar caches
  private clearCaches(): void {
    this.actividadCache = [];
    this.barStatsCache = null;
    this.lastActivityUpdate = 0;
    this.lastBarStatsUpdate = 0;
  }

  refreshActivity(): void {
    this.refreshingActivity = true;
    
    // Limpiar cache de actividad
    this.clearCaches();
    
    this.adminService.getAdminStats().subscribe({
      next: (stats) => {
        this.stats.actividadReciente = stats.actividadReciente;
        this.refreshingActivity = false;
        this.toastService.showSuccess('🔄 Actividad actualizada');
      },
      error: (error) => {
        console.error('❌ Error al refrescar actividad:', error);
        this.refreshingActivity = false;
        this.toastService.showError('❌ Error al actualizar actividad');
      }
    });
  }

  refreshAllStats(): void {
    this.toastService.showInfo('🔄 Actualizando todas las estadísticas y sistema de auditoría...');
    
    // Limpiar todos los caches
    this.clearCaches();
    
    this.cargarEstadisticasConDiagnostico();
    this.cargarMetricasSistema();
  }

  // ==================== RESTO DE MÉTODOS (SIN CAMBIOS) ====================

  verificarEstadoConexion(): void {
    this.toastService.showInfo('🔍 Verificando conexión con el backend...');
    
    this.adminService.checkDatabaseConnection().subscribe({
      next: (connected) => {
        if (connected) {
          this.toastService.showSuccess('✅ Conexión con backend exitosa');
          this.datosRealesDisponibles = true;
          this.errorCargaDatos = false;
          this.cargarEstadisticasConDiagnostico();
        } else {
          this.toastService.showWarning('⚠️ Backend no responde correctamente');
          this.mostrarInstruccionesBackend();
        }
      },
      error: () => {
        this.toastService.showError('❌ No se puede conectar con el backend');
        this.mostrarInstruccionesBackend();
      }
    });
  }

  private mostrarInstruccionesBackend(): void {
    console.log('🛠️ INSTRUCCIONES PARA SOLUCIONAR:');
    console.log('1. Abrir terminal en la carpeta del backend');
    console.log('2. Ejecutar: npm install');
    console.log('3. Ejecutar: npm start');
    console.log('4. Verificar que PostgreSQL esté ejecutándose');
    console.log('5. Comprobar que el backend responda en http://localhost:3000');
    
    setTimeout(() => {
      this.toastService.showInfo(`
        🛠️ Para solucionar:
        1. Abrir terminal en carpeta backend
        2. Ejecutar: npm start
        3. Verificar PostgreSQL activo
        4. Comprobar http://localhost:3000
      `);
    }, 1000);
  }

  reintentarCarga(): void {
    this.toastService.showInfo('🔄 Reintentando cargar datos...');
    this.clearCaches();
    this.cargarEstadisticasConDiagnostico();
    this.cargarMetricasSistema();
  }

  verificarEstadoDatos(): void {
    this.toastService.showInfo('🔍 Verificando estado del sistema...');
    
    this.adminService.getDataStatus().subscribe({
      next: (status) => {
        console.log('📊 Estado del sistema:', status);
        
        const mensaje = `
          📊 Estado del Sistema:
          • Películas: ${status.totalPeliculas}
          • Usuarios: ${status.totalUsuarios}
          • Ventas: ${status.totalVentas}
          • Fuente: ${status.source}
          • Última actualización: ${new Date(status.lastUpdate).toLocaleTimeString()}
        `;
        
        this.toastService.showInfo(mensaje);
      },
      error: (error) => {
        console.error('❌ Error verificando estado:', error);
        this.toastService.showError('❌ Error al verificar estado del sistema');
      }
    });
  }

  mostrarInfoCompleta(): void {
    const info = {
      estado: {
        datosReales: this.datosRealesDisponibles,
        usoFallback: this.usoFallback,
        errorCarga: this.errorCargaDatos,
        tipoError: this.tipoError,
        mensaje: this.mensajeEstado
      },
      estadisticas: {
        peliculas: this.stats.totalPeliculas,
        usuarios: this.stats.totalUsuarios,
        ventas: this.stats.totalVentas,
        ingresos: this.stats.ingresosMes
      },
      sistema: {
        ordenesHoy: this.systemMetrics.ordenes_hoy,
        ingresosHoy: this.systemMetrics.ingresos_hoy,
        alertasPendientes: this.systemMetrics.alertas_pendientes
      },
      bar: this.getBarStats(),
      ultimaActualizacion: this.ultimaActualizacion,
      timestamp: new Date().toLocaleString('es-ES')
    };
    
    console.log('=== INFORMACIÓN COMPLETA DEL SISTEMA ===');
    console.table(info.estado);
    console.table(info.estadisticas);
    console.table(info.sistema);
    console.log('Bar:', info.bar);
    console.log('========================================');
    
    this.toastService.showSuccess('ℹ️ Información del sistema mostrada en consola del navegador');
  }

  // ==================== UTILIDADES DE FECHA Y FORMATO ====================

  getCurrentDate(): string {
    return new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getLastUpdateTime(): string {
    return this.ultimaActualizacion || new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatActivityDate(fecha: string): string {
    const fechaObj = new Date(fecha);
    const ahora = new Date();
    const diffMs = ahora.getTime() - fechaObj.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      return 'Hace un momento';
    } else if (diffMins < 60) {
      return `Hace ${diffMins} minutos`;
    } else if (diffHours < 24) {
      return `Hace ${diffHours} horas`;
    } else if (diffDays < 7) {
      return `Hace ${diffDays} días`;
    } else {
      return fechaObj.toLocaleDateString('es-ES');
    }
  }

  getGenreColorClass(genero: string): string {
    const colorMap: { [key: string]: string } = {
      'Acción': 'bg-danger',
      'Aventura': 'bg-warning',
      'Comedia': 'bg-success',
      'Drama': 'bg-primary',
      'Terror': 'bg-dark',
      'Romance': 'bg-info',
      'Ciencia Ficción': 'bg-secondary',
      'Fantasía': 'bg-purple',
      'Animación': 'bg-orange',
      'Misterio': 'bg-indigo'
    };
    
    return colorMap[genero] || 'bg-primary';
  }

  // ==================== REPORTES SIMPLIFICADOS ====================

  generateSalesReport(): void {
    this.generatingReport = true;
    this.toastService.showInfo('📊 Generando reporte de ventas en PDF...');
    
    this.downloadReportPDF('ventas', 'Reporte de Ventas');
  }

  generateBarReport(): void {
    this.generatingReport = true;
    this.toastService.showInfo('📊 Generando reporte del bar en PDF...');
    
    this.downloadReportPDF('bar', 'Reporte del Bar');
  }

  generateUsersReport(): void {
    this.generatingReport = true;
    this.toastService.showInfo('📊 Generando reporte de usuarios en PDF...');
    
    this.downloadReportPDF('usuarios', 'Reporte de Usuarios');
  }

  generateMoviesReport(): void {
    this.generatingReport = true;
    this.toastService.showInfo('📊 Generando reporte de películas en PDF...');
    
    this.downloadReportPDF('peliculas', 'Reporte de Películas');
  }

  generateCombinedReport(): void {
    this.generatingReport = true;
    this.toastService.showInfo('📊 Generando reporte combinado en PDF...');
    
    this.downloadReportPDF('combinado', 'Reporte Combinado');
  }

  generateCompleteReport(): void {
    this.generatingReport = true;
    this.toastService.showInfo('📊 Generando reporte ejecutivo en PDF...');
    
    this.downloadReportPDF('ejecutivo', 'Reporte Ejecutivo');
  }

  private downloadReportPDF(tipoReporte: string, nombreReporte: string): void {
    const token = this.authService.getToken();
    
    if (!token) {
      this.generatingReport = false;
      this.toastService.showError('❌ No hay token de autenticación');
      return;
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    const url = `${environment.apiUrl}/reports/${tipoReporte}?formato=pdf`;

    this.http.get(url, { 
      headers, 
      responseType: 'blob' as 'json',
      observe: 'response'
    }).subscribe({
      next: (response: any) => {
        const blob = new Blob([response.body], { type: 'application/pdf' });
        const downloadUrl = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${tipoReporte}-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        window.URL.revokeObjectURL(downloadUrl);
        
        this.generatingReport = false;
        this.toastService.showSuccess(`✅ ${nombreReporte} descargado exitosamente`);
      },
      error: (error) => {
        console.error(`❌ Error descargando ${nombreReporte}:`, error);
        this.generatingReport = false;
        
        if (error.status === 401) {
          this.toastService.showError('❌ No tienes permisos para generar reportes');
          this.router.navigate(['/login']);
        } else if (error.status === 0) {
          this.toastService.showError('❌ Backend no disponible. Verifica que esté ejecutándose.');
        } else {
          this.toastService.showError(`❌ Error al generar ${nombreReporte}`);
        }
      }
    });
  }

  // ==================== ACCIONES RÁPIDAS MEJORADAS ====================

  viewSystemLogs(): void {
    const logs = [
      { fecha: new Date().toISOString(), nivel: 'INFO', mensaje: `Sistema iniciado - Estado: ${this.mensajeEstado}` },
      { fecha: new Date().toISOString(), nivel: this.errorCargaDatos ? 'ERROR' : 'SUCCESS', mensaje: `Carga de datos: ${this.errorCargaDatos ? 'Fallida' : 'Exitosa'}` },
      { fecha: new Date().toISOString(), nivel: 'INFO', mensaje: `Datos reales: ${this.datosRealesDisponibles ? 'Disponibles' : 'No disponibles'}` },
      { fecha: new Date().toISOString(), nivel: 'INFO', mensaje: `Fallback activo: ${this.usoFallback ? 'Sí' : 'No'}` },
      { fecha: new Date().toISOString(), nivel: 'INFO', mensaje: `Películas: ${this.stats.totalPeliculas}, Usuarios: ${this.stats.totalUsuarios}` },
      { fecha: new Date().toISOString(), nivel: 'INFO', mensaje: `Alertas pendientes: ${this.systemMetrics.alertas_pendientes}` },
      { fecha: new Date().toISOString(), nivel: 'INFO', mensaje: `Sistema de triggers: ${this.triggerTestResult?.success ? 'OK' : 'ERROR'}` }
    ];
    
    console.log('=== LOGS DEL SISTEMA CON DIAGNÓSTICO Y AUDITORÍA ===');
    console.table(logs);
    console.log('=================================================');
    
    this.toastService.showInfo('📋 Logs del sistema mostrados en consola del navegador');
  }

  systemBackup(): void {
    const confirmBackup = confirm(
      '¿Realizar backup del sistema en PDF?\n\n' +
      `Estado actual:\n` +
      `• Películas: ${this.stats.totalPeliculas}\n` +
      `• Usuarios: ${this.stats.totalUsuarios}\n` +
      `• Ventas: ${this.stats.totalVentas}\n` +
      `• Productos Bar: ${this.getBarStats().totalProductos}\n` +
      `• Alertas pendientes: ${this.systemMetrics.alertas_pendientes}\n` +
      `• Fuente: ${this.datosRealesDisponibles ? 'Datos disponibles' : 'Sistema vacío'}`
    );
    
    if (confirmBackup) {
      this.toastService.showInfo('💾 Generando backup del sistema en PDF...');
      
      setTimeout(() => {
        try {
          this.generateSystemBackupPDF();
          this.toastService.showSuccess('✅ Backup completado y descargado en PDF');
        } catch (error) {
          console.error('Error generando backup PDF:', error);
          this.toastService.showError('❌ Error al generar backup PDF');
        }
      }, 1000);
    }
  }

  private generateSystemBackupPDF(): void {
    const doc = new jsPDF();
    const fechaBackup = new Date().toLocaleDateString('es-ES');
    const horaBackup = new Date().toLocaleTimeString('es-ES');
    
    let yPosition = 20;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;

    // Header
    doc.setFillColor(52, 73, 94);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('BACKUP DEL SISTEMA PARKYFILMS', pageWidth / 2, 25, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text('Copia de Seguridad Completa con Sistema de Auditoría', pageWidth / 2, 35, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Generado el: ${fechaBackup} a las ${horaBackup}`, pageWidth / 2, 45, { align: 'center' });
    
    yPosition = 65;

    // Información general
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN GENERAL DEL SISTEMA', margin, yPosition);
    yPosition += 15;

    const infoGeneral = [
      ['Fecha del Backup', `${fechaBackup} ${horaBackup}`],
      ['Versión del Sistema', '2.1.0 + Auditoría'],
      ['Estado de Datos', this.datosRealesDisponibles ? 'Datos Reales Disponibles' : 'Datos Locales'],
      ['Modo de Operación', this.usoFallback ? 'Modo Fallback' : 'Modo Normal'],
      ['Estado de Conexión', this.errorCargaDatos ? 'Error de Conexión' : 'Conexión OK'],
      ['Última Actualización', this.ultimaActualizacion || 'No disponible'],
      ['Usuario Admin', this.authService.getCurrentUser()?.nombre || 'Administrador'],
      ['Mensaje de Estado', this.mensajeEstado || 'Sistema normal'],
      ['Alertas Pendientes', this.systemMetrics.alertas_pendientes.toString()],
      ['Órdenes Hoy', this.systemMetrics.ordenes_hoy.toString()],
      ['Ingresos Hoy', `${this.systemMetrics.ingresos_hoy.toFixed(2)}`],
      ['Sistema de Triggers', this.triggerTestResult?.success ? 'Funcionando' : 'Con problemas']
    ];

    autoTable(doc, {
      head: [['Parámetro', 'Valor']],
      body: infoGeneral,
      startY: yPosition,
      theme: 'striped',
      headStyles: { 
        fillColor: [52, 73, 94],
        textColor: [255, 255, 255],
        fontSize: 12,
        fontStyle: 'bold'
      },
      styles: { 
        fontSize: 10,
        cellPadding: { top: 4, right: 6, bottom: 4, left: 6 }
      },
      columnStyles: {
        0: { cellWidth: 60, fontStyle: 'bold' },
        1: { cellWidth: 110 }
      }
    });

    const fileName = `backup-sistema-parkyfilms-auditoria-${new Date().toISOString().split('T')[0]}-${new Date().toTimeString().split(' ')[0].replace(/:/g, '')}.pdf`;
    doc.save(fileName);
  }
}
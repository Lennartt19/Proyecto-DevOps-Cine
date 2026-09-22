// src/app/services/system.service.ts - NUEVO SERVICIO PARA SISTEMA DE AUDITORÍA
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { environment } from '../../environments/environment';

// ==================== INTERFACES ====================

export interface SystemMetrics {
  ordenes_hoy: number;
  ingresos_hoy: number;
  alertas_pendientes: number;
  ultima_actualizacion: string;
}

export interface SystemAlert {
  id: number;
  tipo: string;
  mensaje: string;
  severidad: 'critica' | 'alta' | 'media' | 'baja';
  revisada: boolean;
  fecha_creacion: string;
  fecha_revision?: string;
}

export interface AlertSummary {
  severidad: 'critica' | 'alta' | 'media' | 'baja';
  total: number;
  pendientes: number;
}

export interface AuditLogEntry {
  id: number;
  tabla_afectada: string;
  accion: 'INSERT' | 'UPDATE' | 'DELETE';
  usuario_id?: number;
  datos_anteriores?: any;
  datos_nuevos?: any;
  fecha_accion: string;
  usuario_nombre?: string;
  usuario_email?: string;
}

export interface SystemStats {
  metricas: SystemMetrics;
  alertas_semana: any[];
  actividad_semana: any[];
}

export interface TriggerTestResult {
  success: boolean;
  message: string;
  data: {
    funciones_activas: number;
    triggers_activos: number;
    metricas_funcionando: boolean;
    funciones: string[];
    triggers: string[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class SystemService {

  private readonly API_URL = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private toastService: ToastService
  ) { 
    console.log('🔧 SystemService inicializado para auditoría y alertas');
  }

  // ==================== MÉTRICAS DEL SISTEMA ====================

  /**
   * Obtener métricas del dashboard del sistema
   */
  getDashboardMetrics(): Observable<SystemMetrics> {
    console.log('📊 Obteniendo métricas del sistema...');
    
    const headers = this.getAuthHeaders();
    
    return this.http.get<any>(`${this.API_URL}/admin/system/metrics`, { headers }).pipe(
      map(response => {
        if (response.success) {
          console.log('✅ Métricas del sistema obtenidas:', response.data);
          return response.data;
        }
        throw new Error('Error obteniendo métricas');
      }),
      catchError(error => {
        console.error('❌ Error obteniendo métricas:', error);
        return of({
          ordenes_hoy: 0,
          ingresos_hoy: 0,
          alertas_pendientes: 0,
          ultima_actualizacion: new Date().toISOString()
        });
      })
    );
  }

  // ==================== GESTIÓN DE ALERTAS ====================

  /**
   * Obtener alertas del sistema con paginación
   */
  getSystemAlerts(page: number = 1, limit: number = 20, severidad?: string, revisada?: boolean): Observable<{data: SystemAlert[], pagination: any}> {
    console.log(`🚨 Obteniendo alertas del sistema (página ${page})`);
    
    const headers = this.getAuthHeaders();
    let params: any = { page: page.toString(), limit: limit.toString() };
    
    if (severidad) params.severidad = severidad;
    if (revisada !== undefined) params.revisada = revisada.toString();
    
    return this.http.get<any>(`${this.API_URL}/admin/system/alerts`, { headers, params }).pipe(
      map(response => {
        if (response.success) {
          console.log(`✅ ${response.data.length} alertas obtenidas`);
          return {
            data: response.data,
            pagination: response.pagination
          };
        }
        throw new Error('Error obteniendo alertas');
      }),
      catchError(error => {
        console.error('❌ Error obteniendo alertas:', error);
        this.toastService.showError('❌ Error al cargar alertas del sistema');
        return of({
          data: [],
          pagination: { page: 1, limit: 20, total: 0 }
        });
      })
    );
  }

  /**
   * Marcar alertas como revisadas
   */
  markAlertsAsReviewed(alertIds: number[]): Observable<{updatedCount: number}> {
    console.log(`✅ Marcando ${alertIds.length} alertas como revisadas`);
    
    const headers = this.getAuthHeaders();
    const body = { alertIds };
    
    return this.http.post<any>(`${this.API_URL}/admin/system/alerts/mark-reviewed`, body, { headers }).pipe(
      map(response => {
        if (response.success) {
          console.log(`✅ ${response.data.updatedCount} alertas marcadas como revisadas`);
          this.toastService.showSuccess(response.message);
          return response.data;
        }
        throw new Error('Error marcando alertas');
      }),
      catchError(error => {
        console.error('❌ Error marcando alertas:', error);
        this.toastService.showError('❌ Error al marcar alertas como revisadas');
        return of({ updatedCount: 0 });
      })
    );
  }

  /**
   * Obtener resumen de alertas por severidad
   */
  getAlertsSummary(): Observable<AlertSummary[]> {
    console.log('📋 Obteniendo resumen de alertas...');
    
    const headers = this.getAuthHeaders();
    
    return this.http.get<any>(`${this.API_URL}/admin/system/alerts/summary`, { headers }).pipe(
      map(response => {
        if (response.success) {
          console.log('✅ Resumen de alertas obtenido');
          return response.data;
        }
        throw new Error('Error obteniendo resumen');
      }),
      catchError(error => {
        console.error('❌ Error obteniendo resumen de alertas:', error);
        return of([]);
      })
    );
  }

  // ==================== AUDITORÍA ====================

  /**
   * Obtener logs de auditoría con filtros
   */
  getAuditLog(
    page: number = 1, 
    limit: number = 50, 
    filters: {
      tabla?: string;
      accion?: string;
      usuario_id?: number;
      fecha_desde?: string;
      fecha_hasta?: string;
    } = {}
  ): Observable<{data: AuditLogEntry[], pagination: any}> {
    console.log(`🔍 Obteniendo log de auditoría (página ${page})`);
    
    const headers = this.getAuthHeaders();
    let params: any = { 
      page: page.toString(), 
      limit: limit.toString() 
    };
    
    // Agregar filtros si existen
    Object.keys(filters).forEach(key => {
      if (filters[key as keyof typeof filters] !== undefined) {
        params[key] = filters[key as keyof typeof filters]!.toString();
      }
    });
    
    return this.http.get<any>(`${this.API_URL}/admin/system/audit`, { headers, params }).pipe(
      map(response => {
        if (response.success) {
          console.log(`✅ ${response.data.length} entradas de auditoría obtenidas`);
          return {
            data: response.data,
            pagination: response.pagination
          };
        }
        throw new Error('Error obteniendo auditoría');
      }),
      catchError(error => {
        console.error('❌ Error obteniendo auditoría:', error);
        this.toastService.showError('❌ Error al cargar logs de auditoría');
        return of({
          data: [],
          pagination: { page: 1, limit: 50, total: 0 }
        });
      })
    );
  }

  // ==================== MANTENIMIENTO ====================

  /**
   * Ejecutar limpieza del sistema
   */
  runSystemCleanup(): Observable<{resultado: string}> {
    console.log('🧹 Ejecutando limpieza del sistema...');
    
    const headers = this.getAuthHeaders();
    
    return this.http.post<any>(`${this.API_URL}/admin/system/cleanup`, {}, { headers }).pipe(
      map(response => {
        if (response.success) {
          console.log('✅ Limpieza completada:', response.data.resultado);
          this.toastService.showSuccess('🧹 ' + response.message);
          return response.data;
        }
        throw new Error('Error ejecutando limpieza');
      }),
      catchError(error => {
        console.error('❌ Error ejecutando limpieza:', error);
        this.toastService.showError('❌ Error al ejecutar limpieza del sistema');
        return of({ resultado: 'Error en limpieza' });
      })
    );
  }

  // ==================== ESTADÍSTICAS AVANZADAS ====================

  /**
   * Obtener estadísticas avanzadas del sistema
   */
  getSystemStats(): Observable<SystemStats> {
    console.log('📈 Obteniendo estadísticas avanzadas del sistema...');
    
    const headers = this.getAuthHeaders();
    
    return this.http.get<any>(`${this.API_URL}/admin/system/stats`, { headers }).pipe(
      map(response => {
        if (response.success) {
          console.log('✅ Estadísticas avanzadas obtenidas');
          return response.data;
        }
        throw new Error('Error obteniendo estadísticas');
      }),
      catchError(error => {
        console.error('❌ Error obteniendo estadísticas avanzadas:', error);
        return of({
          metricas: {
            ordenes_hoy: 0,
            ingresos_hoy: 0,
            alertas_pendientes: 0,
            ultima_actualizacion: new Date().toISOString()
          },
          alertas_semana: [],
          actividad_semana: []
        });
      })
    );
  }

  // ==================== TESTING DE TRIGGERS ====================

  /**
   * Probar que los triggers del sistema funcionan
   */
  testTriggers(): Observable<TriggerTestResult> {
    console.log('🧪 Probando funcionamiento de triggers...');
    
    const headers = this.getAuthHeaders();
    
    return this.http.get<any>(`${this.API_URL}/admin/system/test-triggers`, { headers }).pipe(
      map(response => {
        if (response.success) {
          console.log('✅ Test de triggers completado:', response.data);
          return response;
        }
        throw new Error('Error probando triggers');
      }),
      catchError(error => {
        console.error('❌ Error probando triggers:', error);
        this.toastService.showError('❌ Error al probar triggers del sistema');
        return of({
          success: false,
          message: 'Error al probar triggers',
          data: {
            funciones_activas: 0,
            triggers_activos: 0,
            metricas_funcionando: false,
            funciones: [],
            triggers: []
          }
        });
      })
    );
  }

  // ==================== MÉTODOS DE UTILIDAD ====================

  /**
   * Verificar estado del sistema de auditoría
   */
  checkSystemStatus(): Observable<{status: string, issues: string[]}> {
    console.log('🔍 Verificando estado del sistema...');
    
    return this.testTriggers().pipe(
      map(result => {
        const issues: string[] = [];
        
        if (result.data.funciones_activas < 4) {
          issues.push('Faltan funciones del sistema');
        }
        
        if (result.data.triggers_activos < 3) {
          issues.push('Faltan triggers de auditoría');
        }
        
        if (!result.data.metricas_funcionando) {
          issues.push('Métricas no funcionan correctamente');
        }
        
        const status = issues.length === 0 ? 'OK' : 'WARNING';
        
        return { status, issues };
      })
    );
  }

  /**
   * Obtener alertas críticas pendientes
   */
  getCriticalAlerts(): Observable<SystemAlert[]> {
    return this.getSystemAlerts(1, 10, 'critica', false).pipe(
      map(response => response.data.filter(alert => alert.severidad === 'critica'))
    );
  }

  /**
   * Obtener actividad reciente de auditoría
   */
  getRecentAuditActivity(limit: number = 10): Observable<AuditLogEntry[]> {
    return this.getAuditLog(1, limit).pipe(
      map(response => response.data)
    );
  }

  // ==================== HELPERS PRIVADOS ====================

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    
    if (!token) {
      console.warn('⚠️ No hay token de autenticación para SystemService');
      return new HttpHeaders({
        'Content-Type': 'application/json'
      });
    }

    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Formatear severidad para mostrar
   */
  formatSeverity(severidad: string): {text: string, class: string, icon: string} {
    const severityMap = {
      'critica': { text: 'Crítica', class: 'danger', icon: 'fas fa-exclamation-triangle' },
      'alta': { text: 'Alta', class: 'warning', icon: 'fas fa-exclamation-circle' },
      'media': { text: 'Media', class: 'info', icon: 'fas fa-info-circle' },
      'baja': { text: 'Baja', class: 'secondary', icon: 'fas fa-check-circle' }
    };
    
    return severityMap[severidad as keyof typeof severityMap] || severityMap['media'];
  }

  /**
   * Formatear fecha para mostrar
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
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
      return date.toLocaleDateString('es-ES');
    }
  }
}  
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PointsService {

  private readonly API_URL = `${environment.apiUrl}/points`;
  private userPointsSubject = new BehaviorSubject<number>(0);
  public userPoints$ = this.userPointsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    console.log('🆕 PointsService actualizado con API backend');
    console.log('📡 PointsService conectado a API:', this.API_URL); 
    this.initializeService();
  }

  // ==================== INICIALIZACIÓN ====================

  private initializeService(): void {
    // Solo cargar puntos si el usuario está logueado
    if (this.authService.isLoggedIn()) {
      this.loadUserPoints();
    }

    // Suscribirse a cambios de autenticación
    this.authService.authStatus$.subscribe(isLoggedIn => {
      if (isLoggedIn) {
        this.loadUserPoints();
      } else {
        this.userPointsSubject.next(0);
      }
    });
  }

  // ==================== MÉTODOS PRINCIPALES DE PUNTOS ====================

  /**
   * Obtener puntos actuales del usuario desde la API
   */
  getUserPoints(): Observable<UserPointsResponse> {
    if (!this.authService.isLoggedIn()) {
      console.log('🔐 Usuario no autenticado, retornando puntos en 0');
      return of({ puntosActuales: 0, totalGanados: 0, totalUsados: 0 });
    }

    const headers = this.getAuthHeaders();
    
    return this.http.get<ApiResponse<UserPointsData>>(`${this.API_URL}`, { headers }).pipe(
      map(response => {
        if (response.success && response.data) {
          this.userPointsSubject.next(response.data.puntos_actuales || 0);
          return {
            puntosActuales: response.data.puntos_actuales || 0,
            totalGanados: response.data.total_ganados || 0,
            totalUsados: response.data.total_usados || 0
          };
        }
        return { puntosActuales: 0, totalGanados: 0, totalUsados: 0 };
      }),
      catchError(error => {
        console.error('❌ Error al obtener puntos del usuario:', error);
        
        // Si es error 401, el token expiró
        if (error.status === 401) {
          this.authService.logout();
          return of({ puntosActuales: 0, totalGanados: 0, totalUsados: 0 });
        }
        
        // Para otros errores, usar fallback legacy
        const currentUser = this.authService.getCurrentUser();
        if (currentUser) {
          const puntosLegacy = this.getUserPoints_Legacy(currentUser.id);
          return of({ 
            puntosActuales: puntosLegacy, 
            totalGanados: puntosLegacy, 
            totalUsados: 0 
          });
        }
        
        return of({ puntosActuales: 0, totalGanados: 0, totalUsados: 0 });
      })
    );
  }

  /**
   * Obtener estadísticas completas de puntos
   */
  getUserPointsStats(): Observable<PointsStats> {
    if (!this.authService.isLoggedIn()) {
      return of(this.getDefaultStats());
    }

    const headers = this.getAuthHeaders();
    
    return this.http.get<ApiResponse<PointsStats>>(`${this.API_URL}/stats`, { headers }).pipe(
      map(response => response.success ? response.data : this.getDefaultStats()),
      catchError(error => {
        console.error('❌ Error al obtener estadísticas de puntos:', error);
        return of(this.getDefaultStats());
      })
    );
  }

  /**
   * Obtener historial de transacciones de puntos
   */
  getPointsHistory(page: number = 1, limit: number = 20): Observable<PointsTransaction[]> {
    if (!this.authService.isLoggedIn()) {
      return of([]);
    }

    const headers = this.getAuthHeaders();
    const params = { page: page.toString(), limit: limit.toString() };
    
    return this.http.get<ApiResponse<PointsTransaction[]>>(`${this.API_URL}/history`, { 
      headers, 
      params 
    }).pipe(
      map(response => response.success ? response.data : []),
      catchError(error => {
        console.error('❌ Error al obtener historial de puntos:', error);
        return of([]);
      })
    );
  }

  /**
   * Usar puntos del usuario
   */
  usePoints(puntos: number, concepto: string, metadata?: any): Observable<boolean> {
    if (!this.authService.isLoggedIn()) {
      return of(false);
    }

    const headers = this.getAuthHeaders();
    const payload = { puntos, concepto, metadata };
    
    return this.http.post<ApiResponse<any>>(`${this.API_URL}/use`, payload, { headers }).pipe(
      map(response => {
        if (response.success) {
          this.loadUserPoints(); // Recargar puntos después de usar
          return true;
        }
        return false;
      }),
      catchError(error => {
        console.error('❌ Error al usar puntos:', error);
        return of(false);
      })
    );
  }

  /**
   * Verificar si el usuario puede usar cierta cantidad de puntos
   */
  canUsePoints(puntos: number): Observable<boolean> {
    if (!this.authService.isLoggedIn()) {
      return of(false);
    }

    const headers = this.getAuthHeaders();
    const params = { puntos: puntos.toString() };
    
    return this.http.get<ApiResponse<any>>(`${this.API_URL}/check`, { headers, params }).pipe(
      map(response => response.success && response.data.puede_usar),
      catchError(error => {
        console.error('❌ Error al verificar puntos:', error);
        // Fallback: verificar con puntos actuales
        const puntosActuales = this.userPointsSubject.value;
        return of(puntosActuales >= puntos);
      })
    );
  }

  // ==================== SISTEMA DE REFERIDOS ====================

  /**
   * Obtener código de referido del usuario
   */
  getReferralCode(): Observable<string> {
    if (!this.authService.isLoggedIn()) {
      return of('');
    }

    const headers = this.getAuthHeaders();
    
    return this.http.get<ApiResponse<any>>(`${this.API_URL}/referral/code`, { headers }).pipe(
      map(response => {
        if (response.success && response.data && response.data.codigo) {
          return response.data.codigo;
        }
        // Si no hay código, intentar crear uno
        return '';
      }),
      catchError(error => {
        console.error('❌ Error al obtener código de referido:', error);
        
        // Fallback: usar método legacy
        const currentUser = this.authService.getCurrentUser();
        if (currentUser) {
          return of(this.getUserReferralCode_Legacy(currentUser.id));
        }
        
        return of('');
      })
    );
  }

  /**
   * Crear código de referido para el usuario
   */
  createReferralCode(): Observable<string> {
    if (!this.authService.isLoggedIn()) {
      return of('');
    }

    const headers = this.getAuthHeaders();
    
    return this.http.post<ApiResponse<any>>(`${this.API_URL}/referral/create`, {}, { headers }).pipe(
      map(response => response.success ? response.data.codigo : ''),
      catchError(error => {
        console.error('❌ Error al crear código de referido:', error);
        
        // Fallback: generar código legacy
        const currentUser = this.authService.getCurrentUser();
        if (currentUser) {
          return of(this.getUserReferralCode_Legacy(currentUser.id));
        }
        
        return of('');
      })
    );
  }

  /**
   * Aplicar código de referido
   */
  applyReferralCode(codigo: string): Observable<ReferralResult> {
    if (!this.authService.isLoggedIn()) {
      return of({
        success: false,
        message: 'Debes iniciar sesión para aplicar un código de referido',
        puntosGanados: 0
      });
    }

    const headers = this.getAuthHeaders();
    const payload = { codigo };
    
    return this.http.post<ApiResponse<any>>(`${this.API_URL}/referral/apply`, payload, { headers }).pipe(
      map(response => {
        if (response.success) {
          this.loadUserPoints(); // Recargar puntos después de aplicar código
          return {
            success: true,
            message: response.message || 'Código aplicado exitosamente',
            puntosGanados: response.data?.puntos_ganados || 0
          };
        }
        return {
          success: false,
          message: response.message || 'Error al aplicar código',
          puntosGanados: 0
        };
      }),
      catchError(error => {
        console.error('❌ Error al aplicar código de referido:', error);
        return of({
          success: false,
          message: error.error?.message || 'Error al aplicar código de referido',
          puntosGanados: 0
        });
      })
    );
  }

  /**
   * Obtener lista de usuarios referidos
   */
  getUserReferrals(): Observable<ReferralRecord[]> {
    if (!this.authService.isLoggedIn()) {
      return of([]);
    }

    const headers = this.getAuthHeaders();
    
    return this.http.get<ApiResponse<ReferralRecord[]>>(`${this.API_URL}/referral/list`, { headers }).pipe(
      map(response => response.success ? response.data : []),
      catchError(error => {
        console.error('❌ Error al obtener referidos:', error);
        return of([]);
      })
    );
  }

  // ==================== PUNTOS DE BIENVENIDA ====================

  /**
   * Otorgar puntos de bienvenida
   */
  giveWelcomePoints(): Observable<boolean> {
    if (!this.authService.isLoggedIn()) {
      return of(false);
    }

    const headers = this.getAuthHeaders();
    
    return this.http.post<ApiResponse<any>>(`${this.API_URL}/welcome`, {}, { headers }).pipe(
      map(response => {
        if (response.success) {
          this.loadUserPoints(); // Recargar puntos después de otorgar bienvenida
          return true;
        }
        return false;
      }),
      catchError(error => {
        console.error('❌ Error al otorgar puntos de bienvenida:', error);
        return of(false);
      })
    );
  }

  // ==================== CONFIGURACIÓN DEL SISTEMA ====================

  /**
   * Obtener configuración del sistema de puntos
   */
  getSystemConfig(): Observable<PointsConfig> {
    const headers = this.getAuthHeaders();
    
    return this.http.get<ApiResponse<PointsConfig>>(`${this.API_URL}/config`, { headers }).pipe(
      map(response => response.success ? response.data : this.getDefaultConfig()),
      catchError(error => {
        console.error('❌ Error al obtener configuración:', error);
        return of(this.getDefaultConfig());
      })
    );
  }

  /**
   * Calcular valor en dólares de una cantidad de puntos
   */
  getPointsValue(puntos: number): Observable<number> {
    const headers = this.getAuthHeaders();
    
    return this.http.get<ApiResponse<any>>(`${this.API_URL}/value/${puntos}`, { headers }).pipe(
      map(response => response.success ? response.data.valor_dolares : puntos / 100),
      catchError(error => {
        console.error('❌ Error al calcular valor de puntos:', error);
        // Fallback: 100 puntos = $1
        return of(puntos / 100);
      })
    );
  }

  // ==================== MÉTODOS AUXILIARES ====================

  /**
   * Obtener headers de autenticación
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Cargar puntos del usuario al inicializar
   */
  private loadUserPoints(): void {
    this.getUserPoints().subscribe({
      next: (response) => {
        console.log('✅ Puntos cargados:', response.puntosActuales);
      },
      error: (error) => {
        console.error('❌ Error cargando puntos:', error);
      }
    });
  }

  /**
   * Obtener estadísticas por defecto
   */
  private getDefaultStats(): PointsStats {
    return {
      puntosActuales: 0,
      totalGanados: 0,
      totalUsados: 0,
      valorEnDolares: 0,
      ultimaActividad: null,
      totalReferidos: 0
    };
  }

  /**
   * Obtener configuración por defecto
   */
  private getDefaultConfig(): PointsConfig {
    return {
      puntos_por_dolar: 1,
      puntos_bienvenida: 50,
      puntos_referido: 100,
      puntos_nuevo_usuario: 25
    };
  }

  // ==================== MÉTODOS LEGACY (PARA COMPATIBILIDAD) ====================

  /**
   * Métodos legacy para mantener compatibilidad con código existente
   */
  getUserPoints_Legacy(userId: number): number {
    // Retorna el valor actual del BehaviorSubject
    return this.userPointsSubject.value;
  }

  getPointsConfig_Legacy() {
    return {
      puntosPorDolar: 1,
      puntosBienvenida: 50,
      puntosReferido: 100,
      puntosNuevoUsuario: 25
    };
  }

  getUserReferralCode_Legacy(userId: number): string {
    // Generar código basado en userId
    return 'REF' + userId.toString().padStart(4, '0') + Date.now().toString().slice(-4);
  }

  processPointsForPurchase_Legacy(userId: number, totalCompra: number, items: any[]): number {
    // Este método ahora se maneja en el backend durante el checkout
    return Math.floor(totalCompra * 1); // 1 punto por dólar
  }

  getPointsValue_Legacy(puntos: number): number {
    return puntos / 100; // 100 puntos = $1
  }

  getUserPointsStats_Legacy(userId: number): PointsStats {
    return this.getDefaultStats();
  }

  // ==================== MÉTODOS PÚBLICOS ADICIONALES ====================

  /**
   * Refrescar puntos manualmente
   */
  refreshPoints(): void {
    if (this.authService.isLoggedIn()) {
      this.loadUserPoints();
    }
  }

  /**
   * Obtener puntos actuales de forma síncrona
   */
  getCurrentPoints(): number {
    return this.userPointsSubject.value;
  }

  /**
   * Verificar si el servicio está disponible
   */
  isServiceAvailable(): Observable<boolean> {
    return this.http.get<any>(`${this.API_URL}/health`).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }
}

// ==================== INTERFACES ====================

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: any;
}

export interface UserPointsData {
  puntos_actuales: number;
  total_ganados: number;
  total_usados: number;
}

export interface UserPointsResponse {
  puntosActuales: number;
  totalGanados: number;
  totalUsados: number;
}

export interface PointsStats {
  puntosActuales: number;
  totalGanados: number;
  totalUsados: number;
  valorEnDolares: number;
  ultimaActividad: string | null;
  totalReferidos: number;
}

export interface PointsTransaction {
  id: number;
  tipo: 'ganancia' | 'uso';
  puntos: number;
  concepto: string;
  puntosAnteriores: number;
  puntosNuevos: number;
  metadata?: any;
  fecha: string;
}

export interface ReferralRecord {
  id: number;
  referido: {
    id: number;
    nombre: string;
    email: string;
  };
  codigoUsado: string;
  puntosOtorgados: number;
  fechaReferido: string;
}

export interface ReferralResult {
  success: boolean;
  message: string;
  puntosGanados: number;
}

export interface PointsConfig {
  puntos_por_dolar: number;
  puntos_bienvenida: number;
  puntos_referido: number;
  puntos_nuevo_usuario: number;
}
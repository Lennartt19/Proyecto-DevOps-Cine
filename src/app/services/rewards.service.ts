// src/app/services/rewards.service.ts - VERSIÓN MÍNIMA CORREGIDA
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

// ==================== INTERFACES ====================
export interface Reward {
  id?: number;
  nombre: string;
  descripcion: string;
  categoria: 'peliculas' | 'bar' | 'especial' | 'descuentos';
  tipo: 'descuento' | 'producto' | 'paquete' | 'experiencia' | 'codigo' | 'bonus';
  puntos_requeridos: number;
  valor?: number;
  stock?: number | null;
  limite_por_usuario?: number;
  validez_dias?: number;
  imagen_url?: string;
  disponible: boolean;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

export interface RewardsStats {
  totalRecompensas: number;
  recompensasActivas: number;
  totalCanjes: number;
  puntosCanjeados: number;
  categoriaPopular: string;
  recompensaPopular: string;
}

export interface RedemptionCode {
  id: number;
  codigo: string;
  recompensa: Reward;
  usuario_id: number;
  fecha_canje: string;
  fecha_vencimiento: string;
  usado: boolean;
  fecha_uso?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: any;
}

@Injectable({
  providedIn: 'root'
})
export class RewardsService {

  // 🔧 CORRECCIÓN PRINCIPAL: URL fija y validada
  private readonly API_URL: string;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    // 🔧 CONSTRUCCIÓN SEGURA DE URL
    this.API_URL = this.buildApiUrl();
    
    console.log('🆕 RewardsService inicializado');
    console.log('📡 API URL:', this.API_URL);
    console.log('🔍 Environment:', environment.production ? 'PRODUCCIÓN' : 'DESARROLLO');
    
    // 🔧 VALIDACIÓN CRÍTICA
    if (this.API_URL.includes('localhost') && environment.production) {
      console.error('❌ ERROR CRÍTICO: localhost en producción!');
    }
  }

  // 🔧 MÉTODO CORREGIDO: Construir URL de API
  private buildApiUrl(): string {
    if (!environment.apiUrl) {
      throw new Error('API URL no configurada en environment');
    }
    
    let baseUrl = environment.apiUrl.trim();
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    
    return `${baseUrl}/rewards`;
  }

  // ==================== HEADERS ====================
  
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    
    if (!token) {
      console.warn('⚠️ No hay token de autenticación');
      return new HttpHeaders({
        'Content-Type': 'application/json'
      });
    }

    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // ==================== MÉTODOS PRINCIPALES CORREGIDOS ====================

  /**
   * 🔧 CORREGIDO: Obtener todas las recompensas
   */
  getAllRewards(): Observable<Reward[]> {
    const headers = this.getAuthHeaders();
    
    console.log('🎁 Obteniendo recompensas desde:', this.API_URL);
    
    return this.http.get<any>(this.API_URL, { headers }).pipe(
      map(response => {
        console.log('✅ Respuesta recibida:', response);
        
        // 🔧 MANEJO INTELIGENTE DE RESPUESTA
        let rewards: Reward[] = [];
        
        if (Array.isArray(response)) {
          rewards = response;
        } else if (response && response.data && Array.isArray(response.data)) {
          rewards = response.data;
        } else {
          console.warn('⚠️ Formato de respuesta inesperado:', response);
          rewards = [];
        }
        
        // 🔧 PROCESAR CADA RECOMPENSA
        const processedRewards = rewards.map(reward => ({
          ...reward,
          // Normalizar tipos numéricos
          puntos_requeridos: Number(reward.puntos_requeridos) || 0,
          valor: Number(reward.valor) || 0,
          stock: reward.stock !== null ? Number(reward.stock) : null,
          limite_por_usuario: Number(reward.limite_por_usuario) || 1,
          validez_dias: Number(reward.validez_dias) || 30,
          disponible: Boolean(reward.disponible),
          // 🔧 MAPEAR IMAGEN
          imagen_url: reward.imagen_url !== null && reward.imagen_url !== undefined ? reward.imagen_url : undefined
        }));
        
        console.log(`✅ ${processedRewards.length} recompensas procesadas`);
        return processedRewards;
      }),
      catchError(error => {
        console.error('❌ Error al obtener recompensas:', error);
        console.error('❌ URL que falló:', this.API_URL);
        
        // 🔧 LOG DE DIAGNÓSTICO
        if (error.status === 0) {
          console.error('🚫 CONEXIÓN RECHAZADA - Verificar backend y CORS');
        }
        
        return of([]);
      })
    );
  }

  /**
   * 🔧 CORREGIDO: Obtener categorías
   */
  getCategories(): Observable<string[]> {
    const headers = this.getAuthHeaders();
    const url = `${this.API_URL}/categories`;
    
    console.log('📂 Obteniendo categorías desde:', url);
    
    return this.http.get<any>(url, { headers }).pipe(
      map(response => {
        console.log('✅ Categorías recibidas:', response);
        
        // 🔧 MANEJO INTELIGENTE
        let categories: string[] = [];
        
        if (Array.isArray(response)) {
          categories = response;
        } else if (response && response.data && Array.isArray(response.data)) {
          categories = response.data;
        } else {
          categories = ['peliculas', 'bar', 'especial', 'descuentos'];
        }
        
        return categories;
      }),
      catchError(error => {
        console.error('❌ Error al obtener categorías:', error);
        return of(['peliculas', 'bar', 'especial', 'descuentos']);
      })
    );
  }

  /**
   * 🔧 CORREGIDO: Obtener canjes del usuario
   */
  getUserRedemptions(incluirUsados: boolean = true): Observable<RedemptionCode[]> {
    const headers = this.getAuthHeaders();
    const params = { incluir_usados: incluirUsados.toString() };
    const url = `${this.API_URL}/my/redemptions`;
    
    console.log('📋 Obteniendo canjes desde:', url);
    
    return this.http.get<any>(url, { headers, params }).pipe(
      map(response => {
        console.log('✅ Canjes recibidos:', response);
        
        // 🔧 MANEJO INTELIGENTE
        let redemptions: RedemptionCode[] = [];
        
        if (Array.isArray(response)) {
          redemptions = response;
        } else if (response && response.data && Array.isArray(response.data)) {
          redemptions = response.data;
        }
        
        return redemptions;
      }),
      catchError(error => {
        console.error('❌ Error al obtener canjes:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtener recompensa por ID
   */
  getRewardById(id: number): Observable<Reward | null> {
    const headers = this.getAuthHeaders();
    
    return this.http.get<ApiResponse<Reward>>(`${this.API_URL}/${id}`, { headers }).pipe(
      map(response => response.success ? response.data : null),
      catchError(error => {
        console.error('❌ Error al obtener recompensa:', error);
        return of(null);
      })
    );
  }

  /**
   * 🔧 CORREGIDO: Canjear recompensa
   */
  redeemReward(rewardId: number): Observable<{ success: boolean; codigo?: string; message: string }> {
    const headers = this.getAuthHeaders();
    const url = `${this.API_URL}/redeem/${rewardId}`;
    
    console.log('🎁 Canjeando recompensa en:', url);
    
    return this.http.post<any>(url, {}, { headers }).pipe(
      map(response => {
        console.log('✅ Respuesta de canje:', response);
        return {
          success: response.success || false,
          codigo: response.codigo || response.data?.codigo_canje || response.data?.codigo,
          message: response.message || (response.success ? 'Recompensa canjeada exitosamente' : 'Error al canjear recompensa')
        };
      }),
      catchError(error => {
        console.error('❌ Error al canjear recompensa:', error);
        return of({
          success: false,
          message: error.error?.message || 'Error al canjear recompensa'
        });
      })
    );
  }

  /**
   * Validar código de canje
   */
  validateRedemptionCode(codigo: string): Observable<{ valid: boolean; redemption?: RedemptionCode; message: string }> {
    const headers = this.getAuthHeaders();
    
    return this.http.get<ApiResponse<any>>(`${this.API_URL}/validate/${codigo}`, { headers }).pipe(
      map(response => ({
        valid: response.success,
        redemption: response.data?.redemption,
        message: response.message || (response.success ? 'Código válido' : 'Código inválido')
      })),
      catchError(error => {
        console.error('❌ Error al validar código:', error);
        return of({
          valid: false,
          message: error.error?.message || 'Error al validar código'
        });
      })
    );
  }

  /**
   * Marcar código como usado
   */
  markCodeAsUsed(codigo: string): Observable<{ success: boolean; message: string }> {
    const headers = this.getAuthHeaders();
    
    return this.http.patch<ApiResponse<any>>(`${this.API_URL}/use/${codigo}`, {}, { headers }).pipe(
      map(response => ({
        success: response.success,
        message: response.message || (response.success ? 'Código marcado como usado' : 'Error al usar código')
      })),
      catchError(error => {
        console.error('❌ Error al marcar código como usado:', error);
        return of({
          success: false,
          message: error.error?.message || 'Error al usar código'
        });
      })
    );
  }

  /**
   * Verificar disponibilidad de puntos
   */
  checkRedeemAvailability(puntos: number): Observable<{ available: boolean; message: string }> {
    const headers = this.getAuthHeaders();
    
    return this.http.get<ApiResponse<any>>(`${this.API_URL}/check/${puntos}`, { headers }).pipe(
      map(response => ({
        available: response.success && response.data?.available,
        message: response.message || (response.success ? 'Puntos suficientes' : 'Puntos insuficientes')
      })),
      catchError(error => {
        console.error('❌ Error al verificar disponibilidad:', error);
        return of({
          available: false,
          message: error.error?.message || 'Error al verificar puntos'
        });
      })
    );
  }

  // ==================== MÉTODOS DE ADMINISTRACIÓN ====================

  createReward(rewardData: Partial<Reward>): Observable<boolean> {
    if (!this.authService.isAdmin()) {
      console.error('❌ Usuario no tiene permisos de administrador');
      return of(false);
    }

    const headers = this.getAuthHeaders();
    
    return this.http.post<ApiResponse<any>>(this.API_URL, rewardData, { headers }).pipe(
      map(response => response.success),
      catchError(error => {
        console.error('❌ Error al crear recompensa:', error);
        return of(false);
      })
    );
  }

  updateReward(id: number, rewardData: Partial<Reward>): Observable<boolean> {
    if (!this.authService.isAdmin()) {
      console.error('❌ Usuario no tiene permisos de administrador');
      return of(false);
    }

    const headers = this.getAuthHeaders();
    
    return this.http.put<ApiResponse<any>>(`${this.API_URL}/${id}`, rewardData, { headers }).pipe(
      map(response => response.success),
      catchError(error => {
        console.error('❌ Error al actualizar recompensa:', error);
        return of(false);
      })
    );
  }

  deleteReward(id: number): Observable<boolean> {
    if (!this.authService.isAdmin()) {
      console.error('❌ Usuario no tiene permisos de administrador');
      return of(false);
    }

    const headers = this.getAuthHeaders();
    
    return this.http.delete<ApiResponse<any>>(`${this.API_URL}/${id}`, { headers }).pipe(
      map(response => response.success),
      catchError(error => {
        console.error('❌ Error al eliminar recompensa:', error);
        return of(false);
      })
    );
  }

  getRewardsStats(): Observable<RewardsStats> {
    const headers = this.getAuthHeaders();
    
    return this.http.get<ApiResponse<RewardsStats>>(`${this.API_URL}/admin/stats`, { headers }).pipe(
      map(response => response.success ? response.data : this.getDefaultStats()),
      catchError(error => {
        console.error('❌ Error al obtener estadísticas:', error);
        return of(this.getDefaultStats());
      })
    );
  }

  getAllRedemptions(page: number = 1, limit: number = 50, recompensaId?: number): Observable<RedemptionCode[]> {
    if (!this.authService.isAdmin()) {
      console.error('❌ Usuario no tiene permisos de administrador');
      return of([]);
    }

    const headers = this.getAuthHeaders();
    const params: any = { page: page.toString(), limit: limit.toString() };
    
    if (recompensaId) {
      params.recompensa_id = recompensaId.toString();
    }
    
    return this.http.get<ApiResponse<RedemptionCode[]>>(`${this.API_URL}/admin/redemptions`, { headers, params }).pipe(
      map(response => response.success ? response.data : []),
      catchError(error => {
        console.error('❌ Error al obtener canjes:', error);
        return of([]);
      })
    );
  }

  // ==================== MÉTODOS AUXILIARES ====================

  isServiceAvailable(): Observable<boolean> {
    return this.http.get<any>(`${this.API_URL}/health`).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  formatCategory(categoria: string): string {
    const categorias: { [key: string]: string } = {
      'peliculas': 'Películas',
      'bar': 'Bar & Comida',
      'especial': 'Especiales',
      'descuentos': 'Descuentos'
    };
    
    return categorias[categoria] || categoria;
  }

  formatType(tipo: string): string {
    const tipos: { [key: string]: string } = {
      'descuento': 'Descuento %',
      'producto': 'Producto Gratis',
      'paquete': 'Paquete Especial',
      'experiencia': 'Experiencia VIP',
      'codigo': 'Código Promocional',
      'bonus': 'Bonus Extra'
    };
    
    return tipos[tipo] || tipo;
  }

  getCategoryIcon(categoria: string): string {
    const iconos: { [key: string]: string } = {
      'peliculas': 'fas fa-film',
      'bar': 'fas fa-utensils',
      'especial': 'fas fa-star',
      'descuentos': 'fas fa-percent'
    };
    
    return iconos[categoria] || 'fas fa-tag';
  }

  getTypeIcon(tipo: string): string {
    const iconos: { [key: string]: string } = {
      'descuento': 'fas fa-percent',
      'producto': 'fas fa-gift',
      'paquete': 'fas fa-box',
      'experiencia': 'fas fa-crown',
      'codigo': 'fas fa-ticket-alt',
      'bonus': 'fas fa-plus-circle'
    };
    
    return iconos[tipo] || 'fas fa-question';
  }

  isRewardAvailable(reward: Reward): boolean {
    if (!reward.disponible) {
      return false;
    }
    
    if (reward.stock !== null && reward.stock !== undefined && reward.stock <= 0) {
      return false;
    }
    
    return true;
  }

  getPointsValue(puntos: number): number {
    return puntos / 100;
  }

  private getDefaultStats(): RewardsStats {
    return {
      totalRecompensas: 0,
      recompensasActivas: 0,
      totalCanjes: 0,
      puntosCanjeados: 0,
      categoriaPopular: 'N/A',
      recompensaPopular: 'N/A'
    };
  }

  filterByCategory(rewards: Reward[], categoria: string): Reward[] {
    if (!categoria) {
      return rewards;
    }
    return rewards.filter(reward => reward.categoria === categoria);
  }

  filterByAvailability(rewards: Reward[], onlyAvailable: boolean = true): Reward[] {
    if (!onlyAvailable) {
      return rewards;
    }
    return rewards.filter(reward => this.isRewardAvailable(reward));
  }

  sortByPoints(rewards: Reward[], ascending: boolean = true): Reward[] {
    return [...rewards].sort((a, b) => {
      return ascending ? 
        a.puntos_requeridos - b.puntos_requeridos : 
        b.puntos_requeridos - a.puntos_requeridos;
    });
  }

  searchRewards(rewards: Reward[], searchTerm: string): Reward[] {
    if (!searchTerm || searchTerm.trim() === '') {
      return rewards;
    }

    const term = searchTerm.toLowerCase().trim();
    return rewards.filter(reward =>
      reward.nombre.toLowerCase().includes(term) ||
      reward.descripcion.toLowerCase().includes(term) ||
      reward.categoria.toLowerCase().includes(term) ||
      reward.tipo.toLowerCase().includes(term)
    );
  }

  validateRewardData(reward: Partial<Reward>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!reward.nombre || reward.nombre.trim().length < 3) {
      errors.push('El nombre debe tener al menos 3 caracteres');
    }

    if (!reward.descripcion || reward.descripcion.trim().length < 10) {
      errors.push('La descripción debe tener al menos 10 caracteres');
    }

    if (!reward.categoria) {
      errors.push('Debe seleccionar una categoría');
    }

    if (!reward.tipo) {
      errors.push('Debe seleccionar un tipo');
    }

    if (!reward.puntos_requeridos || reward.puntos_requeridos <= 0) {
      errors.push('Los puntos requeridos deben ser mayor a 0');
    }

    if (['descuento', 'producto', 'paquete'].includes(reward.tipo || '')) {
      if (!reward.valor || reward.valor <= 0) {
        errors.push('El valor debe ser mayor a 0 para este tipo de recompensa');
      }
    }

    if (['producto', 'paquete', 'experiencia'].includes(reward.tipo || '')) {
      if (reward.stock !== null && reward.stock !== undefined && reward.stock < 0) {
        errors.push('El stock no puede ser negativo');
      }
    }

    if (reward.limite_por_usuario && reward.limite_por_usuario <= 0) {
      errors.push('El límite por usuario debe ser mayor a 0');
    }

    if (reward.validez_dias && reward.validez_dias <= 0) {
      errors.push('La validez en días debe ser mayor a 0');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  generateRedemptionCode(rewardId: number, userId: number): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `RW${rewardId}U${userId}${timestamp}${random}`.toUpperCase();
  }

  formatExpirationDate(fecha: string): string {
    const date = new Date(fecha);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return 'Vencido';
    } else if (diffDays === 0) {
      return 'Vence hoy';
    } else if (diffDays === 1) {
      return 'Vence mañana';
    } else if (diffDays <= 7) {
      return `Vence en ${diffDays} días`;
    } else {
      return date.toLocaleDateString('es-ES');
    }
  }

  isCodeExpired(fechaVencimiento: string): boolean {
    return new Date(fechaVencimiento) < new Date();
  }

  getRewardsByCategory(rewards: Reward[]): { [key: string]: number } {
    const categoryCounts: { [key: string]: number } = {};
    
    rewards.forEach(reward => {
      categoryCounts[reward.categoria] = (categoryCounts[reward.categoria] || 0) + 1;
    });
    
    return categoryCounts;
  }

  calculateLocalStats(rewards: Reward[]): RewardsStats {
    const activas = rewards.filter(r => r.disponible).length;
    const totalPuntos = rewards.reduce((sum, r) => sum + r.puntos_requeridos, 0);
    const categoryCounts = this.getRewardsByCategory(rewards);
    const categoriaPopular = Object.keys(categoryCounts).reduce((a, b) => 
      categoryCounts[a] > categoryCounts[b] ? a : b, 'N/A'
    );

    return {
      totalRecompensas: rewards.length,
      recompensasActivas: activas,
      totalCanjes: 0,
      puntosCanjeados: 0,
      categoriaPopular,
      recompensaPopular: rewards.length > 0 ? rewards[0].nombre : 'N/A'
    };
  }
}
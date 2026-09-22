// src/app/services/function.service.ts - VERSIÓN CORREGIDA
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FunctionService {

  // 🔧 CORRECCIÓN PRINCIPAL: URL construida de forma segura
  private readonly API_URL: string;

  constructor(private http: HttpClient) {
    // 🔧 CONSTRUCCIÓN SEGURA DE URL
    this.API_URL = this.buildApiUrl();
    
    console.log('🎬 FunctionService inicializado');
    console.log('📡 API URL:', this.API_URL);
    console.log('🔍 Environment:', environment.production ? 'PRODUCCIÓN' : 'DESARROLLO');
    
    // 🔧 VALIDACIÓN CRÍTICA
    if (this.API_URL.includes('localhost') && environment.production) {
      console.error('❌ ERROR CRÍTICO: localhost en producción para FunctionService!');
    }
  }

  // 🔧 MÉTODO NUEVO: Construir URL de API de forma segura
  private buildApiUrl(): string {
    if (!environment.apiUrl) {
      throw new Error('API URL no configurada en environment');
    }
    
    let baseUrl = environment.apiUrl.trim();
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    
    console.log('🔧 Construyendo URL de funciones desde:', baseUrl);
    return baseUrl; // No agregamos /functions aquí porque se agrega en cada método
  }

  // ==================== MÉTODOS PÚBLICOS CORREGIDOS ====================

  /**
   * 🔧 CORREGIDO: Obtener todas las funciones
   */
  getAllFunctions(): Observable<FuncionCine[]> {
    const url = `${this.API_URL}/functions`;
    
    console.log('🎬 Obteniendo todas las funciones desde:', url);
    
    return this.http.get<any>(url).pipe(
      map(response => {
        console.log('✅ Respuesta de funciones recibida:', response);
        
        // 🔧 MANEJO INTELIGENTE DE RESPUESTA
        let functions: any[] = [];
        
        if (Array.isArray(response)) {
          functions = response;
        } else if (response && response.data && Array.isArray(response.data)) {
          functions = response.data;
        } else {
          console.warn('⚠️ Formato de respuesta inesperado:', response);
          functions = [];
        }
        
        console.log(`📡 ${functions.length} funciones obtenidas de BD`);
        return functions.map((func: any) => this.convertApiToLocal(func));
      }),
      catchError(error => {
        console.error('❌ Error al obtener funciones:', error);
        console.error('❌ URL que falló:', url);
        
        // 🔧 LOG DE DIAGNÓSTICO
        if (error.status === 0) {
          console.error('🚫 CONEXIÓN RECHAZADA - Verificar backend y CORS');
        }
        
        return of([]);
      })
    );
  }

  /**
   * 🔧 CORREGIDO: Obtener funciones por película
   */
  getFunctionsByMovie(peliculaId: number): Observable<FuncionCine[]> {
    const url = `${this.API_URL}/functions/movie/${peliculaId}`;
    
    console.log(`🎬 Obteniendo funciones para película ${peliculaId} desde:`, url);
    
    return this.http.get<any>(url).pipe(
      map(response => {
        console.log(`✅ Respuesta de funciones por película recibida:`, response);
        
        // 🔧 MANEJO INTELIGENTE DE RESPUESTA
        let functions: any[] = [];
        
        if (Array.isArray(response)) {
          functions = response;
        } else if (response && response.data && Array.isArray(response.data)) {
          functions = response.data;
        } else {
          functions = [];
        }
        
        console.log(`📡 ${functions.length} funciones encontradas para película ${peliculaId}`);
        return functions.map((func: any) => this.convertApiToLocal(func));
      }),
      catchError(error => {
        console.error('❌ Error al obtener funciones por película:', error);
        console.error('❌ URL que falló:', url);
        return of([]);
      })
    );
  }

  /**
   * 🔧 CORREGIDO: Obtener función por ID
   */
  getFunctionById(funcionId: string): Observable<FuncionCine | null> {
    const url = `${this.API_URL}/functions/${funcionId}`;
    
    console.log(`🔍 Obteniendo función ${funcionId} desde:`, url);
    
    return this.http.get<any>(url).pipe(
      map(response => {
        console.log('✅ Respuesta de función por ID:', response);
        
        if (response && response.success && response.data) {
          console.log('📡 Función obtenida:', response.data.pelicula_titulo);
          return this.convertApiToLocal(response.data);
        } else if (response && !response.success) {
          console.warn('⚠️ Función no encontrada o inactiva');
          return null;
        } else if (response) {
          // Si la respuesta es directamente los datos
          return this.convertApiToLocal(response);
        }
        
        return null;
      }),
      catchError(error => {
        console.error('❌ Error al obtener función:', error);
        console.error('❌ URL que falló:', url);
        return of(null);
      })
    );
  }

  /**
   * 🔧 CORREGIDO: Obtener funciones por fecha
   */
  getFunctionsByDate(fecha: string): Observable<FuncionCine[]> {
    const url = `${this.API_URL}/functions/date/${fecha}`;
    
    console.log(`📅 Obteniendo funciones para fecha ${fecha} desde:`, url);
    
    return this.http.get<any>(url).pipe(
      map(response => {
        console.log(`✅ Respuesta de funciones por fecha:`, response);
        
        // 🔧 MANEJO INTELIGENTE DE RESPUESTA
        let functions: any[] = [];
        
        if (Array.isArray(response)) {
          functions = response;
        } else if (response && response.data && Array.isArray(response.data)) {
          functions = response.data;
        } else {
          functions = [];
        }
        
        console.log(`📡 ${functions.length} funciones encontradas para ${fecha}`);
        return functions.map((func: any) => this.convertApiToLocal(func));
      }),
      catchError(error => {
        console.error('❌ Error al obtener funciones por fecha:', error);
        console.error('❌ URL que falló:', url);
        return of([]);
      })
    );
  }

  // ==================== MÉTODOS ADMIN CORREGIDOS ====================

  /**
   * 🔧 CORREGIDO: Crear nueva función (solo admin)
   */
  createFunction(funcionData: CreateFunctionData): Observable<boolean> {
    const headers = this.getAuthHeaders();
    const url = `${this.API_URL}/functions`;
    
    const body = {
      peliculaId: funcionData.peliculaId,
      fecha: funcionData.fecha,
      hora: funcionData.hora,
      sala: funcionData.sala,
      precio: funcionData.precio,
      formato: funcionData.formato || '2D',
      asientosDisponibles: funcionData.asientosDisponibles || 50
    };

    console.log('📝 Creando función en:', url);
    console.log('📝 Datos de la función:', body);

    return this.http.post<any>(url, body, { headers }).pipe(
      map(response => {
        console.log('✅ Respuesta de creación de función:', response);
        
        if (response && response.success) {
          console.log('✅ Función creada:', response.data?.id);
          return true;
        } else if (response && response.id) {
          // Si la respuesta no tiene 'success' pero sí 'id', probablemente fue exitosa
          console.log('✅ Función creada (formato alternativo):', response.id);
          return true;
        }
        
        console.warn('⚠️ Respuesta inesperada al crear función:', response);
        return false;
      }),
      catchError(error => {
        console.error('❌ Error al crear función:', error);
        console.error('❌ URL que falló:', url);
        return of(false);
      })
    );
  }

  /**
   * 🔧 CORREGIDO: Actualizar función (solo admin)
   */
  updateFunction(funcionId: string, funcionData: Partial<CreateFunctionData>): Observable<boolean> {
    const headers = this.getAuthHeaders();
    const url = `${this.API_URL}/functions/${funcionId}`;
    
    console.log(`📝 Actualizando función ${funcionId} en:`, url);
    console.log('📝 Datos de actualización:', funcionData);
    
    return this.http.put<any>(url, funcionData, { headers }).pipe(
      map(response => {
        console.log('✅ Respuesta de actualización de función:', response);
        
        if (response && response.success) {
          console.log('✅ Función actualizada:', funcionId);
          return true;
        } else if (response && !response.hasOwnProperty('success')) {
          // Si no hay campo 'success', asumir que fue exitosa
          console.log('✅ Función actualizada (formato alternativo):', funcionId);
          return true;
        }
        
        return false;
      }),
      catchError(error => {
        console.error('❌ Error al actualizar función:', error);
        console.error('❌ URL que falló:', url);
        return of(false);
      })
    );
  }

  /**
   * 🔧 CORREGIDO: Eliminar función (solo admin)
   */
  deleteFunction(funcionId: string): Observable<boolean> {
    const headers = this.getAuthHeaders();
    const url = `${this.API_URL}/functions/${funcionId}`;
    
    console.log(`🗑️ Eliminando función ${funcionId} en:`, url);
    
    return this.http.delete<any>(url, { headers }).pipe(
      map(response => {
        console.log('✅ Respuesta de eliminación de función:', response);
        
        if (response && response.success) {
          console.log('✅ Función eliminada:', funcionId);
          return true;
        } else if (response && !response.hasOwnProperty('success')) {
          // Si no hay campo 'success', asumir que fue exitosa
          console.log('✅ Función eliminada (formato alternativo):', funcionId);
          return true;
        }
        
        return false;
      }),
      catchError(error => {
        console.error('❌ Error al eliminar función:', error);
        console.error('❌ URL que falló:', url);
        return of(false);
      })
    );
  }

  // ==================== MÉTODOS DE ASIENTOS CORREGIDOS ====================

  /**
   * 🔧 CORREGIDO: Obtener asientos de una función
   */
  getSeatsForFunction(funcionId: string): Observable<any> {
    const url = `${this.API_URL}/functions/${funcionId}/seats`;
    
    console.log(`🪑 Obteniendo asientos para función ${funcionId} desde:`, url);
    
    return this.http.get<any>(url).pipe(
      map(response => {
        console.log('✅ Respuesta de asientos:', response);
        
        if (response && response.success) {
          console.log(`🪑 ${response.data?.length || 0} asientos obtenidos para función ${funcionId}`);
          return response;
        } else if (Array.isArray(response)) {
          // Si la respuesta es directamente un array de asientos
          console.log(`🪑 ${response.length} asientos obtenidos (formato directo)`);
          return { success: true, data: response };
        } else if (response) {
          // Si hay datos pero sin estructura success
          return { success: true, data: response.data || response };
        }
        
        return { success: false, data: [] };
      }),
      catchError(error => {
        console.error('❌ Error al obtener asientos:', error);
        console.error('❌ URL que falló:', url);
        return of({ success: false, data: [] });
      })
    );
  }

  /**
   * 🔧 CORREGIDO: Reservar asientos (usuario autenticado)
   */
  reserveSeats(funcionId: string, seatIds: number[]): Observable<boolean> {
    const headers = this.getAuthHeaders();
    const url = `${this.API_URL}/functions/${funcionId}/seats/reserve`;
    const body = { seatIds };
    
    console.log(`🎫 Reservando asientos para función ${funcionId}:`, seatIds);
    
    return this.http.post<any>(url, body, { headers }).pipe(
      map(response => {
        console.log('✅ Respuesta de reserva de asientos:', response);
        
        if (response && response.success) {
          console.log('✅ Asientos reservados:', response.data?.asientosReservados?.length || seatIds.length);
          return true;
        } else if (response && !response.hasOwnProperty('success')) {
          // Si no hay campo 'success', asumir que fue exitosa
          console.log('✅ Asientos reservados (formato alternativo)');
          return true;
        }
        
        return false;
      }),
      catchError(error => {
        console.error('❌ Error al reservar asientos:', error);
        console.error('❌ URL que falló:', url);
        return of(false);
      })
    );
  }

  /**
   * 🔧 CORREGIDO: Liberar asientos (usuario autenticado)
   */
  releaseSeats(funcionId: string, seatIds: number[]): Observable<boolean> {
    const headers = this.getAuthHeaders();
    const url = `${this.API_URL}/functions/${funcionId}/seats/release`;
    const body = { seatIds };
    
    console.log(`🔓 Liberando asientos para función ${funcionId}:`, seatIds);
    
    return this.http.post<any>(url, body, { headers }).pipe(
      map(response => {
        console.log('✅ Respuesta de liberación de asientos:', response);
        
        if (response && response.success) {
          console.log('✅ Asientos liberados:', response.data?.asientos_liberados?.length || seatIds.length);
          return true;
        } else if (response && !response.hasOwnProperty('success')) {
          // Si no hay campo 'success', asumir que fue exitosa
          console.log('✅ Asientos liberados (formato alternativo)');
          return true;
        }
        
        return false;
      }),
      catchError(error => {
        console.error('❌ Error al liberar asientos:', error);
        console.error('❌ URL que falló:', url);
        return of(false);
      })
    );
  }

  // ==================== MÉTODOS AUXILIARES ====================

  /**
   * 🔧 MEJORADO: Obtener headers con token de autenticación
   */
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      console.warn('⚠️ No hay token de autenticación para FunctionService');
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
   * Convertir función de API a formato local
   */
  private convertApiToLocal(apiFunc: any): FuncionCine {
    return {
      id: apiFunc.id,
      peliculaId: apiFunc.pelicula_id,
      fecha: this.formatDateFromAPI(apiFunc.fecha),
      hora: this.formatTimeFromAPI(apiFunc.hora),
      sala: apiFunc.sala,
      precio: parseFloat(apiFunc.precio.toString()),
      asientosDisponibles: apiFunc.asientos_disponibles,
      formato: apiFunc.formato,
      activo: apiFunc.activo,
      fechaCreacion: apiFunc.fecha_creacion,
      
      // Información de la película (si está disponible)
      pelicula: apiFunc.pelicula_titulo ? {
        titulo: apiFunc.pelicula_titulo,
        poster: apiFunc.pelicula_poster,
        genero: apiFunc.pelicula_genero,
        rating: parseFloat(apiFunc.pelicula_rating?.toString() || '0'),
        duracion: apiFunc.pelicula_duracion,
        director: apiFunc.pelicula_director,
        sinopsis: apiFunc.pelicula_sinopsis
      } : undefined
    };
  }

  /**
   * Formatear fecha desde API (YYYY-MM-DDTHH:mm:ss.sssZ -> YYYY-MM-DD)
   */
  private formatDateFromAPI(dateString: string): string {
    return new Date(dateString).toISOString().split('T')[0];
  }

  /**
   * Formatear hora desde API (HH:mm:ss -> HH:mm)
   */
  private formatTimeFromAPI(timeString: string): string {
    return timeString.substring(0, 5); // Tomar solo HH:mm
  }

  // ==================== MÉTODOS UTILITARIOS ====================

  /**
   * Verificar si una función es pasada
   */
  isPastFunction(funcion: FuncionCine): boolean {
    const funcionDateTime = new Date(`${funcion.fecha}T${funcion.hora}`);
    return funcionDateTime < new Date();
  }

  /**
   * Agrupar funciones por fecha
   */
  groupFunctionsByDate(funciones: FuncionCine[]): { [fecha: string]: FuncionCine[] } {
    return funciones.reduce((groups, funcion) => {
      const fecha = funcion.fecha;
      if (!groups[fecha]) {
        groups[fecha] = [];
      }
      groups[fecha].push(funcion);
      return groups;
    }, {} as { [fecha: string]: FuncionCine[] });
  }

  /**
   * Obtener fechas disponibles
   */
  getAvailableDates(funciones: FuncionCine[]): string[] {
    const fechas = [...new Set(funciones.map(f => f.fecha))];
    return fechas.sort();
  }

  /**
   * Formatear precio para mostrar
   */
  formatPrice(precio: number): string {
    return `$${precio.toFixed(2)}`;
  }

  /**
   * Formatear fecha para mostrar
   */
  formatDateForDisplay(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Formatear hora para mostrar
   */
  formatTimeForDisplay(hora: string): string {
    return hora; // Ya está en formato HH:mm
  }
}

// ==================== INTERFACES ====================

export interface FuncionCine {
  id: string;
  peliculaId: number;
  fecha: string;        // YYYY-MM-DD
  hora: string;         // HH:mm
  sala: string;
  precio: number;
  asientosDisponibles: number;
  formato: string;      // '2D', '3D', 'IMAX', '4DX'
  activo: boolean;
  fechaCreacion: string;
  pelicula?: {
    titulo: string;
    poster: string;
    genero: string;
    rating: number;
    duracion: string;
    director?: string;
    sinopsis?: string;
  };
}

export interface CreateFunctionData {
  peliculaId: number;
  fecha: string;        // YYYY-MM-DD
  hora: string;         // HH:mm
  sala: string;
  precio: number;
  formato?: string;     // Opcional, default '2D'
  asientosDisponibles?: number; // Opcional, default 50
}
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Usuario } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  // 🔗 API Configuration
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {
    console.log('🔐 UserService conectado a API:', this.API_URL);
  }

  // ==================== MÉTODOS DE API ====================

  /**
   * Obtener todos los usuarios (solo admin)
   */
  getAllUsers(): Observable<Usuario[]> {
    const headers = this.getAuthHeaders();
    
    return this.http.get<any>(`${this.API_URL}/users`, { headers }).pipe(
      map(response => {
        console.log('📡 Usuarios obtenidos de BD:', response.data?.length || 0);
        return (response.data || []).map((user: any) => this.convertApiToLocal(user));
      }),
      catchError(error => {
        console.error('❌ Error al obtener usuarios:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtener usuario por ID
   */
  getUserById(id: number): Observable<Usuario | null> {
    const headers = this.getAuthHeaders();
    
    return this.http.get<any>(`${this.API_URL}/users/${id}`, { headers }).pipe(
      map(response => {
        if (response.success && response.data) {
          console.log('📡 Usuario obtenido:', response.data.nombre);
          return this.convertApiToLocal(response.data);
        }
        return null;
      }),
      catchError(error => {
        console.error('❌ Error al obtener usuario:', error);
        return of(null);
      })
    );
  }

  /**
   * Actualizar perfil de usuario
   */
  updateProfile(userId: number, profileData: UpdateProfileData): Observable<boolean> {
    const headers = this.getAuthHeaders();
    const body = {
      nombre: profileData.nombre,
      email: profileData.email,
      avatar: profileData.avatar
    };

    return this.http.put<any>(`${this.API_URL}/users/${userId}`, body, { headers }).pipe(
      map(response => {
        if (response.success) {
          console.log('✅ Perfil actualizado:', response.data?.nombre);
          return true;
        }
        return false;
      }),
      catchError(error => {
        console.error('❌ Error al actualizar perfil:', error);
        return of(false);
      })
    );
  }

  /**
   * Cambiar rol de usuario (solo admin)
   */
  changeUserRole(userId: number, newRole: 'admin' | 'cliente'): Observable<boolean> {
    const headers = this.getAuthHeaders();
    const body = { role: newRole };

    return this.http.put<any>(`${this.API_URL}/users/${userId}`, body, { headers }).pipe(
      map(response => {
        if (response.success) {
          console.log(`✅ Rol cambiado a ${newRole} para usuario ID: ${userId}`);
          return true;
        }
        return false;
      }),
      catchError(error => {
        console.error('❌ Error al cambiar rol:', error);
        return of(false);
      })
    );
  }

  /**
   * Cambiar estado de usuario (solo admin)
   */
  toggleUserStatus(userId: number): Observable<boolean> {
    const headers = this.getAuthHeaders();

    return this.http.patch<any>(`${this.API_URL}/users/${userId}/status`, {}, { headers }).pipe(
      map(response => {
        if (response.success) {
          console.log(`✅ Estado cambiado para usuario ID: ${userId}`);
          return true;
        }
        return false;
      }),
      catchError(error => {
        console.error('❌ Error al cambiar estado:', error);
        return of(false);
      })
    );
  }

  /**
   * Eliminar usuario (solo admin)
   */
  deleteUser(userId: number): Observable<boolean> {
    const headers = this.getAuthHeaders();

    return this.http.delete<any>(`${this.API_URL}/users/${userId}`, { headers }).pipe(
      map(response => {
        if (response.success) {
          console.log(`✅ Usuario eliminado ID: ${userId}`);
          return true;
        }
        return false;
      }),
      catchError(error => {
        console.error('❌ Error al eliminar usuario:', error);
        return of(false);
      })
    );
  }

  /**
   * Buscar usuarios
   */
  searchUsers(searchTerm: string): Observable<Usuario[]> {
    const headers = this.getAuthHeaders();
    const encodedTerm = encodeURIComponent(searchTerm);
    
    return this.http.get<any>(`${this.API_URL}/users/search?q=${encodedTerm}`, { headers }).pipe(
      map(response => {
        console.log(`🔍 ${response.data?.length || 0} usuarios encontrados para "${searchTerm}"`);
        return (response.data || []).map((user: any) => this.convertApiToLocal(user));
      }),
      catchError(error => {
        console.error('❌ Error en búsqueda de usuarios:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtener estadísticas de usuarios (solo admin)
   */
  getUsersStats(): Observable<any> {
    const headers = this.getAuthHeaders();
    
    return this.http.get<any>(`${this.API_URL}/users/stats`, { headers }).pipe(
      map(response => {
        if (response.success) {
          console.log('📊 Estadísticas de usuarios obtenidas');
          return response.data;
        }
        return null;
      }),
      catchError(error => {
        console.error('❌ Error al obtener estadísticas:', error);
        return of(null);
      })
    );
  }

  // ==================== MÉTODOS DE FAVORITAS (API) ====================

  /**
   * Obtener favoritas del usuario desde la API
   */
  getUserFavorites(): Observable<PeliculaFavorita[]> {
  const headers = this.getAuthHeaders();
  
  // Solo para usuario actual - la API toma el userId del token
  return this.http.get<any>(`${this.API_URL}/favorites`, { headers }).pipe(
    map(response => {
      console.log(`📡 Favoritas obtenidas de BD para usuario actual:`, response.data?.length || 0);
      return (response.data || []).map((fav: any) => this.convertApiFavoriteToLocal(fav));
    }),
    catchError(error => {
      console.error(`❌ Error al obtener favoritas del usuario actual:`, error);
      return of([]);
    })
  );
}
getUserFavoritesById(userId: number): Observable<PeliculaFavorita[]> {
  const headers = this.getAuthHeaders();
  
  return this.http.get<any>(`${this.API_URL}/favorites/${userId}`, { headers }).pipe(
    map(response => {
      console.log(`📡 [ADMIN] Favoritas obtenidas para usuario ${userId}:`, response.data?.length || 0);
      return (response.data || []).map((fav: any) => this.convertApiFavoriteToLocal(fav));
    }),
    catchError(error => {
      console.error(`❌ [ADMIN] Error al obtener favoritas para usuario ${userId}:`, error);
      return of([]);
    })
  );
}

  /**
   * Agregar a favoritas usando API
   */
  addToFavorites(userId: number, pelicula: PeliculaFavorita): Observable<boolean> {
  const headers = this.getAuthHeaders();
  const body = { 
    peliculaId: pelicula.peliculaId
    // No enviar userId porque la API lo toma del token
  };

  return this.http.post<any>(`${this.API_URL}/favorites`, body, { headers }).pipe(
    map(response => {
      if (response.success) {
        console.log(`✅ Película agregada a favoritas en BD:`, pelicula.titulo);
        return true;
      }
      return false;
    }),
    catchError(error => {
      console.error(`❌ Error al agregar a favoritas:`, error);
      // Fallback a localStorage si falla la API
      return of(this.addToFavoritesLocal(userId, pelicula));
    })
  );
}

  /**
   * Remover de favoritas usando API
   */
  removeFromFavorites(userId: number, peliculaId: number): Observable<boolean> {
  const headers = this.getAuthHeaders();

  return this.http.delete<any>(`${this.API_URL}/favorites/${peliculaId}`, { headers }).pipe(
    map(response => {
      if (response.success) {
        console.log(`✅ Película removida de favoritas en BD`);
        return true;
      }
      return false;
    }),
    catchError(error => {
      console.error(`❌ Error al remover de favoritas:`, error);
      // Fallback a localStorage si falla la API
      return of(this.removeFromFavoritesLocal(userId, peliculaId));
    })
  );
}


  /**
   * Verificar si está en favoritas
   */
 isInFavorites(userId: number, peliculaId: number): Observable<boolean> {
  const headers = this.getAuthHeaders();

  return this.http.get<any>(`${this.API_URL}/favorites/check/${peliculaId}`, { headers }).pipe(
    map(response => {
      if (response.success) {
        return response.data.isFavorite;
      }
      return false;
    }),
    catchError(error => {
      console.error(`❌ Error al verificar favorita:`, error);
      // Fallback a localStorage
      return of(this.isInFavoritesLocal(userId, peliculaId));
    })
  );
}


  /**
   * Limpiar todas las favoritas
   */
  clearAllFavorites(userId: number): Observable<boolean> {
  const headers = this.getAuthHeaders();

  return this.http.delete<any>(`${this.API_URL}/favorites/clear`, { headers }).pipe(
    map(response => {
      if (response.success) {
        console.log(`✅ Todas las favoritas limpiadas en BD`);
        return true;
      }
      return false;
    }),
    catchError(error => {
      console.error(`❌ Error al limpiar favoritas:`, error);
      return of(false);
    })
  );
}
private getCurrentUserId(): number {
  // Obtener desde AuthService o token
  const token = localStorage.getItem('auth_token');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.id || payload.userId || 0;
    } catch (error) {
      console.error('Error al obtener usuario ID del token:', error);
      return 0;
    }
  }
  return 0;
}

  // ==================== MÉTODOS DE HISTORIAL (ACTUALIZADOS PARA API) ====================

  /**
   * 🔥 NUEVO: Obtener historial del usuario desde la API
   */
getUserHistory(options?: HistoryOptions): Observable<HistorialItem[]> {
  const headers = this.getAuthHeaders();
  
  // Construir parámetros de query
  let params = new URLSearchParams();
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.offset) params.append('offset', options.offset.toString());
  if (options?.tipoAccion && options.tipoAccion !== 'todas') params.append('tipoAccion', options.tipoAccion);
  if (options?.fechaDesde) params.append('fechaDesde', options.fechaDesde);
  if (options?.fechaHasta) params.append('fechaHasta', options.fechaHasta);
  
  const queryString = params.toString();
  const url = `${this.API_URL}/history${queryString ? '?' + queryString : ''}`;
  
  return this.http.get<any>(url, { headers }).pipe(
    map(response => {
      console.log(`📡 Historial obtenido de BD para usuario actual:`, response.data?.length || 0);
      return (response.data || []).map((item: any) => this.convertApiHistoryToLocal(item));
    }),
    catchError(error => {
      console.error(`❌ Error al obtener historial del usuario actual:`, error);
      return of([]);
    })
  );
}


  /**
   * 🔥 NUEVO: Agregar al historial usando API
   */
  addToHistory(userId: number, historialItem: HistorialItem): Observable<boolean> {
    const headers = this.getAuthHeaders();
    const body = {
      peliculaId: historialItem.peliculaId,
      tipoAccion: historialItem.tipoAccion
    };

    return this.http.post<any>(`${this.API_URL}/history`, body, { headers }).pipe(
      map(response => {
        if (response.success) {
          console.log(`✅ Item agregado al historial en BD para usuario ${userId}:`, historialItem.titulo);
          return true;
        }
        return false;
      }),
      catchError(error => {
  // 🔧 NUEVO MANEJO
      if (error.status === 409) {
        console.log(`ℹ️ Actividad reciente para ${historialItem.titulo} (anti-spam de 30s activo)`);
        return of(true); // ✅ Silencioso
      }
      
      // Para otros errores, mantener tu fallback
      console.error(`❌ Error al agregar al historial para usuario ${userId}:`, error);
      return of(this.addToHistoryLocal(userId, historialItem));
    })
    );
  }

  /**
   * 🔥 NUEVO: Limpiar historial usando API
   */
  clearHistory(userId: number): Observable<boolean> {
    const headers = this.getAuthHeaders();

    return this.http.delete<any>(`${this.API_URL}/history/clear`, { headers }).pipe(
      map(response => {
        if (response.success) {
          console.log(`✅ Historial limpiado en BD para usuario ${userId}`);
          return true;
        }
        return false;
      }),
      catchError(error => {
        console.error(`❌ Error al limpiar historial para usuario ${userId}:`, error);
        return of(false);
      })
    );
  }

  /**
   * 🔥 NUEVO: Obtener estadísticas de historial desde API
   */
  getUserHistoryStats(userId: number): Observable<HistoryStats | null> {
    const headers = this.getAuthHeaders();

    return this.http.get<any>(`${this.API_URL}/history/stats`, { headers }).pipe(
      map(response => {
        if (response.success) {
          console.log(`📊 Estadísticas de historial obtenidas para usuario ${userId}`);
          return response.data;
        }
        return null;
      }),
      catchError(error => {
        console.error(`❌ Error al obtener estadísticas de historial para usuario ${userId}:`, error);
        return of(null);
      })
    );
  }

  /**
   * 🔥 NUEVO: Obtener historial de usuario específico (solo admin)
   */
  getUserHistoryById(userId: number, options?: HistoryOptions): Observable<HistorialItem[]> {
    const headers = this.getAuthHeaders();
    
    // Construir parámetros de query
    let params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    
    const queryString = params.toString();
    const url = `${this.API_URL}/history/${userId}${queryString ? '?' + queryString : ''}`;
    
    return this.http.get<any>(url, { headers }).pipe(
      map(response => {
        console.log(`📡 [ADMIN] Historial obtenido para usuario ${userId}:`, response.data?.length || 0);
        return (response.data || []).map((item: any) => this.convertApiHistoryToLocal(item));
      }),
      catchError(error => {
        console.error(`❌ [ADMIN] Error al obtener historial para usuario ${userId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * 🔥 ACTUALIZAR: Obtener estadísticas del usuario (ahora usa API si está disponible)
   */
  getUserStats(userId: number): Observable<UserStats> {
    // Intentar obtener desde API primero
    return this.getUserHistoryStats(userId).pipe(
      map(apiStats => {
        if (apiStats) {
          // Convertir estadísticas de API a formato local
          return {
            totalFavoritas: 0, // Se obtiene de otro método
            totalVistas: apiStats.totalVistas || 0,
            generoFavorito: apiStats.generoMasVisto || 'Ninguno',
            ultimaActividad: apiStats.ultimaActividad || null
          };
        } else {
          // Fallback a datos locales
          return this.getUserStatsLocal(userId);
        }
      }),
      catchError(error => {
        console.error('Error al obtener estadísticas, usando datos locales:', error);
        return of(this.getUserStatsLocal(userId));
      })
    );
  }

  // ==================== MÉTODOS LOCALES (FALLBACK) ====================

  /**
   * Obtener favoritas del localStorage (fallback)
   */
  private getUserFavoritesLocal(userId: number): PeliculaFavorita[] {
    const favoritesKey = `favorites_${userId}`;
    const favorites = localStorage.getItem(favoritesKey);
    
    if (favorites) {
      try {
        return JSON.parse(favorites);
      } catch (error) {
        console.error('Error al obtener favoritas locales:', error);
        return [];
      }
    }
    return [];
  }

  /**
   * Agregar a favoritas local (fallback)
   */
  private addToFavoritesLocal(userId: number, pelicula: PeliculaFavorita): boolean {
    try {
      const favorites = this.getUserFavoritesLocal(userId);
      
      const yaExiste = favorites.some(fav => fav.peliculaId === pelicula.peliculaId);
      if (yaExiste) {
        console.log('La película ya está en favoritas locales');
        return false;
      }

      favorites.push({
        ...pelicula,
        fechaAgregada: new Date().toISOString()
      });

      const favoritesKey = `favorites_${userId}`;
      localStorage.setItem(favoritesKey, JSON.stringify(favorites));
      
      console.log('Película agregada a favoritas locales:', pelicula.titulo);
      return true;
    } catch (error) {
      console.error('Error al agregar a favoritas locales:', error);
      return false;
    }
  }

  /**
   * Remover de favoritas local (fallback)
   */
  private removeFromFavoritesLocal(userId: number, peliculaId: number): boolean {
    try {
      const favorites = this.getUserFavoritesLocal(userId);
      const nuevasFavoritas = favorites.filter(fav => fav.peliculaId !== peliculaId);
      
      const favoritesKey = `favorites_${userId}`;
      localStorage.setItem(favoritesKey, JSON.stringify(nuevasFavoritas));
      
      console.log('Película removida de favoritas locales');
      return true;
    } catch (error) {
      console.error('Error al remover de favoritas locales:', error);
      return false;
    }
  }

  /**
   * Verificar favoritas local (fallback)
   */
  private isInFavoritesLocal(userId: number, peliculaId: number): boolean {
    const favorites = this.getUserFavoritesLocal(userId);
    return favorites.some(fav => fav.peliculaId === peliculaId);
  }

  /**
   * Obtener historial del localStorage (fallback)
   */
  private getUserHistoryLocal(userId: number): HistorialItem[] {
    const historyKey = `history_${userId}`;
    const history = localStorage.getItem(historyKey);
    
    if (history) {
      try {
        return JSON.parse(history).sort((a: HistorialItem, b: HistorialItem) => 
          new Date(b.fechaVista).getTime() - new Date(a.fechaVista).getTime()
        );
      } catch (error) {
        console.error('Error al obtener historial local:', error);
        return [];
      }
    }
    return [];
  }

  /**
   * Agregar al historial local (fallback)
   */
  private addToHistoryLocal(userId: number, historialItem: HistorialItem): boolean {
    try {
      const history = this.getUserHistoryLocal(userId);
      
      const yaExiste = history.some(item => 
        item.peliculaId === historialItem.peliculaId &&
        this.isSameDay(new Date(item.fechaVista), new Date(historialItem.fechaVista))
      );

      if (!yaExiste) {
        history.unshift({
          ...historialItem,
          fechaVista: new Date().toISOString()
        });

        const historialLimitado = history.slice(0, 50);
        const historyKey = `history_${userId}`;
        localStorage.setItem(historyKey, JSON.stringify(historialLimitado));
        
        console.log('Agregado al historial local:', historialItem.titulo);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error al agregar al historial local:', error);
      return false;
    }
  }

  /**
   * Obtener estadísticas locales (fallback)
   */
  private getUserStatsLocal(userId: number): UserStats {
    const favorites = this.getUserFavoritesLocal(userId);
    const history = this.getUserHistoryLocal(userId);
    
    // Contar géneros favoritos
    const generos: { [key: string]: number } = {};
    [...favorites, ...history].forEach(item => {
      if (item.genero) {
        generos[item.genero] = (generos[item.genero] || 0) + 1;
      }
    });

    const generoFavorito = Object.keys(generos).reduce((a, b) => 
      generos[a] > generos[b] ? a : b, 'Ninguno'
    );

    return {
      totalFavoritas: favorites.length,
      totalVistas: history.length,
      generoFavorito: generoFavorito,
      ultimaActividad: history.length > 0 ? history[0].fechaVista : null
    };
  }

  /**
   * Convertir favorita de API a formato local
   */
  private convertApiFavoriteToLocal(apiFav: any): PeliculaFavorita {
    return {
      peliculaId: apiFav.pelicula_id,
      titulo: apiFav.titulo,
      poster: apiFav.poster,
      genero: apiFav.genero,
      anio: apiFav.anio,
      rating: parseFloat(apiFav.rating?.toString() || '0'),
      fechaAgregada: apiFav.fecha_agregada
    };
  }

  /**
   * Convertir historial de API a formato local
   */
  private convertApiHistoryToLocal(apiHistory: any): HistorialItem {
    return {
      peliculaId: apiHistory.peliculaId || apiHistory.pelicula_id,
      titulo: apiHistory.titulo,
      poster: apiHistory.poster,
      genero: apiHistory.genero,
      anio: apiHistory.anio,
      fechaVista: apiHistory.fechaVista || apiHistory.fecha_vista,
      tipoAccion: apiHistory.tipoAccion || apiHistory.tipo_accion
    };
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Obtener headers con token de autenticación
   */
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      console.warn('⚠️ No hay token de autenticación');
      return new HttpHeaders();
    }

    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Convertir usuario de API a formato local
   */
  private convertApiToLocal(apiUser: any): Usuario {
    return {
      id: apiUser.id,
      nombre: apiUser.nombre,
      email: apiUser.email,
      role: apiUser.role as 'admin' | 'cliente',
      avatar: apiUser.avatar,
      fechaRegistro: apiUser.fecha_registro,
      isActive: apiUser.is_active
    };
  }

  /**
   * Verificar si dos fechas son del mismo día
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }
}

// ==================== INTERFACES ACTUALIZADAS ====================

export interface UpdateProfileData {
  nombre?: string;
  email?: string;
  avatar?: string;
}

export interface PeliculaFavorita {
  peliculaId: number;
  titulo: string;
  poster: string;
  genero: string;
  anio: number;
  rating: number;
  fechaAgregada: string;
}

export interface HistorialItem {
  peliculaId: number;
  titulo: string;
  poster: string;
  genero: string;
  anio: number;
  fechaVista: string;
  tipoAccion: 'vista' | 'comprada';
}

export interface UserStats {
  totalFavoritas: number;
  totalVistas: number;
  generoFavorito: string;
  ultimaActividad: string | null;
}

export interface HistoryOptions {
  limit?: number;
  offset?: number;
  tipoAccion?: 'todas' | 'vista' | 'comprada';
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface HistoryStats {
  totalActividades: number;
  totalVistas: number;
  totalCompradas: number;
  generosDiferentes: number;
  generoMasVisto: string;
  ultimaActividad: string | null;
  actividadUltimos7Dias: Array<{
    fecha: string;
    actividades: number;
  }>;
}
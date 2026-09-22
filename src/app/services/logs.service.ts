// src/app/services/logs.service.ts - VERSIÓN CORREGIDA
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ActivityLog {
  tipo: string;
  descripcion: string;
  fecha: string;
  icono: string;
  color: string;
}

export interface OrderLog {
  id: string;
  total: number;
  estado: string;
  nombre_cliente: string;
  email_cliente: string;
  metodo_pago: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
  color_estado: string;
}

export interface UserLog {
  id: number;
  nombre: string;
  email: string;
  role: string;
  is_active: boolean;
  fecha_registro: string;
  color_estado: string;
}

export interface ErrorLog {
  id: number;
  tipo: string;
  mensaje: string;
  timestamp: string;
  nivel: string;
  modulo: string;
}

export interface SystemStats {
  usuarios_activos: number;
  ordenes_hoy: number;
  ordenes_pendientes: number;
  ingresos_hoy: number;
  peliculas_activas: number;
  funciones_activas: number;
}

@Injectable({
  providedIn: 'root'
})
export class LogsService {
  private apiUrl = `${environment.apiUrl}/logs`;

  constructor(private http: HttpClient) {
    console.log('📋 LogsService conectado a API:', this.apiUrl);
  }

  // 🔧 MÉTODO CORREGIDO: Obtener headers con autenticación
  private getAuthHeaders(): HttpHeaders {
    // 🔧 FIX: Usar la misma clave que otros servicios
    const token = localStorage.getItem('auth_token');
    
    console.log('🔐 Token para logs:', token ? 'Token presente' : 'Token NO encontrado');
    
    if (!token) {
      console.warn('⚠️ No hay token de autenticación para LogsService');
      return new HttpHeaders({
        'Content-Type': 'application/json'
      });
    }

    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // 🔧 MEJORADO: Obtener actividad reciente con mejor manejo de errores
  getRecentActivity(limit: number = 50, offset: number = 0): Observable<any> {
    const headers = this.getAuthHeaders();
    const url = `${this.apiUrl}/activity?limit=${limit}&offset=${offset}`;
    
    console.log('📡 Solicitando actividad reciente desde:', url);
    console.log('🔐 Headers enviados:', headers.get('Authorization') ? 'Authorization presente' : 'Sin Authorization');
    
    return this.http.get(url, { headers });
  }

  // 🔧 MEJORADO: Obtener logs de órdenes
  getOrderLogs(limit: number = 20): Observable<any> {
    const headers = this.getAuthHeaders();
    const url = `${this.apiUrl}/orders?limit=${limit}`;
    
    console.log('📡 Solicitando logs de órdenes desde:', url);
    
    return this.http.get(url, { headers });
  }

  // 🔧 MEJORADO: Obtener logs de usuarios
  getUserLogs(limit: number = 20): Observable<any> {
    const headers = this.getAuthHeaders();
    const url = `${this.apiUrl}/users?limit=${limit}`;
    
    console.log('📡 Solicitando logs de usuarios desde:', url);
    
    return this.http.get(url, { headers });
  }

  // 🔧 MEJORADO: Obtener logs de errores
  getErrorLogs(): Observable<any> {
    const headers = this.getAuthHeaders();
    const url = `${this.apiUrl}/errors`;
    
    console.log('📡 Solicitando logs de errores desde:', url);
    
    return this.http.get(url, { headers });
  }

  // 🔧 MEJORADO: Obtener estadísticas del sistema
  getSystemStats(): Observable<any> {
    const headers = this.getAuthHeaders();
    const url = `${this.apiUrl}/stats`;
    
    console.log('📡 Solicitando estadísticas del sistema desde:', url);
    
    return this.http.get(url, { headers });
  }

  // 🆕 MÉTODO ADICIONAL: Verificar si el usuario está autenticado
  isAuthenticated(): boolean {
    const token = localStorage.getItem('auth_token');
    return !!token;
  }

  // 🆕 MÉTODO ADICIONAL: Obtener información del token
  getTokenInfo(): any {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;

    try {
      // Decodificar payload del JWT (solo para debug - no validar aquí)
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return {
        userId: decoded.userId,
        role: decoded.role,
        exp: decoded.exp,
        isExpired: decoded.exp * 1000 < Date.now()
      };
    } catch (error) {
      console.error('Error decodificando token:', error);
      return null;
    }
  }
}
// src/app/services/password-reset.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PasswordResetService {

  // 🔗 API Configuration
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {
    console.log('🔐 PasswordResetService conectado a API:', this.API_URL);
  }

  // ==================== MÉTODOS DE RECUPERACIÓN ====================

  /**
   * Solicitar recuperación de contraseña
   */
  requestPasswordReset(email: string): Observable<PasswordResetResponse> {
    const body = { email };

    return this.http.post<any>(`${this.API_URL}/auth/forgot-password`, body).pipe(
      map(response => {
        console.log('🔍 Respuesta de forgot-password:', response);
        
        if (response.success) {
          return {
            success: true,
            message: response.message || 'Se ha enviado un enlace de recuperación a tu email'
          };
        }
        throw new Error(response.error || 'Error al solicitar recuperación');
      }),
      catchError(error => {
        console.error('❌ Error en solicitud de recuperación:', error);
        return of({
          success: false,
          message: error.error?.error || error.error?.message || 'Error al enviar el email de recuperación'
        });
      })
    );
  }

  /**
   * Validar token de recuperación
   */
  validateResetToken(token: string): Observable<TokenValidationResponse> {
    return this.http.get<any>(`${this.API_URL}/auth/validate-reset-token/${token}`).pipe(
      map(response => {
        console.log('🔍 Respuesta de validate-token:', response);
        
        if (response.success && response.data) {
          return {
            success: true,
            message: response.message || 'Token válido',
            data: {
              email: response.data.email,
              nombre: response.data.nombre
            }
          };
        }
        throw new Error(response.error || 'Token inválido');
      }),
      catchError(error => {
        console.error('❌ Error validando token:', error);
        return of({
          success: false,
          message: error.error?.error || error.error?.message || 'Token inválido o expirado'
        });
      })
    );
  }

  /**
   * Restablecer contraseña
   */
  resetPassword(token: string, newPassword: string, confirmPassword: string): Observable<PasswordResetResponse> {
    const body = {
      token,
      newPassword,
      confirmPassword
    };

    return this.http.post<any>(`${this.API_URL}/auth/reset-password`, body).pipe(
      map(response => {
        console.log('🔍 Respuesta de reset-password:', response);
        
        if (response.success) {
          return {
            success: true,
            message: response.message || 'Contraseña restablecida exitosamente'
          };
        }
        throw new Error(response.error || 'Error al restablecer contraseña');
      }),
      catchError(error => {
        console.error('❌ Error restableciendo contraseña:', error);
        return of({
          success: false,
          message: error.error?.error || error.error?.message || 'Error al restablecer la contraseña'
        });
      })
    );
  }

  // ==================== MÉTODOS DE VALIDACIÓN ====================

  /**
   * Validar formato de email
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validar contraseña segura
   */
  validatePasswordStrength(password: string): PasswordStrength {
    if (!password) return { strength: '', color: '', percentage: 0, valid: false };
    
    let score = 0;
    const checks = [];

    // Verificar cada criterio
    if (password.length >= 6) { score++; checks.push('Longitud'); }
    if (/[A-Z]/.test(password)) { score++; checks.push('Mayúscula'); }
    if (/[a-z]/.test(password)) { score++; checks.push('Minúscula'); }
    if (/\d/.test(password)) { score++; checks.push('Número'); }
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) { score++; checks.push('Especial'); }

    const percentage = (score / 5) * 100;
    const valid = score >= 3; // Mínimo 3 criterios para considerar válida

    if (score <= 2) return { strength: 'Débil', color: 'danger', percentage, valid: false };
    if (score <= 3) return { strength: 'Regular', color: 'warning', percentage, valid: true };
    if (score <= 4) return { strength: 'Buena', color: 'info', percentage, valid: true };
    return { strength: 'Muy Segura', color: 'success', percentage, valid: true };
  }
}

// ==================== INTERFACES ====================

export interface PasswordResetResponse {
  success: boolean;
  message: string;
}

export interface TokenValidationResponse {
  success: boolean;
  message: string;
  data?: {
    email: string;
    nombre: string;
  };
}

export interface PasswordStrength {
  strength: string;
  color: string;
  percentage: number;
  valid: boolean;
}
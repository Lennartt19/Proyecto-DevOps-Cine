// src/app/components/reset-password/reset-password.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PasswordResetService, PasswordStrength } from '../../services/password-reset.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-reset-password',
  standalone: false,
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  token = '';
  newPassword = '';
  confirmPassword = '';
  mensajeError = '';
  mensajeExito = '';
  cargando = false;
  tokenValido = false;
  verificandoToken = true;
  mostrarPassword = false;
  mostrarConfirmPassword = false;
  
  // Datos del usuario
  userData = {
    email: '',
    nombre: ''
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private passwordResetService: PasswordResetService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    // Obtener token de la URL
    this.token = this.route.snapshot.paramMap.get('token') || '';
    
    if (!this.token) {
      this.toastService.showError('Token de recuperación inválido');
      this.router.navigate(['/login']);
      return;
    }

    // Validar token
    this.validarToken();
  }

  /**
   * Validar token con el servidor
   */
  validarToken() {
    this.verificandoToken = true;
    
    this.passwordResetService.validateResetToken(this.token).subscribe({
      next: (response) => {
        console.log('🔍 Respuesta de validación token:', response);
        
        if (response.success && response.data) {
          this.tokenValido = true;
          this.userData.email = response.data.email;
          this.userData.nombre = response.data.nombre;
          this.toastService.showSuccess('Token válido. Puedes restablecer tu contraseña.');
        } else {
          this.tokenValido = false;
          this.toastService.showError(response.message);
          this.mensajeError = response.message;
        }
        
        this.verificandoToken = false;
      },
      error: (error) => {
        console.error('❌ Error validando token:', error);
        this.tokenValido = false;
        this.toastService.showError('Token inválido o expirado');
        this.mensajeError = 'Token inválido o expirado';
        this.verificandoToken = false;
      }
    });
  }

  /**
   * Procesar restablecimiento de contraseña
   */
  onSubmit() {
    this.cargando = true;
    this.mensajeError = '';
    this.mensajeExito = '';
    
    // Validaciones
    if (!this.newPassword || !this.confirmPassword) {
      this.toastService.showWarning('Todos los campos son obligatorios');
      this.cargando = false;
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.toastService.showWarning('Las contraseñas no coinciden');
      this.cargando = false;
      return;
    }

    const passwordStrength = this.getPasswordStrength(this.newPassword);
    if (!passwordStrength.valid) {
      this.toastService.showWarning('La contraseña no cumple los requisitos mínimos de seguridad');
      this.cargando = false;
      return;
    }

    // Enviar solicitud
    this.passwordResetService.resetPassword(this.token, this.newPassword, this.confirmPassword).subscribe({
      next: (response) => {
        console.log('🔍 Respuesta de reset password:', response);
        
        if (response.success) {
          this.toastService.showSuccess(response.message);
          this.mensajeExito = response.message;
          
          // Redirigir al login después de 3 segundos
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        } else {
          this.toastService.showError(response.message);
          this.mensajeError = response.message;
        }
        
        this.cargando = false;
      },
      error: (error) => {
        console.error('❌ Error en reset password:', error);
        this.toastService.showError('Error de conexión. Intenta de nuevo.');
        this.mensajeError = 'Error de conexión. Intenta de nuevo.';
        this.cargando = false;
      }
    });
  }

  /**
   * Obtener fortaleza de contraseña
   */
  getPasswordStrength(password: string): PasswordStrength {
    return this.passwordResetService.validatePasswordStrength(password);
  }

  /**
   * Verificar si las contraseñas coinciden
   */
  passwordsMatch(): boolean {
    return this.newPassword === this.confirmPassword;
  }

  /**
   * Verificar si las contraseñas no coinciden
   */
  passwordsNoCoinciden(): boolean {
    return this.confirmPassword.length > 0 && !this.passwordsMatch();
  }

  /**
   * Toggle password visibility
   */
  togglePassword() {
    this.mostrarPassword = !this.mostrarPassword;
  }

  toggleConfirmPassword() {
    this.mostrarConfirmPassword = !this.mostrarConfirmPassword;
  }

  /**
   * Volver al login
   */
  goToLogin() {
    this.router.navigate(['/login']);
  }

  /**
   * Ir a forgot password
   */
  goToForgotPassword() {
    this.router.navigate(['/forgot-password']);
  }
}
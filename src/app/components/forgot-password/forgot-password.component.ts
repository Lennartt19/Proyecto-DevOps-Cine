// src/app/components/forgot-password/forgot-password.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { PasswordResetService } from '../../services/password-reset.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-forgot-password',
  standalone: false,
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {
  email = '';
  mensajeError = '';
  mensajeExito = '';
  cargando = false;
  emailEnviado = false;

  constructor(
    private passwordResetService: PasswordResetService,
    private router: Router,
    private toastService: ToastService
  ) {}

  /**
   * Procesar solicitud de recuperación
   */
  onSubmit() {
    this.cargando = true;
    this.mensajeError = '';
    this.mensajeExito = '';
    
    // Validación de email
    if (!this.email.trim()) {
      this.toastService.showWarning('El email es requerido');
      this.cargando = false;
      return;
    }

    if (!this.passwordResetService.isValidEmail(this.email)) {
      this.toastService.showWarning('Ingresa un email válido');
      this.cargando = false;
      return;
    }

    // Enviar solicitud
    this.passwordResetService.requestPasswordReset(this.email).subscribe({
      next: (response) => {
        console.log('🔍 Respuesta de forgot password:', response);
        
        if (response.success) {
          this.toastService.showSuccess(response.message);
          this.mensajeExito = response.message;
          this.emailEnviado = true;
          
          // Opcional: redirigir después de 5 segundos
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 5000);
        } else {
          this.toastService.showError(response.message);
          this.mensajeError = response.message;
        }
        
        this.cargando = false;
      },
      error: (error) => {
        console.error('❌ Error en forgot password:', error);
        this.toastService.showError('Error de conexión. Intenta de nuevo.');
        this.mensajeError = 'Error de conexión. Intenta de nuevo.';
        this.cargando = false;
      }
    });
  }

  /**
   * Volver al login
   */
  goToLogin() {
    this.router.navigate(['/login']);
  }

  /**
   * Reenviar email
   */
  reenviarEmail() {
    this.emailEnviado = false;
    this.onSubmit();
  }
}
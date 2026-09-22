import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginData = { 
    email: '', 
    password: '' 
  };
  mensajeError = '';
  mensajeExito = '';
  mostrarPassword = false;
  recordarSesion = false;
  cargando = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService
  ) {}

  // ==================== MÉTODOS DE AUTENTICACIÓN TRADICIONAL ====================
  onLogin() {
    this.cargando = true;
    this.mensajeError = '';   
    this.mensajeExito = '';   
    
    // Validaciones básicas
    if (!this.loginData.email.trim()) {
      this.toastService.showWarning('El email es requerido');
      this.cargando = false;
      return;
    }
    if (!this.loginData.password.trim()) {
      this.toastService.showWarning('La contraseña es requerida');
      this.cargando = false;
      return;
    }

    // Usar el método Observable
    this.authService.login(this.loginData.email, this.loginData.password).subscribe({
      next: (response) => {
        console.log('🔍 Respuesta de login:', response);
        
        if (response.success) {
          this.toastService.showSuccess(response.message || '¡Bienvenido de vuelta!');
          this.mensajeExito = response.message || '¡Bienvenido de vuelta!';
          
          // Verificar si hay URL de redirección
          const redirectUrl = localStorage.getItem('redirectUrl');
          if (redirectUrl) {
            localStorage.removeItem('redirectUrl');
            setTimeout(() => {
              window.location.href = redirectUrl;
            }, 1000);
          } else {
            // Redirigir según el rol del usuario
            setTimeout(() => {
              if (response.user?.role === 'admin') {
                this.router.navigate(['/admin']);
              } else {
                this.router.navigate(['/home']);
              }
            }, 1000);
          }
        } else {
          this.toastService.showError(response.message || 'Email o contraseña incorrectos');
          this.mensajeError = response.message || 'Email o contraseña incorrectos';
        }
        
        this.cargando = false;
      },
      error: (error) => {
        console.error('❌ Error en login:', error);
        this.toastService.showError('Error de conexión. Intenta de nuevo.');
        this.mensajeError = 'Error de conexión. Intenta de nuevo.';
        this.cargando = false;
      }
    });
  }

  togglePassword() {
    this.mostrarPassword = !this.mostrarPassword;
  }

  // ==================== MÉTODO DE OAUTH (SOLO GOOGLE) ====================
  /**
   * 🔗 Iniciar autenticación con Google
   */
  loginWithGoogle() {
    if (this.cargando) return;
    
    console.log('🔗 Iniciando login con Google...');
    this.toastService.showInfo('Redirigiendo a Google...');
    
    // Guardar URL de redirección si existe
    this.guardarUrlRedirect();
    
    // Llamar al servicio
    this.authService.loginWithGoogle();
  }

  // ==================== MÉTODOS AUXILIARES ====================
  /**
   * Guardar URL de redirección para después del OAuth
   */
  private guardarUrlRedirect() {
    const redirectUrl = localStorage.getItem('redirectUrl');
    if (redirectUrl) {
      // Ya hay una URL guardada, mantenerla
      console.log('🔄 URL de redirección ya guardada:', redirectUrl);
    }
  }

  /**
   * Limpiar mensajes de error/éxito
   */
  private limpiarMensajes() {
    this.mensajeError = '';
    this.mensajeExito = '';
  }

  // ==================== MÉTODOS DE CICLO DE VIDA ====================
  ngOnInit() {
    // Verificar si hay parámetros de error en la URL
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    
    if (error) {
      this.mostrarErrorOAuth(error);
    }
  }

  /**
   * Mostrar error de OAuth basado en el parámetro
   */
  private mostrarErrorOAuth(error: string) {
    let mensaje = '';
    
    switch (error) {
      case 'oauth_failed':
        mensaje = 'La autenticación falló. Por favor, inténtalo de nuevo.';
        break;
      case 'oauth_error':
        mensaje = 'Ocurrió un error durante la autenticación. Inténtalo más tarde.';
        break;
      case 'access_denied':
        mensaje = 'Acceso denegado. Has cancelado la autenticación.';
        break;
      default:
        mensaje = 'Error desconocido en la autenticación.';
    }
    
    this.toastService.showError(mensaje);
    this.mensajeError = mensaje;
    
    // Limpiar la URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-oauth-callback',
  standalone: false,
  template: `
    <div class="container mt-5">
      <div class="row justify-content-center">
        <div class="col-md-6">
          <div class="card">
            <div class="card-body text-center">
              <div *ngIf="procesando" class="text-primary">
                <div class="spinner-border mb-3" role="status">
                  <span class="visually-hidden">Cargando...</span>
                </div>
                <h4>Procesando autenticación...</h4>
                <p class="text-muted">Esto puede tomar unos momentos</p>
              </div>
              
              <div *ngIf="!procesando && exito" class="text-success">
                <i class="fas fa-check-circle fa-3x mb-3"></i>
                <h4>¡Autenticación exitosa!</h4>
                <p>Redirigiendo...</p>
              </div>
              
              <div *ngIf="!procesando && !exito" class="text-danger">
                <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                <h4>Error en la autenticación</h4>
                <p>{{ mensajeError }}</p>
                <button class="btn btn-primary" (click)="volverAlLogin()">
                  Volver al Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .spinner-border {
      width: 3rem;
      height: 3rem;
    }
    
    .fa-3x {
      font-size: 3rem;
    }
    
    .card {
      border: none;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
  `]
})
export class OAuthCallbackComponent implements OnInit {
  procesando = true;
  exito = false;
  mensajeError = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.procesarCallback();
  }

  private procesarCallback(): void {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      const userData = params['user'];
      const success = params['success'] === 'true';
      const error = params['error'];

      this.procesando = false;

      if (error) {
        this.manejarError(error);
        return;
      }

      if (success && token) {
        this.manejarExito(token, userData);
      } else {
        this.manejarError('No se recibió token de autenticación');
      }
    });
  }

  private manejarExito(token: string, userData?: string): void {
    console.log('✅ Procesando callback OAuth exitoso');
    
    const callbackSuccess = this.authService.handleOAuthCallback(token, userData);
    
    if (callbackSuccess) {
      this.exito = true;
      this.toastService.showSuccess('¡Autenticación exitosa!');
      
      // Verificar si hay URL de redirección
      const redirectUrl = localStorage.getItem('redirectUrl');
      
      setTimeout(() => {
        if (redirectUrl) {
          localStorage.removeItem('redirectUrl');
          window.location.href = redirectUrl;
        } else {
          // Redirigir según el rol del usuario
          const user = this.authService.getCurrentUser();
          if (user?.role === 'admin') {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/home']);
          }
        }
      }, 1500);
    } else {
      this.manejarError('Error procesando datos de autenticación');
    }
  }

  private manejarError(error: string): void {
    this.exito = false;
    this.mensajeError = this.obtenerMensajeError(error);
    this.toastService.showError(this.mensajeError);
    console.error('❌ Error en OAuth callback:', error);
  }

  private obtenerMensajeError(error: string): string {
    switch (error) {
      case 'oauth_failed':
        return 'La autenticación con el proveedor falló. Por favor, inténtalo de nuevo.';
      case 'oauth_error':
        return 'Ocurrió un error durante la autenticación. Inténtalo más tarde.';
      case 'access_denied':
        return 'Acceso denegado. Has cancelado la autenticación.';
      default:
        return 'Error desconocido en la autenticación. Inténtalo de nuevo.';
    }
  }

  volverAlLogin(): void {
    this.router.navigate(['/login']);
  }
}
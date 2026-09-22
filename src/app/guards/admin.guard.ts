// guards/admin.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  
  constructor(
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    
    // Primero verificar si está logueado
    if (!this.authService.isLoggedIn()) {
      this.toastService.showWarning('Debes iniciar sesión para acceder a esta sección.');
      localStorage.setItem('redirectUrl', state.url);
      this.router.navigate(['/login']);
      return false;
    }
    
    // Luego verificar si es admin
    if (this.authService.isAdmin()) {
      return true;
    } else {
      this.toastService.showError('Acceso denegado. Esta sección es solo para administradores.');
      this.router.navigate(['/home']);
      return false;
    }
  }
}
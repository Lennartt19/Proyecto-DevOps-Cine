// frontend/src/app/components/suggestions/suggestions.component.ts
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-suggestions',
  standalone: false,
  templateUrl: './suggestions.component.html',
  styleUrls: ['./suggestions.component.css']
})
export class SuggestionsComponent implements OnInit {

  // Estado del componente
  loading = false;
  currentUser: any = null;

  constructor(
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    
    if (!this.currentUser) {
      // Si no está logueado, redirigir
      this.toastService.showWarning('Debes iniciar sesión para enviar sugerencias');
    }
  }

  /**
   * Verificar si el usuario está logueado
   */
  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  /**
   * Mostrar información sobre tipos de sugerencias
   */
  showSuggestionTypes(): void {
    const message = `💡 Tipos de sugerencias que puedes enviar:\n\n` +
                   `🐛 Reportar errores o problemas\n` +
                   `⭐ Sugerir nuevas funcionalidades\n` +
                   `🎬 Proponer mejoras en películas\n` +
                   `🍿 Ideas para el sistema de bar\n` +
                   `💰 Sugerencias para el sistema de puntos\n` +
                   `🎨 Mejoras en la interfaz\n\n` +
                   `¡Tu opinión es muy valiosa para nosotros!`;
    
    alert(message);
  }

  /**
   * Obtener el nombre del usuario actual
   */
  getCurrentUserName(): string {
    return this.currentUser?.nombre || 'Usuario';
  }
}
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Pelicula, MovieService } from '../../services/movie.service';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { PointsService } from '../../services/points.service'; // 🆕 NUEVO

@Component({
  selector: 'app-navbar',
  standalone: false,
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit, OnDestroy {
  sugerencias: Pelicula[] = [];
  mostrarSugerencias: boolean = false;
  sugerenciaSeleccionada: number = -1;
  terminoBusqueda: string = '';

  // 🆕 NUEVAS PROPIEDADES PARA PUNTOS
  userPoints: number = 0;
  loadingPoints: boolean = false;
  private pointsSubscription: Subscription = new Subscription();

  constructor(
    private router: Router,
    private movieService: MovieService,
    public authService: AuthService,
    public cartService: CartService,
    private pointsService: PointsService // 🆕 NUEVO
  ) {}

  ngOnInit(): void {
    this.loadUserPoints();
    this.subscribeToAuthChanges();
  }

  ngOnDestroy(): void {
    this.pointsSubscription.unsubscribe();
  }

  // 🆕 CARGAR PUNTOS DEL USUARIO
  private loadUserPoints(): void {
    if (this.authService.isLoggedIn()) {
      this.loadingPoints = true;
      
      // Suscribirse a cambios en puntos
      this.pointsSubscription = this.pointsService.userPoints$.subscribe({
        next: (points) => {
          this.userPoints = points;
          this.loadingPoints = false;
        },
        error: (error) => {
          console.error('❌ Error cargando puntos:', error);
          this.loadingPoints = false;
          // Usar método legacy como fallback
          const currentUser = this.authService.getCurrentUser();
          if (currentUser) {
            this.userPoints = this.pointsService.getUserPoints_Legacy(currentUser.id);
          }
        }
      });

      // Cargar puntos iniciales
      this.pointsService.getUserPoints().subscribe();
    }
  }

  // 🆕 SUSCRIBIRSE A CAMBIOS DE AUTENTICACIÓN
  private subscribeToAuthChanges(): void {
    // Recargar puntos cuando el usuario se loguee/desloguee
    this.authService.authStatus$.subscribe((isLoggedIn) => {
      if (isLoggedIn) {
        this.loadUserPoints();
      } else {
        this.userPoints = 0;
        this.pointsSubscription.unsubscribe();
        this.pointsSubscription = new Subscription();
      }
    });
  }

  // ==================== MÉTODOS DE BÚSQUEDA (SIN CAMBIOS) ====================

  onBuscarInput(event: any) {
    this.terminoBusqueda = event.target.value;
    
    if (this.terminoBusqueda.trim().length === 0) {
      this.sugerencias = [];
      this.mostrarSugerencias = false;
      return;
    }

    if (this.terminoBusqueda.trim().length >= 2) {
      this.movieService.buscarPeliculas(this.terminoBusqueda).subscribe({
        next: (peliculas: Pelicula[]) => {
          console.log('📡 Sugerencias de API:', peliculas.length);
          this.sugerencias = peliculas.slice(0, 5);
          this.mostrarSugerencias = this.sugerencias.length > 0;
          this.sugerenciaSeleccionada = -1;
        },
        error: (error) => {
          console.error('❌ Error en sugerencias:', error);
          this.sugerencias = [];
          this.mostrarSugerencias = false;
        }
      });
    }
  }

  seleccionarSugerencia(pelicula: Pelicula) {
    this.cerrarSugerencias();
    const movieId = pelicula.id || pelicula.idx;
    console.log('🎬 Navegando a película con ID:', movieId);
    this.router.navigate(['/movie', movieId]);
  }

  cerrarSugerencias() {
    this.mostrarSugerencias = false;
    this.sugerenciaSeleccionada = -1;
  }

  buscarPelicula(termino: string) {
    console.log('🔍 Término de búsqueda:', termino);
    
    if (!termino || termino.trim().length === 0) {
      console.log('⚠️ Búsqueda vacía');
      return;
    }
    
    this.cerrarSugerencias();
    const terminoLimpio = termino.trim();
    console.log('🧭 Navegando a /buscar/' + terminoLimpio);
    
    this.router.navigate(['/buscar', terminoLimpio]).then(success => {
      if (success) {
        console.log('✅ Navegación exitosa');
        this.terminoBusqueda = '';
      }
    }).catch(error => {
      console.error('❌ Error en navegación:', error);
    });
  }

  // ==================== MÉTODO DE LOGOUT ACTUALIZADO ====================

  logout() {
    console.log('Cerrando sesión...');
    
    // Limpiar puntos al cerrar sesión
    this.userPoints = 0;
    this.pointsSubscription.unsubscribe();
    this.pointsSubscription = new Subscription();
    
    this.authService.logout();
    this.router.navigate(['/home']);
  }

  // 🆕 NUEVOS MÉTODOS PARA PUNTOS

  /**
   * Obtener texto de puntos para mostrar en el navbar
   */
  getPointsDisplayText(): string {
    if (this.loadingPoints) {
      return '...';
    }
    
    if (this.userPoints === 0) {
      return '0';
    }
    
    // Formatear números grandes
    if (this.userPoints >= 1000) {
      return (this.userPoints / 1000).toFixed(1) + 'k';
    }
    
    return this.userPoints.toString();
  }

  /**
   * Obtener valor en dólares de los puntos (para tooltip)
   */
  getPointsValueText(): string {
    const value = this.userPoints / 1; // 1 punto = $1
    return `$${value.toFixed(2)}`;
  }

  /**
   * Verificar si debe mostrar los puntos en el navbar
   */
  shouldShowPoints(): boolean {
    return this.authService.isLoggedIn() && !this.loadingPoints;
  }

  /**
   * Navegar a la página de puntos/recompensas
   */
  goToRewards(): void {
    this.router.navigate(['/rewards']);
  }

  /**
   * Navegar al perfil (desde donde se pueden ver los puntos)
   */
  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  // 🆕 MÉTODOS PARA DETECCIÓN DE CAMBIOS EN TIEMPO REAL

  /**
   * Refrescar puntos manualmente
   */
  refreshPoints(): void {
    if (this.authService.isLoggedIn()) {
      this.loadingPoints = true;
      this.pointsService.getUserPoints().subscribe({
        next: () => {
          console.log('✅ Puntos actualizados');
        },
        error: (error) => {
          console.error('❌ Error actualizando puntos:', error);
          this.loadingPoints = false;
        }
      });
    }
  }

  /**
   * Obtener clase CSS para el badge de puntos
   */
  getPointsBadgeClass(): string {
    if (this.userPoints === 0) {
      return 'bg-secondary';
    } else if (this.userPoints < 100) {
      return 'bg-info';
    } else if (this.userPoints < 500) {
      return 'bg-success';
    } else {
      return 'bg-warning text-dark';
    }
  }

  /**
   * Obtener mensaje de tooltip para los puntos
   */
  getPointsTooltip(): string {
    if (this.loadingPoints) {
      return 'Cargando puntos...';
    }
    
    if (this.userPoints === 0) {
      return 'No tienes puntos. ¡Compra entradas para ganar puntos!';
    }
    
    return `Tienes ${this.userPoints} puntos (equivalente a ${this.getPointsValueText()})`;
  }

  // 🆕 MÉTODOS AUXILIARES PARA NAVEGACIÓN

  /**
   * Verificar si la ruta actual es la página de recompensas
   */
  isRewardsActive(): boolean {
    return this.router.url === '/rewards';
  }

  /**
   * Verificar si la ruta actual es el perfil
   */
  isProfileActive(): boolean {
    return this.router.url === '/profile';
  }
goToPointsHistory(): void {
  this.router.navigate(['/points-history']);
}
showEarnPointsInfo(): void {
  // Mostrar modal de información de puntos
  const modalElement = document.getElementById('pointsInfoModal');
  if (modalElement) {
    const modal = new (window as any).bootstrap.Modal(modalElement);
    modal.show();
  }
}
shareReferralCode(): void {
  // Navegar directamente al historial de puntos donde está la gestión de referidos
  this.router.navigate(['/points-history']);
}
showPointsUsageInfo(): void {
  const modalElement = document.getElementById('pointsUsageModal');
  if (modalElement) {
    const modal = new (window as any).bootstrap.Modal(modalElement);
    modal.show();
  }
}
getUserPointsValue(): number {
  return this.userPoints / 1; // 1 punto = $1
}

getMaxPointsToUse(): number {
  // En el navbar simplemente retornar los puntos disponibles
  return this.userPoints;
}
  /**
   * Manejar clic en el badge de puntos
   */
  onPointsClick(): void {
    // Si ya está en la página de recompensas, ir al perfil, sino ir a recompensas
    if (this.isRewardsActive()) {
      this.goToProfile();
    } else {
      this.goToRewards();
    }
  }
}
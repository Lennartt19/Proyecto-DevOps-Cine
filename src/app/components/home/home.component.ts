// home.component.ts - ESTILO HBO MAX
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Pelicula, MovieService } from '../../services/movie.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  // Propiedades para recomendaciones
  recommendations: Pelicula[] = [];
  isLoadingRecommendations = true;
  showRecommendations = false;
  
  // Propiedades para películas destacadas
  featuredMovies: any[] = [
    {
      id: 1,
      titulo: "Avatar: El Camino del Agua",
      poster: "assets/movies/avatar.png",
      rating: 8.1,
      genero: "Aventura",
      anio: 2022,
      duracion: "3h 12min"
    },
    {
      id: 2,
      titulo: "Top Gun: Maverick",
      poster: "assets/movies/topgun.png", 
      rating: 8.3,
      genero: "Acción",
      anio: 2022,
      duracion: "2h 11min"
    },
    {
      id: 3,
      titulo: "Black Panther: Wakanda Forever",
      poster: "assets/movies/blackpanter2.png",
      rating: 7.8,
      genero: "Acción", 
      anio: 2022,
      duracion: "2h 41min"
    },
    {
      id: 4,
      titulo: "The Batman",
      poster: "assets/movies/batman.png",
      rating: 7.9,
      genero: "Acción",
      anio: 2022,
      duracion: "2h 56min"
    }
  ];

  // Géneros para la sección inferior
  genres = [
    {
      name: 'Acción',
      icon: 'fas fa-rocket fa-3x text-primary',
      description: 'Aventuras llenas de adrenalina'
    },
    {
      name: 'Romance',
      icon: 'fas fa-heart fa-3x text-danger',
      description: 'Historias de amor eternas'
    },
    {
      name: 'Comedia',
      icon: 'fas fa-laugh fa-3x text-warning',
      description: 'Diversión garantizada'
    },
    {
      name: 'Terror',
      icon: 'fas fa-ghost fa-3x text-secondary',
      description: 'Suspenso y emociones fuertes'
    },
    {
      name: 'Fantasía',
      icon: 'fas fa-magic fa-3x text-info',
      description: 'Mundos mágicos e imaginarios'
    },
    {
      name: 'Misterio',
      icon: 'fas fa-search fa-3x text-success',
      description: 'Enigmas por resolver'
    }
  ];
  
  private subscriptions: Subscription[] = [];
  
  constructor(
    private router: Router, 
    private movieService: MovieService,
    public authService: AuthService // 🔧 Hacer público para usar en template
  ) {
    console.log('🏠 Home component inicializado - Estilo HBO Max');
  }
  
  ngOnInit() {
    this.loadRecommendations();
    this.preloadImages();
  }
  
  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
  
  /**
   * Cargar recomendaciones personalizadas
   */
  loadRecommendations() {
    // Verificar si el usuario está autenticado
    if (!this.authService.isAuthenticated) {
      console.log('👤 Usuario no autenticado - mostrando hero estático');
      this.showRecommendations = false;
      this.isLoadingRecommendations = false;
      return;
    }
    
    console.log('🎯 Cargando recomendaciones estilo HBO Max...');
    this.isLoadingRecommendations = true;
    
    const recommendationsSub = this.movieService.getRecommendations().subscribe({
      next: (recommendations) => {
        this.recommendations = recommendations.slice(0, 5); // Máximo 5 para hero carousel
        this.showRecommendations = recommendations.length > 0;
        this.isLoadingRecommendations = false;
        
        console.log(`✅ ${this.recommendations.length} recomendaciones cargadas para hero carousel`);
        
        // Precargar imágenes de las recomendaciones
        this.preloadRecommendationImages();
      },
      error: (error) => {
        console.error('❌ Error cargando recomendaciones:', error);
        this.showRecommendations = false;
        this.isLoadingRecommendations = false;
      }
    });
    
    this.subscriptions.push(recommendationsSub);
  }

  /**
   * Precargar imágenes para transiciones suaves
   */
  preloadImages() {
    const imagesToPreload = [
      'assets/movies/destinofinal.png',
      ...this.featuredMovies.map(movie => movie.poster)
    ];

    imagesToPreload.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }

  /**
   * Precargar imágenes de recomendaciones
   */
  preloadRecommendationImages() {
    this.recommendations.forEach(pelicula => {
      const img = new Image();
      img.src = pelicula.poster;
    });
  }
  
  /**
   * Navegar a detalle de película
   */
  verPelicula(movieId: number) {
    this.router.navigate(['/movie', movieId]);
  }
  
  /**
   * Navegar a detalle de película recomendada
   */
  verPeliculaRecomendada(pelicula: Pelicula) {
    if (pelicula.id) {
      // Agregar al historial antes de navegar
      this.addToHistory(pelicula);
      this.router.navigate(['/movie', pelicula.id]);
    }
  }

  /**
   * Agregar película a la lista de deseos (placeholder)
   */
  addToWatchlist(pelicula: Pelicula) {
    console.log('➕ Agregando a lista de deseos:', pelicula.titulo);
    // TODO: Implementar lógica de watchlist
    // Mostrar toast de confirmación
    this.showToast(`"${pelicula.titulo}" agregada a tu lista`, 'success');
  }

  /**
   * Explorar películas por género
   */
  exploreGenre(genreName: string) {
    console.log('🎭 Explorando género:', genreName);
    this.router.navigate(['/movies'], { 
      queryParams: { genre: genreName } 
    });
  }

  /**
   * Agregar al historial de visualización
   */
  private addToHistory(pelicula: Pelicula) {
    // TODO: Implementar servicio de historial
    console.log('📚 Agregando al historial:', pelicula.titulo);
  }

  /**
   * Mostrar notificación toast
   */
  private showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    // TODO: Implementar servicio de toast
    console.log(`🍞 Toast ${type}:`, message);
  }
  
  /**
   * Obtener URL del trailer
   */
  getTrailerUrl(pelicula: Pelicula): string {
    return this.movieService.getTrailerUrl(pelicula);
  }
  
  /**
   * Formatear duración
   */
  formatDuration(duracion: string): string {
    return duracion || 'N/A';
  }
  
  /**
   * Scroll al inicio
   */
  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  
  /**
   * Recargar recomendaciones
   */
  refreshRecommendations() {
    this.loadRecommendations();
  }

  /**
   * Manejar error de carga de imagen
   */
  onImageError(event: any) {
    console.warn('❌ Error cargando imagen:', event.target.src);
    // Usar imagen placeholder
    event.target.src = 'assets/placeholder-movie.jpg';
  }

  /**
   * Pausar carrusel automático al hacer hover
   */
  pauseCarousel() {
    const carousel = document.getElementById('mainHeroCarousel');
    if (carousel) {
      const bsCarousel = (window as any).bootstrap?.Carousel?.getInstance(carousel);
      if (bsCarousel) {
        bsCarousel.pause();
      }
    }
  }

  /**
   * Reanudar carrusel automático
   */
  resumeCarousel() {
    const carousel = document.getElementById('mainHeroCarousel');
    if (carousel) {
      const bsCarousel = (window as any).bootstrap?.Carousel?.getInstance(carousel);
      if (bsCarousel) {
        bsCarousel.cycle();
      }
    }
  }
}
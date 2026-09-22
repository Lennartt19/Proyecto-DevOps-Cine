import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, Usuario } from '../../services/auth.service';
import { UserService, PeliculaFavorita } from '../../services/user.service';
import { MovieService } from '../../services/movie.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-favorites',
  standalone: false,
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.css']
})
export class FavoritesComponent implements OnInit {
  
  currentUser: Usuario | null = null;
  favoritas: PeliculaFavorita[] = [];
  loading: boolean = true;
  filtroGenero: string = 'todos';
  generos: string[] = ['todos'];
  
  // Para paginación
  itemsPorPagina: number = 8;
  paginaActual: number = 1;
  
  // Vista de tarjetas o lista
  vistaActual: 'grid' | 'list' = 'grid';

  constructor(
    public authService: AuthService,
    private userService: UserService,
    private movieService: MovieService,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadFavoritas();
  }

  loadFavoritas(): void {
  if (!this.currentUser) {
    this.loading = false;
    return;
  }

  this.loading = true;
  
  // 🔥 CAMBIO: NO pasar userId, solo usar getUserFavorites()
  this.userService.getUserFavorites().subscribe({
    next: (favoritas) => {
      this.favoritas = favoritas;
      this.extraerGeneros();
      this.loading = false;
      console.log('📡 Favoritas cargadas del usuario actual:', favoritas.length);
    },
    error: (error) => {
      console.error('❌ Error al cargar favoritas:', error);
      this.favoritas = [];
      this.loading = false;
      this.toastService.showError('Error al cargar favoritas');
    }
  });
}

  extraerGeneros(): void {
    const generos = [...new Set(this.favoritas.map(f => f.genero))];
    this.generos = ['todos', ...generos.sort()];
  }

  get favoritasFiltradas(): PeliculaFavorita[] {
    let filtradas = this.favoritas;
    
    if (this.filtroGenero !== 'todos') {
      filtradas = this.favoritas.filter(f => f.genero === this.filtroGenero);
    }
    
    return filtradas;
  }

  get favoritasPaginadas(): PeliculaFavorita[] {
    const filtradas = this.favoritasFiltradas;
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    return filtradas.slice(inicio, fin);
  }

  get totalPaginas(): number {
    return Math.ceil(this.favoritasFiltradas.length / this.itemsPorPagina);
  }

  removeFromFavorites(peliculaId: number): void {
  if (!this.currentUser) return;

  // 🔥 CAMBIO: NO pasar userId
  this.userService.removeFromFavorites(this.currentUser.id, peliculaId).subscribe({
    next: (success) => {
      if (success) {
        // Remover localmente después del éxito
        this.favoritas = this.favoritas.filter(f => f.peliculaId !== peliculaId);
        this.extraerGeneros();
        this.toastService.showSuccess('Película removida de favoritas');
        
        // Ajustar página si es necesario
        if (this.favoritasPaginadas.length === 0 && this.paginaActual > 1) {
          this.paginaActual--;
        }
      } else {
        this.toastService.showError('Error al remover de favoritas');
      }
    },
    error: (error) => {
      console.error('❌ Error al remover favorita:', error);
      this.toastService.showError('Error al remover de favoritas');
    }
  });
}
  verPelicula(peliculaId: number): void {
    // Agregar al historial
    if (this.currentUser) {
      const pelicula = this.favoritas.find(f => f.peliculaId === peliculaId);
      if (pelicula) {
        this.userService.addToHistory(this.currentUser.id, {
          peliculaId: pelicula.peliculaId,
          titulo: pelicula.titulo,
          poster: pelicula.poster,
          genero: pelicula.genero,
          anio: pelicula.anio,
          fechaVista: new Date().toISOString(),
          tipoAccion: 'vista'
        });
      }
    }
    
    this.router.navigate(['/movie', peliculaId]);
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
    }
  }

  cambiarVista(vista: 'grid' | 'list'): void {
    this.vistaActual = vista;
  }

  filtrarPorGenero(genero: string): void {
    this.filtroGenero = genero;
    this.paginaActual = 1; // Resetear a primera página
  }

 clearAllFavorites(): void {
  if (!this.currentUser) return;
  
  if (confirm('¿Estás seguro de que quieres eliminar todas tus películas favoritas?')) {
    // 🔥 CAMBIO: NO pasar userId
    this.userService.clearAllFavorites(this.currentUser.id).subscribe({
      next: (success) => {
        if (success) {
          this.favoritas = [];
          this.extraerGeneros();
          this.toastService.showSuccess('Todas las favoritas han sido eliminadas');
        } else {
          this.toastService.showError('Error al eliminar todas las favoritas');
        }
      },
      error: (error) => {
        console.error('❌ Error al limpiar favoritas:', error);
        this.toastService.showError('Error al eliminar todas las favoritas');
      }
    });
  }
}

  getTimeSinceFavorite(fechaAgregada: string): string {
    const fecha = new Date(fechaAgregada);
    const ahora = new Date();
    const diffMs = ahora.getTime() - fecha.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
    return `Hace ${Math.floor(diffDays / 30)} meses`;
  }
}
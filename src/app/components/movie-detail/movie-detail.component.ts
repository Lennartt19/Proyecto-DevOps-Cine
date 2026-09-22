import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MovieService, Pelicula } from '../../services/movie.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FunctionService } from '../../services/function.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-movie-detail',
  standalone: false,
  templateUrl: './movie-detail.component.html',
  styleUrl: './movie-detail.component.css'
})
export class MovieDetailComponent implements OnInit {
  pelicula: any = {};
  peliculaId: number = -1;
  mostrarModal: boolean = false;
  trailerUrl: SafeResourceUrl = '';
  
  // Estados de carga
  cargando = true;
  errorConexion = false;
  peliculaNoEncontrada = false;

  // 🆕 PROPIEDADES PARA ADMINISTRACIÓN DE FUNCIONES
  showFunctionAdmin: boolean = false;

  constructor(
    private functionService: FunctionService,
    private activatedRoute: ActivatedRoute, 
    private movieService: MovieService, // 🔧 Solo MovieService
    private router: Router,
    private sanitizer: DomSanitizer,
    public authService: AuthService,
    private toastService: ToastService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
  this.activatedRoute.params.subscribe(params => {
    this.peliculaId = +params['id'];
    console.log('ID de película recibido:', this.peliculaId);
    this.cargarPelicula();
    this.cargarConteoFunciones(); // 🆕 Cargar conteo al inicializar
  });
}
private cargarConteoFunciones(): void {
  if (!this.peliculaId || this.funcionesLoaded) return;
  
  this.functionService.getFunctionsByMovie(this.peliculaId).subscribe({
    next: (funciones) => {
      this.funcionesCount = funciones.length;
      this.funcionesLoaded = true;
      console.log(`📊 Funciones encontradas: ${this.funcionesCount}`);
    },
    error: (error) => {
      console.error('Error al obtener conteo de funciones:', error);
      this.funcionesCount = 0;
      this.funcionesLoaded = true;
    }
  });
}

  // 🔧 MÉTODO ACTUALIZADO: Usar solo MovieService
  cargarPelicula(): void {
  this.cargando = true;
  this.errorConexion = false;
  this.peliculaNoEncontrada = false;

  this.movieService.getPeliculaById(this.peliculaId).subscribe(
    (pelicula) => {
      if (pelicula) {
        console.log('✅ Película cargada:', pelicula.titulo);
        this.pelicula = pelicula;
        this.configurarTrailer();
        this.cargando = false;
        this.errorConexion = false;
        this.peliculaNoEncontrada = false;
        
        // 🆕 AGREGAR TRACKING AUTOMÁTICO
        this.trackMovieView();
        
      } else {
        console.log('⚠️ Película no encontrada');
        this.peliculaNoEncontrada = true;
        this.cargando = false;
         
        setTimeout(() => {
          this.router.navigate(['/movies']);
          this.toastService.showError('Película no encontrada');
        }, 3000);
      }
    },
    error => {
      console.error('❌ Error al cargar película:', error);
      this.errorConexion = true;
      this.cargando = false;
      this.toastService.showError('Error al cargar la película');
      
      setTimeout(() => {
        this.router.navigate(['/movies']);
      }, 3000);
    }
  );
}
irAAdminMovie(): void {
    if (this.validarAdmin()) {
      this.router.navigate(['/admin/movies']);
    }
  }
private validarAdmin(): boolean {
    if (!this.authService.isAdmin()) {
      this.toastService.showError('No tienes permisos para realizar esta acción');
      return false; 
    }
    return true;
  }
  // MÉTODO: Configurar URL del trailer
  private configurarTrailer(): void {
    if (this.pelicula && this.pelicula.trailer) {
      const url = `https://www.youtube.com/embed/${this.pelicula.trailer}`;
      this.trailerUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    } else {
      this.trailerUrl = '';
    }
  }

  // MÉTODO: Reintentar conexión
  reintentarConexion(): void {
    this.toastService.showInfo('Reintentando conexión...');
    this.cargarPelicula();
  }
  
  // ==================== MÉTODOS EXISTENTES ====================
  
  tieneTrailer(): boolean {
    return this.pelicula && this.pelicula.trailer;
  }

  comprarEntradas() {
  if (this.pelicula) {
    console.log('🎬 Navegando a compra de entradas para:', this.pelicula.titulo);
    
    // 🔧 CORRECCIÓN: Ir a ticket-purchase donde se eligen funciones
    // No ir directo al carrito, sino a la selección de funciones
    this.router.navigate(['/ticket-purchase', this.peliculaId]);
  }
}


  // 🆕 MÉTODOS ACTUALIZADOS PARA GESTIÓN DE FUNCIONES
  gestionarFunciones(): void {
    if (!this.authService.isAdmin()) {
      this.toastService.showError('No tienes permisos para realizar esta acción');
      return;
    }
    this.showFunctionAdmin = !this.showFunctionAdmin;
  }

  agregarFuncion(): void {
    if (!this.authService.isAdmin()) {
      this.toastService.showError('No tienes permisos para realizar esta acción');
      return;
    }
    this.showFunctionAdmin = true;
  }

  verTodasLasFunciones(): void {
    if (!this.authService.isAdmin()) {
      this.toastService.showError('No tienes permisos para realizar esta acción');
      return;
    }
    this.showFunctionAdmin = true;
  }
funcionesCount: number = 0;
funcionesLoaded: boolean = false;

  getFuncionesCount(): number {
  return this.funcionesCount;
}
refreshFuncionesCount(): void {
  this.funcionesLoaded = false;
  this.cargarConteoFunciones();
}

  verEstadisticas(): void {
    if (!this.authService.isAdmin()) {
      this.toastService.showError('No tienes permisos para realizar esta acción');
      return;
    }
    
    const stats = {
      vistas: Math.floor(Math.random() * 1000) + 100,
      favoritas: Math.floor(Math.random() * 200) + 10,
      funciones: this.getFuncionesCount(),
      rating: this.pelicula.rating
    };
    
    const mensaje = `Estadísticas de "${this.pelicula.titulo}":\n\n` +
                   `• Vistas: ${stats.vistas}\n` +
                   `• En favoritas: ${stats.favoritas} usuarios\n` +
                   `• Funciones programadas: ${stats.funciones}\n` +
                   `• Rating promedio: ${stats.rating}/10`;
    
    alert(mensaje);
    console.log('Estadísticas:', stats);
  }
  private trackMovieView(): void {
  const currentUser = this.authService.getCurrentUser();
  
  if (currentUser && this.pelicula) {
    const historialItem = {
      peliculaId: this.peliculaId,
      titulo: this.pelicula.titulo,
      poster: this.pelicula.poster,
      genero: this.pelicula.genero,
      anio: this.pelicula.anio,
      fechaVista: new Date().toISOString(),
      tipoAccion: 'vista' as const
    };

    this.userService.addToHistory(currentUser.id, historialItem).subscribe({
      next: (success) => {
        if (success) {
          console.log('✅ Vista registrada en historial:', this.pelicula.titulo);
        }
      },
      error: (error) => {
        console.error('❌ Error al registrar vista:', error);
      }
    });
  }
}
  // MÉTODOS PARA LA INTERFAZ
  getConnectionStatusClass(): string {
    if (this.cargando) return 'text-info';
    if (this.peliculaNoEncontrada || this.errorConexion) return 'text-danger';
    return 'text-success';
  }

  getConnectionStatusText(): string {
    if (this.cargando) return 'Cargando...';
    if (this.peliculaNoEncontrada) return 'Película no encontrada';
    if (this.errorConexion) return 'Error de conexión';
    return 'Conectado al servidor';
  }
}
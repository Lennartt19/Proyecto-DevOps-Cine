import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, Usuario } from '../../services/auth.service';
import { UserService, HistorialItem, HistoryOptions } from '../../services/user.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-history',
  standalone: false,
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.css']
})
export class HistoryComponent implements OnInit {
  
  currentUser: Usuario | null = null;
  historial: HistorialItem[] = [];
  loading: boolean = true;
  filtroTipo: string = 'todas';
  filtroFecha: string = 'todas';
  
  // Para paginación
  itemsPorPagina: number = 10;
  paginaActual: number = 1;
  totalItems: number = 0;
  hasMore: boolean = false;

  constructor(
    public authService: AuthService,
    private userService: UserService,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadHistorial();
  }

  /**
   * 🔥 ACTUALIZADO: Cargar historial desde API
   */
  loadHistorial(): void {
  if (!this.currentUser) {
    this.loading = false;
    return;
  }

  this.loading = true;
  
  // Construir opciones de filtro
  const options: HistoryOptions = {
    limit: this.itemsPorPagina,
    offset: (this.paginaActual - 1) * this.itemsPorPagina,
    tipoAccion: this.filtroTipo === 'todas' ? undefined : this.filtroTipo as 'vista' | 'comprada'
  };

  // Agregar filtros de fecha
  if (this.filtroFecha !== 'todas') {
    const { fechaDesde, fechaHasta } = this.getFechaRange(this.filtroFecha);
    options.fechaDesde = fechaDesde;
    options.fechaHasta = fechaHasta;
  }

  // 🔥 CAMBIO PRINCIPAL: NO pasar userId como primer parámetro
  this.userService.getUserHistory(options).subscribe({
    next: (historial) => {
      if (this.paginaActual === 1) {
        this.historial = historial;
      } else {
        this.historial = [...this.historial, ...historial];
      }
      
      this.hasMore = historial.length === this.itemsPorPagina;
      this.loading = false;
      
      console.log('📡 Historial cargado del usuario actual:', historial.length, 'items');
    },
    error: (error) => {
      console.error('❌ Error al cargar historial:', error);
      this.historial = [];
      this.loading = false;
      this.toastService.showError('Error al cargar historial');
    }
  });
}
  /**
   * 🆕 NUEVO: Obtener rango de fechas según filtro
   */
  private getFechaRange(filtro: string): { fechaDesde?: string; fechaHasta?: string } {
    const hoy = new Date();
    let fechaDesde: Date | undefined;

    switch (filtro) {
      case 'hoy':
        fechaDesde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        break;
      case 'semana':
        fechaDesde = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'mes':
        fechaDesde = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        return {};
    }

    return {
      fechaDesde: fechaDesde?.toISOString().split('T')[0],
      fechaHasta: hoy.toISOString().split('T')[0]
    };
  }

  /**
   * 🔥 ACTUALIZADO: Usar filtros con recarga desde API
   */
  get historialFiltrado(): HistorialItem[] {
    // Ya no necesitamos filtrar aquí porque la API hace el filtrado
    return this.historial;
  }

  get historialPaginado(): HistorialItem[] {
    // La paginación ya viene desde la API
    return this.historial;
  }

  get totalPaginas(): number {
    // Para scroll infinito, no necesitamos páginas específicas
    return this.hasMore ? this.paginaActual + 1 : this.paginaActual;
  }

  verPelicula(peliculaId: number): void {
    // 🔥 MEJORADO: Agregar al historial automáticamente
    if (this.currentUser) {
      const pelicula = this.historial.find(h => h.peliculaId === peliculaId);
      if (pelicula) {
        this.userService.addToHistory(this.currentUser.id, {
          peliculaId: pelicula.peliculaId,
          titulo: pelicula.titulo,
          poster: pelicula.poster,
          genero: pelicula.genero,
          anio: pelicula.anio,
          fechaVista: new Date().toISOString(),
          tipoAccion: 'vista'
        }).subscribe({
          next: (success) => {
            if (success) {
              console.log('✅ Película agregada al historial');
            }
          },
          error: (error) => {
            console.error('❌ Error al agregar al historial:', error);
          }
        });
      }
    }
    
    this.router.navigate(['/movie', peliculaId]);
  }

  /**
   * 🔥 ACTUALIZADO: Limpiar historial usando API
   */
 clearHistory(): void {
  if (!this.currentUser) return;
  
  if (confirm('¿Estás seguro de que quieres eliminar todo tu historial?')) {
    this.userService.clearHistory(this.currentUser.id).subscribe({
      next: (success) => {
        if (success) {
          this.historial = [];
          this.paginaActual = 1;
          this.hasMore = false;
          this.toastService.showSuccess('Historial eliminado correctamente');
        } else {
          this.toastService.showError('Error al eliminar el historial');
        }
      },
      error: (error) => {
        console.error('❌ Error al limpiar historial:', error);
        this.toastService.showError('Error al eliminar el historial');
      }
    });
  }
}

  /**
   * 🔥 ACTUALIZADO: Cambiar página (ahora recarga desde API)
   */
  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
      this.loadHistorial();
    }
  }

  /**
   * 🆕 NUEVO: Cargar más elementos (scroll infinito)
   */
  loadMore(): void {
    if (this.hasMore && !this.loading) {
      this.paginaActual++;
      this.loadHistorial();
    }
  }

  /**
   * 🔥 ACTUALIZADO: Filtrar por tipo (recarga desde API)
   */
  filtrarPorTipo(tipo: string): void {
    this.filtroTipo = tipo;
    this.paginaActual = 1;
    this.loadHistorial();
  }

  /**
   * 🔥 ACTUALIZADO: Filtrar por fecha (recarga desde API)
   */
  filtrarPorFecha(fecha: string): void {
    this.filtroFecha = fecha;
    this.paginaActual = 1;
    this.loadHistorial();
  }

  /**
   * 🆕 NUEVO: Método para refrescar datos
   */
  refreshData(): void {
    this.paginaActual = 1;
    this.historial = [];
    this.loadHistorial();
  }

  // ==================== MÉTODOS DE UTILIDAD ====================

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  getTimeAgo(fechaVista: string): string {
    const fecha = new Date(fechaVista);
    const ahora = new Date();
    const diffMs = ahora.getTime() - fecha.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 60) {
      return diffMinutes <= 1 ? 'Hace un momento' : `Hace ${diffMinutes} minutos`;
    } else if (diffHours < 24) {
      return diffHours === 1 ? 'Hace 1 hora' : `Hace ${diffHours} horas`;
    } else if (diffDays < 7) {
      return diffDays === 1 ? 'Ayer' : `Hace ${diffDays} días`;
    } else {
      return fecha.toLocaleDateString('es-ES');
    }
  }

  getTipoIcon(tipo: string): string {
    switch (tipo) {
      case 'vista': return 'fas fa-eye';
      case 'comprada': return 'fas fa-shopping-cart';
      default: return 'fas fa-film';
    }
  }

  getTipoColor(tipo: string): string {
    switch (tipo) {
      case 'vista': return 'text-info';
      case 'comprada': return 'text-success';
      default: return 'text-primary';
    }
  }

  getTipoText(tipo: string): string {
    switch (tipo) {
      case 'vista': return 'Vista';
      case 'comprada': return 'Comprada';
      default: return tipo;
    }
  }
}
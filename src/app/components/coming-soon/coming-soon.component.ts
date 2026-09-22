import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MovieService, ProximoEstreno } from '../../services/movie.service';
import { AuthService } from '../../services/auth.service';


@Component({
  selector: 'app-coming-soon',
  standalone: false,
  templateUrl: './coming-soon.component.html',
  styleUrls: ['./coming-soon.component.css']
})
export class ComingSoonComponent implements OnInit {
  
  estrenos: ProximoEstreno[] = [];
  estrenosPorMes: { [mes: string]: ProximoEstreno[] } = {};
  mesesOrdenados: string[] = [];

  constructor(
    private movieService: MovieService,
    private router: Router,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarEstrenos();
  }

  cargarEstrenos(): void {
    // 🔄 USAR MÉTODO HÍBRIDO API + FALLBACK LOCAL
    this.movieService.getProximosEstrenosHybrid().subscribe(
      estrenos => {
        this.estrenos = estrenos;
        this.organizarPorMes();
      },
      error => {
        console.error('Error cargando estrenos:', error);
        // Fallback a datos locales si falla
        this.estrenos = this.movieService.getProximosEstrenos();
        this.organizarPorMes();
      }
    );
  }

  organizarPorMes(): void {
    this.estrenosPorMes = {};
    
    this.estrenos.forEach(estreno => {
      const fecha = new Date(estreno.fechaEstreno);
      const mes = fecha.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      const mesCapitalizado = mes.charAt(0).toUpperCase() + mes.slice(1);
      
      if (!this.estrenosPorMes[mesCapitalizado]) {
        this.estrenosPorMes[mesCapitalizado] = [];
      }
      
      this.estrenosPorMes[mesCapitalizado].push(estreno);
    });
    
    // Ordenar los meses cronológicamente
    this.mesesOrdenados = Object.keys(this.estrenosPorMes).sort((a, b) => {
      const fechaA = new Date(this.estrenosPorMes[a][0].fechaEstreno);
      const fechaB = new Date(this.estrenosPorMes[b][0].fechaEstreno);
      return fechaA.getTime() - fechaB.getTime();
    });
  }

  irAAdminComingSoon(): void {
  if (!this.authService.isAdmin()) {
    return;
  }
  this.router.navigate(['/admin/coming-soon']);
}
  verDetalles(estreno: ProximoEstreno): void {
    // Navegar usando id o idx para compatibilidad
    const estrenoId = estreno.id || estreno.idx;
    this.router.navigate(['/coming-soon', estrenoId]);
  }

  formatearFecha(fecha: string): string {
    const fechaObj = new Date(fecha);
    return fechaObj.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  getDiasRestantes(fecha: string): number {
    const fechaEstreno = new Date(fecha);
    const hoy = new Date();
    const diferencia = fechaEstreno.getTime() - hoy.getTime();
    return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
  }

  getColorPorGenero(genero: string): string {
    const colores: { [key: string]: string } = {
      'Acción': 'danger',
      'Aventura': 'success',
      'Comedia': 'warning',
      'Drama': 'info',
      'Terror': 'dark',
      'Ciencia Ficción': 'primary',
      'Animación': 'success',
      'Romance': 'danger'
    };
    return colores[genero] || 'secondary';
  }
}

// 🚫 INTERFAZ ELIMINADA - AHORA SE USA LA DEL MovieService
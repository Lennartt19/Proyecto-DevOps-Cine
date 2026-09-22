import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MovieService, ProximoEstreno } from '../../services/movie.service'; // 🔧 USAR INTERFAZ DEL SERVICE
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-coming-soon-detail',
  standalone: false,
  templateUrl: './coming-soon-detail.component.html',
  styleUrls: ['./coming-soon-detail.component.css']
})
export class ComingSoonDetailComponent implements OnInit {
  
  estreno: ProximoEstreno | null = null;
  trailerUrl: SafeResourceUrl = '';
  showTrailer: boolean = true;
  diasRestantes: number = 0;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private movieService: MovieService,
    private sanitizer: DomSanitizer,
    public authService: AuthService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.cargarEstreno();
  }

  cargarEstreno(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    
    // 🔄 USAR MÉTODO HÍBRIDO API + FALLBACK LOCAL
    this.movieService.getProximoEstrenoByIdFromAPI(id).subscribe(
      estreno => {
        if (estreno) {
          this.estreno = estreno;
          
          // Sanitizar URL del trailer
          if (this.estreno.trailer) {
            this.trailerUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
              `https://www.youtube.com/embed/${this.estreno.trailer}?autoplay=0&rel=0`
            );
          }
          
          // Calcular días restantes
          this.calcularDiasRestantes();
        } else {
          console.warn('No se encontró el estreno con ID:', id);
          this.router.navigate(['/coming-soon']);
        }
      },
      error => {
        console.error('Error cargando estreno:', error);
        
        // 🔄 FALLBACK: Intentar con método local si falla API
        const estrenoLocal = this.movieService.getProximoEstreno(id);
        if (estrenoLocal) {
          this.estreno = estrenoLocal;
          
          if (this.estreno.trailer) {
            this.trailerUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
              `https://www.youtube.com/embed/${this.estreno.trailer}?autoplay=0&rel=0`
            );
          }
          
          this.calcularDiasRestantes();
        } else {
          this.router.navigate(['/coming-soon']);
        }
      }
    );
  }
  
    irAAdminEstreno(): void {
      if (this.validarAdmin()) {
        this.router.navigate(['/admin/coming-soon']);
      }
    }
  private validarAdmin(): boolean {
      if (!this.authService.isAdmin()) {
        this.toastService.showError('No tienes permisos para realizar esta acción');
        return false; 
      }
      return true;
    }

  calcularDiasRestantes(): void {
    if (this.estreno) {
      const fechaEstreno = new Date(this.estreno.fechaEstreno);
      const hoy = new Date();
      const diferencia = fechaEstreno.getTime() - hoy.getTime();
      this.diasRestantes = Math.ceil(diferencia / (1000 * 60 * 60 * 24));
    }
  }

  formatearFecha(fecha: string): string {
    const fechaObj = new Date(fecha);
    return fechaObj.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  agregarRecordatorio(): void {
    // Aquí podrías implementar funcionalidad para agregar a favoritos o enviar recordatorio
    alert(`¡Te recordaremos cuando "${this.estreno?.titulo}" esté disponible!`);
  } 

  compartir(): void {
    if (navigator.share && this.estreno) {
      navigator.share({
        title: this.estreno.titulo,
        text: `¡No te pierdas ${this.estreno.titulo} - Estreno ${this.formatearFecha(this.estreno.fechaEstreno)}!`,
        url: window.location.href
      });
    } else {
      // Fallback para navegadores que no soportan Web Share API
      alert('Función de compartir no disponible en este navegador');
    }
  }

  volver(): void {
    this.router.navigate(['/coming-soon']);
  }
}
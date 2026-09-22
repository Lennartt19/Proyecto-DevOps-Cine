// src/app/components/admin/admin-coming-soon/admin-coming-soon.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { MovieService, ProximoEstreno } from '../../../services/movie.service';
import { AdminService } from '../../../services/admin.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-admin-coming-soon',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule
  ],
  templateUrl: './admin-coming-soon.component.html',
  styleUrls: ['./admin-coming-soon.component.css']
})
export class AdminComingSoonComponent implements OnInit, OnDestroy {
  // ==================== DATOS PRINCIPALES ====================
  estrenos: ProximoEstreno[] = [];
  estrenosFiltrados: ProximoEstreno[] = [];
  
  // ==================== ESTADOS DE VISTA ====================
  vistaActual: 'lista' | 'agregar' | 'editar' = 'lista';
  cargando = true;
  procesando = false;
  
  // ==================== FORMULARIO DE ESTRENO ====================
  estrenoForm: Partial<ProximoEstreno> = {};
  estrenoEditandoIndex = -1;
  erroresValidacion: string[] = [];
  actoresTexto: string = '';
  
  // ==================== ESTADOS DE IMAGEN ====================
  imageLoaded = false;
  imageError = false;
  
  // ==================== FILTROS Y BÚSQUEDA ====================
  filtroGenero = '';
  filtroAnio = '';
  terminoBusqueda = '';
  
  // ==================== PAGINACIÓN ====================
  paginaActual = 1;
  estrenosPorPagina = 10;
  totalPaginas = 1;
  
  // ==================== MODAL DE CONFIRMACIÓN ====================
  mostrarModalConfirmacion = false;
  estrenoParaEliminar = -1;
  
  // ==================== ESTADÍSTICAS ====================
  estadisticas = {
    total: 0,
    porGenero: {} as { [key: string]: number },
    proximoEstreno: '',
    anioMasReciente: 0
  };
  
  // ==================== CONSTANTES ====================
  readonly generosDisponibles = [
    'Acción', 'Aventura', 'Comedia', 'Drama', 'Terror', 'Romance', 
    'Ciencia Ficción', 'Fantasía', 'Animación', 'Misterio'
  ];
  
  readonly estudiosDisponibles = [
    'Disney', 'Marvel Studios', 'Warner Bros', 'Universal Pictures',
    'Paramount Pictures', 'Sony Pictures', 'Lionsgate', 'Netflix',
    'Amazon Studios', 'Apple TV+', 'Blumhouse'
  ];

  // ==================== SUBSCRIPCIONES ====================
  private subscriptions = new Subscription();

  constructor(
    private movieService: MovieService,
    private adminService: AdminService,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  // ==================== LIFECYCLE HOOKS ====================

  ngOnInit(): void {
    if (!this.authService.isAdmin()) {
      this.toastService.showError('No tienes permisos para gestionar próximos estrenos');
      this.router.navigate(['/home']);
      return;
    }

    console.log('🧪 Probando conexión a API...');
    this.movieService.testComingSoonConnection();

    this.cargarEstrenos();
    
    this.subscriptions.add(
      this.route.queryParams.subscribe(params => {
        if (params['action'] === 'add') {
          this.mostrarFormularioAgregar();
        }
      })
    );

    window.addEventListener('adminDataRefresh', this.handleDataRefresh.bind(this));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    window.removeEventListener('adminDataRefresh', this.handleDataRefresh.bind(this));
  }

  // ==================== CARGA DE DATOS ====================

  cargarEstrenos(): void {
    this.cargando = true;
    
    this.movieService.getProximosEstrenosHybrid().subscribe(
      estrenos => {
        console.log('📡 Próximos estrenos cargados:', estrenos.length);
        this.estrenos = estrenos;
        
        this.aplicarFiltros();
        this.calcularEstadisticas();
        this.cargando = false;
        
        if (estrenos.length > 0) {
          this.toastService.showSuccess(`${estrenos.length} próximos estrenos cargados`);
        } else {
          this.toastService.showInfo('No hay próximos estrenos programados');
        }
      },
      error => {
        this.cargando = false;
        this.toastService.showError('Error al cargar próximos estrenos');
        console.error('Error cargando estrenos:', error);
      }
    );
  }

  private handleDataRefresh(event: any): void {
    if (event.detail.section === 'Gestión de Próximos Estrenos') {
      this.cargarEstrenos();
    }
  }

  // ==================== CRUD DE ESTRENOS ====================

  guardarEstreno(): void {
    const validacion = this.movieService.validateProximoEstrenoData(this.estrenoForm);
    
    if (!validacion.valid) {
      this.erroresValidacion = validacion.errors;
      this.toastService.showError('Por favor corrige los errores en el formulario');
      return;
    }

    this.procesando = true;
    this.erroresValidacion = [];
    
    this.actualizarActores();
    
    const esAgregar = this.vistaActual === 'agregar';
    
    if (esAgregar) {
      this.crearEstreno();
    } else {
      this.actualizarEstreno();
    }
  }

  private crearEstreno(): void {
    this.movieService.addProximoEstreno(this.estrenoForm as Omit<ProximoEstreno, 'id'>).subscribe(
      success => {
        this.procesando = false;
        
        if (success) {
          this.toastService.showSuccess('Próximo estreno agregado exitosamente');
          this.cargarEstrenos();
          this.vistaActual = 'lista';
        } else {
          this.toastService.showError('Error al agregar el próximo estreno');
        }
      },
      error => {
        this.procesando = false;
        this.toastService.showError('Error de conexión al agregar estreno');
        console.error('Error creando estreno:', error);
      }
    );
  }

  private actualizarEstreno(): void {
    const estrenoSeleccionado = this.estrenos[this.estrenoEditandoIndex];
    
    if (!estrenoSeleccionado) {
      this.toastService.showError('No se pudo identificar el estreno a actualizar');
      this.procesando = false;
      return;
    }

    const estrenoId = estrenoSeleccionado.id || estrenoSeleccionado.idx;
    
    if (!estrenoId || estrenoId === 0) {
      this.toastService.showError('Error: ID de estreno inválido');
      this.procesando = false;
      return;
    }
    
    this.movieService.updateProximoEstreno(estrenoId, this.estrenoForm).subscribe(
      success => {
        this.procesando = false;
        
        if (success) {
          this.toastService.showSuccess('Próximo estreno actualizado exitosamente');
          this.cargarEstrenos();
          this.vistaActual = 'lista';
        } else {
          this.toastService.showError('Error al actualizar el próximo estreno');
        }
      },
      error => {
        this.procesando = false;
        this.toastService.showError('Error de conexión al actualizar estreno');
        console.error('Error actualizando estreno:', error);
      }
    );
  }

  eliminarEstreno(): void {
    if (this.estrenoParaEliminar >= 0) {
      this.procesando = true;
      
      const estrenoSeleccionado = this.estrenos[this.estrenoParaEliminar];
      
      if (!estrenoSeleccionado) {
        this.toastService.showError('No se pudo identificar el estreno a eliminar');
        this.procesando = false;
        return;
      }

      const estrenoId = estrenoSeleccionado.id || estrenoSeleccionado.idx;
      
      if (!estrenoId || estrenoId === 0) {
        this.toastService.showError('Error: ID de estreno inválido');
        this.procesando = false;
        return;
      }
      
      this.movieService.deleteProximoEstreno(estrenoId).subscribe(
        success => {
          this.procesando = false;
          
          if (success) {
            this.toastService.showSuccess('Próximo estreno eliminado exitosamente');
            this.cargarEstrenos();
            this.cerrarModalConfirmacion();
          } else {
            this.toastService.showError('Error al eliminar el próximo estreno');
            this.cerrarModalConfirmacion();
          }
        },
        error => {
          this.procesando = false;
          this.toastService.showError('Error de conexión al eliminar estreno');
          this.cerrarModalConfirmacion();
          console.error('Error eliminando estreno:', error);
        }
      );
    }
  }

  // ==================== GESTIÓN DE VISTA ====================

  cambiarVista(vista: 'lista' | 'agregar' | 'editar'): void {
    this.vistaActual = vista;
    if (vista === 'lista') {
      this.resetearFormulario();
    }
  }

  mostrarFormularioAgregar(): void {
    this.resetearFormulario();
    this.vistaActual = 'agregar';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  mostrarFormularioEditar(estreno: ProximoEstreno): void {
    const indiceReal = this.estrenos.findIndex(e => 
      e.titulo === estreno.titulo && e.director === estreno.director
    );
    
    if (indiceReal !== -1) {
      this.estrenoForm = { 
        ...estreno,
        fechaEstreno: this.formatDateForInput(estreno.fechaEstreno)
      };
      
      this.actoresTexto = estreno.actores ? estreno.actores.join(', ') : '';
      
      this.estrenoEditandoIndex = indiceReal;
      this.vistaActual = 'editar';
      this.erroresValidacion = [];
      this.imageError = false;
      this.imageLoaded = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      this.toastService.showError('No se pudo encontrar el estreno para editar');
    }
  }

  confirmarEliminarEstreno(estreno: ProximoEstreno): void {
    const indiceReal = this.estrenos.findIndex(e => 
      e.titulo === estreno.titulo && e.director === estreno.director
    );
    
    if (indiceReal !== -1) {
      this.estrenoParaEliminar = indiceReal;
      this.mostrarModalConfirmacion = true;
    } else {
      this.toastService.showError('No se pudo encontrar el estreno para eliminar');
    }
  }

  cerrarModalConfirmacion(): void {
    this.mostrarModalConfirmacion = false;
    this.estrenoParaEliminar = -1;
  }

  verEstreno(estreno: ProximoEstreno): void {
    const estrenoId = estreno.id || estreno.idx;
    
    if (estrenoId) {
      this.router.navigate(['/coming-soon', estrenoId]);
    } else {
      this.toastService.showError('No se pudo encontrar el estreno');
    }
  }

  // ==================== FILTROS Y BÚSQUEDA ====================

  aplicarFiltros(): void {
    this.estrenosFiltrados = this.estrenos.filter(estreno => {
      const cumpleBusqueda = this.cumpleFiltroTexto(estreno);
      const cumpleGenero = !this.filtroGenero || estreno.genero === this.filtroGenero;
      const cumpleAnio = !this.filtroAnio || this.getAnioFromFecha(estreno.fechaEstreno) === parseInt(this.filtroAnio);
      
      return cumpleBusqueda && cumpleGenero && cumpleAnio;
    });
    this.calcularPaginacion();
  }

  private cumpleFiltroTexto(estreno: ProximoEstreno): boolean {
    if (!this.terminoBusqueda.trim()) return true;
    
    const termino = this.terminoBusqueda.toLowerCase();
    return [estreno.titulo, estreno.director, estreno.sinopsis]
      .some(campo => campo?.toLowerCase().includes(termino));
  }

  limpiarFiltros(): void {
    Object.assign(this, {
      terminoBusqueda: '',
      filtroGenero: '',
      filtroAnio: '',
      paginaActual: 1
    });
    
    this.aplicarFiltros();
    this.toastService.showInfo('Filtros limpiados');
  }

  hasActiveFilters(): boolean {
    return !!(this.terminoBusqueda || this.filtroGenero || this.filtroAnio);
  }

  // ==================== PAGINACIÓN ====================

  calcularPaginacion(): void {
    this.totalPaginas = Math.ceil(this.estrenosFiltrados.length / this.estrenosPorPagina);
    this.paginaActual = Math.min(this.paginaActual, Math.max(1, this.totalPaginas));
  }

  getEstrenosPaginaActual(): ProximoEstreno[] {
    const inicio = (this.paginaActual - 1) * this.estrenosPorPagina;
    return this.estrenosFiltrados.slice(inicio, inicio + this.estrenosPorPagina);
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
    }
  }

  getPaginasArray(): number[] {
    const inicio = Math.max(1, this.paginaActual - 2);
    const fin = Math.min(this.totalPaginas, this.paginaActual + 2);
    return Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);
  }

  // ==================== ESTADÍSTICAS ====================

  calcularEstadisticas(): void {
    const stats = this.estrenos.reduce((acc, estreno) => {
      acc.total++;
      const anio = this.getAnioFromFecha(estreno.fechaEstreno);
      acc.anioMasReciente = Math.max(acc.anioMasReciente, anio);
      acc.porGenero[estreno.genero] = (acc.porGenero[estreno.genero] || 0) + 1;
      return acc;
    }, {
      total: 0,
      anioMasReciente: 0,
      porGenero: {} as { [key: string]: number }
    });

    this.estadisticas = {
      total: stats.total,
      porGenero: stats.porGenero,
      proximoEstreno: this.getProximoEstreno(),
      anioMasReciente: stats.anioMasReciente
    };
  }

  getStatsArray() {
    return [
      { 
        value: this.estadisticas.total, 
        label: 'Total Estrenos', 
        bgClass: 'bg-primary text-white', 
        icon: 'fas fa-calendar-star'
      },
      { 
        value: this.getCantidadGeneros(), 
        label: 'Géneros Diferentes', 
        bgClass: 'bg-success text-white', 
        icon: 'fas fa-tags' 
      },
      { 
        value: this.getEstrenosProximoMes(), 
        label: 'Próximo Mes', 
        bgClass: 'bg-info text-white', 
        icon: 'fas fa-clock' 
      },
      { 
        value: this.estadisticas.anioMasReciente, 
        label: 'Año Más Lejano', 
        bgClass: 'bg-warning text-dark', 
        icon: 'fas fa-calendar' 
      }
    ];
  }

  // ==================== GESTIÓN DE FORMULARIO ====================

  resetearFormulario(): void {
    this.estrenoForm = {
      titulo: '',
      sinopsis: '',
      poster: '',
      fechaEstreno: '',
      estudio: '',
      genero: '',
      director: '',
      trailer: '',
      duracion: '',
      actores: []
    };
    this.actoresTexto = '';
    this.estrenoEditandoIndex = -1;
    this.erroresValidacion = [];
    this.imageError = false;
    this.imageLoaded = false;
  }

  actualizarActores(): void {
    if (this.actoresTexto.trim()) {
      this.estrenoForm.actores = this.actoresTexto.split(',').map(actor => actor.trim()).filter(actor => actor.length > 0);
    } else {
      this.estrenoForm.actores = [];
    }
  }

  // ==================== MÉTODOS DE INTERFAZ ====================

  getTableColumns() {
    return [
      { name: 'Estreno', width: '300' },
      { name: 'Género', width: '120' },
      { name: 'Fecha Estreno', width: '120' },
      { name: 'Director', width: '150' },
      { name: 'Estado', width: '100' },
      { name: 'Acciones', width: '150' }
    ];
  }

  getActions(estreno: ProximoEstreno) {
    return [
      { 
        icon: 'fas fa-eye', 
        class: 'btn-outline-info', 
        title: 'Ver detalles', 
        action: () => this.verEstreno(estreno) 
      },
      { 
        icon: 'fas fa-edit', 
        class: 'btn-outline-primary', 
        title: 'Editar estreno', 
        action: () => this.mostrarFormularioEditar(estreno) 
      },
      { 
        icon: 'fas fa-trash', 
        class: 'btn-outline-danger', 
        title: 'Eliminar estreno', 
        action: () => this.confirmarEliminarEstreno(estreno) 
      }
    ];
  }

  trackEstrenoFn(index: number, estreno: ProximoEstreno): string {
    return estreno.titulo + estreno.director;
  }

  // ==================== MANEJO DE IMÁGENES ====================

  onImageErrorTable(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'https://via.placeholder.com/300x450/cccccc/666666?text=Sin+Imagen';
    }
  }

  onImageError(event: Event): void {
    this.imageError = true;
    this.imageLoaded = false;
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'https://via.placeholder.com/300x450/cccccc/666666?text=Sin+Imagen';
    }
  }

  onImageLoad(event: Event): void {
    this.imageError = false;
    this.imageLoaded = true;
  }

  setExamplePoster(url: string): void {
    this.estrenoForm.poster = url;
    this.imageError = false;
    this.imageLoaded = false;
  }

  getPosterExamples() {
    return [
      { url: 'assets/coming-soon/ejemplo.png', label: 'Assets', icon: 'fas fa-folder' },
      { url: 'https://via.placeholder.com/300x450/28a745/ffffff?text=Próximo+Estreno', label: 'URL Externa', icon: 'fas fa-globe' }
    ];
  }

  // ==================== UTILIDADES DE FECHAS Y DATOS ====================

  getAniosDisponibles(): number[] {
    const anios = [...new Set(this.estrenos.map(e => this.getAnioFromFecha(e.fechaEstreno)))];
    return anios.sort((a, b) => a - b);
  }

  getAnioFromFecha(fecha: string): number {
    return new Date(fecha).getFullYear();
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES');
  }

  formatDateForInput(dateString: string): string {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  }

  getCantidadGeneros(): number {
    return Object.keys(this.estadisticas.porGenero).length;
  }

  getEstrenosProximoMes(): number {
    const hoy = new Date();
    const proximoMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, hoy.getDate());
    
    return this.estrenos.filter(e => {
      const fechaEstreno = new Date(e.fechaEstreno);
      return fechaEstreno >= hoy && fechaEstreno <= proximoMes;
    }).length;
  }

  getProximoEstreno(): string {
    const hoy = new Date();
    const proximosEstrenos = this.estrenos
      .filter(e => new Date(e.fechaEstreno) >= hoy)
      .sort((a, b) => new Date(a.fechaEstreno).getTime() - new Date(b.fechaEstreno).getTime());
    
    return proximosEstrenos.length > 0 ? proximosEstrenos[0].titulo : 'Ninguno';
  }

  getGeneroColor(genero: string): string {
    const colores: Record<string, string> = {
      'Acción': 'danger',
      'Aventura': 'warning',
      'Comedia': 'success',
      'Drama': 'primary',
      'Terror': 'dark',
      'Romance': 'info',
      'Ciencia Ficción': 'secondary',
      'Fantasía': 'purple',
      'Animación': 'orange',
      'Misterio': 'indigo'
    };
    return colores[genero] || 'primary';
  }

  getRangoElementos(): string {
    if (!this.estrenosFiltrados.length) return '0-0 de 0';
    
    const inicio = (this.paginaActual - 1) * this.estrenosPorPagina + 1;
    const fin = Math.min(this.paginaActual * this.estrenosPorPagina, this.estrenosFiltrados.length);
    
    return `${inicio}-${fin} de ${this.estrenosFiltrados.length}`;
  }

  // ==================== EXPORTACIÓN PDF ====================

  exportarEstrenos(): void {
    this.procesando = true;
    this.toastService.showInfo('Generando exportación de próximos estrenos en PDF...');

    setTimeout(() => {
      try {
        const doc = new jsPDF();
        
        this.setupPDFHeader(doc, 'EXPORTACIÓN DE PRÓXIMOS ESTRENOS', 
          `Lista de próximos estrenos - ${this.estrenosFiltrados.length} estrenos`);
        
        let currentY = 110;
        
        if (this.hasActiveFilters()) {
          doc.setFillColor(240, 240, 240);
          doc.rect(20, currentY - 5, 170, 15, 'F');
          doc.setFontSize(12);
          doc.setTextColor(52, 73, 94);
          doc.text('FILTROS APLICADOS', 25, currentY + 5);
          currentY += 20;
          
          const filtros = [];
          if (this.terminoBusqueda) filtros.push(`Búsqueda: "${this.terminoBusqueda}"`);
          if (this.filtroGenero) filtros.push(`Género: ${this.filtroGenero}`);
          if (this.filtroAnio) filtros.push(`Año: ${this.filtroAnio}`);
          
          doc.setFontSize(10);
          doc.setTextColor(100, 100, 100);
          filtros.forEach(filtro => {
            doc.text(`• ${filtro}`, 25, currentY);
            currentY += 8;
          });
          currentY += 10;
        }
        
        const estrenosData = this.estrenosFiltrados.map((estreno, index) => [
          (index + 1).toString(),
          estreno.titulo.length > 25 ? estreno.titulo.substring(0, 25) + '...' : estreno.titulo,
          estreno.director.length > 20 ? estreno.director.substring(0, 20) + '...' : estreno.director,
          estreno.genero, 
          this.formatearFecha(estreno.fechaEstreno),
          estreno.estudio || 'N/A',
          estreno.duracion || 'N/A'
        ]);
        
        autoTable(doc, {
          head: [['#', 'Título', 'Director', 'Género', 'Fecha Estreno', 'Estudio', 'Duración']],
          body: estrenosData,
          startY: currentY,
          theme: 'striped',
          headStyles: { 
            fillColor: [40, 167, 69],
            textColor: [255, 255, 255],
            fontSize: 10,
            fontStyle: 'bold'
          },
          styles: { 
            fontSize: 8,
            cellPadding: { top: 3, right: 4, bottom: 3, left: 4 }
          },
          columnStyles: {
            0: { cellWidth: 15, halign: 'center' },
            1: { cellWidth: 40 },
            2: { cellWidth: 30 },
            3: { cellWidth: 25 },
            4: { cellWidth: 25, halign: 'center' },
            5: { cellWidth: 30 },
            6: { cellWidth: 20, halign: 'center' }
          },
          alternateRowStyles: { fillColor: [248, 249, 250] }
        });
        
        this.setupPDFFooter(doc, 'Próximos Estrenos');
        doc.save(`proximos-estrenos-export-${new Date().toISOString().split('T')[0]}.pdf`);
        
        this.procesando = false;
        this.toastService.showSuccess('Exportación de próximos estrenos completada en PDF');
        
      } catch (error) {
        console.error('Error generando exportación:', error);
        this.procesando = false;
        this.toastService.showError('Error al generar la exportación PDF');
      }
    }, 1000);
  }

  private setupPDFHeader(doc: jsPDF, titulo: string, subtitulo?: string): void {
    doc.setFillColor(40, 167, 69);
    doc.rect(0, 0, 210, 45, 'F');
    
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text('ParkyFilms', 20, 25);
    
    doc.setFontSize(12);
    doc.text('Próximos Estrenos', 20, 35);
    
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text(titulo, 20, 60);
    
    if (subtitulo) {
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(subtitulo, 20, 72);
    }
    
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    const fechaGeneracion = new Date().toLocaleString('es-ES');
    doc.text(`Generado el: ${fechaGeneracion}`, 20, 85);
    doc.text(`Por: ${this.authService.getCurrentUser()?.nombre || 'Admin'}`, 20, 95);
    
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(20, 100, 190, 100);
  }

  private setupPDFFooter(doc: jsPDF, seccion: string): void {
    const pageCount = (doc as any).internal.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      doc.setDrawColor(40, 167, 69);
      doc.setLineWidth(1);
      doc.line(20, 275, 190, 275);
      
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`ParkyFilms - ${seccion}`, 20, 282);
      doc.text('Documento Confidencial - Solo uso interno', 20, 287);
      
      doc.setTextColor(40, 167, 69);
      doc.text(`Página ${i} de ${pageCount}`, 150, 282);
      
      const timestamp = new Date().toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      doc.text(`Hora: ${timestamp}`, 150, 287);
    }
  }
}
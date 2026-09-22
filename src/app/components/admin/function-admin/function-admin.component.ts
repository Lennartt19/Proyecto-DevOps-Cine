import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FunctionService, FuncionCine, CreateFunctionData } from '../../../services/function.service';
import { MovieService, Pelicula } from '../../../services/movie.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-function-admin',
  standalone: false,
  templateUrl: './function-admin.component.html',
  styleUrls: ['./function-admin.component.css']
})
export class FunctionAdminComponent implements OnInit {

  @Input() peliculaId: number | null = null; // Si se usa desde movie-detail
  @Output() funcionesChanged = new EventEmitter<void>(); // 🆕 EVENTO PARA NOTIFICAR CAMBIOS
  
  // Formularios
  functionForm!: FormGroup;
  
  // Datos
  peliculas: Pelicula[] = [];
  funciones: FuncionCine[] = [];
  funcionesFiltradas: FuncionCine[] = [];
  
  // Estados
  loading: boolean = false;
  submitting: boolean = false;
  showForm: boolean = false;
  editMode: boolean = false;
  funcionEditando: FuncionCine | null = null;
  
  // Filtros
  filtroFecha: string = '';
  filtroSala: string = '';
  salas: string[] = ['Sala 1', 'Sala 2', 'Sala 3', 'Sala VIP', 'Sala IMAX', 'Sala Premium'];
  formatos: string[] = ['2D', '3D', 'IMAX', '4DX', 'ScreenX'];

  constructor(
    private fb: FormBuilder,
    private functionService: FunctionService,
    private movieService: MovieService,
    private authService: AuthService,
    private toastService: ToastService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    // Verificar permisos de admin
    if (!this.authService.isAdmin()) {
      this.toastService.showError('No tienes permisos para gestionar funciones');
      return;
    }

    this.loadData();
  }

  // ==================== INICIALIZACIÓN ====================

  private initForm(): void {
    this.functionForm = this.fb.group({
      peliculaId: [this.peliculaId || '', [Validators.required]],
      fecha: ['', [Validators.required]],
      hora: ['', [Validators.required]],
      sala: ['', [Validators.required]],
      precio: ['', [Validators.required, Validators.min(0)]],
      formato: ['2D', [Validators.required]],
      asientosDisponibles: [50, [Validators.required, Validators.min(1), Validators.max(100)]]
    });

    // Si hay peliculaId, deshabilitar ese campo
    if (this.peliculaId) {
      this.functionForm.get('peliculaId')?.disable();
    }
  }

  private loadData(): void {
    this.loading = true;
    
    // Cargar películas
    this.movieService.getPeliculas().subscribe({
      next: (peliculas) => {
        this.peliculas = peliculas;
        this.loading = false;
        
        // Cargar funciones
        this.loadFunctions();
      },
      error: (error) => {
        console.error('❌ Error al cargar películas:', error);
        this.toastService.showError('Error al cargar películas');
        this.loading = false;
      }
    });
  }

  private loadFunctions(): void {
    if (this.peliculaId) {
      // Cargar solo funciones de esta película
      this.functionService.getFunctionsByMovie(this.peliculaId).subscribe({
        next: (funciones) => {
          this.funciones = funciones;
          this.aplicarFiltros();
        },
        error: (error) => {
          console.error('❌ Error al cargar funciones:', error);
          this.toastService.showError('Error al cargar funciones');
        }
      });
    } else {
      // Cargar todas las funciones
      this.functionService.getAllFunctions().subscribe({
        next: (funciones) => {
          this.funciones = funciones;
          this.aplicarFiltros();
        },
        error: (error) => {
          console.error('❌ Error al cargar funciones:', error);
          this.toastService.showError('Error al cargar funciones');
        }
      });
    }
  }

  // ==================== GESTIÓN DE FUNCIONES ====================

  showCreateForm(): void {
    this.editMode = false;
    this.funcionEditando = null;
    this.showForm = true;
    this.functionForm.reset({
      peliculaId: this.peliculaId || '',
      formato: '2D',
      asientosDisponibles: 50
    });

    if (this.peliculaId) {
      this.functionForm.get('peliculaId')?.setValue(this.peliculaId);
      this.functionForm.get('peliculaId')?.disable();
    }
  }

  editFunction(funcion: FuncionCine): void {
    this.editMode = true;
    this.funcionEditando = funcion;
    this.showForm = true;
    
    this.functionForm.patchValue({
      peliculaId: funcion.peliculaId,
      fecha: funcion.fecha,
      hora: funcion.hora,
      sala: funcion.sala,
      precio: funcion.precio,
      formato: funcion.formato,
      asientosDisponibles: funcion.asientosDisponibles
    });

    if (this.peliculaId) {
      this.functionForm.get('peliculaId')?.disable();
    }
  }

  cancelForm(): void {
    this.showForm = false;
    this.editMode = false;
    this.funcionEditando = null;
    this.functionForm.reset();
  }

  onSubmit(): void {
    if (this.functionForm.invalid) {
      this.markFormGroupTouched(this.functionForm);
      return;
    }

    this.submitting = true;
    
    const formData = this.functionForm.getRawValue(); // getRawValue incluye campos disabled
    const funcionData: CreateFunctionData = {
      peliculaId: formData.peliculaId,
      fecha: formData.fecha,
      hora: formData.hora,
      sala: formData.sala,
      precio: parseFloat(formData.precio),
      formato: formData.formato,
      asientosDisponibles: parseInt(formData.asientosDisponibles)
    };

    if (this.editMode && this.funcionEditando) {
      // Actualizar función existente
      this.functionService.updateFunction(this.funcionEditando.id, funcionData).subscribe({
        next: (success) => {
          this.submitting = false;
          if (success) {
            this.toastService.showSuccess('Función actualizada exitosamente');
            this.cancelForm();
            this.loadFunctions();
            this.funcionesChanged.emit(); // 🆕 EMITIR EVENTO DE CAMBIO
          } else {
            this.toastService.showError('Error al actualizar la función');
          }
        },
        error: (error) => {
          this.submitting = false;
          console.error('❌ Error al actualizar función:', error);
          this.toastService.showError('Error al actualizar la función');
        }
      });
    } else {
      // Crear nueva función
      this.functionService.createFunction(funcionData).subscribe({
        next: (success) => {
          this.submitting = false;
          if (success) {
            this.toastService.showSuccess('Función creada exitosamente');
            this.cancelForm();
            this.loadFunctions();
            this.funcionesChanged.emit(); // 🆕 EMITIR EVENTO DE CAMBIO
          } else {
            this.toastService.showError('Error al crear la función');
          }
        },
        error: (error) => {
          this.submitting = false;
          console.error('❌ Error al crear función:', error);
          this.toastService.showError('Error al crear la función');
        }
      });
    }
  }

  deleteFunction(funcion: FuncionCine): void {
    const confirmMsg = `¿Estás seguro de eliminar la función de ${funcion.pelicula?.titulo || 'esta película'} ` +
                      `el ${this.formatDate(funcion.fecha)} a las ${funcion.hora} en ${funcion.sala}?`;
    
    if (confirm(confirmMsg)) {
      this.functionService.deleteFunction(funcion.id).subscribe({
        next: (success) => {
          if (success) {
            this.toastService.showSuccess('Función eliminada exitosamente');
            this.loadFunctions();
            this.funcionesChanged.emit(); // 🆕 EMITIR EVENTO DE CAMBIO
          } else {
            this.toastService.showError('Error al eliminar la función');
          }
        },
        error: (error) => {
          console.error('❌ Error al eliminar función:', error);
          this.toastService.showError('Error al eliminar la función');
        }
      });
    }
  }

  // ==================== FILTROS ====================

  aplicarFiltros(): void {
    let filtradas = [...this.funciones];

    // Filtro por fecha
    if (this.filtroFecha) {
      filtradas = filtradas.filter(f => f.fecha === this.filtroFecha);
    }

    // Filtro por sala
    if (this.filtroSala) {
      filtradas = filtradas.filter(f => f.sala === this.filtroSala);
    }

    // Ordenar por fecha y hora
    filtradas.sort((a, b) => {
      const fechaA = new Date(`${a.fecha}T${a.hora}`);
      const fechaB = new Date(`${b.fecha}T${b.hora}`);
      return fechaA.getTime() - fechaB.getTime();
    });

    this.funcionesFiltradas = filtradas;
  }

  clearFilters(): void {
    this.filtroFecha = '';
    this.filtroSala = '';
    this.aplicarFiltros();
  }

  // ==================== UTILIDADES ====================

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.functionForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  getFieldError(fieldName: string): string {
    const field = this.functionForm.get(fieldName);
    if (field?.errors && (field.dirty || field.touched)) {
      if (field.errors['required']) return `${fieldName} es requerido`;
      if (field.errors['min']) return `${fieldName} debe ser mayor a ${field.errors['min'].min}`;
      if (field.errors['max']) return `${fieldName} debe ser menor a ${field.errors['max'].max}`;
    }
    return '';
  }

  getPeliculaTitulo(peliculaId: number): string {
    const pelicula = this.peliculas.find(p => p.id === peliculaId);
    return pelicula?.titulo || 'Película no encontrada';
  }

  formatDate(fecha: string): string {
    return this.functionService.formatDateForDisplay(fecha);
  }

  formatPrice(precio: number): string {
    return this.functionService.formatPrice(precio);
  }

  isPastFunction(funcion: FuncionCine): boolean {
    return this.functionService.isPastFunction(funcion);
  }

  getMinDate(): string {
    return new Date().toISOString().split('T')[0]; // Fecha de hoy en formato YYYY-MM-DD
  }

  getFechasDisponibles(): string[] {
    return [...new Set(this.funciones.map(f => f.fecha))].sort();
  }

  getSalasUsadas(): string[] {
    return [...new Set(this.funciones.map(f => f.sala))].sort();
  }

  // ==================== ESTADÍSTICAS ====================

  getTotalFunciones(): number {
    return this.funcionesFiltradas.length;
  }

  getFuncionesPorSala(): { [sala: string]: number } {
    return this.funcionesFiltradas.reduce((acc, funcion) => {
      acc[funcion.sala] = (acc[funcion.sala] || 0) + 1;
      return acc;
    }, {} as { [sala: string]: number });
  }

  getPromedioAsientos(): number {
    if (this.funcionesFiltradas.length === 0) return 0;
    const total = this.funcionesFiltradas.reduce((sum, f) => sum + f.asientosDisponibles, 0);
    return Math.round(total / this.funcionesFiltradas.length);
  }

  trackFunction(index: number, funcion: FuncionCine): string {
    return funcion.id;
  }
}
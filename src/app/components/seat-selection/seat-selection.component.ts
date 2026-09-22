// seat-selection.component.ts - CORRECCIÓN DE PRECIOS VIP

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MovieService, Pelicula } from '../../services/movie.service';
import { FunctionService, FuncionCine } from '../../services/function.service';
import { CartService } from '../../services/cart.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';

// Interface actualizada para asientos (coincide con la BD)
interface Seat {
  id: number;
  fila: string;
  numero: number;
  es_vip: boolean;
  esta_ocupado: boolean;
  esta_deshabilitado: boolean;
  precio: string; // Viene como string de la BD
  seat_id: string;
  
  // Propiedades para el frontend
  isSelected?: boolean;
  isDisabled?: boolean;
}

@Component({
  selector: 'app-seat-selection',
  standalone: false,
  templateUrl: './seat-selection.component.html',
  styleUrls: ['./seat-selection.component.css']
})
export class SeatSelectionComponent implements OnInit {
  pelicula: Pelicula | null = null;
  peliculaId: number = -1;
  funcion: FuncionCine | null = null;
  funcionId: string = '';
  cantidad: number = 1;
  
  seats: Seat[] = [];
  selectedSeats: Seat[] = [];
  
  // Estados de carga
  cargando: boolean = true;
  errorConexion: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private movieService: MovieService,
    private functionService: FunctionService,
    private cartService: CartService,
    private toastService: ToastService,
    public authService: AuthService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;
    this.errorConexion = false;

    // Obtener parámetros de la ruta
    this.peliculaId = Number(this.route.snapshot.paramMap.get('movieId'));
    this.funcionId = this.route.snapshot.paramMap.get('funcionId') || '';
    this.cantidad = Number(this.route.snapshot.paramMap.get('cantidad')) || 1;

    console.log('🎬 Parámetros recibidos:', {
      peliculaId: this.peliculaId,
      funcionId: this.funcionId,
      cantidad: this.cantidad
    });

    if (!this.peliculaId || !this.funcionId) {
      this.toastService.showError('Parámetros inválidos');
      this.router.navigate(['/movies']);
      return;
    }

    // Cargar película desde API
    this.movieService.getPeliculaById(this.peliculaId).subscribe({
      next: (pelicula) => {
        if (pelicula) {
          this.pelicula = pelicula;
          console.log('✅ Película cargada:', pelicula.titulo);
          this.cargarFuncion();
        } else {
          console.error('Película no encontrada');
          this.toastService.showError('Película no encontrada');
          this.router.navigate(['/movies']);
        }
      },
      error: (error) => {
        console.error('❌ Error al cargar película:', error);
        this.errorConexion = true;
        this.cargando = false;
        this.toastService.showError('Error al cargar la película');
      }
    });
  }

  private cargarFuncion(): void {
    this.functionService.getFunctionById(this.funcionId).subscribe({
      next: (funcion) => {
        if (funcion) {
          this.funcion = funcion;
          console.log('✅ Función cargada:', funcion);
          this.cargarAsientosReales();
        } else {
          console.error('Función no encontrada');
          this.toastService.showError('Función no encontrada');
          this.router.navigate(['/ticket-purchase', this.peliculaId]);
        }
      },
      error: (error) => {
        console.error('❌ Error al cargar función:', error);
        this.errorConexion = true;
        this.cargando = false;
        this.toastService.showError('Error al cargar la función');
      }
    });
  }

  private cargarAsientosReales(): void {
    console.log('🪑 Cargando asientos reales para función:', this.funcionId);
    
    this.functionService.getSeatsForFunction(this.funcionId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Mapear asientos de la BD al formato del frontend
          this.seats = response.data.map((seat: any) => ({
            ...seat,
            isSelected: false,
            isDisabled: seat.esta_deshabilitado || false
          }));
          
          console.log(`✅ ${this.seats.length} asientos cargados desde la BD`);
          console.log('💰 Precios de asientos:', this.seats.map(s => ({ 
            seat: s.seat_id, 
            precio: s.precio, 
            es_vip: s.es_vip 
          })));
          
          this.cargando = false;
        } else {
          console.error('❌ No se pudieron cargar los asientos');
          this.toastService.showError('No se pudieron cargar los asientos');
          this.cargando = false;
        }
      },
      error: (error) => {
        console.error('❌ Error al cargar asientos:', error);
        this.errorConexion = true;
        this.cargando = false;
        this.toastService.showError('Error al cargar los asientos');
      }
    });
  }

  // ==================== MANEJO DE ASIENTOS ====================
  
  toggleSeat(seat: Seat): void {
    if (seat.esta_ocupado || seat.isDisabled) {
      this.toastService.showWarning('Este asiento no está disponible');
      return;
    }
    
    if (seat.isSelected) {
      // Deseleccionar asiento
      seat.isSelected = false;
      this.selectedSeats = this.selectedSeats.filter(s => s.id !== seat.id);
    } else {
      // Verificar límite de cantidad
      if (this.selectedSeats.length >= this.cantidad) {
        this.toastService.showWarning(`Solo puedes seleccionar ${this.cantidad} asiento(s)`);
        return;
      }
      
      // Seleccionar asiento
      seat.isSelected = true;
      this.selectedSeats.push(seat);
    }
    
    console.log('🪑 Asientos seleccionados:', this.selectedSeats.map(s => ({
      seat_id: s.seat_id,
      precio: s.precio,
      es_vip: s.es_vip
    })));
  }

  // ==================== UTILIDADES DE ASIENTOS ====================
  
  getUniqueRows(): string[] {
    const rows = [...new Set(this.seats.map(seat => seat.fila))];
    return rows.sort();
  }

  getSeatsByRow(row: string): Seat[] {
    return this.seats
      .filter(seat => seat.fila === row)
      .sort((a, b) => a.numero - b.numero);
  }

  isSeatAvailable(seat: Seat): boolean {
    return !seat.esta_ocupado && !seat.isDisabled && !seat.isSelected;
  }

  getSeatTooltip(seat: Seat): string {
    if (seat.isDisabled) return 'No disponible';
    if (seat.esta_ocupado) return 'Ocupado';
    if (seat.isSelected) return 'Seleccionado - ' + this.functionService.formatPrice(parseFloat(seat.precio));
    if (seat.es_vip) return `VIP - ${this.functionService.formatPrice(parseFloat(seat.precio))}`;
    return this.functionService.formatPrice(parseFloat(seat.precio));
  }

  // ==================== CÁLCULOS DE PRECIOS CORREGIDOS ====================
  
  // 🔧 CORREGIDO: Usar precio real de cada asiento
  getTotalPrice(): number {
    return this.selectedSeats.reduce((total, seat) => total + parseFloat(seat.precio), 0);
  }

  hasVipSeats(): boolean {
    return this.selectedSeats.some(seat => seat.es_vip);
  }

  getNormalSeats(): Seat[] {
    return this.selectedSeats.filter(seat => !seat.es_vip);
  }

  getVipSeats(): Seat[] {
    return this.selectedSeats.filter(seat => seat.es_vip);
  }

  // 🔧 CORREGIDO: Calcular precio real de asientos normales
  getNormalPrice(): number {
    return this.getNormalSeats().reduce((total, seat) => total + parseFloat(seat.precio), 0);
  }

  // 🔧 CORREGIDO: Precio VIP base (función x 1.5) - solo para mostrar
  getVipPrice(): number {
    return this.funcion ? this.funcion.precio * 1.5 : 0;
  }

  // 🔧 CORREGIDO: Calcular precio real de asientos VIP seleccionados
  getVipTotalPrice(): number {
    return this.getVipSeats().reduce((total, seat) => total + parseFloat(seat.precio), 0);
  }

  // ==================== ACCIONES ====================
  
  limpiarSeleccion(): void {
    this.selectedSeats.forEach(seat => seat.isSelected = false);
    this.selectedSeats = [];
    this.toastService.showInfo('Selección de asientos limpiada');
  }

  cancelar(): void {
    this.router.navigate(['/ticket-purchase', this.peliculaId]);
  }

  // 🔧 CORREGIDO: Enviar precios correctos al carrito
  confirmarSeleccion(): void {
    if (this.selectedSeats.length === 0) {
      this.toastService.showWarning('Debes seleccionar al menos un asiento');
      return;
    }

    if (this.selectedSeats.length !== this.cantidad) {
      this.toastService.showWarning(`Debes seleccionar exactamente ${this.cantidad} asiento(s)`);
      return;
    }

    if (!this.pelicula || !this.funcion) {
      this.toastService.showError('Error: Información de película o función no disponible');
      return;
    }

    // Agregar al historial
    this.agregarAlHistorial();

    // 🔧 CORRECCIÓN CRÍTICA: Calcular precio promedio correcto
    const totalPrecio = this.getTotalPrice();
    const precioPromedio = totalPrecio / this.selectedSeats.length;

    console.log('💰 Cálculo de precios:', {
      totalPrecio: totalPrecio,
      cantidad: this.selectedSeats.length,
      precioPromedio: precioPromedio,
      asientos: this.selectedSeats.map(s => ({
        seat_id: s.seat_id,
        precio: parseFloat(s.precio),
        es_vip: s.es_vip
      }))
    });

    // 🔧 CREAR ITEM CON PRECIOS CORRECTOS
    const itemParaCarrito = {
      tipo: 'pelicula',
      pelicula: this.pelicula,
      funcion: {
        ...this.funcion,
        // 🔧 USAR PRECIO PROMEDIO REAL CALCULADO DESDE LOS ASIENTOS
        precio: precioPromedio
      },
      cantidad: this.selectedSeats.length,
      // 🆕 INFORMACIÓN DETALLADA DE ASIENTOS
      asientos_seleccionados: this.selectedSeats.map(s => s.seat_id),
      asientos_info: this.selectedSeats.map(s => ({
        id: s.id,
        seat_id: s.seat_id,
        precio: parseFloat(s.precio),
        es_vip: s.es_vip
      })),
      // 🔧 PRECIO TOTAL REAL
      precio_total_real: totalPrecio
    };

    console.log('🛒 Agregando al carrito desde seat-selection:', itemParaCarrito);

    this.cartService.addToCart(itemParaCarrito).subscribe({
      next: (exito) => {
        if (exito) {
          this.toastService.showSuccess(`¡${this.selectedSeats.length} asiento(s) agregado(s) al carrito!`);
          
          console.log('✅ Item agregado correctamente al carrito');
          console.log('🛒 Carrito actual:', this.cartService.getCartItems());
          
          this.router.navigate(['/cart']);
        } else {
          this.toastService.showError('No se pudo agregar al carrito');
        }
      },
      error: (error) => {
        console.error('❌ Error agregando al carrito:', error);
        this.toastService.showError('Error al agregar al carrito');
      }
    });
  }

  private agregarAlHistorial(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser && this.pelicula) {
      this.userService.addToHistory(currentUser.id, {
        peliculaId: this.peliculaId,
        titulo: this.pelicula.titulo,
        poster: this.pelicula.poster,
        genero: this.pelicula.genero,
        anio: this.pelicula.anio,
        fechaVista: new Date().toISOString(),
        tipoAccion: 'comprada'
      });
    }
  }

  // Métodos auxiliares
  formatearFecha(fecha: string): string {
    return this.functionService.formatDateForDisplay(fecha);
  }

  reintentarConexion(): void {
    this.toastService.showInfo('Reintentando conexión...');
    this.cargarDatos();
  }

  trackSeat(index: number, seat: Seat): string {
    return seat.id.toString();
  }

  getAsientosRestantes(): number {
    return this.cantidad - this.selectedSeats.length;
  }
}
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MovieService, Pelicula } from '../../services/movie.service';
import { FunctionService, FuncionCine } from '../../services/function.service';
import { CartService } from '../../services/cart.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-ticket-purchase',
  standalone: false,
  templateUrl: './ticket-purchase.component.html',
  styleUrls: ['./ticket-purchase.component.css']
})
export class TicketPurchaseComponent implements OnInit {
  
  pelicula: Pelicula | null = null;
  peliculaId: number = -1; 
  funciones: FuncionCine[] = [];
  funcionesFuturas: FuncionCine[] = [];
  funcionSeleccionada: FuncionCine | null = null;
  cantidadEntradas: number = 1;
  cargando: boolean = true;
  cargandoFunciones: boolean = false;
  agregandoCarrito: boolean = false;
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
    
    // Obtener ID de la película desde la ruta
    this.peliculaId = Number(this.route.snapshot.paramMap.get('id'));
    
    if (this.peliculaId > 0) {
      this.movieService.getPeliculaById(this.peliculaId).subscribe({
        next: (pelicula) => {
          if (pelicula) {
            this.pelicula = pelicula;
            console.log('✅ Película cargada:', pelicula.titulo);
            
            // Agregar al historial
            this.agregarAlHistorial();
            
            // Cargar funciones de la API
            this.cargarFuncionesAPI();
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
    } else {
      console.error('ID de película inválido');
      this.toastService.showError('ID de película inválido');
      this.router.navigate(['/movies']);
    }
  }

  private cargarFuncionesAPI(): void {
    this.cargandoFunciones = true;
    
    this.functionService.getFunctionsByMovie(this.peliculaId).subscribe({
      next: (funciones) => {
        console.log('✅ Funciones cargadas desde API:', funciones.length);
        this.funciones = funciones;
        
        // Filtrar solo funciones futuras
        this.funcionesFuturas = funciones.filter(funcion => !this.functionService.isPastFunction(funcion));
        
        console.log(`📅 Funciones futuras disponibles: ${this.funcionesFuturas.length}`);
        
        this.cargandoFunciones = false;
        this.cargando = false;
        
        if (this.funcionesFuturas.length === 0) {
          this.toastService.showInfo('No hay funciones disponibles para esta película');
        }
      },
      error: (error) => {
        console.error('❌ Error al cargar funciones:', error);
        this.cargandoFunciones = false;
        this.cargando = false;
        this.errorConexion = true;
        this.toastService.showError('Error al cargar las funciones disponibles');
        
        // Fallback: usar array vacío
        this.funciones = [];
        this.funcionesFuturas = [];
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
        tipoAccion: 'vista'
      });
    }
  }
private generarAsientosAutomaticos(cantidad: number): string[] {
  const asientos: string[] = [];
  const filas = ['A', 'B', 'C', 'D', 'E'];
  
  for (let i = 0; i < cantidad; i++) {
    const fila = filas[Math.floor(i / 10)];
    const numero = (i % 10) + 1;
    asientos.push(`${fila}${numero}`);
  }
  
  return asientos;
}
  seleccionarFuncion(funcion: FuncionCine): void {
    console.log('Función seleccionada:', funcion);
    this.funcionSeleccionada = funcion;
    this.cantidadEntradas = 1; // Reset cantidad
  }

  // 🔧 MÉTODO CORREGIDO: Agregar al carrito en lugar de ir directo a seat-selection
  agregarAlCarritoDirecto(): void {
  if (!this.pelicula || !this.funcionSeleccionada) {
    console.error('Faltan datos para proceder');
    this.toastService.showError('Por favor selecciona una función');
    return;
  }

  // Verificar si el usuario está autenticado
  if (!this.authService.isLoggedIn()) {
    this.toastService.showWarning('Debes iniciar sesión para comprar entradas');
    this.router.navigate(['/login']);
    return;
  }

  this.agregandoCarrito = true;

  // Verificar disponibilidad de asientos
  if (this.funcionSeleccionada.asientosDisponibles < this.cantidadEntradas) {
    this.toastService.showWarning(`Solo hay ${this.funcionSeleccionada.asientosDisponibles} asientos disponibles`);
    this.agregandoCarrito = false;
    return;
  }

  // Agregar al carrito con asientos automáticos
  const itemParaCarrito = {
    tipo: 'pelicula',
    pelicula: this.pelicula,
    funcion: {
      ...this.funcionSeleccionada,
      asientosSeleccionados: this.generarAsientosAutomaticos(this.cantidadEntradas)
    },
    cantidad: this.cantidadEntradas
  };

  console.log('🛒 Agregando al carrito (sin selección manual):', itemParaCarrito);

  this.cartService.addToCart(itemParaCarrito).subscribe({
    next: (exito) => {
      this.agregandoCarrito = false;
      
      if (exito) {
        this.toastService.showSuccess(
          `✅ ${this.cantidadEntradas} entrada(s) agregada(s) al carrito`
        );
        
        // Dar opción al usuario de qué hacer
        this.mostrarOpcionesPostAgregarCarrito();
      } else {
        this.toastService.showError('No se pudo agregar al carrito');
      }
    },
    error: (error) => {
      console.error('❌ Error agregando al carrito:', error);
      this.agregandoCarrito = false;
      this.toastService.showError('Error al agregar al carrito');
    }
  });
}

  // 🆕 NUEVO MÉTODO: Mostrar opciones después de agregar al carrito
  private mostrarOpcionesPostAgregarCarrito(): void {
    // Mostrar toast con botones de acción
    setTimeout(() => {
      const shouldGoToCart = confirm(
        `Entradas agregadas al carrito.\n\n¿Qué deseas hacer?\n\n` +
        `OK = Ver carrito\n` +
        `Cancelar = Seguir comprando`
      );

      if (shouldGoToCart) {
        this.router.navigate(['/cart']);
      }
      // Si cancela, se queda en la página actual para seguir comprando
    }, 500);
  }
seleccionarAsientos(): void {
  if (!this.pelicula || !this.funcionSeleccionada) {
    console.error('Faltan datos para proceder');
    this.toastService.showError('Por favor selecciona una función');
    return;
  }

  // Verificar si el usuario está autenticado
  if (!this.authService.isLoggedIn()) {
    this.toastService.showWarning('Debes iniciar sesión para comprar entradas');
    this.router.navigate(['/login']);
    return;
  }

  // Verificar disponibilidad de asientos
  if (this.funcionSeleccionada.asientosDisponibles < this.cantidadEntradas) {
    this.toastService.showWarning(`Solo hay ${this.funcionSeleccionada.asientosDisponibles} asientos disponibles`);
    return;
  }

  console.log('🪑 Navegando a selección de asientos:', {
    peliculaId: this.peliculaId,
    funcionId: this.funcionSeleccionada.id,
    cantidad: this.cantidadEntradas
  });

  // 🆕 NAVEGACIÓN CORRECTA: Ir a seat-selection
  this.router.navigate([
    '/seat-selection', 
    this.peliculaId, 
    this.funcionSeleccionada.id, 
    this.cantidadEntradas
  ]);
}
  // 🆕 NUEVO MÉTODO: Ir directo al checkout
  comprarAhora(): void {
    if (!this.pelicula || !this.funcionSeleccionada) {
      this.toastService.showError('Por favor selecciona una función');
      return;
    }

    if (!this.authService.isLoggedIn()) {
      this.toastService.showWarning('Debes iniciar sesión para comprar entradas');
      this.router.navigate(['/login']);
      return;
    }

    this.agregandoCarrito = true;

    const itemParaCarrito = {
      tipo: 'pelicula',
      pelicula: this.pelicula,
      funcion: this.funcionSeleccionada,
      cantidad: this.cantidadEntradas
    };

    this.cartService.addToCart(itemParaCarrito).subscribe({
      next: (exito) => {
        this.agregandoCarrito = false;
        
        if (exito) {
          this.toastService.showSuccess('Entradas agregadas al carrito');
          // Ir directo al checkout
          this.router.navigate(['/checkout']);
        } else {
          this.toastService.showError('No se pudo agregar al carrito');
        }
      },
      error: (error) => {
        console.error('❌ Error:', error);
        this.agregandoCarrito = false;
        this.toastService.showError('Error al procesar la compra');
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/movie', this.peliculaId]);
  }

  incrementarCantidad(): void {
    const maxAsientos = this.funcionSeleccionada?.asientosDisponibles || 20;
    const limite = Math.min(20, maxAsientos);
    
    if (this.cantidadEntradas < limite) {
      this.cantidadEntradas++;
    } else {
      this.toastService.showWarning(`Máximo ${limite} entradas disponibles`);
    }
  }

  decrementarCantidad(): void {
    if (this.cantidadEntradas > 1) {
      this.cantidadEntradas--;
    }
  }

  // ==================== MÉTODOS DE FORMATO ====================

  formatearFecha(fecha: string): string {
    return this.functionService.formatDateForDisplay(fecha);
  }

  formatearPrecio(precio: number): string {
    return this.functionService.formatPrice(precio);
  }

  getAsientosDisponiblesTexto(asientos: number): string {
    if (asientos === 0) return 'Agotado';
    if (asientos <= 10) return `Quedan ${asientos}`;
    return `${asientos} disponibles`;
  }

  getAsientosDisponiblesClass(asientos: number): string {
    if (asientos === 0) return 'text-danger';
    if (asientos <= 10) return 'text-warning';
    return 'text-success';
  }

  reintentarConexion(): void {
    this.toastService.showInfo('Reintentando conexión...');
    this.cargarDatos();
  }

  trackFunction(index: number, funcion: FuncionCine): string {
    return funcion.id;
  }

  getTotal(): number {
    if (!this.funcionSeleccionada) return 0;
    return this.funcionSeleccionada.precio * this.cantidadEntradas;
  }

  getMin(a: number, b: number): number {
    return Math.min(a, b);
  }

  // 🆕 NUEVOS MÉTODOS AUXILIARES

  /**
   * Verificar si ya está en el carrito
   */
  yaEstaEnCarrito(): boolean {
    if (!this.pelicula || !this.funcionSeleccionada) return false;
    
    const itemsCarrito = this.cartService.getCartItems();
    return itemsCarrito.some(item => 
      item.tipo === 'pelicula' && 
      item.pelicula?.id === this.pelicula!.id &&
      item.funcion?.id === this.funcionSeleccionada!.id
    );
  }

  /**
   * Obtener cantidad ya en carrito
   */
  getCantidadEnCarrito(): number {
    if (!this.pelicula || !this.funcionSeleccionada) return 0;
    
    const itemsCarrito = this.cartService.getCartItems();
    const item = itemsCarrito.find(item => 
      item.tipo === 'pelicula' && 
      item.pelicula?.id === this.pelicula!.id &&
      item.funcion?.id === this.funcionSeleccionada!.id
    );
    
    return item ? item.cantidad : 0;
  }

  /**
   * Ir al carrito
   */
  irAlCarrito(): void {
    this.router.navigate(['/cart']);
  }
}
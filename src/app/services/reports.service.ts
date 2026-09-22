// src/app/services/reports.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReportsService {

  private readonly API_URL = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient) {
    console.log('📊 ReportsService conectado a:', this.API_URL);
  }

  // ==================== REPORTES INDIVIDUALES ====================

  /**
   * Obtener reporte de ventas
   */
  getVentasReport(fechaInicio?: string, fechaFin?: string): Observable<ReportResponse<VentasReport>> {
    let params = new HttpParams();
    if (fechaInicio) params = params.set('fechaInicio', fechaInicio);
    if (fechaFin) params = params.set('fechaFin', fechaFin);

    return this.http.get<any>(`${this.API_URL}/ventas`, { params }).pipe(
      map(response => {
        if (response.success) {
          return {
            success: true,
            data: response.data,
            meta: response.meta
          };
        }
        throw new Error(response.error || 'Error en reporte de ventas');
      }),
      catchError(error => {
        console.error('❌ Error en reporte de ventas:', error);
        return of({
          success: false,
          error: error.message || 'Error al generar reporte de ventas',
          data: null
        });
      })
    );
  }

  /**
   * Obtener reporte de películas populares
   */
  getPeliculasReport(limit: number = 10): Observable<ReportResponse<PeliculasReport>> {
    const params = new HttpParams().set('limit', limit.toString());

    return this.http.get<any>(`${this.API_URL}/peliculas`, { params }).pipe(
      map(response => {
        if (response.success) {
          return {
            success: true,
            data: response.data,
            meta: response.meta
          };
        }
        throw new Error(response.error || 'Error en reporte de películas');
      }),
      catchError(error => {
        console.error('❌ Error en reporte de películas:', error);
        return of({
          success: false,
          error: error.message || 'Error al generar reporte de películas',
          data: null
        });
      })
    );
  }

  /**
   * Obtener reporte del bar
   */
  getBarReport(limit: number = 15): Observable<ReportResponse<BarReport>> {
    const params = new HttpParams().set('limit', limit.toString());

    return this.http.get<any>(`${this.API_URL}/bar`, { params }).pipe(
      map(response => {
        if (response.success) {
          return {
            success: true,
            data: response.data,
            meta: response.meta
          };
        }
        throw new Error(response.error || 'Error en reporte del bar');
      }),
      catchError(error => {
        console.error('❌ Error en reporte del bar:', error);
        return of({
          success: false,
          error: error.message || 'Error al generar reporte del bar',
          data: null
        });
      })
    );
  }

  /**
   * Obtener reporte de usuarios
   */
  getUsuariosReport(limit: number = 20): Observable<ReportResponse<UsuariosReport>> {
    const params = new HttpParams().set('limit', limit.toString());

    return this.http.get<any>(`${this.API_URL}/usuarios`, { params }).pipe(
      map(response => {
        if (response.success) {
          return {
            success: true,
            data: response.data,
            meta: response.meta
          };
        }
        throw new Error(response.error || 'Error en reporte de usuarios');
      }),
      catchError(error => {
        console.error('❌ Error en reporte de usuarios:', error);
        return of({
          success: false,
          error: error.message || 'Error al generar reporte de usuarios',
          data: null
        });
      })
    );
  }

  /**
   * Obtener actividad reciente
   */
  getActividadReciente(limit: number = 20): Observable<ReportResponse<ActividadReport>> {
    const params = new HttpParams().set('limit', limit.toString());

    return this.http.get<any>(`${this.API_URL}/actividad`, { params }).pipe(
      map(response => {
        if (response.success) {
          return {
            success: true,
            data: response.data,
            meta: response.meta
          };
        }
        throw new Error(response.error || 'Error en actividad reciente');
      }),
      catchError(error => {
        console.error('❌ Error en actividad reciente:', error);
        return of({
          success: false,
          error: error.message || 'Error al obtener actividad reciente',
          data: null
        });
      })
    );
  }

  // ==================== REPORTES COMBINADOS ====================

  /**
   * Obtener reporte ejecutivo completo
   */
  getReporteEjecutivo(): Observable<ReportResponse<ReporteEjecutivo>> {
    return this.http.get<any>(`${this.API_URL}/ejecutivo`).pipe(
      map(response => {
        if (response.success) {
          return {
            success: true,
            data: response.data,
            meta: response.meta
          };
        }
        throw new Error(response.error || 'Error en reporte ejecutivo');
      }),
      catchError(error => {
        console.error('❌ Error en reporte ejecutivo:', error);
        return of({
          success: false,
          error: error.message || 'Error al generar reporte ejecutivo',
          data: null
        });
      })
    );
  }

  /**
   * Obtener estadísticas para dashboard (reemplaza AdminService.getAdminStats)
   */
  getDashboardStats(): Observable<ReportResponse<DashboardStats>> {
    return this.http.get<any>(`${this.API_URL}/dashboard`).pipe(
      map(response => {
        if (response.success) {
          return {
            success: true,
            data: response.data,
            meta: response.meta
          };
        }
        throw new Error(response.error || 'Error en estadísticas del dashboard');
      }),
      catchError(error => {
        console.error('❌ Error en dashboard stats:', error);
        return of({
          success: false,
          error: error.message || 'Error al cargar estadísticas del dashboard',
          data: null
        });
      })
    );
  }

  // ==================== UTILIDADES ====================

  /**
   * Descargar reporte como archivo
   */
  downloadReport(tipo: 'ventas' | 'peliculas' | 'bar' | 'usuarios' | 'ejecutivo', formato: 'json' | 'csv' = 'json'): void {
    this.getReportData(tipo).subscribe(response => {
      if (response.success && response.data) {
        const filename = `reporte-${tipo}-${new Date().toISOString().split('T')[0]}.${formato}`;
        
        let content: string;
        let mimeType: string;

        if (formato === 'csv') {
          content = this.convertToCSV(response.data, tipo);
          mimeType = 'text/csv';
        } else {
          content = JSON.stringify(response.data, null, 2);
          mimeType = 'application/json';
        }

        this.downloadFile(content, filename, mimeType);
      }
    });
  }

  /**
   * Obtener datos del reporte según el tipo
   */
  private getReportData(tipo: string): Observable<ReportResponse<any>> {
    switch (tipo) {
      case 'ventas':
        return this.getVentasReport();
      case 'peliculas':
        return this.getPeliculasReport();
      case 'bar':
        return this.getBarReport();
      case 'usuarios':
        return this.getUsuariosReport();
      case 'ejecutivo':
        return this.getReporteEjecutivo();
      default:
        return of({ success: false, error: 'Tipo de reporte no válido', data: null });
    }
  }

  /**
   * Convertir datos a formato CSV
   */
  private convertToCSV(data: any, tipo: string): string {
    let csv = '';
    
    switch (tipo) {
      case 'ventas':
        csv = 'Fecha,Ordenes,Ingresos,Subtotal,Impuestos,Ticket Promedio\n';
        data.ventasPorDia?.forEach((venta: any) => {
          csv += `${venta.fecha},${venta.total_ordenes},${venta.ingresos_total},${venta.subtotal_total},${venta.impuestos_total},${venta.ticket_promedio}\n`;
        });
        break;
        
      case 'peliculas':
        csv = 'Titulo,Genero,Rating,Entradas Vendidas,Ingresos,Usuarios Unicos\n';
        data.peliculas?.forEach((pelicula: any) => {
          csv += `"${pelicula.titulo}",${pelicula.genero},${pelicula.rating},${pelicula.total_entradas_vendidas},${pelicula.ingresos_generados},${pelicula.usuarios_unicos}\n`;
        });
        break;
        
      case 'bar':
        csv = 'Producto,Categoria,Precio,Es Combo,Veces Vendido,Cantidad Total,Ingresos\n';
        data.productos?.forEach((producto: any) => {
          csv += `"${producto.nombre}",${producto.categoria},${producto.precio},${producto.es_combo ? 'Si' : 'No'},${producto.veces_vendido},${producto.cantidad_total_vendida},${producto.ingresos_generados}\n`;
        });
        break;
        
      case 'usuarios':
        csv = 'Nombre,Email,Fecha Registro,Puntos,Compras,Total Gastado,Categoria\n';
        data.usuarios?.forEach((usuario: any) => {
          csv += `"${usuario.nombre}","${usuario.email}",${usuario.fecha_registro},${usuario.puntos_actuales},${usuario.total_compras},${usuario.total_gastado},${usuario.categoria_cliente}\n`;
        });
        break;
    }
    
    return csv;
  }

  /**
   * Descargar archivo
   */
  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

// ==================== INTERFACES ====================

export interface ReportResponse<T> {
  success: boolean;
  data: T | null;
  meta?: {
    generadoEn: string;
    [key: string]: any;
  };
  error?: string;
}

export interface VentasReport {
  ventasPorDia: Array<{
    fecha: string;
    total_ordenes: number;
    ingresos_total: number;
    subtotal_total: number;
    impuestos_total: number;
    ticket_promedio: number;
    pagos_paypal: number;
    pagos_tarjeta: number;
  }>;
  resumen: {
    totalOrdenes: number;
    totalIngresos: number;
    totalSubtotal: number;
    totalImpuestos: number;
    promedioTicket: number;
  };
  periodo: {
    desde: string;
    hasta: string;
    totalDias: number;
  };
}

export interface PeliculasReport {
  peliculas: Array<{
    id: number;
    titulo: string;
    genero: string;
    rating: number;
    total_entradas_vendidas: number;
    ingresos_generados: number;
    usuarios_unicos: number;
    precio_promedio: number;
    popularidad: string;
  }>;
  estadisticas: {
    totalPeliculas: number;
    totalEntradas: number;
    totalIngresos: number;
    ratingPromedio: number;
    precioPromedio: number;
  };
  generos: Array<{
    nombre: string;
    cantidad: number;
    entradas: number;
    ingresos: number;
    porcentaje: string;
  }>;
}

export interface BarReport {
  productos: Array<{
    id: number;
    nombre: string;
    categoria: string;
    precio: number;
    es_combo: boolean;
    veces_vendido: number;
    cantidad_total_vendida: number;
    ingresos_generados: number;
    precio_promedio_venta: number;
    nivel_popularidad: string;
  }>;
  estadisticas: {
    totalProductos: number;
    totalVentas: number;
    totalIngresos: number;
    cantidadVendida: number;
    precioPromedio: number;
  };
  categorias: Array<{
    nombre: string;
    productos: number;
    ventas: number;
    ingresos: number;
    porcentajeVentas: string;
  }>;
  analisisCombos: {
    totalCombos: number;
    totalIndividuales: number;
    ventasCombos: number;
    ventasIndividuales: number;
    ingresosCombos: number;
    ingresosIndividuales: number;
  };
}

export interface UsuariosReport {
  usuarios: Array<{
    id: number;
    nombre: string;
    email: string;
    fecha_registro: string;
    puntos_actuales: number;
    total_favoritas: number;
    total_historial: number;
    total_compras: number;
    total_gastado: number;
    total_referidos: number;
    categoria_cliente: string;
    dias_desde_registro: number;
  }>;
  estadisticas: {
    totalUsuarios: number;
    totalCompras: number;
    totalGastado: number;
    totalPuntos: number;
    totalReferidos: number;
    promedioGasto: number;
    promedioCompras: number;
  };
  categorias: Array<{
    nombre: string;
    cantidad: number;
    gastoTotal: number;
    comprasTotal: number;
    porcentaje: string;
    gastoPromedio: string;
  }>;
}

export interface ActividadReport {
  actividades: Array<{
    tipo: string;
    descripcion: string;
    fecha: string;
    icono: string;
    color: string;
  }>;
  total: number;
  ultimaActividad: string | null;
}

export interface ReporteEjecutivo {
  timestamp: string;
  resumenEjecutivo: {
    totalIngresos: number;
    totalOrdenes: number;
    ticketPromedio: number;
    peliculasActivas: number;
    productosBar: number;
    usuariosActivos: number;
  };
  ventas: VentasReport;
  peliculas: PeliculasReport;
  bar: BarReport;
  usuarios: UsuariosReport;
  actividad: ActividadReport;
  generadoEn: string;
}

export interface DashboardStats {
  totalPeliculas: number;
  totalUsuarios: number;
  totalVentas: number;
  ingresosMes: number;
  usuariosActivos: number;
  ticketPromedio: number;
  peliculasPopulares: Array<{
    titulo: string;
    genero: string;
    rating: number;
    vistas: number;
  }>;
  generosMasPopulares: Array<{
    genero: string;
    cantidad: number;
    porcentaje: number;
  }>;
  ventasRecientes: Array<{
    usuario: string;
    pelicula: string;
    entradas: number;
    total: number;
    estado: string;
    fecha: string;
  }>;
  actividadReciente: Array<{
    tipo: string;
    descripcion: string;
    fecha: string;
    icono: string;
    color: string;
  }>;
  barStats: {
    totalProductos: number;
    totalVentas: number;
    totalIngresos: number;
    productosPopulares: Array<{
      nombre: string;
      categoria: string;
      ventas: number;
      ingresos: number;
    }>;
  };
}
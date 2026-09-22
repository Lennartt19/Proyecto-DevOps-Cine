// src/app/components/admin/admin-logs/admin-logs.component.ts
import { Component, OnInit } from '@angular/core';
import { LogsService, ActivityLog, OrderLog, UserLog, ErrorLog, SystemStats } from '../../../services/logs.service';
import { ToastService } from '../../../services/toast.service';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-admin-logs',
  standalone: false,
  templateUrl: './admin-logs.component.html',
  styleUrls: ['./admin-logs.component.css']
})
export class AdminLogsComponent implements OnInit {

  // Datos
  actividadReciente: ActivityLog[] = [];
  logsOrdenes: OrderLog[] = [];
  logsUsuarios: UserLog[] = [];
  logsErrores: ErrorLog[] = [];
  estadisticasSistema: SystemStats | null = null;

  // Estados
  cargando = true;
  seccionActiva = 'actividad';

  // Configuración de paginación
  limit = 20;
  offset = 0;

  constructor(
    private logsService: LogsService,
    private toastService: ToastService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAdmin()) {
      this.toastService.showError('No tienes permisos para acceder a los logs');
      this.router.navigate(['/home']);
      return;
    }

    this.cargarDatos();
  }

  // ==================== CARGA DE DATOS ====================

  cargarDatos(): void {
    this.cargando = true;
    
    // Cargar estadísticas del sistema
    this.cargarEstadisticas();
    
    // Cargar según la sección activa
    switch (this.seccionActiva) {
      case 'actividad':
        this.cargarActividadReciente();
        break;
      case 'ordenes':
        this.cargarLogsOrdenes();
        break;
      case 'usuarios':
        this.cargarLogsUsuarios();
        break;
      case 'errores':
        this.cargarLogsErrores();
        break;
      default:
        this.cargarActividadReciente();
    }
  }

  cargarEstadisticas(): void {
    this.logsService.getSystemStats().subscribe({
      next: (response) => {
        if (response.success) {
          this.estadisticasSistema = response.data;
        }
      },
      error: (error) => {
        console.error('Error al cargar estadísticas:', error);
      }
    });
  }

  cargarActividadReciente(): void {
    this.logsService.getRecentActivity(this.limit, this.offset).subscribe({
      next: (response) => {
        if (response.success) {
          this.actividadReciente = response.data;
          this.toastService.showSuccess('Actividad reciente cargada');
        } else {
          this.toastService.showError('Error al cargar actividad reciente');
        }
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar actividad:', error);
        this.toastService.showError('Error de conexión al cargar actividad');
        this.cargando = false;
      }
    });
  }

  cargarLogsOrdenes(): void {
    this.logsService.getOrderLogs(this.limit).subscribe({
      next: (response) => {
        if (response.success) {
          this.logsOrdenes = response.data;
          this.toastService.showSuccess('Logs de órdenes cargados');
        } else {
          this.toastService.showError('Error al cargar logs de órdenes');
        }
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar logs de órdenes:', error);
        this.toastService.showError('Error de conexión al cargar logs de órdenes');
        this.cargando = false;
      }
    });
  }

  cargarLogsUsuarios(): void {
    this.logsService.getUserLogs(this.limit).subscribe({
      next: (response) => {
        if (response.success) {
          this.logsUsuarios = response.data;
          this.toastService.showSuccess('Logs de usuarios cargados');
        } else {
          this.toastService.showError('Error al cargar logs de usuarios');
        }
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar logs de usuarios:', error);
        this.toastService.showError('Error de conexión al cargar logs de usuarios');
        this.cargando = false;
      }
    });
  }

  cargarLogsErrores(): void {
    this.logsService.getErrorLogs().subscribe({
      next: (response) => {
        if (response.success) {
          this.logsErrores = response.data;
          this.toastService.showSuccess('Logs de errores cargados');
        } else {
          this.toastService.showError('Error al cargar logs de errores');
        }
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar logs de errores:', error);
        this.toastService.showError('Error de conexión al cargar logs de errores');
        this.cargando = false;
      }
    });
  }

  // ==================== NAVEGACIÓN ENTRE SECCIONES ====================

  cambiarSeccion(seccion: string): void {
    this.seccionActiva = seccion;
    this.offset = 0; // Reset pagination
    this.cargarDatos();
  }

  // ==================== UTILIDADES ====================

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatearFechaRelativa(fecha: string): string {
    const ahora = new Date();
    const fechaLog = new Date(fecha);
    const diferencia = ahora.getTime() - fechaLog.getTime();
    
    const minutos = Math.floor(diferencia / (1000 * 60));
    const horas = Math.floor(diferencia / (1000 * 60 * 60));
    const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
    
    if (minutos < 1) return 'Hace un momento';
    if (minutos < 60) return `Hace ${minutos} minuto${minutos > 1 ? 's' : ''}`;
    if (horas < 24) return `Hace ${horas} hora${horas > 1 ? 's' : ''}`;
    return `Hace ${dias} día${dias > 1 ? 's' : ''}`;
  }

  formatearMoneda(amount: number): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
  trackActividad(index: number, actividad: ActivityLog): any {
  return actividad.fecha + actividad.descripcion;
}

trackOrden(index: number, orden: OrderLog): any {
  return orden.id;
}

trackUsuario(index: number, usuario: UserLog): any {
  return usuario.id;
}

trackError(index: number, error: ErrorLog): any {
  return error.id;
}
  // ==================== ACCIONES ====================

  refreshDatos(): void {
    this.cargarDatos();
  }


 exportarLogs(): void {
  try {
    // Crear nuevo documento PDF
    const doc = new jsPDF();
    const fechaReporte = new Date().toLocaleDateString('es-ES');
    const horaReporte = new Date().toLocaleTimeString('es-ES');
    
    let yPosition = 20;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;

    // =========================== HEADER ===========================
    // Título principal
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');  // ✅ Cambio aquí
    doc.text('REPORTE DE LOGS DEL SISTEMA', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 10;
    doc.setFontSize(16);
    doc.text('ParkyFilms - Sistema de Gestión de Cine', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');  // ✅ Cambio aquí
    doc.text(`Fecha: ${fechaReporte} | Hora: ${horaReporte}`, pageWidth / 2, yPosition, { align: 'center' });
    
    // Línea separadora
    yPosition += 10;
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 15;

    // =========================== ESTADÍSTICAS ===========================
    if (this.estadisticasSistema) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');  // ✅ Cambio aquí
      doc.text('ESTADISTICAS DEL SISTEMA', margin, yPosition);  // ✅ Sin emojis para evitar problemas
      yPosition += 15;

      doc.setFont('helvetica', 'normal');  // ✅ Cambio aquí
      doc.setFontSize(11);

      // Primera fila de estadísticas
      const col1 = margin;
      const col2 = pageWidth / 3;
      const col3 = (pageWidth / 3) * 2;

      doc.text(`Usuarios Activos: ${this.estadisticasSistema.usuarios_activos}`, col1, yPosition);
      doc.text(`Ordenes Hoy: ${this.estadisticasSistema.ordenes_hoy}`, col2, yPosition);
      doc.text(`Pendientes: ${this.estadisticasSistema.ordenes_pendientes}`, col3, yPosition);
      yPosition += 12;

      doc.text(`Ingresos Hoy: ${this.formatearMoneda(this.estadisticasSistema.ingresos_hoy)}`, col1, yPosition);
      doc.text(`Peliculas: ${this.estadisticasSistema.peliculas_activas}`, col2, yPosition);
      doc.text(`Funciones: ${this.estadisticasSistema.funciones_activas}`, col3, yPosition);
      yPosition += 20;
    }

    // =========================== ACTIVIDAD RECIENTE ===========================
    if (this.actividadReciente.length > 0) {
      // Verificar si necesitamos nueva página
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');  // ✅ Cambio aquí
      doc.text(`ACTIVIDAD RECIENTE (${this.actividadReciente.length} eventos)`, margin, yPosition);
      yPosition += 15;

      doc.setFont('helvetica', 'normal');  // ✅ Cambio aquí
      doc.setFontSize(10);

      // Encabezados de tabla
      doc.setFont('helvetica', 'bold');  // ✅ Cambio aquí
      doc.text('Tipo', margin, yPosition);
      doc.text('Descripcion', margin + 30, yPosition);
      doc.text('Fecha', margin + 120, yPosition);
      yPosition += 8;

      // Línea bajo encabezados
      doc.line(margin, yPosition - 3, pageWidth - margin, yPosition - 3);

      doc.setFont('helvetica', 'normal');  // ✅ Cambio aquí
      
      // Mostrar primeros 8 elementos de actividad
      this.actividadReciente.slice(0, 8).forEach((actividad) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        const tipoTexto = actividad.tipo.replace('_', ' ').toUpperCase();
        const descripcionCorta = actividad.descripcion.length > 50 
          ? actividad.descripcion.substring(0, 47) + '...' 
          : actividad.descripcion;
        const fechaFormateada = this.formatearFecha(actividad.fecha);

        doc.text(tipoTexto, margin, yPosition);
        doc.text(descripcionCorta, margin + 30, yPosition);
        doc.text(fechaFormateada, margin + 120, yPosition);
        yPosition += 8;
      });

      yPosition += 10;
    }

    // =========================== ÓRDENES RECIENTES ===========================
    if (this.logsOrdenes.length > 0) {
      // Verificar si necesitamos nueva página
      if (yPosition > 180) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');  // ✅ Cambio aquí
      doc.text(`ORDENES RECIENTES (${this.logsOrdenes.length} ordenes)`, margin, yPosition);
      yPosition += 15;

      doc.setFont('helvetica', 'normal');  // ✅ Cambio aquí
      doc.setFontSize(10);

      // Encabezados
      doc.setFont('helvetica', 'bold');  // ✅ Cambio aquí
      doc.text('ID', margin, yPosition);
      doc.text('Cliente', margin + 35, yPosition);
      doc.text('Total', margin + 85, yPosition);
      doc.text('Estado', margin + 110, yPosition);
      doc.text('Fecha', margin + 140, yPosition);
      yPosition += 8;

      doc.line(margin, yPosition - 3, pageWidth - margin, yPosition - 3);
      doc.setFont('helvetica', 'normal');  // ✅ Cambio aquí

      // Mostrar primeras 8 órdenes
      this.logsOrdenes.slice(0, 8).forEach((orden) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        const idCorto = orden.id.substring(0, 8) + '...';
        const clienteCorto = orden.nombre_cliente.length > 20 
          ? orden.nombre_cliente.substring(0, 17) + '...' 
          : orden.nombre_cliente;

        doc.text(idCorto, margin, yPosition);
        doc.text(clienteCorto, margin + 35, yPosition);
        doc.text(this.formatearMoneda(orden.total), margin + 85, yPosition);
        doc.text(orden.estado, margin + 110, yPosition);
        doc.text(this.formatearFecha(orden.fecha_creacion), margin + 140, yPosition);
        yPosition += 8;
      });

      yPosition += 10;
    }

    // =========================== USUARIOS RECIENTES ===========================
    if (this.logsUsuarios.length > 0) {
      // Verificar si necesitamos nueva página
      if (yPosition > 180) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');  // ✅ Cambio aquí
      doc.text(`USUARIOS RECIENTES (${this.logsUsuarios.length} usuarios)`, margin, yPosition);
      yPosition += 15;

      doc.setFont('helvetica', 'normal');  // ✅ Cambio aquí
      doc.setFontSize(10);

      // Encabezados
      doc.setFont('helvetica', 'bold');  // ✅ Cambio aquí
      doc.text('ID', margin, yPosition);
      doc.text('Nombre', margin + 20, yPosition);
      doc.text('Email', margin + 60, yPosition);
      doc.text('Rol', margin + 110, yPosition);
      doc.text('Fecha Registro', margin + 130, yPosition);
      yPosition += 8;

      doc.line(margin, yPosition - 3, pageWidth - margin, yPosition - 3);
      doc.setFont('helvetica', 'normal');  // ✅ Cambio aquí

      // Mostrar primeros 8 usuarios
      this.logsUsuarios.slice(0, 8).forEach((usuario) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        const nombreCorto = usuario.nombre.length > 15 
          ? usuario.nombre.substring(0, 12) + '...' 
          : usuario.nombre;
        const emailCorto = usuario.email.length > 25 
          ? usuario.email.substring(0, 22) + '...' 
          : usuario.email;

        doc.text(usuario.id.toString(), margin, yPosition);
        doc.text(nombreCorto, margin + 20, yPosition);
        doc.text(emailCorto, margin + 60, yPosition);
        doc.text(usuario.role, margin + 110, yPosition);
        doc.text(this.formatearFecha(usuario.fecha_registro), margin + 130, yPosition);
        yPosition += 8;
      });
    }

    // =========================== FOOTER ===========================
const totalPages = (doc as any).internal.getNumberOfPages();

for (let i = 1; i <= totalPages; i++) {
  doc.setPage(i);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  // Footer en cada página
  const footerY = doc.internal.pageSize.height - 10;
  doc.text(`Pagina ${i} de ${totalPages}`, pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Generado por ParkyFilms - ${fechaReporte}`, pageWidth / 2, footerY - 5, { align: 'center' });
}

    // =========================== GUARDAR PDF ===========================
    const fileName = `reporte-logs-parkyfilms-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    this.toastService.showSuccess('📄 Reporte PDF generado y descargado exitosamente');

  } catch (error) {
    console.error('Error al generar PDF:', error);
    this.toastService.showError('Error al generar el reporte PDF');
  }
}
}
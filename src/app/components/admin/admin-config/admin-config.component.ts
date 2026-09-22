// src/app/components/admin/admin-config/admin-config.component.ts
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { Router } from '@angular/router';
import jsPDF from 'jspdf';

export interface ConfiguracionSistema {
  id?: number;
  clave: string;
  valor: string;
  descripcion: string;
  tipo: 'string' | 'number' | 'boolean' | 'json';
  fechaActualizacion?: string;
}

@Component({
  selector: 'app-admin-config',
  standalone: false,
  templateUrl: './admin-config.component.html',
  styleUrls: ['./admin-config.component.css']
})
export class AdminConfigComponent implements OnInit {

  // Datos de configuración
  configuraciones: ConfiguracionSistema[] = [];
  configuracionesFiltradas: ConfiguracionSistema[] = [];
  
  // Estados
  cargando = true;
  procesando = false;
  
  // Filtros
  filtroTipo = '';
  terminoBusqueda = '';
  
  // Edición
  configuracionEditando: ConfiguracionSistema | null = null;
  valorTemporal = '';
  
  // Estadísticas
  estadisticas = {
    total: 0,
    porTipo: {} as { [key: string]: number },
    ultimaActualizacion: ''
  };

  constructor(
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAdmin()) {
      this.toastService.showError('No tienes permisos para acceder a la configuración');
      this.router.navigate(['/home']);
      return;
    }

    this.cargarConfiguraciones();
  }

  // ==================== CARGA DE DATOS ====================

  cargarConfiguraciones(): void {
    this.cargando = true;
    
    // Simular carga desde API
    setTimeout(() => {
      // Datos basados en tu tabla configuracion_sistema
      this.configuraciones = [
        {
          id: 1,
          clave: 'puntos_por_dolar',
          valor: '1',
          descripcion: 'Puntos ganados por cada dólar gastado',
          tipo: 'number',
          fechaActualizacion: new Date().toISOString()
        },
        {
          id: 2,
          clave: 'puntos_bienvenida',
          valor: '50',
          descripcion: 'Puntos de bienvenida para nuevos usuarios',
          tipo: 'number',
          fechaActualizacion: new Date().toISOString()
        },
        {
          id: 3,
          clave: 'precio_entrada_base',
          valor: '8.50',
          descripcion: 'Precio base de entrada estándar',
          tipo: 'number',
          fechaActualizacion: new Date().toISOString()
        },
        {
          id: 4,
          clave: 'precio_vip_multiplicador',
          valor: '1.5',
          descripcion: 'Multiplicador para asientos VIP',
          tipo: 'number',
          fechaActualizacion: new Date().toISOString()
        },
        {
          id: 5,
          clave: 'impuesto_porcentaje',
          valor: '8',
          descripcion: 'Porcentaje de impuestos',
          tipo: 'number',
          fechaActualizacion: new Date().toISOString()
        },
        {
          id: 6,
          clave: 'cargo_servicio_porcentaje',
          valor: '5',
          descripcion: 'Porcentaje de cargo por servicio',
          tipo: 'number',
          fechaActualizacion: new Date().toISOString()
        },
        {
          id: 7,
          clave: 'nombre_sistema',
          valor: 'ParkyFilms',
          descripcion: 'Nombre del sistema de cine',
          tipo: 'string',
          fechaActualizacion: new Date().toISOString()
        },
        {
          id: 8,
          clave: 'sistema_activo',
          valor: 'true',
          descripcion: 'Estado general del sistema',
          tipo: 'boolean',
          fechaActualizacion: new Date().toISOString()
        }
      ];

      this.aplicarFiltros();
      this.calcularEstadisticas();
      this.cargando = false;
      
      this.toastService.showSuccess('Configuraciones cargadas desde la base de datos');
    }, 1000);
  }

  // ==================== FILTROS ====================

  aplicarFiltros(): void {
    this.configuracionesFiltradas = this.configuraciones.filter(config => {
      const cumpleBusqueda = this.cumpleFiltroTexto(config);
      const cumpleTipo = !this.filtroTipo || config.tipo === this.filtroTipo;
      
      return cumpleBusqueda && cumpleTipo;
    });
  }

  private cumpleFiltroTexto(config: ConfiguracionSistema): boolean {
    if (!this.terminoBusqueda.trim()) return true;
    
    const termino = this.terminoBusqueda.toLowerCase();
    return [config.clave, config.descripcion, config.valor]
      .some(campo => campo.toLowerCase().includes(termino));
  }

  limpiarFiltros(): void {
    this.terminoBusqueda = '';
    this.filtroTipo = '';
    this.aplicarFiltros();
    this.toastService.showInfo('Filtros limpiados');
  }

  // ==================== EDICIÓN ====================

  iniciarEdicion(config: ConfiguracionSistema): void {
    this.configuracionEditando = { ...config };
    this.valorTemporal = config.valor;
  }

  cancelarEdicion(): void {
    this.configuracionEditando = null;
    this.valorTemporal = '';
  }

  guardarConfiguracion(): void {
    if (!this.configuracionEditando) return;

    // Validar el valor según el tipo
    const validacion = this.validarValor(this.valorTemporal, this.configuracionEditando.tipo);
    
    if (!validacion.valido) {
      this.toastService.showError(validacion.error || 'Valor inválido');
      return;
    }

    this.procesando = true;
    
    // Simular guardado en API
    setTimeout(() => {
      const index = this.configuraciones.findIndex(c => c.id === this.configuracionEditando!.id);
      
      if (index !== -1) {
        this.configuraciones[index].valor = this.valorTemporal;
        this.configuraciones[index].fechaActualizacion = new Date().toISOString();
        
        this.toastService.showSuccess(`Configuración "${this.configuracionEditando!.descripcion}" actualizada`);
        
        this.aplicarFiltros();
        this.calcularEstadisticas();
        this.cancelarEdicion();
      }
      
      this.procesando = false;
    }, 1000);
  }

  private validarValor(valor: string, tipo: string): { valido: boolean; error?: string } {
    switch (tipo) {
      case 'number':
        const num = parseFloat(valor);
        if (isNaN(num)) {
          return { valido: false, error: 'Debe ser un número válido' };
        }
        if (num < 0) {
          return { valido: false, error: 'No puede ser negativo' };
        }
        return { valido: true };
        
      case 'boolean':
        if (!['true', 'false'].includes(valor.toLowerCase())) {
          return { valido: false, error: 'Debe ser "true" o "false"' };
        }
        return { valido: true };
        
      case 'string':
        if (!valor.trim()) {
          return { valido: false, error: 'No puede estar vacío' };
        }
        return { valido: true };
        
      default:
        return { valido: true };
    }
  }

  // ==================== ACCIONES ESPECIALES ====================

  resetearConfiguracion(config: ConfiguracionSistema): void {
    const confirmar = confirm(
      `¿Estás seguro de resetear "${config.descripcion}" a su valor por defecto?`
    );

    if (confirmar) {
      this.procesando = true;
      
      // Valores por defecto
      const valoresPorDefecto: { [key: string]: string } = {
        'puntos_por_dolar': '1',
        'puntos_bienvenida': '50',
        'precio_entrada_base': '8.50',
        'precio_vip_multiplicador': '1.5',
        'impuesto_porcentaje': '8',
        'cargo_servicio_porcentaje': '5',
        'nombre_sistema': 'ParkyFilms',
        'sistema_activo': 'true'
      };

      setTimeout(() => {
        const valorDefecto = valoresPorDefecto[config.clave] || config.valor;
        
        const index = this.configuraciones.findIndex(c => c.id === config.id);
        if (index !== -1) {
          this.configuraciones[index].valor = valorDefecto;
          this.configuraciones[index].fechaActualizacion = new Date().toISOString();
        }

        this.aplicarFiltros();
        this.calcularEstadisticas();
        this.procesando = false;
        
        this.toastService.showSuccess(`"${config.descripcion}" reseteada al valor por defecto`);
      }, 800);
    }
  }

  exportarConfiguraciones(): void {
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
    doc.setFont('helvetica', 'bold');
    doc.text('CONFIGURACION DEL SISTEMA', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 10;
    doc.setFontSize(16);
    doc.text('ParkyFilms - Sistema de Gestion de Cine', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${fechaReporte} | Hora: ${horaReporte}`, pageWidth / 2, yPosition, { align: 'center' });
    
    // Línea separadora
    yPosition += 10;
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 15;

    // =========================== ESTADÍSTICAS ===========================
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('ESTADISTICAS DE CONFIGURACION', margin, yPosition);
    yPosition += 15;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    // Estadísticas en dos columnas
    const col1 = margin;
    const col2 = pageWidth / 2;

    doc.text(`Total Configuraciones: ${this.estadisticas.total}`, col1, yPosition);
    doc.text(`Ultima Actualizacion: ${this.estadisticas.ultimaActualizacion}`, col2, yPosition);
    yPosition += 12;

    // Estadísticas por tipo
    const tipos = this.getTiposDisponibles();
    tipos.forEach((tipo, index) => {
      const cantidad = this.estadisticas.porTipo[tipo] || 0;
      if (index % 2 === 0) {
        doc.text(`${tipo.toUpperCase()}: ${cantidad}`, col1, yPosition);
      } else {
        doc.text(`${tipo.toUpperCase()}: ${cantidad}`, col2, yPosition);
        yPosition += 10;
      }
    });
    
    yPosition += 15;

    // =========================== CONFIGURACIONES ===========================
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`CONFIGURACIONES DETALLADAS (${this.configuracionesFiltradas.length})`, margin, yPosition);
    yPosition += 15;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    // Encabezados de tabla
    doc.setFont('helvetica', 'bold');
    doc.text('Clave', margin, yPosition);
    doc.text('Tipo', margin + 50, yPosition);
    doc.text('Valor', margin + 75, yPosition);
    doc.text('Descripcion', margin + 110, yPosition);
    yPosition += 8;

    // Línea bajo encabezados
    doc.line(margin, yPosition - 3, pageWidth - margin, yPosition - 3);
    doc.setFont('helvetica', 'normal');

    // Mostrar todas las configuraciones
    this.configuracionesFiltradas.forEach((config) => {
      // Verificar si necesitamos nueva página
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
        
        // Repetir encabezados en nueva página
        doc.setFont('helvetica', 'bold');
        doc.text('Clave', margin, yPosition);
        doc.text('Tipo', margin + 50, yPosition);
        doc.text('Valor', margin + 75, yPosition);
        doc.text('Descripcion', margin + 110, yPosition);
        yPosition += 8;
        doc.line(margin, yPosition - 3, pageWidth - margin, yPosition - 3);
        doc.setFont('helvetica', 'normal');
      }

      // Formatear datos para el PDF
      const claveCorta = config.clave.length > 20 
        ? config.clave.substring(0, 17) + '...' 
        : config.clave;
      
      const valorFormateado = this.formatearValorParaPDF(config.valor, config.tipo);
      const valorCorto = valorFormateado.length > 15 
        ? valorFormateado.substring(0, 12) + '...' 
        : valorFormateado;
      
      const descripcionCorta = config.descripcion.length > 35 
        ? config.descripcion.substring(0, 32) + '...' 
        : config.descripcion;

      // Mostrar datos
      doc.text(claveCorta, margin, yPosition);
      doc.text(config.tipo, margin + 50, yPosition);
      doc.text(valorCorto, margin + 75, yPosition);
      doc.text(descripcionCorta, margin + 110, yPosition);

      // Marcar configuraciones críticas
      if (this.isConfiguracionCritica(config.clave)) {
        doc.setFontSize(8);
        doc.text('(CRITICA)', margin + 180, yPosition);
        doc.setFontSize(10);
      }

      yPosition += 8;
    });

    // =========================== CONFIGURACIONES CRÍTICAS ===========================
    yPosition += 15;
    
    // Verificar si necesitamos nueva página
    if (yPosition > 200) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('CONFIGURACIONES CRITICAS', margin, yPosition);
    yPosition += 15;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const configsCriticas = this.configuracionesFiltradas.filter(config => 
      this.isConfiguracionCritica(config.clave)
    );

    if (configsCriticas.length > 0) {
      configsCriticas.forEach((config) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.text(`• ${config.clave}:`, margin, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(`${this.formatearValorParaPDF(config.valor, config.tipo)}`, margin + 60, yPosition);
        yPosition += 8;
        
        doc.text(`  ${config.descripcion}`, margin + 5, yPosition);
        yPosition += 12;
      });
    } else {
      doc.text('No hay configuraciones criticas en el filtro actual.', margin, yPosition);
    }

    // =========================== INFORMACIÓN ADICIONAL ===========================
    yPosition += 15;
    
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACION ADICIONAL', margin, yPosition);
    yPosition += 15;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const infoTexto = [
      '• Las configuraciones criticas afectan directamente el funcionamiento del sistema.',
      '• Los cambios en precios e impuestos se reflejan inmediatamente en nuevas compras.',
      '• El estado del sistema controla si el sitio web esta disponible para usuarios.',
      '• Se recomienda hacer respaldos antes de modificar configuraciones criticas.'
    ];

    infoTexto.forEach((texto) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(texto, margin, yPosition);
      yPosition += 8;
    });

    // =========================== GUARDAR PDF ===========================
    const fileName = `configuracion-sistema-parkyfilms-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    this.toastService.showSuccess('📄 Configuracion exportada a PDF exitosamente');

  } catch (error) {
    console.error('Error al generar PDF de configuracion:', error);
    this.toastService.showError('Error al generar el reporte PDF');
  }
}

// Función auxiliar para formatear valores en el PDF
private formatearValorParaPDF(valor: string, tipo: string): string {
  switch (tipo) {
    case 'number':
      const num = parseFloat(valor);
      return isNaN(num) ? valor : num.toString();
    case 'boolean':
      return valor.toLowerCase() === 'true' ? 'ACTIVO' : 'INACTIVO';
    default:
      return valor;
  }
}

  // ==================== ESTADÍSTICAS ====================

  private calcularEstadisticas(): void {
    const stats = this.configuraciones.reduce((acc, config) => {
      acc.total++;
      acc.porTipo[config.tipo] = (acc.porTipo[config.tipo] || 0) + 1;
      return acc;
    }, {
      total: 0,
      porTipo: {} as { [key: string]: number }
    });

    this.estadisticas = {
      ...stats,
      ultimaActualizacion: this.getUltimaActualizacion()
    };
  }

  private getUltimaActualizacion(): string {
    const fechas = this.configuraciones.map(c => new Date(c.fechaActualizacion || ''));
    const ultimaFecha = new Date(Math.max(...fechas.map(f => f.getTime())));
    
    return ultimaFecha.toLocaleString('es-ES');
  }

  // ==================== UTILIDADES ====================

  getTiposDisponibles(): string[] {
    return ['number', 'string', 'boolean', 'json'];
  }

  getIconoTipo(tipo: string): string {
    const iconos: { [key: string]: string } = {
      'number': 'fas fa-hashtag',
      'string': 'fas fa-font',
      'boolean': 'fas fa-toggle-on',
      'json': 'fas fa-code'
    };
    return iconos[tipo] || 'fas fa-cog';
  }

  getColorTipo(tipo: string): string {
    const colores: { [key: string]: string } = {
      'number': 'primary',
      'string': 'success',
      'boolean': 'warning',
      'json': 'info'
    };
    return colores[tipo] || 'secondary';
  }

  formatearValor(valor: string, tipo: string): string {
    switch (tipo) {
      case 'number':
        const num = parseFloat(valor);
        return isNaN(num) ? valor : num.toString();
      case 'boolean':
        return valor.toLowerCase() === 'true' ? '✅ Activo' : '❌ Inactivo';
      default:
        return valor;
    }
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  isConfiguracionCritica(clave: string): boolean {
    const criticas = ['precio_entrada_base', 'impuesto_porcentaje', 'sistema_activo'];
    return criticas.includes(clave);
  }
trackConfig(index: number, config: ConfiguracionSistema): any {
  return config.id || index;
}
  refreshConfiguraciones(): void {
    this.cargarConfiguraciones();
  }
}
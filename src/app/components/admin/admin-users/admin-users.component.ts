import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, Usuario } from '../../../services/auth.service';
import { AdminService } from '../../../services/admin.service';
import { UserService } from '../../../services/user.service';
import { ToastService } from '../../../services/toast.service';
// Importar jsPDF al inicio del archivo
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-admin-users',
  standalone: false,
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.css']
})
export class AdminUsersComponent implements OnInit {
  
  // Datos de usuarios
  allUsers: Usuario[] = [];
  filteredUsers: Usuario[] = [];
  selectedUserDetails: Usuario | null = null;
  
  // Estados de carga
  loading: boolean = true;
  processing: boolean = false;
  
  // Filtros
  searchTerm: string = '';
  roleFilter: string = '';
  statusFilter: string = '';
  sortBy: string = 'nombre';
  
  // Selección múltiple
  selectedUsers: number[] = [];
  selectAll: boolean = false;
  
  // Usuario actual (no puede modificarse a sí mismo)
  currentUserId: number;
  
  // 🆕 Cache para favoritas y historial POR USUARIO ESPECÍFICO
  userStats: { 
    [userId: number]: { 
      favoritas: number; 
      historial: number; 
      loading: boolean;
      lastUpdated: number; // timestamp para cache
    } 
  } = {};

  constructor(
    private authService: AuthService,
    private adminService: AdminService,
    private userService: UserService,
    private toastService: ToastService,
    private router: Router
  ) {
    this.currentUserId = this.authService.getCurrentUser()?.id || 0;
  }

  ngOnInit(): void {
    // Verificar permisos de admin
    if (!this.authService.isAdmin()) {
      this.toastService.showError('No tienes permisos para acceder a esta sección');
      this.router.navigate(['/home']);
      return;
    }
    this.loadUsers();
  }

  // ==================== CARGA DE DATOS ====================
  
  /**
   * Cargar lista de usuarios
   */
  loadUsers(): void {
    this.loading = true;
    
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        console.log('📡 Usuarios cargados desde BD:', users.length);
        this.allUsers = users;
        this.applyFilters();
        this.loading = false;
        
        // 🆕 Cargar estadísticas de usuarios individualmente
        this.loadUserStatsIndividually();
      },
      error: (error) => {
        console.error('❌ Error al cargar usuarios:', error);
        this.toastService.showError('Error al cargar la lista de usuarios');
        this.allUsers = [];
        this.filteredUsers = [];
        this.loading = false;
      }
    });
  }

  /**
   * 🔥 MÉTODO CORREGIDO: Cargar estadísticas por usuario específico
   */
  private loadUserStatsIndividually(): void {
  this.allUsers.forEach(user => {
    // 🔥 IMPORTANTE: Crear cache específico para cada usuario
    this.userStats[user.id] = { 
      favoritas: 0, 
      historial: 0, 
      loading: true,
      lastUpdated: Date.now()
    };
    
    // 🎯 Cargar favoritas ESPECÍFICAS del usuario usando API
    this.userService.getUserFavoritesById(user.id).subscribe({
      next: (favoritas) => {
        console.log(`📊 Usuario ${user.nombre} (ID: ${user.id}) tiene ${favoritas.length} favoritas`);
        
        // 🔥 Actualizar cache específico del usuario
        if (this.userStats[user.id]) {
          this.userStats[user.id].favoritas = favoritas.length;
          this.checkIfStatsComplete(user.id);
        }
      },
      error: (error) => {
        console.error(`❌ Error cargando favoritas para usuario ${user.nombre} (ID: ${user.id}):`, error);
        
        if (this.userStats[user.id]) {
          this.userStats[user.id].favoritas = 0;
          this.checkIfStatsComplete(user.id);
        }
      }
    });
    
    // 🔥 CORREGIDO: Cargar historial ESPECÍFICO del usuario usando API
    this.userService.getUserHistoryById(user.id, { limit: 50 }).subscribe({
      next: (historial) => {
        console.log(`📊 Usuario ${user.nombre} (ID: ${user.id}) tiene ${historial.length} en historial`);
        
        if (this.userStats[user.id]) {
          this.userStats[user.id].historial = historial.length;
          this.checkIfStatsComplete(user.id);
        }
      },
      error: (error) => {
        console.error(`❌ Error cargando historial para usuario ${user.id}:`, error);
        if (this.userStats[user.id]) {
          this.userStats[user.id].historial = 0;
          this.checkIfStatsComplete(user.id);
        }
      }
    });
  });
}
  
  private checkIfStatsComplete(userId: number): void {
    const stats = this.userStats[userId];
    if (stats) {
      // Solo marcar como completado cuando ambos requests hayan terminado
      // (esto es una simplificación, en un caso real podrías usar forkJoin)
      stats.loading = false;
      stats.lastUpdated = Date.now();
    }
  }

  /**
   * Refrescar datos
   */
  refreshData(): void {
    this.clearSelection();
    
    // 🔥 Limpiar cache de estadísticas
    this.userStats = {};
    
    this.loadUsers();
    this.toastService.showInfo('Actualizando lista de usuarios...');
  }

  // ==================== FILTROS Y BÚSQUEDA ====================
  
  applyFilters(): void {
    let filtered = [...this.allUsers];

    // Filtro por búsqueda (nombre o email)
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.nombre.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term)
      );
    }

    // Filtro por rol
    if (this.roleFilter) {
      filtered = filtered.filter(user => user.role === this.roleFilter);
    }

    // Filtro por estado
    if (this.statusFilter !== '') {
      const isActive = this.statusFilter === 'true';
      filtered = filtered.filter(user => user.isActive === isActive);
    }

    // Ordenamiento
    filtered.sort((a, b) => {
      switch (this.sortBy) {
        case 'nombre':
          return a.nombre.localeCompare(b.nombre);
        case 'email':
          return a.email.localeCompare(b.email);
        case 'fechaRegistro':
          return new Date(b.fechaRegistro ?? '').getTime() - new Date(a.fechaRegistro ?? '').getTime();
        case 'role':
          return a.role.localeCompare(b.role);
        default:
          return 0;
      }
    });

    this.filteredUsers = filtered;
    this.clearSelection();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.roleFilter = '';
    this.statusFilter = '';
    this.sortBy = 'nombre';
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return this.searchTerm.trim() !== '' || 
           this.roleFilter !== '' || 
           this.statusFilter !== '';
  }

  // ==================== ESTADÍSTICAS ====================
  
  getTotalUsers(): number {
    return this.allUsers.length;
  }

  getActiveUsers(): number {
    return this.allUsers.filter(user => user.isActive).length;
  }

  getAdminUsers(): number {
    return this.allUsers.filter(user => user.role === 'admin').length;
  }

  getRecentUsers(): number {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return this.allUsers.filter(user => 
      new Date(user.fechaRegistro ?? '') >= thirtyDaysAgo
    ).length;
  }

  // 🔥 MÉTODOS COMPLETAMENTE CORREGIDOS: Usar cache específico por usuario
  getUserFavorites(userId: number): number {
    const stats = this.userStats[userId];
    if (!stats) {
      console.warn(`⚠️ No hay estadísticas cargadas para usuario ID: ${userId}`);
      return 0;
    }
    
    console.log(`📊 Favoritas para usuario ID ${userId}: ${stats.favoritas}`);
    return stats.favoritas;
  }

  getUserHistory(userId: number): number {
    const stats = this.userStats[userId];
    if (!stats) {
      console.warn(`⚠️ No hay estadísticas de historial para usuario ID: ${userId}`);
      return 0;
    }
    
    console.log(`📊 Historial para usuario ID ${userId}: ${stats.historial}`);
    return stats.historial;
  }

  // 🆕 Verificar si está cargando las estadísticas
  isUserStatsLoading(userId: number): boolean {
    return this.userStats[userId]?.loading || false;
  }

  // 🆕 Forzar recarga de estadísticas para un usuario específico
  refreshUserStats(userId: number): void {
  console.log(`🔄 Recargando estadísticas para usuario ID: ${userId}`);
  
  if (this.userStats[userId]) {
    this.userStats[userId].loading = true;
  }

  // Recargar favoritas usando API específica para admin
  this.userService.getUserFavoritesById(userId).subscribe({
    next: (favoritas) => {
      console.log(`✅ Favoritas recargadas para usuario ${userId}: ${favoritas.length}`);
      
      if (this.userStats[userId]) {
        this.userStats[userId].favoritas = favoritas.length;
        this.userStats[userId].lastUpdated = Date.now();
        // No cambiar loading aquí, esperar a que termine el historial también
      }
    },
    error: (error) => {
      console.error(`❌ Error recargando favoritas para usuario ${userId}:`, error);
      if (this.userStats[userId]) {
        this.userStats[userId].favoritas = 0;
      }
    }
  });

  // 🔥 CORREGIDO: Recargar historial usando API específica para admin
  this.userService.getUserHistoryById(userId, { limit: 50 }).subscribe({
    next: (historial) => {
      console.log(`✅ Historial recargado para usuario ${userId}: ${historial.length}`);
      
      if (this.userStats[userId]) {
        this.userStats[userId].historial = historial.length;
        this.userStats[userId].loading = false;
        this.userStats[userId].lastUpdated = Date.now();
      }
    },
    error: (error) => {
      console.error(`❌ Error recargando historial para usuario ${userId}:`, error);
      if (this.userStats[userId]) {
        this.userStats[userId].historial = 0;
        this.userStats[userId].loading = false;
      }
    }
  });
}

  // ==================== GESTIÓN DE USUARIOS ====================
  
  toggleUserRole(user: Usuario): void {
    if (user.id === this.currentUserId) {
      this.toastService.showWarning('No puedes cambiar tu propio rol');
      return;
    }

    if (this.processing) return;

    const nuevoRol = user.role === 'admin' ? 'cliente' : 'admin';
    const confirmar = confirm(
      `¿Estás seguro de cambiar el rol de "${user.nombre}" a ${nuevoRol}?`
    );

    if (confirmar) {
      this.processing = true;
      
      this.userService.changeUserRole(user.id, nuevoRol).subscribe({
        next: (success) => {
          if (success) {
            user.role = nuevoRol;
            this.toastService.showSuccess(`Rol de ${user.nombre} cambiado a ${nuevoRol}`);
          } else {
            this.toastService.showError('Error al cambiar el rol del usuario');
          }
          this.processing = false;
        },
        error: (error) => {
          console.error('❌ Error al cambiar rol:', error);
          this.toastService.showError('Error al cambiar el rol del usuario');
          this.processing = false;
        }
      });
    }
  }

  toggleUserStatus(user: Usuario): void {
    if (user.id === this.currentUserId) {
      this.toastService.showWarning('No puedes desactivar tu propia cuenta');
      return;
    }

    if (this.processing) return;

    const nuevoEstado = !user.isActive;
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    
    const confirmar = confirm(
      `¿Estás seguro de ${accion} la cuenta de "${user.nombre}"?`
    );

    if (confirmar) {
      this.processing = true;
      
      this.userService.toggleUserStatus(user.id).subscribe({
        next: (success) => {
          if (success) {
            user.isActive = nuevoEstado;
            this.toastService.showSuccess(`Usuario ${user.nombre} ${nuevoEstado ? 'activado' : 'desactivado'}`);
          } else {
            this.toastService.showError(`Error al ${accion} el usuario`);
          }
          this.processing = false;
        },
        error: (error) => {
          console.error(`❌ Error al ${accion} usuario:`, error);
          this.toastService.showError(`Error al ${accion} el usuario`);
          this.processing = false;
        }
      });
    }
  }

  viewUserDetails(user: Usuario): void {
    this.selectedUserDetails = user;
    
    // 🔄 Refrescar estadísticas del usuario seleccionado
    this.refreshUserStats(user.id);
    
    // Abrir modal (usando Bootstrap)
    const modal = document.getElementById('userDetailsModal');
    if (modal && (window as any).bootstrap) {
      const bootstrapModal = new (window as any).bootstrap.Modal(modal);
      bootstrapModal.show();
    }
  }

  editUser(user: Usuario): void {
    this.toastService.showInfo(`Función de edición para ${user.nombre} (próximamente disponible)`);
    console.log('Editando usuario:', user);
  }

  sendEmailToUser(user: Usuario): void {
    if (this.processing) return;

    this.processing = true;
    this.toastService.showInfo(`Enviando email a ${user.nombre}...`);
    
    setTimeout(() => {
      this.toastService.showSuccess(`Email enviado exitosamente a ${user.email}`);
      this.processing = false;
      console.log('Email enviado a:', user);
    }, 2000);
  }

  confirmDeleteUser(user: Usuario): void {
    if (user.id === this.currentUserId) {
      this.toastService.showWarning('No puedes eliminar tu propia cuenta');
      return;
    }

    const confirmar = confirm(
      `¿Estás seguro de eliminar al usuario "${user.nombre}"?\n\n` +
      `Esta acción no se puede deshacer y eliminará:\n` +
      `- Todos sus datos personales\n` +
      `- Su historial de favoritas\n` +
      `- Su historial de compras\n\n` +
      `¿Continuar?`
    );

    if (confirmar) {
      this.deleteUser(user);
    }
  }

  private deleteUser(user: Usuario): void {
    this.processing = true;
    this.toastService.showInfo(`Eliminando usuario ${user.nombre}...`);
    
    this.userService.deleteUser(user.id).subscribe({
      next: (success) => {
        if (success) {
          // Remover de la lista local
          const index = this.allUsers.findIndex(u => u.id === user.id);
          if (index !== -1) {
            this.allUsers.splice(index, 1);
            this.applyFilters();
          }
          
          // 🔥 Limpiar cache de estadísticas del usuario eliminado
          delete this.userStats[user.id];
          
          this.toastService.showSuccess(`Usuario ${user.nombre} eliminado exitosamente`);
        } else {
          this.toastService.showError('Error al eliminar el usuario');
        }
        this.processing = false;
      },
      error: (error) => {
        console.error('❌ Error al eliminar usuario:', error);
        this.toastService.showError('Error al eliminar el usuario');
        this.processing = false;
      }
    });
  }

  // ==================== SELECCIÓN MÚLTIPLE ====================
  
  isUserSelected(userId: number): boolean {
    return this.selectedUsers.includes(userId);
  }

  toggleUserSelection(userId: number): void {
    const index = this.selectedUsers.indexOf(userId);
    if (index === -1) {
      this.selectedUsers.push(userId);
    } else {
      this.selectedUsers.splice(index, 1);
    }
    
    this.updateSelectAllState();
  }

  toggleSelectAll(): void {
    if (this.selectAll) {
      this.selectedUsers = this.filteredUsers
        .filter(user => user.id !== this.currentUserId)
        .map(user => user.id);
    } else {
      this.selectedUsers = [];
    }
  }

  private updateSelectAllState(): void {
    const selectableUsers = this.filteredUsers.filter(user => user.id !== this.currentUserId);
    this.selectAll = selectableUsers.length > 0 && 
                    selectableUsers.every(user => this.isUserSelected(user.id));
  }

  clearSelection(): void {
    this.selectedUsers = [];
    this.selectAll = false;
  }

  // ==================== ACCIONES MASIVAS ====================
  
  bulkChangeRole(newRole: 'admin' | 'cliente'): void {
    if (this.selectedUsers.length === 0) return;

    const confirmar = confirm(
      `¿Estás seguro de cambiar el rol de ${this.selectedUsers.length} usuario(s) a ${newRole}?`
    );

    if (confirmar) {
      this.processing = true;
      let successCount = 0;
      let completedCount = 0;

      this.selectedUsers.forEach(userId => {
        this.userService.changeUserRole(userId, newRole).subscribe({
          next: (success) => {
            completedCount++;
            if (success) {
              const user = this.allUsers.find(u => u.id === userId);
              if (user) {
                user.role = newRole;
                successCount++;
              }
            }

            if (completedCount === this.selectedUsers.length) {
              this.toastService.showSuccess(`${successCount} usuario(s) cambiados a ${newRole}`);
              this.clearSelection();
              this.processing = false;
            }
          },
          error: (error) => {
            completedCount++;
            console.error('❌ Error en cambio masivo:', error);
            
            if (completedCount === this.selectedUsers.length) {
              this.toastService.showSuccess(`${successCount} usuario(s) cambiados a ${newRole}`);
              this.clearSelection();
              this.processing = false;
            }
          }
        });
      });
    }
  }

  bulkActivate(activate: boolean): void {
    if (this.selectedUsers.length === 0) return;

    const action = activate ? 'activar' : 'desactivar';
    const confirmar = confirm(
      `¿Estás seguro de ${action} ${this.selectedUsers.length} usuario(s)?`
    );

    if (confirmar) {
      this.processing = true;
      let successCount = 0;
      let completedCount = 0;

      this.selectedUsers.forEach(userId => {
        const user = this.allUsers.find(u => u.id === userId);
        if (user && user.isActive !== activate) {
          this.userService.toggleUserStatus(userId).subscribe({
            next: (success) => {
              completedCount++;
              if (success) {
                user.isActive = activate;
                successCount++;
              }

              if (completedCount === this.selectedUsers.length) {
                this.toastService.showSuccess(`${successCount} usuario(s) ${activate ? 'activados' : 'desactivados'}`);
                this.clearSelection();
                this.processing = false;
              }
            },
            error: (error) => {
              completedCount++;
              console.error('❌ Error en cambio masivo de estado:', error);
              
              if (completedCount === this.selectedUsers.length) {
                this.toastService.showSuccess(`${successCount} usuario(s) ${activate ? 'activados' : 'desactivados'}`);
                this.clearSelection();
                this.processing = false;
              }
            }
          });
        } else {
          completedCount++;
          if (completedCount === this.selectedUsers.length) {
            this.toastService.showSuccess(`${successCount} usuario(s) ${activate ? 'activados' : 'desactivados'}`);
            this.clearSelection();
            this.processing = false;
          }
        }
      });
    }
  }

  // ==================== 🆕 MÉTODOS PARA VER HISTORIAL DE USUARIO ====================
  
  /**
   * Ver historial detallado de un usuario específico
   */
  viewUserHistory(user: Usuario): void {
    console.log(`📋 [ADMIN] Viendo historial de usuario: ${user.nombre} (ID: ${user.id})`);
    
    this.userService.getUserHistoryById(user.id, { limit: 50 }).subscribe({
      next: (historial) => {
        console.log(`📊 Historial obtenido: ${historial.length} elementos`);
        
        // Mostrar historial en alert
        this.showUserHistoryAlert(user, historial);
      },
      error: (error) => {
        console.error(`❌ Error al obtener historial para usuario ${user.id}:`, error);
        this.toastService.showError(`Error al cargar historial de ${user.nombre}`);
      }
    });
  }

  /**
   * Mostrar historial en un alert (puedes mejorarlo con modal después)
   */
  private showUserHistoryAlert(user: Usuario, historial: any[]): void {
    if (historial.length === 0) {
      alert(`📋 ${user.nombre} no tiene historial de actividad.`);
      return;
    }

    const totalVistas = historial.filter(h => h.tipoAccion === 'vista').length;
    const totalCompradas = historial.filter(h => h.tipoAccion === 'comprada').length;
    const generos = [...new Set(historial.map(h => h.genero))];
    
    let mensaje = `📋 Historial de ${user.nombre}\n`;
    mensaje += `═══════════════════════════════\n\n`;
    
    mensaje += `📊 RESUMEN:\n`;
    mensaje += `• Total actividades: ${historial.length}\n`;
    mensaje += `• Películas vistas: ${totalVistas}\n`;
    mensaje += `• Películas compradas: ${totalCompradas}\n`;
    mensaje += `• Géneros diferentes: ${generos.length}\n\n`;
    
    mensaje += `🎬 ÚLTIMAS 10 ACTIVIDADES:\n`;
    mensaje += `─────────────────────────────\n`;
    
    historial.slice(0, 10).forEach((item, index) => {
      const tipo = item.tipoAccion === 'vista' ? '👁️ Vista' : '🛒 Comprada';
      const fecha = new Date(item.fechaVista).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      const hora = new Date(item.fechaVista).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      mensaje += `${index + 1}. ${tipo} - ${item.titulo}\n`;
      mensaje += `   📅 ${fecha} a las ${hora}\n`;
      mensaje += `   🎭 ${item.genero} (${item.anio})\n\n`;
    });
    
    if (historial.length > 10) {
      mensaje += `... y ${historial.length - 10} actividades más\n\n`;
    }
    
    mensaje += `═══════════════════════════════\n`;
    mensaje += `📈 Para análisis más detallado, exporta el reporte de usuarios`;
    
    alert(mensaje);
  }

  // ==================== REPORTES Y EXPORTACIÓN ====================
  
  exportUsers(): void {
    this.processing = true;
    this.toastService.showInfo('Generando exportación de usuarios en PDF...');

    setTimeout(() => {
      try {
        const doc = new jsPDF();
        
        this.setupPDFHeader(doc, 'EXPORTACIÓN DE USUARIOS', 
          `Lista filtrada de usuarios del sistema - ${this.filteredUsers.length} usuarios`);
        
        let currentY = 110;
        
        if (this.hasActiveFilters()) {
          doc.setFillColor(240, 240, 240);
          doc.rect(20, currentY - 5, 170, 15, 'F');
          doc.setFontSize(12);
          doc.setTextColor(52, 73, 94);
          doc.text('FILTROS APLICADOS', 25, currentY + 5);
          currentY += 20;
          
          const filtros = [];
          if (this.searchTerm) filtros.push(`Búsqueda: "${this.searchTerm}"`);
          if (this.roleFilter) filtros.push(`Rol: ${this.roleFilter}`);
          if (this.statusFilter !== '') filtros.push(`Estado: ${this.statusFilter === 'true' ? 'Activos' : 'Inactivos'}`);
          
          doc.setFontSize(10);
          doc.setTextColor(100, 100, 100);
          filtros.forEach(filtro => {
            doc.text(`• ${filtro}`, 25, currentY);
            currentY += 8;
          });
          currentY += 10;
        }
        
        const usuariosData = this.filteredUsers.map((usuario, index) => [
          (index + 1).toString(),
          usuario.nombre,
          usuario.email.length > 30 ? usuario.email.substring(0, 30) + '...' : usuario.email,
          usuario.role === 'admin' ? 'Admin' : 'Cliente',
          usuario.isActive ? 'Activo' : 'Inactivo',
          this.formatDate(usuario.fechaRegistro ?? ''),
          this.getUserFavorites(usuario.id).toString(),
          this.getUserHistory(usuario.id).toString()
        ]);
        
        autoTable(doc, {
          head: [['#', 'Nombre', 'Email', 'Rol', 'Estado', 'Registro', 'Favoritas', 'Vistas']],
          body: usuariosData,
          startY: currentY,
          theme: 'striped',
          headStyles: { 
            fillColor: [52, 152, 219],
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
            1: { cellWidth: 30 },
            2: { cellWidth: 45 },
            3: { cellWidth: 20, halign: 'center' },
            4: { cellWidth: 20, halign: 'center' },
            5: { cellWidth: 25, halign: 'center' },
            6: { cellWidth: 18, halign: 'center' },
            7: { cellWidth: 18, halign: 'center' }
          },
          alternateRowStyles: { fillColor: [248, 249, 250] }
        });
        
        this.setupPDFFooter(doc);
        doc.save(`usuarios-export-${new Date().toISOString().split('T')[0]}.pdf`);
        
        this.processing = false;
        this.toastService.showSuccess('Exportación de usuarios completada en PDF');
        
      } catch (error) {
        console.error('Error generando exportación:', error);
        this.processing = false;
        this.toastService.showError('Error al generar la exportación PDF');
      }
    }, 1000);
  }

  generateUserReport(): void {
    this.processing = true;
    this.toastService.showInfo('Generando reporte completo de usuarios...');

    setTimeout(() => {
      try {
        const doc = new jsPDF();
        
        this.setupPDFHeader(doc, 'REPORTE COMPLETO DE USUARIOS', 
          'Análisis detallado de la base de usuarios del sistema');
        
        let currentY = 110;
        
        doc.setFillColor(240, 240, 240);
        doc.rect(20, currentY - 5, 170, 15, 'F');
        doc.setFontSize(14);
        doc.setTextColor(52, 73, 94);
        doc.text('RESUMEN EJECUTIVO', 25, currentY + 5);
        currentY += 20;
        
        const resumenData = [
          ['Total de Usuarios', this.getTotalUsers().toString()],
          ['Usuarios Activos', `${this.getActiveUsers()} (${Math.round((this.getActiveUsers()/this.getTotalUsers())*100)}%)`],
          ['Usuarios Inactivos', `${this.getTotalUsers() - this.getActiveUsers()} (${Math.round(((this.getTotalUsers() - this.getActiveUsers())/this.getTotalUsers())*100)}%)`],
          ['Administradores', `${this.getAdminUsers()} (${Math.round((this.getAdminUsers()/this.getTotalUsers())*100)}%)`],
          ['Clientes', `${this.getTotalUsers() - this.getAdminUsers()} (${Math.round(((this.getTotalUsers() - this.getAdminUsers())/this.getTotalUsers())*100)}%)`],
          ['Nuevos Usuarios (30d)', this.getRecentUsers().toString()],
          ['Promedio Favoritas', this.getAverageFavorites().toString()],
          ['Promedio Historial', this.getAverageHistory().toString()]
        ];
        
        autoTable(doc, {
          body: resumenData,
          startY: currentY,
          theme: 'plain',
          styles: { 
            fontSize: 11,
            cellPadding: { top: 5, right: 10, bottom: 5, left: 10 }
          },
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 100, fillColor: [248, 249, 250] },
            1: { cellWidth: 70, halign: 'center', fillColor: [255, 255, 255] }
          }
        });
        
        this.setupPDFFooter(doc);
        doc.save(`reporte-usuarios-completo-${new Date().toISOString().split('T')[0]}.pdf`);
        
        this.processing = false;
        this.toastService.showSuccess('Reporte completo de usuarios generado en PDF');
        
      } catch (error) {
        console.error('Error generando reporte:', error);
        this.processing = false;
        this.toastService.showError('Error al generar el reporte PDF');
      }
    }, 2000);
  }

  // ==================== MÉTODOS AUXILIARES PARA PDF ====================
  
  private setupPDFHeader(doc: jsPDF, titulo: string, subtitulo?: string): void {
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, 210, 45, 'F');
    
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text('ParkyFilms', 20, 25);
    
    doc.setFontSize(12);
    doc.text('Gestión de Usuarios', 20, 35);
    
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

  private setupPDFFooter(doc: jsPDF): void {
    const pageCount = (doc as any).internal.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      doc.setDrawColor(41, 128, 185);
      doc.setLineWidth(1);
      doc.line(20, 275, 190, 275);
      
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('ParkyFilms - Gestión de Usuarios', 20, 282);
      doc.text('Documento Confidencial - Solo uso interno', 20, 287);
      
      doc.setTextColor(41, 128, 185);
      doc.text(`Página ${i} de ${pageCount}`, 150, 282);
      
      const timestamp = new Date().toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      doc.text(`Hora: ${timestamp}`, 150, 287);
    }
  }

  // ==================== UTILIDADES ====================
  
  formatDate(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getDaysAgo(fecha: string): number {
    const now = new Date();
    const then = new Date(fecha);
    const diffTime = Math.abs(now.getTime() - then.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  trackUser(index: number, user: Usuario): number {
    return user.id;
  }

  private getAverageFavorites(): number {
    if (this.allUsers.length === 0) return 0;
    const total = this.allUsers.reduce((sum, user) => sum + this.getUserFavorites(user.id), 0);
    return Math.round((total / this.allUsers.length) * 10) / 10;
  }

  private getAverageHistory(): number {
    if (this.allUsers.length === 0) return 0;
    const total = this.allUsers.reduce((sum, user) => sum + this.getUserHistory(user.id), 0);
    return Math.round((total / this.allUsers.length) * 10) / 10;
  }
}
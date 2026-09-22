import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { OrderService, Order, OrderDetails, OrderStats } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-order-history',
  standalone: false,
  templateUrl: './order-history.component.html',
  styleUrls: ['./order-history.component.css']
})
export class OrderHistoryComponent implements OnInit, OnDestroy {

  orders: Order[] = [];
  stats: OrderStats | null = null;
  selectedOrder: OrderDetails | null = null;
  
  // Estados
  loading: boolean = true;
  loadingStats: boolean = true;
  loadingOrderDetails: boolean = false;
  loadingMore: boolean = false;
  
  // Paginación
  currentPage: number = 1;
  itemsPerPage: number = 10;
  hasMoreOrders: boolean = false;
  totalOrders: number = 0;
  
  // Filtros
  filterStatus: string = 'all';
  filterPaymentMethod: string = 'all';
  filterDateRange: string = 'all';
  showFilters: boolean = false;

  // Suscripciones
  private subscriptions = new Subscription();

  constructor(
    private orderService: OrderService,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.toastService.showWarning('Debes iniciar sesión para ver tu historial');
      this.router.navigate(['/login']);
      return;
    }
    
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // ==================== INICIALIZACIÓN ====================

  private loadInitialData(): void {
    this.loadOrders();
    this.loadStats();
  }

  // ==================== CARGAR DATOS ====================

  loadOrders(page: number = 1): void {
    if (page === 1) {
      this.loading = true;
    } else {
      this.loadingMore = true;
    }
    
    this.subscriptions.add(
      this.orderService.getUserOrders(page, this.itemsPerPage).subscribe({
        next: (orders: Order[]) => {
          if (page === 1) {
            this.orders = orders;
          } else {
            this.orders = [...this.orders, ...orders];
          }
          
          this.hasMoreOrders = orders.length === this.itemsPerPage;
          this.currentPage = page;
          this.totalOrders = this.orders.length;
          
          if (page === 1) {
            this.loading = false;
          } else {
            this.loadingMore = false;
          }
          
          console.log(`✅ ${orders.length} órdenes cargadas (página ${page})`);
        },
        error: (error) => {
          console.error('❌ Error cargando órdenes:', error);
          this.loading = false;
          this.loadingMore = false;
          this.toastService.showError('Error al cargar el historial de órdenes');
        }
      })
    );
  }

  loadStats(): void {
    this.loadingStats = true;
    
    this.subscriptions.add(
      this.orderService.getOrderStats().subscribe({
        next: (stats) => {
          this.stats = stats;
          this.loadingStats = false;
          console.log('✅ Estadísticas de órdenes cargadas:', stats);
        },
        error: (error) => {
          console.error('❌ Error cargando estadísticas:', error);
          this.loadingStats = false;
          this.stats = {
            totalOrdenes: 0,
            ordenesCompletadas: 0,
            ordenesPendientes: 0,
            ordenesCanceladas: 0,
            totalIngresos: 0,
            ticketPromedio: 0
          };
        }
      })
    );
  }

  loadMoreOrders(): void {
    if (this.hasMoreOrders && !this.loadingMore) {
      this.loadOrders(this.currentPage + 1);
    }
  }

  // ==================== GESTIÓN DE ÓRDENES ====================

  viewOrderDetails(orderId: string): void {
    this.loadingOrderDetails = true;
    
    this.subscriptions.add(
      this.orderService.getOrderById(orderId).subscribe({
        next: (orderDetails) => {
          this.selectedOrder = orderDetails;
          this.loadingOrderDetails = false;
          
          if (orderDetails) {
            console.log('✅ Detalles de orden cargados:', orderDetails);
            this.showOrderModal();
          } else {
            this.toastService.showError('No se pudieron cargar los detalles de la orden');
          }
        },
        error: (error) => {
          console.error('❌ Error cargando detalles de orden:', error);
          this.loadingOrderDetails = false;
          this.toastService.showError('Error al cargar los detalles de la orden');
        }
      })
    );
  }

  cancelOrder(orderId: string): void {
    const order = this.orders.find(o => o.id === orderId);
    
    if (!order) {
      this.toastService.showError('Orden no encontrada');
      return;
    }

    if (!this.canCancelOrder(order)) {
      this.toastService.showWarning('Esta orden no se puede cancelar');
      return;
    }

    const confirmed = confirm(
      `¿Estás seguro de que quieres cancelar la orden #${orderId.substring(0, 8)}?\n\n` +
      `Total: ${this.formatCurrency(order.total)}\n` +
      `Esta acción no se puede deshacer.`
    );

    if (confirmed) {
      this.subscriptions.add(
        this.orderService.cancelOrder(orderId).subscribe({
          next: (success) => {
            if (success) {
              this.toastService.showSuccess('Orden cancelada exitosamente');
              this.refreshData();
            } else {
              this.toastService.showError('No se pudo cancelar la orden');
            }
          },
          error: (error) => {
            console.error('❌ Error cancelando orden:', error);
            this.toastService.showError('Error al cancelar la orden');
          }
        })
      );
    }
  }

  reorderItems(order: Order): void {
    this.toastService.showInfo(
      `Función de reordenar próximamente disponible para la orden #${order.id.substring(0, 8)}`
    );
  }

  // ==================== MÉTODOS DE FILTRADO ====================

  getFilteredOrders(): Order[] {
    let filtered = [...this.orders];
    
    // Filtro por estado
    if (this.filterStatus !== 'all') {
      filtered = filtered.filter(order => order.estado === this.filterStatus);
    }
    
    // Filtro por método de pago
    if (this.filterPaymentMethod !== 'all') {
      filtered = filtered.filter(order => 
        order.metodo_pago.toLowerCase().includes(this.filterPaymentMethod.toLowerCase())
      );
    }
    
    // Filtro por rango de fechas
    if (this.filterDateRange !== 'all') {
      const now = new Date();
      let startDate = new Date();
      
      switch (this.filterDateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter(order => 
        new Date(order.fecha_creacion) >= startDate
      );
    }
    
    return filtered;
  }

  resetFilters(): void {
    this.filterStatus = 'all';
    this.filterPaymentMethod = 'all';
    this.filterDateRange = 'all';
    this.showFilters = false;
    this.toastService.showInfo('Filtros limpiados');
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  hasActiveFilters(): boolean {
    return this.filterStatus !== 'all' || 
           this.filterPaymentMethod !== 'all' || 
           this.filterDateRange !== 'all';
  }

  // ==================== MÉTODOS AUXILIARES ====================

  formatDate(dateString: string): string {
    return this.orderService.formatDate(dateString);
  }

  formatCurrency(amount: number): string {
    return this.orderService.formatCurrency(amount);
  }

  getStatusBadgeClass(status: string): string {
    return this.orderService.getStatusBadgeClass(status);
  }

  getStatusText(status: string): string {
    return this.orderService.getStatusText(status);
  }

  getPaymentMethodIcon(method: string): string {
    return this.orderService.getPaymentMethodIcon(method);
  }

  canCancelOrder(order: Order): boolean {
    return this.orderService.canCancelOrder(order);
  }

  getTotalItems(order: Order): number {
    return this.orderService.getTotalItems(order);
  }

  // ==================== MÉTODOS PARA MODAL ====================

  showOrderModal(): void {
    const modalElement = document.getElementById('orderDetailsModal');
    if (modalElement) {
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  closeOrderModal(): void {
    const modalElement = document.getElementById('orderDetailsModal');
    if (modalElement) {
      const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
      if (modal) {
        modal.hide();
      }
    }
    this.selectedOrder = null;
  }

  // ==================== MÉTODOS PARA ESTADÍSTICAS ====================

  getSuccessRate(): number {
    if (!this.stats || this.stats.totalOrdenes === 0) return 0;
    return Math.round((this.stats.ordenesCompletadas / this.stats.totalOrdenes) * 100);
  }

  getRecentOrdersCount(): number {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return this.orders.filter(order => 
      new Date(order.fecha_creacion) >= thirtyDaysAgo
    ).length;
  }

  getMostUsedPaymentMethod(): string {
    if (this.orders.length === 0) return 'N/A';
    
    const paymentMethods: { [key: string]: number } = {};
    
    this.orders.forEach(order => {
      const method = order.metodo_pago;
      paymentMethods[method] = (paymentMethods[method] || 0) + 1;
    });
    
    let mostUsed = '';
    let maxCount = 0;
    
    Object.entries(paymentMethods).forEach(([method, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostUsed = method;
      }
    });
    
    return this.orderService.getFormattedPaymentMethod(mostUsed) || 'N/A';
  }

  getAverageOrderValue(): number {
    if (this.orders.length === 0) return 0;
    
    const total = this.orders.reduce((sum, order) => sum + order.total, 0);
    return total / this.orders.length;
  }

  // ==================== MÉTODOS DE NAVEGACIÓN ====================

  goToMovies(): void {
    this.router.navigate(['/movies']);
  }

  goToBar(): void {
    this.router.navigate(['/bar']);
  }

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  goToRewards(): void {
    this.router.navigate(['/rewards']);
  }

  // ==================== MÉTODOS PARA EXPORTAR ====================

  exportOrderHistory(): void {
    const filteredOrders = this.getFilteredOrders();
    
    if (filteredOrders.length === 0) {
      this.toastService.showWarning('No hay órdenes para exportar');
      return;
    }

    try {
      const csvHeaders = [
        'Fecha', 'ID Orden', 'Estado', 'Método de Pago', 
        'Items', 'Subtotal', 'Total'
      ];
      
      const csvData = filteredOrders.map(order => [
        this.formatDate(order.fecha_creacion),
        order.id.substring(0, 8),
        this.getStatusText(order.estado),
        order.metodo_pago,
        this.getTotalItems(order).toString(),
        order.subtotal.toFixed(2),
        order.total.toFixed(2)
      ]);

      const csvContent = [csvHeaders, ...csvData]
        .map(row => row.join(','))
        .join('\n');

      // Crear y descargar archivo
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `historial-ordenes-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);

      this.toastService.showSuccess('Historial exportado exitosamente');
    } catch (error) {
      console.error('Error al exportar:', error);
      this.toastService.showError('Error al exportar el historial');
    }
  }

  // ==================== MÉTODOS PARA DETALLES DE ORDEN ====================

  getOrderItemsDescription(order: OrderDetails): string {
    const items: string[] = [];
    
    if (order.total_entradas > 0) {
      items.push(`${order.total_entradas} entrada(s)`);
    }
    
    if (order.total_productos_bar > 0) {
      items.push(`${order.total_productos_bar} producto(s) del bar`);
    }
    
    return items.join(' + ');
  }

  hasMovieItems(order: OrderDetails): boolean {
    return order.items_peliculas && order.items_peliculas.length > 0;
  }

  hasBarItems(order: OrderDetails): boolean {
    return order.items_bar && order.items_bar.length > 0;
  }

  getMovieItemsTotal(order: OrderDetails): number {
    if (!this.hasMovieItems(order)) return 0;
    return order.items_peliculas.reduce((total, item) => total + item.subtotal, 0);
  }

  getBarItemsTotal(order: OrderDetails): number {
    if (!this.hasBarItems(order)) return 0;
    return order.items_bar.reduce((total, item) => total + item.subtotal, 0);
  }

  // ==================== TRACKBY FUNCTIONS ====================

  trackByOrderId(index: number, order: Order): string {
    return order.id;
  }

  trackByItemId(index: number, item: any): number {
    return item.id;
  }

  // ==================== MÉTODO PARA REFRESCAR DATOS ====================

  refreshData(): void {
    this.currentPage = 1;
    this.orders = [];
    this.loadOrders();
    this.loadStats();
    this.toastService.showInfo('Datos actualizados');
  }

  // ==================== MÉTODOS PARA BÚSQUEDA ====================

  searchOrders(searchTerm: string): Order[] {
    if (!searchTerm.trim()) return this.orders;
    
    return this.orderService.searchOrders(this.orders, searchTerm);
  }

  // ==================== MÉTODOS DE VALIDACIÓN ====================

  isValidOrder(order: Order): boolean {
    return !!order && !!order.id && order.total > 0;
  }

  isRecentOrder(order: Order): boolean {
    const orderDate = new Date(order.fecha_creacion);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return orderDate >= sevenDaysAgo;
  }

  // ==================== MÉTODOS DE UTILIDAD ====================

  getOrderAge(order: Order): string {
    const orderDate = new Date(order.fecha_creacion);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - orderDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Hace 1 día';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return weeks === 1 ? 'Hace 1 semana' : `Hace ${weeks} semanas`;
    }
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return months === 1 ? 'Hace 1 mes' : `Hace ${months} meses`;
    }
    
    const years = Math.floor(diffDays / 365);
    return years === 1 ? 'Hace 1 año' : `Hace ${years} años`;
  }

  getRangeText(): string {
    if (this.orders.length === 0) return '0-0 de 0';
    
    const start = 1;
    const end = Math.min(this.orders.length, this.currentPage * this.itemsPerPage);
    const total = this.totalOrders;
    
    return `${start}-${end} de ${total}`;
  }

  // ==================== MÉTODOS PARA DEBUGGING ====================

  logOrdersState(): void {
    if (!this.authService.isAdmin()) return;
    
    console.log('=== ORDER HISTORY COMPONENT STATE ===');
    console.log('Total Orders:', this.orders.length);
    console.log('Filtered Orders:', this.getFilteredOrders().length);
    console.log('Current Page:', this.currentPage);
    console.log('Has More Orders:', this.hasMoreOrders);
    console.log('Stats:', this.stats);
    console.log('Filters:', {
      status: this.filterStatus,
      payment: this.filterPaymentMethod,
      dateRange: this.filterDateRange
    });
    console.log('======================================');
  }
}
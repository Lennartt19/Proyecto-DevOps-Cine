import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PointsService, PointsTransaction, ReferralRecord } from '../../services/points.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-points-history',
  standalone: false, // ✅ IMPORTANTE: Debe ser false para usar en app.module.ts
  templateUrl: './points-history.component.html',
  styleUrls: ['./points-history.component.css']
})
export class PointsHistoryComponent implements OnInit {

  transactions: PointsTransaction[] = [];
  referrals: ReferralRecord[] = [];
  currentUserPoints: number = 0;
  referralCode: string = '';
  
  // Estados
  loading: boolean = true;
  loadingReferrals: boolean = true;
  applyingReferralCode: boolean = false;
  copyingCode: boolean = false;
  
  // Paginación
  currentPage: number = 1;
  itemsPerPage: number = 20;
  hasMoreTransactions: boolean = false;
  
  // Filtros
  filterType: string = 'all'; // 'all', 'ganancia', 'uso'
  showApplyReferralForm: boolean = false;
  newReferralCode: string = '';
  
  // Tabs
  activeTab: string = 'transactions'; // 'transactions', 'referrals'

  constructor(
    private pointsService: PointsService,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    
    this.loadData();
  }

  // ==================== CARGAR DATOS ====================

  loadData(): void {
    this.loadUserPoints();
    this.loadTransactions();
    this.loadReferrals();
    this.loadReferralCode();
  }

  loadUserPoints(): void {
    this.pointsService.getUserPoints().subscribe({
      next: (response) => {
        this.currentUserPoints = response.puntosActuales;
      },
      error: (error) => {
        console.error('❌ Error cargando puntos:', error);
        this.currentUserPoints = 0;
      }
    });
  }

  loadTransactions(page: number = 1): void {
    this.loading = true;
    
    this.pointsService.getPointsHistory(page, this.itemsPerPage).subscribe({
      next: (transactions) => {
        if (page === 1) {
          this.transactions = transactions;
        } else {
          this.transactions = [...this.transactions, ...transactions];
        }
        
        this.hasMoreTransactions = transactions.length === this.itemsPerPage;
        this.currentPage = page;
        this.loading = false;
        
        console.log(`✅ ${transactions.length} transacciones cargadas (página ${page})`);
      },
      error: (error) => {
        console.error('❌ Error cargando historial:', error);
        this.loading = false;
        this.toastService.showError('Error al cargar el historial de puntos');
      }
    });
  }

  loadReferrals(): void {
    this.loadingReferrals = true;
    
    this.pointsService.getUserReferrals().subscribe({
      next: (referrals) => {
        this.referrals = referrals;
        this.loadingReferrals = false;
        console.log(`✅ ${referrals.length} referidos cargados`);
      },
      error: (error) => {
        console.error('❌ Error cargando referidos:', error);
        this.loadingReferrals = false;
        this.toastService.showError('Error al cargar referidos');
      }
    });
  }

  loadReferralCode(): void {
    this.pointsService.getReferralCode().subscribe({
      next: (code) => {
        this.referralCode = code;
        console.log('✅ Código de referido cargado:', code);
      },
      error: (error) => {
        console.error('❌ Error cargando código de referido:', error);
        // Crear código si no existe
        this.createReferralCode();
      }
    });
  }

  loadMoreTransactions(): void {
    if (this.hasMoreTransactions && !this.loading) {
      this.loadTransactions(this.currentPage + 1);
    }
  }

  // ==================== GESTIÓN DE REFERIDOS ====================

  createReferralCode(): void {
    this.pointsService.createReferralCode().subscribe({
      next: (code) => {
        this.referralCode = code;
        this.toastService.showSuccess('Código de referido creado');
      },
      error: (error) => {
        console.error('❌ Error creando código:', error);
        this.toastService.showError('Error al crear código de referido');
      }
    });
  }

  copyReferralCode(): void {
    this.copyingCode = true;
    
    navigator.clipboard.writeText(this.referralCode).then(() => {
      this.toastService.showSuccess('¡Código copiado al portapapeles!');
      this.copyingCode = false;
    }).catch(() => {
      // Fallback para navegadores que no soportan clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = this.referralCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      this.toastService.showSuccess('¡Código copiado al portapapeles!');
      this.copyingCode = false;
    });
  }

  shareReferralCode(): void {
    const shareText = `¡Únete a Parky Films con mi código de referido y obtén puntos gratis! 🎬🍿\n\nCódigo: ${this.referralCode}\n\n¡Disfruta del mejor cine!`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Código de Referido - Parky Films',
        text: shareText,
        url: window.location.origin
      }).then(() => {
        this.toastService.showSuccess('Código compartido exitosamente');
      }).catch(() => {
        this.fallbackShare(shareText);
      });
    } else {
      this.fallbackShare(shareText);
    }
  }

  private fallbackShare(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.toastService.showSuccess('Mensaje de referido copiado al portapapeles');
    }).catch(() => {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      this.toastService.showSuccess('Mensaje de referido copiado al portapapeles');
    });
  }

  applyReferralCode(): void {
    if (!this.newReferralCode.trim()) {
      this.toastService.showWarning('Ingresa un código de referido');
      return;
    }

    this.applyingReferralCode = true;
    
    this.pointsService.applyReferralCode(this.newReferralCode.trim()).subscribe({
      next: (result) => {
        if (result.success) {
          this.toastService.showSuccess(
            `¡Código aplicado! Ganaste ${result.puntosGanados} puntos 🎉`
          );
          this.newReferralCode = '';
          this.showApplyReferralForm = false;
          this.loadData(); // Recargar datos
        } else {
          this.toastService.showError(result.message);
        }
        this.applyingReferralCode = false;
      },
      error: (error) => {
        console.error('❌ Error aplicando código:', error);
        this.toastService.showError('Error al aplicar código de referido');
        this.applyingReferralCode = false;
      }
    });
  }

  // ==================== MÉTODOS DE FILTRADO ====================

  getFilteredTransactions(): PointsTransaction[] {
    if (this.filterType === 'all') {
      return this.transactions;
    }
    return this.transactions.filter(t => t.tipo === this.filterType);
  }

  setFilterType(type: string): void {
    this.filterType = type;
  }

  // ==================== MÉTODOS AUXILIARES ====================

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTransactionIcon(tipo: string): string {
    return tipo === 'ganancia' ? 'fas fa-plus-circle text-success' : 'fas fa-minus-circle text-warning';
  }

  getTransactionBadgeClass(tipo: string): string {
    return tipo === 'ganancia' ? 'bg-success' : 'bg-warning text-dark';
  }

  getTransactionText(tipo: string): string {
    return tipo === 'ganancia' ? 'Ganancia' : 'Uso';
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  toggleApplyReferralForm(): void {
    this.showApplyReferralForm = !this.showApplyReferralForm;
    if (!this.showApplyReferralForm) {
      this.newReferralCode = '';
    }
  }

  // ==================== ESTADÍSTICAS ====================

  getTotalEarned(): number {
    return this.transactions
      .filter(t => t.tipo === 'ganancia')
      .reduce((sum, t) => sum + t.puntos, 0);
  }

  getTotalUsed(): number {
    return this.transactions
      .filter(t => t.tipo === 'uso')
      .reduce((sum, t) => sum + t.puntos, 0);
  }

  getTotalReferralPoints(): number {
    return this.transactions
      .filter(t => t.tipo === 'ganancia' && t.concepto.toLowerCase().includes('referido'))
      .reduce((sum, t) => sum + t.puntos, 0);
  }

  getRecentTransactionsCount(): number {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return this.transactions.filter(t => 
      new Date(t.fecha) >= thirtyDaysAgo
    ).length;
  }

  // ==================== MÉTODOS PARA METADATA ====================

  getMetadataKeys(metadata: any): string[] {
    if (!metadata || typeof metadata !== 'object') return [];
    return Object.keys(metadata).slice(0, 3); // Máximo 3 keys para no saturar
  }

  // ==================== TRACKBY FUNCTIONS ====================

  trackByTransactionId(index: number, transaction: PointsTransaction): number {
    return transaction.id;
  }

  trackByReferralId(index: number, referral: ReferralRecord): number {
    return referral.id;
  }

  // ==================== NAVEGACIÓN ====================

  goToRewards(): void {
    this.router.navigate(['/rewards']);
  }

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  refreshData(): void {
    this.currentPage = 1;
    this.loadData();
    this.toastService.showInfo('Datos actualizados');
  }
}
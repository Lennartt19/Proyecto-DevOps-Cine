import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { PointsService } from '../../services/points.service';
import { RewardsService, Reward, RedemptionCode } from '../../services/rewards.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-rewards',
  standalone: false,
  templateUrl: './rewards.component.html',
  styleUrls: ['./rewards.component.css']
})
export class RewardsComponent implements OnInit, OnDestroy {
  // Estados del componente
  cargando: boolean = true;
  canjeando: boolean = false;
  
  // Datos del usuario
  userPoints: number = 0;
  userId: number = 0;
  
  // Recompensas
  allRewards: Reward[] = [];
  filteredRewards: Reward[] = [];
  categories: string[] = [];
  
  // Filtros
  selectedCategory: string = 'todas';
  sortBy: string = 'puntos-asc';
  searchTerm: string = '';
  showOnlyAffordable: boolean = false;
  
  // Canjes del usuario
  userRedemptions: RedemptionCode[] = [];
  activeRedemptions: RedemptionCode[] = [];
  
  // Vista actual
  currentView: 'catalog' | 'my-rewards' = 'catalog';
  
  // Recompensa seleccionada para modal
  selectedReward: Reward | null = null;
  
  // Suscripciones
  private subscriptions = new Subscription();

  constructor(
    public authService: AuthService,
    private pointsService: PointsService,
    private rewardsService: RewardsService,
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.toastService.showError('Debes iniciar sesión para ver las recompensas');
      this.router.navigate(['/login']);
      return;
    }
    
    this.loadInitialData();
    this.setupSubscriptions();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // ==================== INICIALIZACIÓN ====================
  
  private loadInitialData(): void {
    this.cargando = true;
    
    // Cargar puntos del usuario
    this.loadUserPoints();
    
    // Cargar recompensas
    this.loadRewards();
    
    // Cargar categorías
    this.loadCategories();
    
    // Cargar canjes del usuario
    this.loadUserRedemptions();
  }

  private setupSubscriptions(): void {
    // Suscribirse a cambios en puntos
    this.subscriptions.add(
      this.pointsService.userPoints$.subscribe(points => {
        this.userPoints = points;
        this.applyFilters(); // Reaplica filtros cuando cambian los puntos
      })
    );
  }

  // ==================== CARGA DE DATOS ====================
  
  private loadUserPoints(): void {
    this.subscriptions.add(
      this.pointsService.getUserPoints().subscribe({
        next: (response) => {
          this.userPoints = response.puntosActuales;
          console.log('✅ Puntos del usuario cargados:', this.userPoints);
        },
        error: (error) => {
          console.error('❌ Error cargando puntos:', error);
          this.userPoints = 0;
        }
      })
    );
  }

  private loadRewards(): void {
    console.log('🔍 Iniciando carga de recompensas...');
    
    this.subscriptions.add(
      this.rewardsService.getAllRewards().subscribe({
        next: (rewards) => {
          console.log('🔍 Respuesta cruda del servicio:', rewards);
          console.log('🔍 Tipo de datos recibidos:', typeof rewards, Array.isArray(rewards));
          console.log('🔍 Primera recompensa (si existe):', rewards[0]);
          
          // 🔧 CORRECCIÓN: Procesar recompensas para normalizar tipos de datos
          this.allRewards = this.processRewards(rewards);
          this.applyFilters();
          this.cargando = false;
          console.log('✅ Recompensas procesadas y cargadas:', this.allRewards.length);
          console.log('✅ Recompensas filtradas:', this.filteredRewards.length);
        },
        error: (error) => {
          console.error('❌ Error cargando recompensas:', error);
          console.error('❌ Error completo:', JSON.stringify(error, null, 2));
          this.cargando = false;
          this.toastService.showError('Error al cargar las recompensas');
        }
      })
    );
  }

  // 🔧 NUEVO MÉTODO: Procesar recompensas para normalizar tipos de datos
  private processRewards(rawRewards: any[]): Reward[] {
    if (!Array.isArray(rawRewards)) {
      console.warn('⚠️ Las recompensas no son un array:', rawRewards);
      return [];
    }

    return rawRewards.map(reward => {
      const processed: Reward = {
        ...reward,
        // 🔧 CORRECCIÓN: Convertir valores string a number donde sea necesario
        puntos_requeridos: this.ensureNumber(reward.puntos_requeridos),
        valor: this.ensureNumber(reward.valor),
        stock: reward.stock !== null ? this.ensureNumber(reward.stock) : null,
        limite_por_usuario: this.ensureNumber(reward.limite_por_usuario, 1),
        validez_dias: this.ensureNumber(reward.validez_dias, 30),
        disponible: Boolean(reward.disponible)
      };

      console.log('🔧 Recompensa procesada:', {
        nombre: processed.nombre,
        valor_original: reward.valor,
        valor_procesado: processed.valor,
        tipo_valor: typeof processed.valor
      });

      return processed;
    });
  }

  // 🔧 NUEVO MÉTODO: Asegurar que un valor sea número
  private ensureNumber(value: any, defaultValue: number = 0): number {
    if (value === null || value === undefined) {
      return defaultValue;
    }

    if (typeof value === 'number') {
      return isNaN(value) ? defaultValue : value;
    }

    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? defaultValue : parsed;
    }

    return defaultValue;
  }

  private loadCategories(): void {
    this.subscriptions.add(
      this.rewardsService.getCategories().subscribe({
        next: (categories) => {
          this.categories = ['todas', ...categories];
          console.log('✅ Categorías cargadas:', this.categories);
        },
        error: (error) => {
          console.error('❌ Error cargando categorías:', error);
          this.categories = ['todas', 'peliculas', 'bar', 'especial', 'descuentos'];
        }
      })
    );
  }

  private loadUserRedemptions(): void {
    this.subscriptions.add(
      this.rewardsService.getUserRedemptions().subscribe({
        next: (redemptions) => {
          this.userRedemptions = redemptions;
          this.activeRedemptions = redemptions.filter(r => !r.usado && !this.isExpired(r.fecha_vencimiento));
          console.log('✅ Canjes del usuario cargados:', redemptions.length);
        },
        error: (error) => {
          console.error('❌ Error cargando canjes:', error);
        }
      })
    );
  }

  // ==================== FILTRADO Y BÚSQUEDA ====================
  
  applyFilters(): void {
    console.log('🔍 Aplicando filtros...');
    console.log('🔍 Recompensas antes de filtrar:', this.allRewards.length);
    
    let filtered = [...this.allRewards];

    // Filtro por categoría
    if (this.selectedCategory !== 'todas') {
      filtered = filtered.filter(reward => reward.categoria === this.selectedCategory);
      console.log(`🔍 Después de filtro categoría "${this.selectedCategory}":`, filtered.length);
    }

    // Filtro por término de búsqueda
    if (this.searchTerm.trim()) {
      const searchTerm = this.searchTerm.toLowerCase();
      filtered = filtered.filter(reward => 
        reward.nombre.toLowerCase().includes(searchTerm) ||
        reward.descripcion.toLowerCase().includes(searchTerm)
      );
      console.log(`🔍 Después de filtro búsqueda "${this.searchTerm}":`, filtered.length);
    }

    // Filtro por asequibles
    if (this.showOnlyAffordable) {
      const before = filtered.length;
      filtered = filtered.filter(reward => reward.puntos_requeridos <= this.userPoints);
      console.log(`🔍 Después de filtro asequibles (${this.userPoints} puntos):`, before, '->', filtered.length);
    }

    // Solo mostrar recompensas disponibles
    const beforeAvailable = filtered.length;
    filtered = filtered.filter(reward => reward.disponible);
    console.log(`🔍 Después de filtro disponibles:`, beforeAvailable, '->', filtered.length);

    // Ordenamiento
    switch (this.sortBy) {
      case 'puntos-asc':
        filtered.sort((a, b) => a.puntos_requeridos - b.puntos_requeridos);
        break;
      case 'puntos-desc':
        filtered.sort((a, b) => b.puntos_requeridos - a.puntos_requeridos);
        break;
      case 'nombre':
        filtered.sort((a, b) => a.nombre.localeCompare(b.nombre));
        break;
      case 'categoria':
        filtered.sort((a, b) => a.categoria.localeCompare(b.categoria));
        break;
    }

    this.filteredRewards = filtered;
    console.log('✅ Filtros aplicados. Resultado final:', this.filteredRewards.length);
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onCategoryChange(): void {
    this.applyFilters();
  }

  onSortChange(): void {
    this.applyFilters();
  }

  toggleAffordableFilter(): void {
    this.showOnlyAffordable = !this.showOnlyAffordable;
    this.applyFilters();
  }

  clearFilters(): void {
    this.selectedCategory = 'todas';
    this.sortBy = 'puntos-asc';
    this.searchTerm = '';
    this.showOnlyAffordable = false;
    this.applyFilters();
  }

  // ==================== GESTIÓN DE RECOMPENSAS ====================
  
  canAffordReward(reward: Reward): boolean {
    return this.userPoints >= reward.puntos_requeridos;
  }

  openRewardModal(reward: Reward): void {
    this.selectedReward = reward;
    const modalElement = document.getElementById('rewardModal');
    if (modalElement) {
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  confirmRedeem(): void {
    if (!this.selectedReward) return;

    const confirmation = confirm(
      `¿Estás seguro de canjear "${this.selectedReward.nombre}" por ${this.selectedReward.puntos_requeridos} puntos?\n\n` +
      `Esta acción no se puede deshacer.`
    );

    if (confirmation) {
      this.redeemReward(this.selectedReward);
    }
  }

  redeemReward(reward: Reward): void {
    this.canjeando = true;
    
    this.subscriptions.add(
      this.rewardsService.redeemReward(reward.id!).subscribe({
        next: (result) => {
          this.canjeando = false;
          
          if (result.success) {
            this.toastService.showSuccess(result.message);
            
            // Cerrar modal
            this.closeRewardModal();
            
            // Mostrar información del canje
            if (result.codigo) {
              this.showRedemptionDetails(result.codigo);
            }
            
            // Recargar datos
            this.loadUserPoints();
            this.loadUserRedemptions();
            
            // Cambiar a la vista de mis canjes
            setTimeout(() => {
              this.switchView('my-rewards');
            }, 2000);
          } else {
            this.toastService.showError(result.message);
          }
        },
        error: (error) => {
          console.error('❌ Error canjeando recompensa:', error);
          this.canjeando = false;
          this.toastService.showError('Error al canjear la recompensa');
        }
      })
    );
  }

  closeRewardModal(): void {
    const modalElement = document.getElementById('rewardModal');
    if (modalElement) {
      const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
      if (modal) {
        modal.hide();
      }
    }
    this.selectedReward = null;
  }

  showRedemptionDetails(codigo: string): void {
    const message = `¡Canje exitoso!\n\n` +
                   `Código: ${codigo}\n\n` +
                   `Guarda este código para usar tu recompensa.`;
    
    setTimeout(() => {
      alert(message);
    }, 500);
  }

  // ==================== MÉTODOS DE VISTA ====================
  
  switchView(view: 'catalog' | 'my-rewards'): void {
    this.currentView = view;
  }

  useRedemption(canje: RedemptionCode): void {
    const confirmed = confirm(
      `¿Marcar como usado el canje "${canje.recompensa.nombre}"?\n\n` +
      `Código: ${canje.codigo}`
    );
    
    if (confirmed) {
      this.subscriptions.add(
        this.rewardsService.markCodeAsUsed(canje.codigo).subscribe({
          next: (result) => {
            if (result.success) {
              this.toastService.showSuccess('Canje marcado como usado');
              this.loadUserRedemptions(); // Recargar canjes
            } else {
              this.toastService.showError(result.message);
            }
          },
          error: (error) => {
            console.error('❌ Error marcando canje como usado:', error);
            this.toastService.showError('Error al marcar canje como usado');
          }
        })
      );
    }
  }

  copyRedemptionCode(code: string): void {
    navigator.clipboard.writeText(code).then(() => {
      this.toastService.showSuccess('Código copiado al portapapeles');
    }).catch(() => {
      // Fallback para navegadores sin soporte
      const textArea = document.createElement('textarea');
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      this.toastService.showSuccess('Código copiado al portapapeles');
    });
  }

  // ==================== MÉTODOS AUXILIARES ====================
  
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getCategoryName(category: string): string {
    const names: { [key: string]: string } = {
      'peliculas': 'Películas',
      'bar': 'Bar & Snacks',
      'especial': 'Especiales',
      'descuentos': 'Descuentos',
      'todas': 'Todas las categorías'
    };
    return names[category] || category;
  }

  getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      'peliculas': 'fas fa-film',
      'bar': 'fas fa-utensils',
      'especial': 'fas fa-star',
      'descuentos': 'fas fa-percent',
      'todas': 'fas fa-th-large'
    };
    return icons[category] || 'fas fa-gift';
  }

  getRewardTypeIcon(tipo: string): string {
    const icons: { [key: string]: string } = {
      'descuento': 'fas fa-percent',
      'producto': 'fas fa-box',
      'paquete': 'fas fa-gifts',
      'experiencia': 'fas fa-star',
      'codigo': 'fas fa-qrcode',
      'bonus': 'fas fa-gem'
    };
    return icons[tipo] || 'fas fa-gift';
  }

  getRewardTypeName(tipo: string): string {
    const names: { [key: string]: string } = {
      'descuento': 'Descuento',
      'producto': 'Producto',
      'paquete': 'Paquete',
      'experiencia': 'Experiencia',
      'codigo': 'Código',
      'bonus': 'Bonus'
    };
    return names[tipo] || tipo;
  }

  getRedeemButtonText(reward: Reward): string {
    if (!this.canAffordReward(reward)) {
      const missing = reward.puntos_requeridos - this.userPoints;
      return `Faltan ${missing} puntos`;
    }
    
    if (reward.stock !== null && reward.stock !== undefined && reward.stock <= 0) {
      return 'Agotado';
    }
    
    return `Canjear por ${reward.puntos_requeridos} puntos`;
  }

  isRedeemButtonDisabled(reward: Reward): boolean {
    return !this.canAffordReward(reward) || 
           (reward.stock !== null && reward.stock !== undefined && reward.stock <= 0) || 
           this.canjeando ||
           !reward.disponible;
  }

  getProgressToReward(reward: Reward): number {
    if (this.userPoints >= reward.puntos_requeridos) return 100;
    return Math.round((this.userPoints / reward.puntos_requeridos) * 100);
  }

  // ==================== FILTROS AUXILIARES ====================
  
  hasActiveFilters(): boolean {
    return this.selectedCategory !== 'todas' || 
           this.searchTerm.trim() !== '' || 
           this.showOnlyAffordable ||
           this.sortBy !== 'puntos-asc';
  }

  getFilterSummary(): string {
    const parts = [];
    
    if (this.selectedCategory !== 'todas') {
      parts.push(this.getCategoryName(this.selectedCategory));
    }
    
    if (this.searchTerm.trim()) {
      parts.push(`"${this.searchTerm}"`);
    }
    
    if (this.showOnlyAffordable) {
      parts.push('Solo asequibles');
    }
    
    return parts.join(' • ');
  }

  // ==================== MÉTODOS PARA FECHAS ====================
  
  isExpired(fechaExpiracion: string): boolean {
    return new Date(fechaExpiracion) <= new Date();
  }

  isActive(canje: RedemptionCode): boolean {
    return !canje.usado && !this.isExpired(canje.fecha_vencimiento);
  }

  isUsed(canje: RedemptionCode): boolean {
    return canje.usado;
  }

  getCanjeStatusClass(canje: RedemptionCode): string {
    if (this.isUsed(canje)) return 'bg-secondary';
    if (this.isActive(canje)) return 'bg-success';
    return 'bg-warning'; // Expirado
  }

  getCanjeStatusText(canje: RedemptionCode): string {
    if (this.isUsed(canje)) return 'Usado';
    if (this.isActive(canje)) return 'Activo';
    return 'Expirado';
  }

  getCanjeStatusIcon(canje: RedemptionCode): string {
    if (this.isUsed(canje)) return 'fas fa-check';
    if (this.isActive(canje)) return 'fas fa-clock';
    return 'fas fa-times';
  }

  canMarkAsUsed(canje: RedemptionCode): boolean {
    return !canje.usado && !this.isExpired(canje.fecha_vencimiento);
  }

  // ==================== NAVEGACIÓN ====================
  
  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  goToMovies(): void {
    this.router.navigate(['/movies']);
  }

  goToBar(): void {
    this.router.navigate(['/bar']);
  }

  goToPointsHistory(): void {
    this.router.navigate(['/points-history']);
  }

  // ==================== MÉTODOS DE RECARGA ====================
  
  refreshData(): void {
    this.cargando = true;
    this.loadRewards();
    this.loadUserPoints();
    this.loadUserRedemptions();
    this.toastService.showSuccess('Datos actualizados');
  }

  // ==================== MÉTODOS DE VALIDACIÓN ====================
  
  validateRewardAccess(reward: Reward): boolean {
    return reward.disponible && 
           (reward.stock === null || reward.stock === undefined || reward.stock > 0);
  }

  getValidationMessage(reward: Reward): string {
    if (!reward.disponible) {
      return 'Esta recompensa no está disponible';
    }
    
    if (reward.stock !== undefined && reward.stock !== null && reward.stock <= 0) {
      return 'Esta recompensa está agotada';
    }
    
    if (!this.canAffordReward(reward)) {
      const missing = reward.puntos_requeridos - this.userPoints;
      return `Te faltan ${missing} puntos`;
    }
    
    return 'Recompensa disponible';
  }

  // ==================== MÉTODOS DE ESTADÍSTICAS ====================
  
  getTotalRedemptions(): number {
    return this.userRedemptions.length;
  }

  getTotalActiveRedemptions(): number {
    return this.activeRedemptions.length;
  }

  getTotalPointsUsed(): number {
    return this.userRedemptions.reduce((total, canje) => {
      const reward = this.allRewards.find(r => r.id === canje.recompensa.id);
      return total + (reward ? reward.puntos_requeridos : 0);
    }, 0);
  }

  getMostUsedCategory(): string {
    if (this.userRedemptions.length === 0) return 'Ninguna';
    
    const categoryCounts: { [key: string]: number } = {};
    
    this.userRedemptions.forEach(canje => {
      const category = canje.recompensa.categoria;
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    
    let mostUsedCategory = '';
    let maxCount = 0;
    
    Object.entries(categoryCounts).forEach(([category, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostUsedCategory = category;
      }
    });
    
    return this.getCategoryName(mostUsedCategory) || 'Ninguna';
  }

  // ==================== MÉTODOS DE BÚSQUEDA AVANZADA ====================
  
  searchRewardsByPoints(maxPoints: number): Reward[] {
    return this.allRewards.filter(reward => 
      reward.puntos_requeridos <= maxPoints && 
      reward.disponible && 
      (reward.stock === undefined || reward.stock === null || reward.stock > 0)
    );
  }

  getRecommendedRewards(): Reward[] {
    const affordable = this.searchRewardsByPoints(this.userPoints);
    return affordable.slice(0, 3);
  }

  // ==================== MÉTODOS DE ACCESIBILIDAD ====================
  
  announceToScreenReader(message: string): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  // ==================== MÉTODOS AUXILIARES PARA RECOMPENSAS - CORREGIDOS ====================

  /**
   * 🔧 CORREGIDO: Formatea el valor de una recompensa de manera segura
   * @param valor - El valor opcional de la recompensa (number, string, null, undefined)
   * @returns String formateado con el valor o mensaje alternativo
   */
  getFormattedValue(valor?: number | string | null): string {
    const numericValue = this.ensureNumber(valor);
    
    if (numericValue <= 0) {
      return 'Sin valor específico';
    }
    
    return `$${numericValue.toFixed(2)}`;
  }

  /**
   * 🔧 CORREGIDO: Debug de datos de recompensa
   */
  debugRewardData(reward: Reward): void {
    console.log('🔍 Debug reward data:', {
      nombre: reward.nombre,
      valor: reward.valor,
      tipoValor: typeof reward.valor,
      esNull: reward.valor === null,
      esUndefined: reward.valor === undefined,
      esNaN: isNaN(reward.valor as any),
      valorProcesado: this.ensureNumber(reward.valor),
      rewardCompleto: reward
    });
  }

  /**
   * 🔧 CORREGIDO: Obtiene el valor formateado con validación de tipo
   * @param reward - La recompensa
   * @returns String con el valor formateado
   */
  getRewardValue(reward: Reward): string {
    return this.getFormattedValue(reward.valor);
  }

  /**
   * 🔧 CORREGIDO: Verifica si una recompensa tiene valor monetario válido
   * @param reward - La recompensa a verificar
   * @returns true si tiene valor válido
   */
  hasValidValue(reward: Reward): boolean {
    const numericValue = this.ensureNumber(reward.valor);
    return numericValue > 0;
  }

  /**
   * 🔧 CORREGIDO: Obtiene el valor en texto para mostrar en el template
   * @param valor - Valor opcional de la recompensa
   * @returns String para mostrar
   */
  getValueDisplay(valor?: number | string | null): string {
    const numericValue = this.ensureNumber(valor);
    if (numericValue <= 0) {
      return '';
    }
    return this.getFormattedValue(valor);
  }

  /**
   * 🔧 CORREGIDO: Verifica si debe mostrar la sección de valor
   * @param reward - La recompensa
   * @returns true si debe mostrar la sección
   */
  shouldShowValue(reward: Reward): boolean {
    return this.hasValidValue(reward);
  }

  /**
   * 🔧 CORREGIDO: Obtiene un valor numérico seguro con soporte para strings
   * @param valor - Valor que puede ser undefined/null/string/number
   * @returns Número válido o 0
   */
  getSafeNumber(valor?: number | string | null): number {
    return this.ensureNumber(valor);
  }

  /**
   * Maneja errores de imagen de recompensa
   * @param event - Evento de error de imagen
   */
  onRewardImageError(event: any, reward?: Reward): void {
  const img = event.target;
  
  // Evitar bucle infinito
  if (img.getAttribute('data-fallback-attempted') === 'true') {
    // Último recurso: imagen SVG inline
    img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjhmOWZhIi8+PGcgZmlsbD0iIzZjNzU3ZCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4Ij48dGV4dCB4PSI1MCUiIHk9IjQ1JSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+🎁</dGV4dD48dGV4dCB4PSI1MCUiIHk9IjYwJSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+UmVjb21wZW5zYTwvdGV4dD48L2c+PC9zdmc+';
    return;
  }
  
  // Marcar que ya intentamos fallback
  img.setAttribute('data-fallback-attempted', 'true');
  
  // Intentar con imagen por defecto según categoría
  if (reward) {
    img.src = this.getDefaultImageByCategory(reward.categoria);
  } else {
    img.src = 'assets/recompensas/default.png';
  }
}
irAAdminRewards(): void {
  if (!this.authService.isAdmin()) {
    return;
  }
  this.router.navigate(['/admin/rewards']);
}
  /**
   * Obtiene las clases CSS para el estado de la recompensa
   * @param reward - La recompensa
   * @returns String con las clases CSS
   */
  getRewardCardClasses(reward: Reward): string {
    const classes = ['card', 'h-100', 'shadow-lg', 'border-0'];
    
    if (this.canAffordReward(reward) && this.validateRewardAccess(reward)) {
      classes.push('border-success');
    } else if (!this.canAffordReward(reward) && this.validateRewardAccess(reward)) {
      classes.push('border-warning');
    } else {
      classes.push('border-danger');
    }
    
    return classes.join(' ');
  }

  /**
   * Obtiene el texto del badge de puntos
   * @param reward - La recompensa
   * @returns String con el texto del badge
   */
  getPointsBadgeText(reward: Reward): string {
    if (reward.stock !== null && reward.stock !== undefined && reward.stock <= 0) {
      return 'Agotado';
    }
    return `${reward.puntos_requeridos} puntos`;
  }

  /**
   * Obtiene las clases CSS para el badge de puntos
   * @param reward - La recompensa
   * @returns String con las clases CSS
   */
  getPointsBadgeClasses(reward: Reward): string {
    if (reward.stock !== null && reward.stock !== undefined && reward.stock <= 0) {
      return 'badge bg-danger text-white fs-6 px-3 py-2';
    }
    
    if (this.canAffordReward(reward)) {
      return 'badge bg-success text-white fs-6 px-3 py-2';
    }
    
    return 'badge bg-warning text-dark fs-6 px-3 py-2';
  }

  /**
   * Formatea el stock de manera segura
   * @param stock - Stock de la recompensa
   * @returns String formateado
   */
  getFormattedStock(stock?: number | null): string {
    if (stock === null || stock === undefined) {
      return 'Sin límite';
    }
    return stock.toString();
  }

  /**
   * Verifica si una recompensa está en stock bajo
   * @param reward - La recompensa
   * @returns true si el stock es bajo
   */
  isLowStock(reward: Reward): boolean {
    return reward.stock !== null && 
           reward.stock !== undefined && 
           reward.stock <= 10 && 
           reward.stock > 0;
  }

  /**
   * Obtiene el mensaje de stock bajo
   * @param reward - La recompensa
   * @returns String con el mensaje
   */
  getLowStockMessage(reward: Reward): string {
    if (!this.isLowStock(reward)) return '';
    return `¡Solo ${reward.stock} disponibles!`;
  }
getRewardImageUrl(reward: Reward): string {
  // Si tiene imagen específica, intentar usarla
  if (reward.imagen_url && reward.imagen_url.trim()) {
    return reward.imagen_url;
  }
  
  // Si tiene imagen pero sin _url, usar esa
  if ((reward as any).imagen && (reward as any).imagen.trim()) {
    return (reward as any).imagen;
  }
  
  // Generar ruta local basada en ID
  if (reward.id) {
    return `assets/recompensas/${reward.id}.png`;
  }
  
  // Fallback a imagen por categoría
  return this.getDefaultImageByCategory(reward.categoria);
}
private getDefaultImageByCategory(categoria: string): string {
  const defaultImages: { [key: string]: string } = {
    'peliculas': 'assets/recompensas/default-movies.png',
    'bar': 'assets/recompensas/default-bar.png',
    'especial': 'assets/recompensas/default-special.png',
    'descuentos': 'assets/recompensas/default-discount.png'
  };
  
  return defaultImages[categoria] || 'assets/recompensas/default.png';
}

  /**
   * Calcula el ahorro en dólares de los puntos
   * @param puntos - Cantidad de puntos
   * @returns Valor en dólares
   */
  getPointsValueInDollars(puntos: number): number {
    // Asumiendo que 100 puntos = $1
    return puntos / 100;
  }

  /**
   * 🔧 CORREGIDO: Obtiene el texto de ahorro para mostrar
   * @param reward - La recompensa
   * @returns String con el ahorro
   */
  getSavingsText(reward: Reward): string {
    if (!this.hasValidValue(reward)) return '';
    
    const pointsValue = this.getPointsValueInDollars(reward.puntos_requeridos);
    const actualValue = this.ensureNumber(reward.valor);
    
    if (actualValue > pointsValue) {
      const savings = actualValue - pointsValue;
      return `¡Ahorras ${savings.toFixed(2)}!`;
    }
    
    return '';
  }

  /**
   * 🔧 CORREGIDO: Verifica si hay ahorro en la recompensa
   * @param reward - La recompensa
   * @returns true si hay ahorro
   */
  hasSavings(reward: Reward): boolean {
    if (!this.hasValidValue(reward)) return false;
    
    const pointsValue = this.getPointsValueInDollars(reward.puntos_requeridos);
    const actualValue = this.ensureNumber(reward.valor);
    
    return actualValue > pointsValue;
  }
}
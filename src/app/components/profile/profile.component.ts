import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router'; // 🆕 AGREGAR ESTA IMPORTACIÓN
import { AuthService, Usuario } from '../../services/auth.service';
import { UserService, UpdateProfileData, UserStats } from '../../services/user.service';
import { PointsService, PointsStats } from '../../services/points.service';
import { ToastService } from '../../services/toast.service';
import { CommentService } from '../../services/comment.service';

@Component({
  selector: 'app-profile',
  standalone: false,
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  
  currentUser: Usuario | null = null;
  userStats: UserStats | null = null;
  pointsStats: PointsStats | null = null;
  editMode: boolean = false;
  userComments: any[] = [];
  loadingUserComments = false;
  userCommentsCurrentPage = 1;
  userCommentsTotalPages = 1;
  userCommentsLimit = 5;

  // 🆕 AGREGAR ESTA VARIABLE PARA CONTAR FAVORITAS REAL
  realFavoritesCount: number = 0;
  
  // Datos del formulario de edición
  profileForm: UpdateProfileData = {
    nombre: '',
    email: '',
    avatar: ''
  };
  
  // Control de estados
  loading: boolean = false;
  showAvatarOptions: boolean = false;
  
  // 🆕 NUEVAS PROPIEDADES PARA PUNTOS Y REFERIDOS
  userPoints: number = 0;
  referralCode: string = '';
  showReferralCode: boolean = false;
  copyingCode: boolean = false;
  
  // Opciones de avatares predefinidos
  avatarOptions: string[] = [
    'https://ui-avatars.com/api/?name=User&background=4CAF50&color=fff&size=128',
    'https://ui-avatars.com/api/?name=User&background=2196F3&color=fff&size=128',
    'https://ui-avatars.com/api/?name=User&background=FF9800&color=fff&size=128',
    'https://ui-avatars.com/api/?name=User&background=9C27B0&color=fff&size=128',
    'https://ui-avatars.com/api/?name=User&background=F44336&color=fff&size=128',
    'https://ui-avatars.com/api/?name=User&background=00BCD4&color=fff&size=128'
  ];

  constructor(
    public authService: AuthService,
    private userService: UserService,
    private pointsService: PointsService,
    private toastService: ToastService,
    private router: Router, // 🆕 AGREGAR ROUTER
    private commentService: CommentService // 🆕 AGREGAR COMMENT SERVICE
  ) {}

  ngOnInit(): void {
    this.loadUserData();
  }

  // 🔧 MÉTODO ACTUALIZADO CON CORRECCIONES
  private loadUserData(): void {
    this.currentUser = this.authService.getCurrentUser();
    
    if (this.currentUser) {
      // 🔧 CORREGIDO: Usar Observable correctamente
      this.userService.getUserStats(this.currentUser.id).subscribe({
        next: (stats) => {
          this.userStats = stats;
          console.log('📊 Estadísticas de usuario cargadas:', stats);
        },
        error: (error) => {
          console.error('❌ Error al cargar estadísticas de usuario:', error);
          this.userStats = {
            totalFavoritas: 0,
            totalVistas: 0,
            generoFavorito: 'Ninguno',
            ultimaActividad: null
          };
        }
      });

      // 🔧 CORREGIDO: Cargar puntos con Observable
      this.pointsService.getUserPoints().subscribe({
        next: (response) => {
          this.pointsStats = {
            puntosActuales: response.puntosActuales,
            totalGanados: response.totalGanados,
            totalUsados: response.totalUsados,
            valorEnDolares: response.puntosActuales / 1, // 1 punto = $1
            ultimaActividad: new Date().toISOString(),
            totalReferidos: 0 // 🆕 AGREGAR ESTA LÍNEA (por ahora en 0)
          };
          this.userPoints = response.puntosActuales;

          // 🆕 CARGAR REFERIDOS SEPARADAMENTE
          this.pointsService.getUserReferrals().subscribe({
            next: (referrals) => {
              if (this.pointsStats) {
                this.pointsStats.totalReferidos = referrals.length;
              }
            },
            error: (error) => {
              console.error('❌ Error cargando referidos:', error);
            }
          });
        },
        error: (error) => {
          console.error('❌ Error cargando puntos:', error);
          this.userPoints = 0;
          this.pointsStats = {
            puntosActuales: 0,
            totalGanados: 0,
            totalUsados: 0,
            valorEnDolares: 0,
            ultimaActividad: null,
            totalReferidos: 0 // 🆕 AGREGAR ESTA LÍNEA
          };
        }
      });

      // 🔧 CORREGIDO: Obtener código de referido
      this.pointsService.getReferralCode().subscribe({
        next: (code) => {
          this.referralCode = code;
        },
        error: (error) => {
          console.error('❌ Error obteniendo código de referido:', error);
          this.referralCode = '';
        }
      });

      // 🔧 CORREGIDO: Dar puntos de bienvenida
      this.pointsService.giveWelcomePoints().subscribe({
        next: (success) => {
          if (success) {
            console.log('✅ Puntos de bienvenida otorgados');
          }
        },
        error: (error) => {
          console.error('❌ Error con puntos de bienvenida:', error);
        }
      });
    }
  }
  loadUserComments(): void {
  if (!this.currentUser) return;
  
  this.loadingUserComments = true;
  
  // 🔥 CAMBIAR A: usar método con reacciones
  this.commentService.getMyCommentsWithReactions(this.userCommentsCurrentPage, this.userCommentsLimit)
    .subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.userComments = response.data.comentarios || [];
          this.userCommentsTotalPages = response.data.pagination?.totalPages || 1;
          console.log('✅ Comentarios del usuario con reacciones cargados:', this.userComments.length);
        }
        this.loadingUserComments = false;
      },
      error: (error: any) => {
        console.error('❌ Error cargando comentarios del usuario:', error);
        this.userComments = [];
        this.loadingUserComments = false;
        this.toastService.showError('Error al cargar comentarios');
      }
    });
}

toggleUserCommentReaction(commentId: number, tipo: 'like' | 'dislike'): void {
  if (!this.isLoggedIn()) {
    this.toastService.showWarning('Debes iniciar sesión para reaccionar');
    return;
  }

  const comment = this.userComments.find(c => c.id === commentId);
  if (!comment) return;

  // Optimistic update
  const wasUserReaction = comment.user_reaction === tipo;
  const previousReaction = comment.user_reaction;
  
  if (wasUserReaction) {
    comment.user_reaction = null;
    if (tipo === 'like') {
      comment.total_likes = (comment.total_likes || 0) - 1;
    } else {
      comment.total_dislikes = (comment.total_dislikes || 0) - 1;
    }
  } else {
    comment.user_reaction = tipo;
    
    if (previousReaction) {
      if (previousReaction === 'like') {
        comment.total_likes = (comment.total_likes || 0) - 1;
      } else {
        comment.total_dislikes = (comment.total_dislikes || 0) - 1;
      }
    }
    
    if (tipo === 'like') {
      comment.total_likes = (comment.total_likes || 0) + 1;
    } else {
      comment.total_dislikes = (comment.total_dislikes || 0) + 1;
    }
  }

  // Llamar al servicio
  this.commentService.addReaction(commentId, tipo)
    .subscribe({
      next: (response) => {
        if (response.success) {
          comment.total_likes = response.data.stats.totalLikes;
          comment.total_dislikes = response.data.stats.totalDislikes;
          
          this.toastService.showSuccess(
            response.data.action === 'removed' 
              ? 'Reacción eliminada' 
              : `¡${tipo === 'like' ? 'Me gusta' : 'No me gusta'}!`
          );
        }
      },
      error: (error) => {
        // Revertir cambios optimistas
        comment.user_reaction = previousReaction;
        if (previousReaction === 'like') {
          comment.total_likes = (comment.total_likes || 0) + 1;
        } else if (previousReaction === 'dislike') {
          comment.total_dislikes = (comment.total_dislikes || 0) + 1;
        }
        
        console.error('Error al reaccionar:', error);
        this.toastService.showError('Error al procesar reacción');
      }
    });
}
getReactionButtonClass(comment: any, tipo: 'like' | 'dislike'): string {
  const isActive = comment.user_reaction === tipo;
  
  if (tipo === 'like') {
    return isActive ? 'btn-success' : 'btn-outline-success';
  } else {
    return isActive ? 'btn-danger' : 'btn-outline-danger';
  }
}
isReactionActive(comment: any, tipo: 'like' | 'dislike'): boolean {
  return comment.user_reaction === tipo;
}
refreshUserComments(): void {
  this.userCommentsCurrentPage = 1;
  this.loadUserComments();
}
changeUserCommentsPage(page: number): void {
  if (page >= 1 && page <= this.userCommentsTotalPages) {
    this.userCommentsCurrentPage = page;
    this.loadUserComments();
  }
}
trackByCommentId(index: number, comment: any): number {
  return comment.id;
}

getCommentStatusText(estado: string): string {
  const statusMap: { [key: string]: string } = {
    'activo': 'Publicado',
    'moderacion': 'En Moderación',
    'rechazado': 'Rechazado',
    'oculto': 'Oculto'
  };
  return statusMap[estado] || estado;
}


  // 🆕 MÉTODO SIMPLE PARA OBTENER EL CONTEO CORRECTO DE FAVORITAS
  getFavoritesCount(): number {
    return this.realFavoritesCount;
  }

  toggleEditMode(): void {
    this.editMode = !this.editMode;
    
    if (!this.editMode) {
      // Si cancela la edición, restaurar datos originales
      this.loadUserData();
    }
  }

  selectAvatar(avatarUrl: string): void {
    this.profileForm.avatar = avatarUrl;
    this.showAvatarOptions = false;
  }

  saveProfile(): void {
    if (!this.currentUser) return;
    
    this.loading = true;
    
    // Validaciones básicas
    if (!this.profileForm.nombre?.trim()) {
      this.toastService.showWarning('El nombre es requerido');
      this.loading = false;
      return;
    }
    
    if (!this.profileForm.email?.trim()) {
      this.toastService.showWarning('El email es requerido');
      this.loading = false;
      return;
    }

    // 🔥 CORREGIDO: Usar Observable para actualizar perfil
    this.userService.updateProfile(this.currentUser.id, this.profileForm).subscribe({
      next: (success) => {
        if (success) {
          // Actualizar datos en AuthService
          this.updateCurrentUser();
          
          this.toastService.showSuccess('Perfil actualizado correctamente');
          this.editMode = false;
          
          // Recargar datos
          this.loadUserData();
        } else {
          this.toastService.showError('Error al actualizar el perfil');
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error al actualizar perfil:', error);
        this.toastService.showError('Error al actualizar el perfil');
        this.loading = false;
      }
    });
  }

  refreshData(): void {
    this.loadUserData();
  }

  /**
   * 🆕 MÉTODO PARA VERIFICAR SI LAS ESTADÍSTICAS ESTÁN CARGANDO
   */
  isStatsLoading(): boolean {
    return this.userStats === null;
  }

  private updateCurrentUser(): void {
    // En un proyecto real, esto se haría automáticamente al recargar desde el backend
    if (this.currentUser) {
      this.currentUser.nombre = this.profileForm.nombre || this.currentUser.nombre;
      this.currentUser.email = this.profileForm.email || this.currentUser.email;
      this.currentUser.avatar = this.profileForm.avatar || this.currentUser.avatar;
      
      // Actualizar en localStorage
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    }
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  /**
   * Verificar si el usuario es cliente
   */
  isCliente(): boolean {
    return this.isLoggedIn() && this.currentUser?.role === 'cliente';
  }

  /**
   * Verificar si el usuario es admin  
   */
  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  getAccountAge(): string {
    if (!this.currentUser || !this.currentUser.fechaRegistro) return '0 días';
    
    const registroDate = new Date(this.currentUser.fechaRegistro as string);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - registroDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return `${diffDays} días`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} ${months === 1 ? 'mes' : 'meses'}`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} ${years === 1 ? 'año' : 'años'}`;
    }
  }

  // 🆕 NUEVOS MÉTODOS PARA SISTEMA DE PUNTOS Y REFERIDOS

  /**
   * Mostrar/ocultar código de referido
   */
  toggleReferralCode(): void {
    this.showReferralCode = !this.showReferralCode;
  }

  /**
   * Copiar código de referido al portapapeles
   */
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

  /**
   * Compartir código de referido
   */
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

  /**
   * Fallback para compartir en navegadores sin Web Share API
   */
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

  /**
   * 🔧 MÉTODO CORREGIDO: Obtener valor en dólares de los puntos
   */
  getUserPointsValue(): number {
    return this.userPoints / 1; // 1 punto = $1
  }

  /**
   * 🔧 MÉTODO AGREGADO: Obtener valor de puntos (método adicional requerido)
   */
  getPointsValue(): number {
    return this.userPoints / 1; // 1 punto = $1
  }

  /**
   * Obtener configuración de puntos para mostrar información
   */
  getPointsConfig() {
    return {
      puntosPorDolar: 1,
      puntosBienvenida: 50,
      puntosReferido: 100,
      puntosNuevoUsuario: 25
    };
  }

  /**
   * Formatear fecha para mostrar
   */
  formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
  /**
   * Obtener puntos necesarios para la próxima recompensa
   */
  getNextRewardPoints(): number {
    // Esto podría integrarse con RewardsService en el futuro
    const commonRewards = [200, 300, 450, 650, 850];
    const nextReward = commonRewards.find(points => points > this.userPoints);
    return nextReward || 1000;
  }

  /**
   * Obtener progreso hacia la próxima recompensa
   */
  getProgressToNextReward(): number {
    const nextReward = this.getNextRewardPoints();
    return Math.round((this.userPoints / nextReward) * 100);
  }

  /**
   * 🆕 CORREGIDO: Navegar a la página de recompensas
   */
  goToRewards(): void {
    this.router.navigate(['/rewards']);
  }

  /**
   * 🆕 CORREGIDO: Navegar al historial de puntos
   */
  goToPointsHistory(): void {
    this.router.navigate(['/points-history']);
  }

  /**
   * Obtener información sobre cómo ganar más puntos
   */
  showEarnPointsInfo(): void {
    const config = this.getPointsConfig();
    const message = `💰 ¿Cómo ganar puntos?\n\n` +
                   `🎬 Por cada dólar que gastes: ${config.puntosPorDolar} punto\n` +
                   `👥 Por cada amigo que refiera: ${config.puntosReferido} puntos\n` +
                   `🎁 Puntos de bienvenida: ${config.puntosBienvenida} puntos\n\n` +
                   `¡Compra entradas y productos del bar para acumular puntos!`;
    
    alert(message);
  }
}
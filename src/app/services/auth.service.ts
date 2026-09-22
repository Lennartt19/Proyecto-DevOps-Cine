import { Injectable, Inject, PLATFORM_ID, Optional } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, catchError, delay, retry } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// 🛡️ IMPORT OPCIONAL del ToastService para evitar dependencia circular
// import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  // 🔗 API Configuration
  private readonly API_URL = environment.apiUrl;

  // 🔐 Estado de autenticación
  public isAuthenticated: boolean = false;
  private currentUser: Usuario | null = null;
  private authToken: string | null = null;

  // 📡 Observable para el estado de autenticación
  private authStatusSubject = new BehaviorSubject<boolean>(false);
  public authStatus$ = this.authStatusSubject.asObservable();

  private currentUserSubject = new BehaviorSubject<Usuario | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  // 🆕 Variable para el intervalo de monitoreo
  private tokenMonitorInterval: any = null;

  // 🛡️ NUEVO: Flag para evitar inicialización múltiple
  private isInitialized: boolean = false;

  // 🛡️ NUEVO: Referencia opcional al ToastService
  private toastService: any = null;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
    // 🛡️ REMOVER ToastService del constructor para evitar dependencia circular
    // @Optional() private toastService?: ToastService
  ) {
    console.log('🔐 AuthService conectado a API:', this.API_URL);
    
    // 🛡️ SOLO inicializar en el navegador
    if (isPlatformBrowser(this.platformId)) {
      this.initializeService();
    }
  }

  // 🛡️ NUEVO: Método de inicialización segura
  private initializeService(): void {
    if (this.isInitialized) {
      console.log('⚠️ AuthService ya inicializado, saltando...');
      return;
    }

    try {
      console.log('🚀 Inicializando AuthService...');
      
      // 🛡️ Prevenir inicialización múltiple
      this.isInitialized = true;

      // Usar setTimeout para permitir que Angular termine la hidratación
      setTimeout(() => {
        this.performInitialization();
      }, 100);

    } catch (error) {
      console.error('❌ Error en inicialización:', error);
      this.handleInitializationError();
    }
  }

  // 🛡️ NUEVO: Realizar inicialización después de hidratación
  private performInitialization(): void {
    try {
      console.log('🔧 Ejecutando inicialización diferida...');
      
      // 1. Limpieza preventiva
      this.preventiveCleanup();
      
      // 2. Cargar datos de autenticación
      this.loadAuthFromStorage();
      
      // 3. Iniciar monitoreo si hay sesión
      if (this.isLoggedIn()) {
        console.log('✅ Sesión detectada, iniciando monitoreo...');
        this.startTokenMonitoring();
      }

      console.log('✅ AuthService inicializado correctamente');

    } catch (error) {
      console.error('❌ Error en inicialización diferida:', error);
      this.handleInitializationError();
    }
  }

  // 🛡️ NUEVO: Manejar errores de inicialización
  private handleInitializationError(): void {
    console.log('🧹 Limpiando datos por error de inicialización...');
    this.clearAuthData();
    this.isInitialized = false;
  }

  // 🛡️ NUEVO: Método para inyectar ToastService después de la inicialización
  public setToastService(toastService: any): void {
    this.toastService = toastService;
    console.log('📧 ToastService conectado al AuthService');
  }

  // 🛡️ MEJORADO: Verificación más robusta de plataforma
  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId) && typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  private preventiveCleanup(): void {
    if (!this.isBrowser()) {
      console.log('⚠️ No es navegador, saltando limpieza preventiva');
      return;
    }

    try {
      console.log('🔍 Ejecutando limpieza preventiva...');
      
      // 1. Verificar si hay tokens obviamente expirados
      const token = this.getStorageItem('auth_token');
      if (token) {
        if (!this.isValidJWTFormat(token)) {
          console.log('🧹 Token con formato inválido detectado - limpiando');
          this.clearAuthData();
          return;
        }
        
        if (this.isTokenExpiredLocally(token)) {
          console.log('🧹 Token expirado detectado - limpiando');
          this.clearAuthData();
          return;
        }
      }
      
      // 2. Verificar consistencia de datos
      const userStr = this.getStorageItem('current_user');
      const isAuth = this.getStorageItem('is_authenticated');
      
      if ((token && !userStr) || (userStr && !token) || (token && isAuth !== 'true')) {
        console.log('🧹 Datos inconsistentes detectados - limpiando');
        this.clearAuthData();
        return;
      }
      
      // 3. Verificar datos de usuario válidos
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (!user.id || !user.email || !user.nombre) {
            console.log('🧹 Datos de usuario incompletos - limpiando');
            this.clearAuthData();
            return;
          }
        } catch (parseError) {
          console.log('🧹 Datos de usuario corruptos - limpiando');
          this.clearAuthData();
          return;
        }
      }
      
      console.log('✅ Limpieza preventiva completada - datos válidos');
      
    } catch (error) {
      console.error('❌ Error en limpieza preventiva:', error);
      // En caso de error, limpiar por seguridad
      this.clearAuthData();
    }
  }

  // 🛡️ NUEVO: Método seguro para acceder a localStorage
  private getStorageItem(key: string): string | null {
    if (!this.isBrowser()) {
      return null;
    }
    
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`❌ Error accediendo a localStorage[${key}]:`, error);
      return null;
    }
  }

  // 🛡️ NUEVO: Método seguro para escribir a localStorage
  private setStorageItem(key: string, value: string): boolean {
    if (!this.isBrowser()) {
      return false;
    }
    
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error(`❌ Error escribiendo a localStorage[${key}]:`, error);
      return false;
    }
  }

  // 🛡️ NUEVO: Método seguro para remover de localStorage
  private removeStorageItem(key: string): boolean {
    if (!this.isBrowser()) {
      return false;
    }
    
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`❌ Error removiendo localStorage[${key}]:`, error);
      return false;
    }
  }

  private isValidJWTFormat(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    // Verificar que cada parte no esté vacía
    for (const part of parts) {
      if (!part || part.trim() === '') {
        return false;
      }
    }

    // Intentar decodificar el payload
    try {
      atob(parts[1]);
      return true;
    } catch (error) {
      return false;
    }
  }

  private isTokenExpiredLocally(token: string): boolean {
    try {
      if (!this.isValidJWTFormat(token)) {
        return true;
      }

      const payload = JSON.parse(atob(token.split('.')[1]));
      
      if (!payload.exp) {
        return false; // Sin expiración = válido
      }

      const currentTime = Date.now() / 1000;
      const isExpired = payload.exp < currentTime;

      if (isExpired) {
        const expDate = new Date(payload.exp * 1000);
        const now = new Date();
        console.log(`⏰ Token expirado desde: ${expDate.toLocaleString()} (actual: ${now.toLocaleString()})`);
      }

      return isExpired;
    } catch (error) {
      console.error('❌ Error verificando expiración:', error);
      return true;
    }
  }

  private setupAutoCleanup(): void {
    const token = this.getToken();
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.exp) return;

      const expirationTime = payload.exp * 1000;
      const now = Date.now();
      const timeUntilExpiration = expirationTime - now;
      
      // 🔧 FIX: Ajustar umbral dinámicamente según duración del token
      const tokenDuration = (payload.exp - payload.iat) * 1000; // Duración total del token
      let cleanupThreshold;
      
      if (tokenDuration <= 300000) { // 5 minutos o menos
        cleanupThreshold = Math.min(60000, tokenDuration * 0.3); // 1 minuto o 30% del token
      } else if (tokenDuration <= 600000) { // 10 minutos o menos
        cleanupThreshold = Math.min(120000, tokenDuration * 0.4); // 2 minutos o 40% del token
      } else {
        cleanupThreshold = 30 * 60 * 1000; // 30 minutos para tokens largos
      }

      // Si queda menos del umbral dinámico, limpiar ahora
      if (timeUntilExpiration <= cleanupThreshold) {
        console.log(`⚠️ Token expira en ${Math.round(timeUntilExpiration/60000)} minutos (umbral: ${Math.round(cleanupThreshold/60000)}min) - limpiando ahora`);
        this.handleTokenExpiration();
        return;
      }

      // Configurar limpieza automática antes del umbral
      const timeoutDuration = timeUntilExpiration - cleanupThreshold;
      
      setTimeout(() => {
        console.log('⏰ Token próximo a expirar - ejecutando limpieza automática');
        this.handleTokenExpiration();
      }, timeoutDuration);

      console.log(`⏰ Auto-limpieza programada en ${Math.round(timeoutDuration / 1000 / 60)} minutos (expira en ${Math.round(timeUntilExpiration / 1000 / 60)}min)`);

    } catch (error) {
      console.error('❌ Error configurando auto-limpieza:', error);
    }
  }

  private handleTokenExpiration(): void {
    console.log('⏰ Manejando expiración de token...');
    
    // Mostrar notificación al usuario SI tenemos ToastService
    if (this.toastService && this.toastService.showWarning) {
      this.toastService.showWarning('⏰ Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
    }
    
    // Limpiar datos
    this.clearAuthData();
    
    // Redirigir al login si estamos en una página protegida
    if (this.isBrowser()) {
      const currentUrl = window.location.pathname;
      const protectedRoutes = ['/admin', '/profile', '/checkout', '/orders'];
      
      if (protectedRoutes.some(route => currentUrl.includes(route))) {
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }
    }
  }

  private checkEnvironmentTokenCompatibility(): void {
    const token = this.getToken();
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const tokenIssuer = payload.iss; // Emisor del token
      
      if (!this.isBrowser()) return;
      const currentDomain = window.location.hostname;
      
      // Si el token fue emitido para un entorno diferente, limpiarlo
      if (tokenIssuer && tokenIssuer !== 'parkyfilms-api') {
        console.log('🧹 Token de entorno diferente detectado - limpiando');
        this.clearAuthData();
        return;
      }
      
      // Verificar dominio
      if (currentDomain.includes('localhost') && payload.aud !== 'parkyfilms-app') {
        console.log('🧹 Token incompatible con entorno local - limpiando');
        this.clearAuthData();
        return;
      }
      
    } catch (error) {
      console.error('❌ Error verificando compatibilidad:', error);
    }
  }

  public checkAndCleanIfNeeded(): void {
    console.log('🔍 Verificación manual de token solicitada');
    this.preventiveCleanup();
    
    if (this.getToken()) {
      this.setupAutoCleanup();
      this.checkEnvironmentTokenCompatibility();
    }
  }

  // ==================== 🆕 MÉTODOS DE RENOVACIÓN AUTOMÁTICA ====================

  /**
   * 🆕 Verificar si el token está próximo a expirar (30 minutos antes)
   */
  private isTokenExpiringSoon(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // Convertir a millisegundos
      const now = Date.now();
      const thirtyMinutes = 30 * 60 * 1000; // 30 minutos en ms
      
      return (exp - now) < thirtyMinutes;
    } catch (error) {
      console.error('Error al verificar expiración:', error);
      return true; // Si hay error, asumir que expira
    }
  }

  /**
   * 🆕 Obtener tiempo restante del token en minutos
   */
  getTokenTimeRemaining(): number {
    const token = this.getToken();
    if (!token) return 0;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000;
      const now = Date.now();
      const minutesRemaining = Math.floor((exp - now) / (1000 * 60));
      
      return Math.max(0, minutesRemaining);
    } catch (error) {
      return 0;
    }
  }

  /**
   * 🆕 Iniciar monitoreo automático del token
   */
  private startTokenMonitoring(): void {
    // Limpiar cualquier intervalo existente
    if (this.tokenMonitorInterval) {
      clearInterval(this.tokenMonitorInterval);
    }

    // Verificar cada 5 minutos
    this.tokenMonitorInterval = setInterval(() => {
      if (this.isLoggedIn()) {
        const minutesLeft = this.getTokenTimeRemaining();
        
        console.log(`⏰ Token expira en ${minutesLeft} minutos`);
        
        if (minutesLeft <= 30 && minutesLeft > 0) {
          console.log('⚠️ Token próximo a expirar, renovando...');
          this.refreshTokenAutomatically();
        } else if (minutesLeft <= 0) {
          console.log('❌ Token expirado, cerrando sesión...');
          this.logout();
        }
      } else {
        // Si no hay sesión, detener el monitoreo
        this.stopTokenMonitoring();
      }
    }, 5 * 60 * 1000); // Cada 5 minutos

    console.log('🔄 Monitoreo automático de token iniciado');
  }

  /**
   * 🆕 Detener monitoreo del token
   */
  private stopTokenMonitoring(): void {
    if (this.tokenMonitorInterval) {
      clearInterval(this.tokenMonitorInterval);
      this.tokenMonitorInterval = null;
      console.log('⏹️ Monitoreo automático de token detenido');
    }
  }

  /**
   * 🆕 Renovar token automáticamente
   */
  private refreshTokenAutomatically(): void {
    this.refreshToken().subscribe({
      next: (response) => {
        if (response.success && response.data?.token) {
          // Actualizar el token
          this.authToken = response.data.token;
          this.saveAuthToStorage();
          console.log('✅ Token renovado automáticamente');
        } else {
          console.log('❌ No se pudo renovar el token');
          this.logout();
        }
      },
      error: (error) => {
        console.error('❌ Error al renovar token:', error);
        this.logout();
      }
    });
  }

  /**
   * 🆕 Método mejorado de refreshToken que retorna el nuevo token
   */
  refreshToken(): Observable<{success: boolean, data?: {token: string}, message?: string}> {
    const token = this.getToken();
    if (!token) return of({success: false, message: 'No hay token para renovar'});

    const headers = this.getAuthHeaders();

    return this.http.post<any>(`${this.API_URL}/auth/refresh`, {}, { headers }).pipe(
      map(response => {
        console.log('🔍 Respuesta de refresh:', response);
        return response;
      }),
      catchError(error => {
        console.error('❌ Error en refresh token:', error);
        return of({
          success: false,
          message: error.error?.error || 'Error al renovar token'
        });
      })
    );
  }

  // ==================== MÉTODOS DE AUTENTICACIÓN TRADICIONAL ====================

  /**
   * Registrar nuevo usuario
   */
  register(registroData: RegistroUsuario): Observable<AuthResponse> {
    const body = {
      nombre: registroData.nombre,
      email: registroData.email,
      password: registroData.password,
      confirmarPassword: registroData.confirmarPassword
    };

    return this.http.post<any>(`${this.API_URL}/auth/register`, body).pipe(
      map(response => {
        console.log('🔍 Respuesta de registro:', response);
        
        if (response.success && response.data) {
          this.handleAuthSuccess(response.data);
          return {
            success: true,
            message: response.message || '¡Usuario registrado exitosamente!',
            user: this.convertApiUser(response.data.user)
          };
        }
        throw new Error(response.error || 'Error en el registro');
      }),
      catchError(error => {
        console.error('❌ Error en registro:', error);
        return of({
          success: false,
          message: error.error?.error || error.error?.message || 'Error al registrar usuario'
        });
      })
    );
  }

  /**
   * Iniciar sesión
   */
  login(email: string, password: string): Observable<AuthResponse> {
    const body = { email, password };

    return this.http.post<any>(`${this.API_URL}/auth/login`, body).pipe(
      map(response => {
        console.log('🔍 Respuesta de login:', response);
        
        if (response.success && response.data) {
          this.handleAuthSuccess(response.data);
          return {
            success: true,
            message: response.message || '¡Bienvenido de vuelta!',
            user: this.convertApiUser(response.data.user)
          };
        }
        throw new Error(response.error || 'Credenciales incorrectas');
      }),
      catchError(error => {
        console.error('❌ Error en login:', error);
        return of({
          success: false,
          message: error.error?.error || error.error?.message || 'Error al iniciar sesión'
        });
      })
    );
  }

  // ==================== MÉTODOS DE OAUTH ====================

  /**
   * 🔗 Iniciar autenticación con Google
   */
  loginWithGoogle(): void {
    console.log('🔗 Iniciando autenticación con Google...');
    if (this.isBrowser()) {
      window.location.href = `${this.API_URL}/auth/google`;
    }
  }

  /**
   * 🔗 Iniciar autenticación con Facebook
   */
  loginWithFacebook(): void {
    console.log('🔗 Iniciando autenticación con Facebook...');
    if (this.isBrowser()) {
      window.location.href = `${this.API_URL}/auth/facebook`;
    }
  }

  /**
   * 🔗 Iniciar autenticación con GitHub
   */
  loginWithGitHub(): void {
    console.log('🔗 Iniciando autenticación con GitHub...');
    if (this.isBrowser()) {
      window.location.href = `${this.API_URL}/auth/github`;
    }
  }

  /**
   * 🔗 Manejar callback de OAuth
   */
  handleOAuthCallback(token: string, userData?: string): boolean {
    try {
      if (!token) {
        console.error('❌ No token received from OAuth callback');
        return false;
      }

      this.authToken = token;
      this.isAuthenticated = true;

      // Si tenemos datos de usuario, parsearlos
      if (userData) {
        try {
          const parsedUser = JSON.parse(decodeURIComponent(userData));
          this.currentUser = this.convertApiUser(parsedUser);
          console.log('✅ Usuario OAuth procesado:', this.currentUser);
        } catch (parseError) {
          console.warn('⚠️ Error parseando datos de usuario OAuth:', parseError);
        }
      }

      // Guardar en localStorage
      this.saveAuthToStorage();
      
      // Actualizar observables
      this.updateAuthState();

      // 🆕 INICIAR MONITOREO AUTOMÁTICO
      this.startTokenMonitoring();

      // Verificar token con el servidor si no tenemos datos completos
      if (!this.currentUser) {
        this.verifyToken().subscribe();
      }

      return true;
    } catch (error) {
      console.error('❌ Error en OAuth callback:', error);
      return false;
    }
  }

  // ==================== MÉTODOS DE RECUPERACIÓN DE CONTRASEÑA ====================

  forgotPassword(email: string): Observable<AuthResponse> {
    const body = { email };

    return this.http.post<any>(`${this.API_URL}/auth/forgot-password`, body).pipe(
      map(response => {
        console.log('🔍 Respuesta de forgot password:', response);
        
        if (response.success) {
          return {
            success: true,
            message: response.message || 'Se ha enviado un enlace de recuperación a tu email'
          };
        }
        throw new Error(response.error || 'Error en la solicitud');
      }),
      catchError(error => {
        console.error('❌ Error en forgot password:', error);
        return of({
          success: false,
          message: error.error?.error || error.error?.message || 'Error al solicitar recuperación'
        });
      })
    );
  }

  /**
   * Validar token de recuperación
   */
  validateResetToken(token: string): Observable<{success: boolean, message: string, data?: any}> {
    return this.http.get<any>(`${this.API_URL}/auth/validate-reset-token/${token}`).pipe(
      map(response => {
        console.log('🔍 Respuesta de validate token:', response);
        return response;
      }),
      catchError(error => {
        console.error('❌ Error validando token:', error);
        return of({
          success: false,
          message: error.error?.error || 'Token inválido o expirado'
        });
      })
    );
  }

  /**
   * Restablecer contraseña
   */
  resetPassword(token: string, newPassword: string, confirmPassword: string): Observable<AuthResponse> {
    const body = { token, newPassword, confirmPassword };

    return this.http.post<any>(`${this.API_URL}/auth/reset-password`, body).pipe(
      map(response => {
        console.log('🔍 Respuesta de reset password:', response);
        
        if (response.success) {
          return {
            success: true,
            message: response.message || 'Contraseña restablecida exitosamente'
          };
        }
        throw new Error(response.error || 'Error al restablecer');
      }),
      catchError(error => {
        console.error('❌ Error en reset password:', error);
        return of({
          success: false,
          message: error.error?.error || error.error?.message || 'Error al restablecer contraseña'
        });
      })
    );
  }

  // ==================== MÉTODOS DE VERIFICACIÓN ====================

  /**
   * 🛡️ MEJORADO: Verificar token con retry y delay
   */
  verifyToken(): Observable<boolean> {
    const token = this.getToken();
    if (!token) return of(false);

    const headers = this.getAuthHeaders();

    return this.http.get<any>(`${this.API_URL}/auth/verify`, { headers }).pipe(
      retry(2), // Reintentar 2 veces
      delay(100), // Delay de 100ms
      map(response => {
        console.log('🔍 Respuesta de verify:', response);
        
        if (response.success && response.data) {
          this.currentUser = this.convertApiUser(response.data.user);
          this.isAuthenticated = true;
          this.updateAuthState();
          return true;
        }
        return false;
      }),
      catchError(error => {
        console.error('❌ Token inválido:', error);
        this.logout();
        return of(false);
      })
    );
  }

  // ==================== MÉTODOS DE ESTADO ====================

  /**
   * Cerrar sesión
   */
  logout(): void {
    // 🆕 DETENER MONITOREO AUTOMÁTICO
    this.stopTokenMonitoring();

    // Llamar al endpoint de logout (opcional)
    const headers = this.getAuthHeaders();
    this.http.post(`${this.API_URL}/auth/logout`, {}, { headers }).subscribe({
      next: () => console.log('✅ Logout exitoso'),
      error: (error) => console.error('⚠️ Error en logout:', error)
    });

    // Limpiar estado local
    this.clearAuthData();
  }

  /**
   * Cambiar contraseña
   */
  changePassword(currentPassword: string, newPassword: string, confirmNewPassword: string): Observable<boolean> {
    const headers = this.getAuthHeaders();
    const body = {
      currentPassword,
      newPassword,
      confirmNewPassword
    };

    return this.http.post<ApiResponse<any>>(`${this.API_URL}/auth/change-password`, body, { headers }).pipe(
      map(response => {
        if (response.success) {
          console.log('✅ Contraseña cambiada exitosamente');
          return true;
        }
        throw new Error(response.message || 'Error al cambiar contraseña');
      }),
      catchError(error => {
        console.error('❌ Error al cambiar contraseña:', error);
        return of(false);
      })
    );
  }

  /**
   * Verificar si el usuario está logueado
   */
  isLoggedIn(): boolean {
    return this.isAuthenticated && this.currentUser !== null && this.authToken !== null;
  }

  /**
   * Verificar si el usuario es admin
   */
  isAdmin(): boolean {
    return this.isLoggedIn() && this.currentUser?.role === 'admin';
  }

  /**
   * Obtener usuario actual
   */
  getCurrentUser(): Usuario | null {
    return this.currentUser;
  }

  /**
   * Obtener token de autenticación
   */
  getToken(): string | null {
    return this.authToken || this.getStorageItem('auth_token');
  }

  getCurrentUserName(): string {
    return this.currentUser?.nombre || 'Usuario';
  }

  /**
   * Obtener email del usuario actual
   */
  getCurrentUserEmail(): string {
    return this.currentUser?.email || '';
  }

  /**
   * Obtener avatar del usuario actual
   */
  getCurrentUserAvatar(): string {
    return this.currentUser?.avatar || 'https://ui-avatars.com/api/?name=User&background=6c757d&color=fff&size=128';
  }

  /**
   * Verificar si el usuario es cliente
   */
  isCliente(): boolean {
    return this.isLoggedIn() && this.currentUser?.role === 'cliente';
  }

  /**
   * 🆕 Verificar si el usuario usó OAuth
   */
  isOAuthUser(): boolean {
    return this.isLoggedIn() && !!this.currentUser?.oauthProvider;
  }

  /**
   * 🆕 Obtener proveedor OAuth
   */
  getOAuthProvider(): string | null {
    return this.currentUser?.oauthProvider || null;
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Manejar éxito de autenticación
   */
  private handleAuthSuccess(authData: AuthData): void {
    this.currentUser = this.convertApiUser(authData.user);
    this.authToken = authData.token || null;
    this.isAuthenticated = true;

    // Guardar en localStorage
    this.saveAuthToStorage();
    
    // Actualizar observables
    this.updateAuthState();

    // 🛡️ NUEVO: Configurar auto-limpieza para el nuevo token
    this.setupAutoCleanup();

    console.log('✅ Autenticación exitosa:', this.currentUser.nombre);
  }

  /**
   * Convertir usuario de API a formato local
   */
  private convertApiUser(apiUser: any): Usuario {
    return {
      id: apiUser.id,
      nombre: apiUser.nombre,
      email: apiUser.email,
      role: apiUser.role as 'admin' | 'cliente',
      avatar: apiUser.avatar,
      fechaRegistro: apiUser.fecha_registro || apiUser.fechaRegistro,
      isActive: apiUser.is_active !== false,
      oauthProvider: apiUser.oauthProvider || apiUser.oauth_provider // 🆕 NUEVO CAMPO
    };
  }

  /**
   * Obtener headers con token de autenticación
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    
    if (!token) {
      console.warn('⚠️ No hay token de autenticación');
      return new HttpHeaders();
    }

    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Actualizar estado de autenticación en observables
   */
  private updateAuthState(): void {
    this.authStatusSubject.next(this.isAuthenticated);
    this.currentUserSubject.next(this.currentUser);
  }

  /**
   * 🛡️ MEJORADO: Guardar datos de autenticación en localStorage con verificación
   */
  private saveAuthToStorage(): void {
    if (!this.isBrowser()) {
      console.warn('⚠️ No es navegador, saltando guardado en localStorage');
      return;
    }

    try {
      if (this.authToken) {
        this.setStorageItem('auth_token', this.authToken);
      }
      if (this.currentUser) {
        this.setStorageItem('current_user', JSON.stringify(this.currentUser));
      }
      this.setStorageItem('is_authenticated', 'true');
      
      console.log('💾 Datos de autenticación guardados');
    } catch (error) {
      console.error('❌ Error al guardar datos de auth:', error);
    }
  }

  /**
   * 🛡️ MEJORADO: Cargar datos de autenticación desde localStorage con verificación
   */
  private loadAuthFromStorage(): void {
    if (!this.isBrowser()) {
      console.warn('⚠️ No es navegador, saltando carga desde localStorage');
      return;
    }

    try {
      const token = this.getStorageItem('auth_token');
      const userStr = this.getStorageItem('current_user');
      const isAuth = this.getStorageItem('is_authenticated') === 'true';

      console.log('🔍 Cargando desde localStorage:', {
        hasToken: !!token,
        hasUser: !!userStr,
        isAuth
      });

      if (token && userStr && isAuth) {
        this.authToken = token;
        this.currentUser = JSON.parse(userStr);
        this.isAuthenticated = true;
        this.updateAuthState();

        console.log('✅ Datos cargados desde localStorage:', this.currentUser?.nombre);

        // 🛡️ VERIFICACIÓN DIFERIDA: Verificar token con el servidor después de un delay
        setTimeout(() => {
          this.verifyToken().subscribe({
            next: (isValid) => {
              if (!isValid) {
                console.log('⚠️ Token inválido detectado durante verificación diferida');
              } else {
                console.log('✅ Token verificado correctamente');
              }
            },
            error: (error) => {
              console.warn('⚠️ Error en verificación diferida:', error);
            }
          });
        }, 1000); // Verificar después de 1 segundo

      } else {
        console.log('ℹ️ No hay datos de autenticación válidos en localStorage');
      }
    } catch (error) {
      console.error('❌ Error al cargar datos de auth:', error);
      this.clearAuthData();
    }
  }

  /**
   * 🛡️ MEJORADO: Limpiar todos los datos de autenticación
   */
  private clearAuthData(): void {
    console.log('🧹 Limpiando datos de autenticación...');
    
    this.currentUser = null;
    this.authToken = null;
    this.isAuthenticated = false;

    // 🆕 DETENER MONITOREO
    this.stopTokenMonitoring();

    // 🛡️ Limpiar localStorage de forma segura
    if (this.isBrowser()) {
      this.removeStorageItem('auth_token');
      this.removeStorageItem('current_user');
      this.removeStorageItem('is_authenticated');
      this.removeStorageItem('redirectUrl');
    }

    // Actualizar observables
    this.updateAuthState();

    console.log('🧹 Datos de autenticación limpiados');
  }

  // ==================== MÉTODOS DE COMPATIBILIDAD ====================

  /**
   * Método legacy para compatibilidad con código existente
   */
  loginSync(email: string, password: string): boolean {
    console.warn('⚠️ loginSync() es obsoleto. Usa login() Observable');
    
    this.login(email, password).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('✅ Login exitoso (sync)');
        }
      },
      error: (error) => {
        console.error('❌ Error en login (sync):', error);
      }
    });

    return false; // Siempre retorna false ya que es asíncrono
  }

  // ==================== MÉTODOS PARA ADMIN SERVICE ====================

  /**
   * Obtener todos los usuarios registrados (para AdminService)
   */
  getAllRegisteredUsers(): Usuario[] {
    // Por ahora retorna array con el usuario actual
    // En el futuro conectarías con una API de usuarios
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      return [{ ...currentUser, isActive: true }];
    }
    
    // Usuarios de ejemplo para el admin
    return [
      {
        id: 1,
        nombre: 'Admin Sistema',
        email: 'admin@parkyfilms.com',
        role: 'admin',
        avatar: 'https://ui-avatars.com/api/?name=Admin+Sistema&background=FF5722&color=fff&size=128&bold=true',
        fechaRegistro: '2024-01-01',
        isActive: true
      },
      {
        id: 2,
        nombre: 'Usuario Demo',
        email: 'demo@parkyfilms.com',
        role: 'cliente',
        avatar: 'https://ui-avatars.com/api/?name=Usuario+Demo&background=4CAF50&color=fff&size=128&bold=true',
        fechaRegistro: '2024-02-15',
        isActive: true
      }
    ];
  }

  /**
   * Buscar usuario por ID (para AdminService)
   */
  findUserById(userId: number): Usuario | null {
    const usuarios = this.getAllRegisteredUsers();
    return usuarios.find(u => u.id === userId) || null;
  }

  // ==================== 🛡️ MÉTODOS PÚBLICOS PARA DEBUGGING ====================

  /**
   * 🛡️ NUEVO: Método para debugging manual
   */
  public debugAuthState(): void {
    console.log('🔍 === DEBUG AUTH STATE ===');
    console.log('isAuthenticated:', this.isAuthenticated);
    console.log('currentUser:', this.currentUser);
    console.log('authToken:', this.authToken ? 'Present' : 'Null');
    console.log('localStorage token:', this.getStorageItem('auth_token') ? 'Present' : 'Null');
    console.log('localStorage user:', this.getStorageItem('current_user') ? 'Present' : 'Null');
    console.log('localStorage isAuth:', this.getStorageItem('is_authenticated'));
    console.log('isLoggedIn():', this.isLoggedIn());
    console.log('Token time remaining:', this.getTokenTimeRemaining(), 'minutes');
    console.log('=========================');
  }

  /**
   * 🛡️ NUEVO: Forzar re-inicialización
   */
  public forceReinitialization(): void {
    console.log('🔄 Forzando re-inicialización del AuthService...');
    this.isInitialized = false;
    this.stopTokenMonitoring();
    
    setTimeout(() => {
      this.initializeService();
    }, 200);
  }

  /**
   * 🛡️ NUEVO: Verificación manual de salud del servicio
   */
  public healthCheck(): {status: string, issues: string[]} {
    const issues: string[] = [];
    
    if (!this.isBrowser()) {
      issues.push('No ejecutándose en navegador');
    }
    
    if (!this.isInitialized) {
      issues.push('Servicio no inicializado');
    }
    
    const token = this.getToken();
    if (token && !this.isValidJWTFormat(token)) {
      issues.push('Token con formato inválido');
    }
    
    if (token && this.isTokenExpiredLocally(token)) {
      issues.push('Token expirado');
    }
    
    if (this.isAuthenticated && !this.currentUser) {
      issues.push('Autenticado pero sin datos de usuario');
    }
    
    if (this.currentUser && !this.authToken) {
      issues.push('Datos de usuario pero sin token');
    }
    
    return {
      status: issues.length === 0 ? 'healthy' : 'issues_detected',
      issues
    };
  }
}

// ==================== INTERFACES ====================

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  role: 'admin' | 'cliente';
  avatar: string;
  fechaRegistro?: string;
  isActive?: boolean;
  oauthProvider?: string; // 🆕 NUEVO CAMPO
}

export interface RegistroUsuario {
  nombre: string;
  email: string;
  password: string;
  confirmarPassword: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: Usuario;
}

interface AuthData {
  user: any;
  accessToken?: string;
  token?: string;
  refreshToken?: string;
  expiresIn?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
// frontend/src/app/app-routing.module.ts - ACTUALIZADO CON COMENTARIOS
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { MovieListComponent } from './components/movie-list/movie-list.component';
import { MovieDetailComponent } from './components/movie-detail/movie-detail.component';
import { TicketPurchaseComponent } from './components/ticket-purchase/ticket-purchase.component';
import { ShoppingCartComponent } from './components/shopping-cart/shopping-cart.component';
import { CheckoutComponent } from './components/checkout/checkout.component';
import { SearchComponent } from './components/search/search.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { SeatSelectionComponent } from './components/seat-selection/seat-selection.component';
import { AuthGuard } from './guards/auth.guard';
import { ComingSoonComponent } from './components/coming-soon/coming-soon.component';
import { ComingSoonDetailComponent } from './components/coming-soon-detail/coming-soon-detail.component';
import { ProfileComponent } from './components/profile/profile.component';
import { FavoritesComponent } from './components/favorites/favorites.component';
import { HistoryComponent } from './components/history/history.component';
import { AdminGuard } from './guards/admin.guard';
import { BarListComponent } from './components/bar-list/bar-list.component';
import { BarDetailComponent } from './components/bar-detail/bar-detail.component';
import { AdminLogsComponent } from './components/admin/admin-logs/admin-logs.component';

// IMPORTAR COMPONENTES ADMIN
import { AdminLayoutComponent } from './components/admin/admin-layout/admin-layout.component';
import { AdminDashboardComponent } from './components/admin/admin-dashboard/admin-dashboard.component';
import { AdminMoviesComponent } from './components/admin/admin-movies/admin-movies.component';
import { AdminUsersComponent } from './components/admin/admin-users/admin-users.component';
import { AdminBarComponent } from './components/admin/admin-bar/admin-bar.component';
import { AdminComingSoonComponent } from './components/admin/admin-coming-soon/admin-coming-soon.component';
import { FunctionAdminComponent } from './components/admin/function-admin/function-admin.component';
import { AdminRewardsComponent } from './components/admin/admin-rewards/admin-rewards.component';
import { AdminConfigComponent } from './components/admin/admin-config/admin-config.component';

// COMPONENTES DEL SISTEMA DE PUNTOS Y RECOMPENSAS
import { RewardsComponent } from './components/rewards/rewards.component';
import { OrderHistoryComponent } from './components/order-history/order-history.component';
import { PointsHistoryComponent } from './components/points-history/points-history.component';

// COMPONENTES DE RECUPERACIÓN DE CONTRASEÑA
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';

// 🆕 COMPONENTE DE OAUTH CALLBACK
import { OAuthCallbackComponent } from './components/oauth-callback/oauth-callback.component';

// 🆕 NUEVO COMPONENTE DE SUGERENCIAS
import { SuggestionsComponent } from './components/suggestions/suggestions.component';

const routes: Routes = [
  // ==================== RUTAS PRINCIPALES ====================
  { 
    path: 'home', 
    component: HomeComponent,
    data: { title: 'Inicio - Parky Films' }
  },
  
  // ==================== RUTAS DE PELÍCULAS ====================
  { 
    path: 'movies', 
    component: MovieListComponent,
    data: { title: 'Películas en Cartelera' }
  },
  { 
    path: 'movie/:id', 
    component: MovieDetailComponent,
    data: { title: 'Detalles de Película' }
  },
  { 
    path: 'ticket-purchase/:id', 
    component: TicketPurchaseComponent,
    data: { title: 'Comprar Entradas' }
  },
  { 
    path: 'seat-selection/:movieId/:funcionId/:cantidad', 
    component: SeatSelectionComponent,
    canActivate: [AuthGuard],
    data: { title: 'Seleccionar Asientos' }
  },
  
  // ==================== RUTAS DE PRÓXIMOS ESTRENOS ====================
  {
    path: 'coming-soon',
    component: ComingSoonComponent,
    data: { title: 'Próximos Estrenos' }
  },
  {
    path: 'coming-soon/:id',
    component: ComingSoonDetailComponent,
    data: { title: 'Detalles del Estreno' }
  },
  
  // ==================== RUTAS DEL BAR ====================
  { 
    path: 'bar', 
    component: BarListComponent,
    data: { title: 'Bar y Snacks' }
  },
  { 
    path: 'bar/:id', 
    component: BarDetailComponent,
    data: { title: 'Producto del Bar' }
  },
  
  // ==================== RUTAS DE COMPRA (PROTEGIDAS) ====================
  { 
    path: 'cart', 
    component: ShoppingCartComponent,
    canActivate: [AuthGuard],
    data: { title: 'Mi Carrito' }
  },
  { 
    path: 'checkout', 
    component: CheckoutComponent,
    canActivate: [AuthGuard],
    data: { title: 'Finalizar Compra' }
  },
  
  // ==================== 🆕 RUTAS DE COMENTARIOS Y SUGERENCIAS ====================
  { 
    path: 'suggestions', 
    component: SuggestionsComponent,
    canActivate: [AuthGuard],
    data: { title: 'Sugerencias y Feedback' }
  },
  
  // ==================== RUTAS DEL SISTEMA DE PUNTOS ====================
  { 
    path: 'rewards', 
    component: RewardsComponent,
    canActivate: [AuthGuard],
    data: { title: 'Centro de Recompensas' }
  },
  { 
    path: 'order-history', 
    component: OrderHistoryComponent, 
    canActivate: [AuthGuard],
    data: { title: 'Historial de Órdenes' }
  },
  { 
    path: 'orders', 
    redirectTo: 'order-history',
    pathMatch: 'full'
  },
  { 
    path: 'points-history', 
    component: PointsHistoryComponent, 
    canActivate: [AuthGuard],
    data: { title: 'Historial de Puntos' }
  },
  
  // ==================== RUTAS DE PERFIL (PROTEGIDAS) ====================
  { 
    path: 'profile', 
    component: ProfileComponent,
    canActivate: [AuthGuard],
    data: { title: 'Mi Perfil' }
  },
  { 
    path: 'favorites', 
    component: FavoritesComponent,
    canActivate: [AuthGuard],
    data: { title: 'Mis Favoritas' }
  },
  { 
    path: 'history', 
    component: HistoryComponent,
    canActivate: [AuthGuard],
    data: { title: 'Mi Historial' }
  },
  
  // ==================== RUTAS DE BÚSQUEDA ====================
  { 
    path: 'buscar/:termino', 
    component: SearchComponent,
    data: { title: 'Resultados de Búsqueda' }
  },
  
  // ==================== RUTAS DE AUTENTICACIÓN ====================
  { 
    path: 'login', 
    component: LoginComponent,
    data: { title: 'Iniciar Sesión' }
  },
  { 
    path: 'register', 
    component: RegisterComponent,
    data: { title: 'Registrarse' }
  },
  
  // RUTAS DE RECUPERACIÓN DE CONTRASEÑA
  { 
    path: 'forgot-password', 
    component: ForgotPasswordComponent,
    data: { title: 'Recuperar Contraseña' }
  },
  { 
    path: 'reset-password/:token', 
    component: ResetPasswordComponent,
    data: { title: 'Nueva Contraseña' }
  },
  
  // 🆕 RUTA DE OAUTH CALLBACK
  { 
    path: 'auth/oauth/callback', 
    component: OAuthCallbackComponent,
    data: { title: 'Procesando Autenticación' }
  },
  
  // ==================== RUTAS DE ADMINISTRACIÓN (PROTEGIDAS) ====================
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [AuthGuard, AdminGuard],
    data: { title: 'Panel de Administración' },
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: AdminDashboardComponent,
        data: { title: 'Dashboard Admin' }
      },
      {
        path: 'movies',
        component: AdminMoviesComponent,
        data: { title: 'Gestión de Películas' }
      },
      {
        path: 'coming-soon',
        component: AdminComingSoonComponent,
        data: { title: 'Gestión de Próximos Estrenos' }
      },
      {
        path: 'functions',
        component: FunctionAdminComponent,
        data: { title: 'Gestión de Funciones' }
      },
      {
        path: 'users',
        component: AdminUsersComponent,
        data: { title: 'Gestión de Usuarios' }
      },
      {
        path: 'bar',
        component: AdminBarComponent,
        data: { title: 'Gestión del Bar' }
      },
      {
        path: 'points',
        component: AdminDashboardComponent, // Temporal
        data: { title: 'Gestión de Puntos' }
      },
      {
        path: 'rewards',
        component: AdminRewardsComponent,
        data: { title: 'Gestión de Recompensas' }
      },
      {
        path: 'config',
        component: AdminConfigComponent,
        data: { title: 'Configuración del Sistema' }
      },
      {
        path: 'logs',
        component: AdminLogsComponent,
        data: { title: 'Logs del Sistema' }
      }
    ]
  },
  
  // ==================== RUTAS DE REDIRECCIÓN ====================
  { 
    path: '', 
    redirectTo: '/home', 
    pathMatch: 'full' 
  },
  { 
    path: '**', 
    redirectTo: '/home' 
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    enableTracing: false, // Cambiar a true para debug de rutas
    scrollPositionRestoration: 'top', // Scroll al top en cada navegación
    anchorScrolling: 'enabled' // Habilitar scroll a anclas
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
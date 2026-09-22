// frontend/src/app/app.module.ts - ACTUALIZADO CON INTERCEPTOR
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http'; // ✅ AGREGADO HTTP_INTERCEPTORS

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { HomeComponent } from './components/home/home.component';
import { MovieListComponent } from './components/movie-list/movie-list.component';
import { MovieDetailComponent } from './components/movie-detail/movie-detail.component';
import { SearchComponent } from './components/search/search.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';

// Importar servicios
import { AuthService } from './services/auth.service';
import { CartService } from './services/cart.service';
import { EmailService } from './services/email.service';
import { PaypalSimulationService } from './services/paypal-simulation.service';
import { AdminService } from './services/admin.service';
import { BarService } from './services/bar.service';
import { FunctionService } from './services/function.service';
import { OrderService } from './services/order.service';
import { LogsService } from './services/logs.service';
import { PointsService } from './services/points.service';
import { RewardsService } from './services/rewards.service';
import { UserService } from './services/user.service';
import { ToastService } from './services/toast.service';
import { SystemService } from './services/system.service';

// 🆕 NUEVO SERVICIO DE COMENTARIOS
import { CommentService } from './services/comment.service';

// ✅ IMPORTAR EL INTERCEPTOR
import { AuthInterceptor } from './interceptors/auth.interceptor';

// Componentes principales
import { TicketPurchaseComponent } from './components/ticket-purchase/ticket-purchase.component';
import { ShoppingCartComponent } from './components/shopping-cart/shopping-cart.component';
import { CheckoutComponent } from './components/checkout/checkout.component';
import { SeatSelectionComponent } from './components/seat-selection/seat-selection.component';
import { ToastComponent } from './components/toast/toast.component';
import { ComingSoonComponent } from './components/coming-soon/coming-soon.component';
import { ComingSoonDetailComponent } from './components/coming-soon-detail/coming-soon-detail.component';
import { ProfileComponent } from './components/profile/profile.component';
import { FavoritesComponent } from './components/favorites/favorites.component';
import { HistoryComponent } from './components/history/history.component';

// Componentes de Admin
import { AdminLayoutComponent } from './components/admin/admin-layout/admin-layout.component';
import { AdminDashboardComponent } from './components/admin/admin-dashboard/admin-dashboard.component';
import { AdminMoviesComponent } from './components/admin/admin-movies/admin-movies.component';
import { AdminUsersComponent } from './components/admin/admin-users/admin-users.component';
import { AdminBarComponent } from './components/admin/admin-bar/admin-bar.component';
import { AdminRewardsComponent } from './components/admin/admin-rewards/admin-rewards.component';

// Componentes del Bar
import { BarListComponent } from './components/bar-list/bar-list.component';
import { BarDetailComponent } from './components/bar-detail/bar-detail.component';

// Componentes de Funciones
import { FunctionAdminComponent } from './components/admin/function-admin/function-admin.component';
import { FunctionListComponent } from './components/function-list/function-list.component';
import { FunctionDetailComponent } from './components/function-detail/function-detail.component';

// Componentes del Sistema de Puntos y Recompensas
import { RewardsComponent } from './components/rewards/rewards.component';
import { OrderHistoryComponent } from './components/order-history/order-history.component';
import { PointsHistoryComponent } from './components/points-history/points-history.component';

// Componentes de Recovery
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';

// 🆕 COMPONENTE OAUTH CALLBACK
import { OAuthCallbackComponent } from './components/oauth-callback/oauth-callback.component';

import { FooterComponent } from './components/footer/footer.component';

// 🎬 COMPONENTES STANDALONE (van en imports)
import { AdminComingSoonComponent } from './components/admin/admin-coming-soon/admin-coming-soon.component';
import { AdminConfigComponent } from './components/admin/admin-config/admin-config.component';
import { AdminLogsComponent } from './components/admin/admin-logs/admin-logs.component';

// 🆕 NUEVOS COMPONENTES DE COMENTARIOS
import { CommentsComponent } from './components/comments/comments.component';
import { SuggestionsComponent } from './components/suggestions/suggestions.component';

@NgModule({
  declarations: [
    // Componente principal
    AppComponent,
    
    // Componentes de navegación y layout
    NavbarComponent,
    FooterComponent,
    ToastComponent,
    
    // Componentes principales
    HomeComponent,
    MovieListComponent,
    MovieDetailComponent,
    SearchComponent,
    
    // Componentes de autenticación
    LoginComponent,     
    RegisterComponent,
    ForgotPasswordComponent,
    ResetPasswordComponent,
    
    // 🆕 COMPONENTE OAUTH CALLBACK
    OAuthCallbackComponent,
    
    // Componentes de compra
    TicketPurchaseComponent, 
    ShoppingCartComponent, 
    CheckoutComponent, 
    SeatSelectionComponent, 
    
    // Componentes de películas y estrenos
    ComingSoonComponent, 
    ComingSoonDetailComponent,
    
    // Componentes de usuario
    ProfileComponent, 
    FavoritesComponent, 
    HistoryComponent, 
    
    // Componentes del Sistema de Puntos
    OrderHistoryComponent,
    PointsHistoryComponent,
    RewardsComponent,
    
    // Componentes del Bar
    BarListComponent, 
    BarDetailComponent, 
    
    // Componentes de Funciones
    FunctionListComponent,
    FunctionDetailComponent,
    
    // Componentes de administración
    AdminLayoutComponent, 
    AdminDashboardComponent, 
    AdminMoviesComponent, 
    AdminUsersComponent,
    AdminBarComponent,
    FunctionAdminComponent,
    AdminRewardsComponent,
    AdminConfigComponent,
    AdminLogsComponent,
    
    // 🆕 NUEVOS COMPONENTES DE COMENTARIOS
    CommentsComponent,
    SuggestionsComponent
  ],
  imports: [
    // Módulos de Angular
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule, // ✅ ESTO SOLUCIONA EL ERROR DE ngModel
    
    // Componentes Standalone
    AdminComingSoonComponent
  
  ],
  providers: [
    // Servicios de autenticación y usuario
    AuthService,
    UserService,
    
    // Servicios de compra y carrito
    CartService,
    OrderService,
    LogsService,
    
    // Servicios del Sistema de Puntos
    PointsService,
    RewardsService,
    
    // Servicios de comunicación
    EmailService,
    PaypalSimulationService,
    ToastService,
    
    // Servicios de datos
    AdminService,
    BarService,
    FunctionService,
    
    // Sistema de Auditoría y Alertas
    SystemService,
    
    // 🆕 NUEVO SERVICIO DE COMENTARIOS
    CommentService,
    
    // ✅ AGREGAR EL INTERCEPTOR AQUÍ
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
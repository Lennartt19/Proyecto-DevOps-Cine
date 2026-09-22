import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    
    // 🔍 MOSTRAR INFORMACIÓN DE LA PETICIÓN
    console.log('🌐 PETICIÓN HTTP:', {
      method: req.method,
      url: req.url,
      timestamp: new Date().toLocaleTimeString()
    });

    // 🔑 OBTENER TOKEN
    const token = this.authService.getToken();
    
    if (token) {
      //MOSTRAR TOKEN EN CONSOLA
      console.log('🔑 TOKEN DETECTADO:', {
        token: token,
        usuario: this.authService.getCurrentUserName(),
        email: this.authService.getCurrentUserEmail(),
        esAdmin: this.authService.isAdmin(),
        esOAuth: this.authService.isOAuthUser(),
        proveedor: this.authService.getOAuthProvider()
      });

      // 📤 AGREGAR TOKEN A LA CABECERA
      const authReq = req.clone({
        setHeaders: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Token agregado a la cabecera Authorization');
      return next.handle(authReq);
    } else {
      // ⚠️ NO HAY TOKEN
      console.log('⚠️ NO SE ENCONTRÓ TOKEN - Petición sin autenticación');
      return next.handle(req);
    }
  }
}
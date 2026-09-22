import { Component } from '@angular/core';
import { AuthService, RegistroUsuario } from '../../services/auth.service';
import { Router } from '@angular/router';
import { ToastService } from '../../services/toast.service'; // ← FALTABA ESTE IMPORT

@Component({
  selector: 'app-register',
  standalone: false,
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  registerData: RegistroUsuario = {
    nombre: '', 
    email: '', 
    password: '', 
    confirmarPassword: ''
  };
  mensajeError = '';
  mensajeExito = '';
  mostrarPassword = false;
  mostrarConfirmPassword = false;
  aceptarTerminos = false;
  cargando = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService // ← FALTABA AGREGAR AQUÍ
  ) {}

  // VALIDACIÓN DE CONTRASEÑA SEGURA
  validarPasswordSegura(password: string): { valid: boolean, message: string } {
    if (password.length < 6) {
      return { valid: false, message: 'La contraseña debe tener al menos 6 caracteres' };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'La contraseña debe incluir al menos una mayúscula' };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'La contraseña debe incluir al menos una minúscula' };
    }
    if (!/\d/.test(password)) {
      return { valid: false, message: 'La contraseña debe incluir al menos un número' };
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return { valid: false, message: 'La contraseña debe incluir al menos un carácter especial (!@#$%^&*)' };
    }
    return { valid: true, message: 'Contraseña segura' };
  }

  // VALIDACIÓN DE EMAIL MEJORADA
  validarEmailAvanzado(email: string): { valid: boolean, message: string } {
    if (!email.trim()) {
      return { valid: false, message: 'El email es requerido' };
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return { valid: false, message: 'Ingresa un email válido (ejemplo: usuario@dominio.com)' };
    }
    // Verificar dominios comunes válidos
    const dominiosValidos = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'icloud.com'];
    const dominio = email.split('@')[1]?.toLowerCase();
    
    if (dominio && !dominiosValidos.includes(dominio) && !dominio.includes('.edu') && !dominio.includes('.org')) {
      return { valid: false, message: 'Usa un email de un proveedor conocido (Gmail, Yahoo, Outlook, etc.)' };
    }
    return { valid: true, message: 'Email válido' };
  }

  // VALIDACIÓN DE NOMBRE
  validarNombre(nombre: string): { valid: boolean, message: string } {
    if (!nombre.trim()) {
      return { valid: false, message: 'El nombre es requerido' };
    }
    if (nombre.trim().length < 2) {
      return { valid: false, message: 'El nombre debe tener al menos 2 caracteres' };
    }
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombre)) {
      return { valid: false, message: 'El nombre solo puede contener letras y espacios' };
    }
    if (nombre.trim().split(' ').length < 2) {
      return { valid: false, message: 'Ingresa tu nombre completo (nombre y apellido)' };
    }
    return { valid: true, message: 'Nombre válido' };
  }

  // MÉTODO onRegister MEJORADO
  onRegister() {
  this.cargando = true;
  this.mensajeError = '';

  // Validar nombre
  const nombreValidation = this.validarNombre(this.registerData.nombre);
  if (!nombreValidation.valid) {
    this.toastService.showWarning(nombreValidation.message);
    this.cargando = false;
    return;
  }

  // Validar email
  const emailValidation = this.validarEmailAvanzado(this.registerData.email);
  if (!emailValidation.valid) {
    this.toastService.showWarning(emailValidation.message);
    this.cargando = false;
    return;
  }

  // Validar contraseña
  const passwordValidation = this.validarPasswordSegura(this.registerData.password);
  if (!passwordValidation.valid) {
    this.toastService.showWarning(passwordValidation.message);
    this.cargando = false;
    return;
  }

  // Validar que las contraseñas coincidan
  if (this.passwordsNoCoinciden()) {
    this.toastService.showWarning('Las contraseñas no coinciden');
    this.cargando = false;
    return;
  }

  // Validar términos
  if (!this.aceptarTerminos) {
    this.toastService.showWarning('Debes aceptar los términos y condiciones');
    this.cargando = false;
    return;
  }

  // ✅ PROCESAR REGISTRO - MÉTODO CORREGIDO PARA USAR OBSERVABLE
  this.authService.register(this.registerData).subscribe({
    next: (response) => {
      console.log('🔍 Respuesta de registro:', response);
      
      if (response.success) {
        this.toastService.showSuccess(response.message || '¡Cuenta creada exitosamente! 🎉');
        this.mensajeExito = response.message || '¡Cuenta creada exitosamente!';
        
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      } else {
        this.toastService.showError(response.message || 'Error al crear la cuenta');
        this.mensajeError = response.message || 'Error al crear la cuenta';
      }
      
      this.cargando = false;
    },
    error: (error) => {
      console.error('❌ Error en registro:', error);
      this.toastService.showError('Error de conexión. Intenta de nuevo.');
      this.mensajeError = 'Error de conexión. Intenta de nuevo.';
      this.cargando = false;
    }
  });
}

  // MÉTODO PARA MOSTRAR FORTALEZA DE CONTRASEÑA EN TIEMPO REAL
  getPasswordStrength(password: string): { strength: string, color: string, percentage: number } {
    if (!password) return { strength: '', color: '', percentage: 0 };
    let score = 0;
    let checks = [];

    // Verificar cada criterio
    if (password.length >= 6) { score++; checks.push('Longitud'); }
    if (/[A-Z]/.test(password)) { score++; checks.push('Mayúscula'); }
    if (/[a-z]/.test(password)) { score++; checks.push('Minúscula'); }
    if (/\d/.test(password)) { score++; checks.push('Número'); }
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) { score++; checks.push('Especial'); }

    const percentage = (score / 5) * 100;

    if (score <= 2) return { strength: 'Débil', color: 'danger', percentage };
    if (score <= 3) return { strength: 'Regular', color: 'warning', percentage };
    if (score <= 4) return { strength: 'Buena', color: 'info', percentage };
    return { strength: 'Muy Segura', color: 'success', percentage };
  }

  // MÉTODOS EXISTENTES
  goToLogin() {
    this.router.navigate(['/login']);
  }

  passwordsNoCoinciden(): boolean {
    return this.registerData.password !== this.registerData.confirmarPassword;
  }

  togglePassword() {
    this.mostrarPassword = !this.mostrarPassword;
  }

  toggleConfirmPassword() {
    this.mostrarConfirmPassword = !this.mostrarConfirmPassword;
  }
}
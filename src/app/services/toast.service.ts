import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ToastService {

  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  public toasts$ = this.toastsSubject.asObservable();

  constructor() {}

  // MOSTRAR TOAST DE ÉXITO
  showSuccess(message: string, duration: number = 4000): void {
    this.showToast({
      id: this.generateId(),
      message: message,
      type: 'success',
      duration: duration,
      icon: 'fas fa-check-circle'
    });
  }

  // MOSTRAR TOAST DE ERROR
  showError(message: string, duration: number = 5000): void {
    this.showToast({
      id: this.generateId(),
      message: message,
      type: 'error',
      duration: duration,
      icon: 'fas fa-times-circle'
    });
  }

  // MOSTRAR TOAST DE ADVERTENCIA
  showWarning(message: string, duration: number = 4000): void {
    this.showToast({
      id: this.generateId(),
      message: message,
      type: 'warning',
      duration: duration,
      icon: 'fas fa-exclamation-triangle'
    });
  }

  // MOSTRAR TOAST DE INFORMACIÓN
  showInfo(message: string, duration: number = 4000): void {
    this.showToast({
      id: this.generateId(),
      message: message,
      type: 'info',
      duration: duration,
      icon: 'fas fa-info-circle'
    });
  }

  // MOSTRAR TOAST PERSONALIZADO
  private showToast(toast: Toast): void {
    const currentToasts = this.toastsSubject.value;
    const newToasts = [...currentToasts, toast];
    this.toastsSubject.next(newToasts);

    // Auto-remover después del tiempo especificado
    setTimeout(() => {
      this.removeToast(toast.id);
    }, toast.duration);
  }

  // REMOVER TOAST
  removeToast(id: string): void {
    const currentToasts = this.toastsSubject.value;
    const filteredToasts = currentToasts.filter(toast => toast.id !== id);
    this.toastsSubject.next(filteredToasts);
  }

  // LIMPIAR TODOS LOS TOASTS
  clearAll(): void {
    this.toastsSubject.next([]);
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration: number;
  icon: string;
}
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PaypalSimulationService {

  constructor() { }

  // ✅ MÉTODO PRINCIPAL - simulatePayPalRedirect
  simulatePayPalRedirect(orderData: any): Promise<PayPalResult> {
    return new Promise((resolve, reject) => {
      console.log('🔄 Iniciando proceso PayPal...', orderData);
      
      // Verificar si el navegador permite popups
      if (!this.canOpenPopup()) {
        reject({
          success: false,
          error: 'Tu navegador está bloqueando ventanas emergentes. Por favor permite popups para PayPal.',
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      // Simular ventana de PayPal
      this.openPayPalWindow(orderData).then((result) => {
        if (result.success) {
          resolve({
            success: true,
            transactionId: this.generatePayPalTransactionId(),
            payerId: this.generatePayerId(),
            paymentStatus: 'COMPLETED',
            amount: orderData.total,
            timestamp: new Date().toISOString(),
            method: 'PayPal'
          });
        } else {
          reject({
            success: false,
            error: result.error || 'Pago cancelado por el usuario',
            timestamp: new Date().toISOString()
          });
        }
      }).catch((error) => {
        reject({
          success: false,
          error: error.message || 'Error en el proceso de PayPal',
          timestamp: new Date().toISOString()
        });
      });
    });
  }

  // ✅ VERIFICAR SI SE PUEDEN ABRIR POPUPS
  private canOpenPopup(): boolean {
    try {
      const popup = window.open('', '', 'width=1,height=1');
      if (popup) {
        popup.close();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  // ✅ SIMULAR VENTANA EMERGENTE DE PAYPAL - MEJORADO
  private openPayPalWindow(orderData: any): Promise<{success: boolean, error?: string}> {
    return new Promise((resolve, reject) => {
      // Crear contenido HTML simulado de PayPal
      const paypalContent = this.createPayPalWindowContent(orderData);
      
      // Configuración de la ventana emergente
      const windowFeatures = [
        'width=500',
        'height=700',
        'scrollbars=yes',
        'resizable=yes',
        'status=no',
        'location=no',
        'toolbar=no',
        'menubar=no',
        'left=' + (screen.width / 2 - 250),
        'top=' + (screen.height / 2 - 350)
      ].join(',');
      
      // Abrir ventana emergente
      const popup = window.open('about:blank', 'PayPalPayment', windowFeatures);
      
      if (!popup) {
        reject(new Error('No se pudo abrir la ventana de PayPal. Verifica que los popups estén habilitados.'));
        return;
      }

      // Escribir contenido en la ventana
      try {
        popup.document.write(paypalContent);
        popup.document.close();
        
        // Enfocar la ventana
        popup.focus();
        
        // Simular proceso de pago
        this.simulatePaymentProcess(popup, resolve, reject);
      } catch (error) {
        popup.close();
        reject(new Error('Error al cargar el contenido de PayPal'));
      }
    });
  }

  // ✅ CREAR CONTENIDO HTML DE LA VENTANA PAYPAL - MEJORADO
  private createPayPalWindowContent(orderData: any): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PayPal - Parky Films</title>
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            margin: 0; 
            padding: 0;
            background: linear-gradient(135deg, #0070ba 0%, #003087 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .paypal-container { 
            width: 100%;
            max-width: 450px;
            margin: 20px;
            background: white; 
            border-radius: 12px; 
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        .paypal-header { 
            background: #0070ba;
            color: white;
            text-align: center; 
            padding: 25px 20px;
        }
        .paypal-logo { 
            font-size: 2.2em; 
            font-weight: bold;
            margin-bottom: 5px;
        }
        .paypal-subtitle {
            font-size: 0.9em;
            opacity: 0.9;
        }
        .payment-details { 
            padding: 30px 25px;
        }
        .merchant-info {
            text-align: center;
            margin-bottom: 25px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #0070ba;
        }
        .merchant-name {
            font-size: 1.2em;
            font-weight: bold;
            color: #003087;
            margin-bottom: 5px;
        }
        .merchant-desc {
            color: #666;
            font-size: 0.9em;
        }
        .amount-section {
            text-align: center;
            margin: 25px 0;
            padding: 20px;
            background: #f0f8ff;
            border-radius: 8px;
        }
        .amount { 
            font-size: 2.5em; 
            color: #003087; 
            font-weight: bold;
            margin-bottom: 5px;
        }
        .amount-label {
            color: #666;
            font-size: 0.9em;
        }
        .order-details {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            font-size: 0.9em;
        }
        .order-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        .order-row:last-child {
            margin-bottom: 0;
        }
        .btn { 
            width: 100%; 
            padding: 15px; 
            border: none; 
            border-radius: 8px; 
            font-size: 1.1em; 
            font-weight: 600; 
            cursor: pointer; 
            margin: 10px 0;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        .btn-primary { 
            background: #0070ba; 
            color: white;
            box-shadow: 0 4px 12px rgba(0,112,186,0.3);
        }
        .btn-primary:hover { 
            background: #005ea6;
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0,112,186,0.4);
        }
        .btn-secondary { 
            background: #ffffff;
            color: #666;
            border: 2px solid #ddd;
        }
        .btn-secondary:hover { 
            background: #f8f9fa;
            border-color: #bbb;
        }
        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none !important;
        }
        .progress { 
            display: none; 
            text-align: center; 
            padding: 40px 20px;
        }
        .spinner { 
            border: 4px solid #f3f3f3; 
            border-top: 4px solid #0070ba; 
            border-radius: 50%; 
            width: 50px; 
            height: 50px; 
            animation: spin 1s linear infinite; 
            margin: 0 auto 20px;
        }
        @keyframes spin { 
            0% { transform: rotate(0deg); } 
            100% { transform: rotate(360deg); } 
        }
        .progress-text {
            color: #003087;
            font-weight: 600;
            margin-bottom: 10px;
        }
        .progress-subtext {
            color: #666;
            font-size: 0.9em;
        }
        .security { 
            text-align: center;
            margin-top: 25px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }
        .security-text {
            font-size: 0.85em;
            color: #666;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        .success-animation {
            display: none;
            text-align: center;
            padding: 40px 20px;
        }
        .success-icon {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: #28a745;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            color: white;
            font-size: 2em;
        }
        .error-animation {
            display: none;
            text-align: center;
            padding: 40px 20px;
        }
        .error-icon {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: #dc3545;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            color: white;
            font-size: 2em;
        }
    </style>
</head>
<body>
    <div class="paypal-container">
        <div class="paypal-header">
            <div class="paypal-logo">PayPal</div>
            <div class="paypal-subtitle">Pago seguro y confiable</div>
        </div>
        
        <div class="payment-details" id="paymentForm">
            <div class="merchant-info">
                <div class="merchant-name">🎬 Parky Films</div>
                <div class="merchant-desc">Sistema de compra de entradas de cine</div>
            </div>
            
            <div class="amount-section">
                <div class="amount">$${orderData.total}</div>
                <div class="amount-label">Total a pagar</div>
            </div>
            
            <div class="order-details">
                <div class="order-row">
                    <span><strong>Orden ID:</strong></span>
                    <span>${orderData.orderId}</span>
                </div>
                <div class="order-row">
                    <span><strong>Items:</strong></span>
                    <span>${orderData.items?.length || 1} entrada(s)</span>
                </div>
                <div class="order-row">
                    <span><strong>Email:</strong></span>
                    <span>${orderData.email}</span>
                </div>
                <div class="order-row">
                    <span><strong>Fecha:</strong></span>
                    <span>${new Date().toLocaleDateString('es-ES')}</span>
                </div>
            </div>
            
            <button class="btn btn-primary" onclick="processPayment()" id="payBtn">
                🔒 Confirmar Pago con PayPal
            </button>
            
            <button class="btn btn-secondary" onclick="cancelPayment()">
                ❌ Cancelar transacción
            </button>
            
            <div class="security">
                <div class="security-text">
                    <span>🛡️</span>
                    <span>Protegido por la garantía de compra de PayPal</span>
                </div>
            </div>
        </div>
        
        <div class="progress" id="progressSection">
            <div class="spinner"></div>
            <div class="progress-text">Procesando pago con PayPal...</div>
            <div class="progress-subtext">Por favor espera, no cierres esta ventana</div>
        </div>

        <div class="success-animation" id="successSection">
            <div class="success-icon">✓</div>
            <div class="progress-text" style="color: #28a745;">¡Pago exitoso!</div>
            <div class="progress-subtext">Tu transacción ha sido completada</div>
        </div>

        <div class="error-animation" id="errorSection">
            <div class="error-icon">✗</div>
            <div class="progress-text" style="color: #dc3545;">Error en el pago</div>
            <div class="progress-subtext" id="errorMessage">Ha ocurrido un problema</div>
        </div>
    </div>
    
    <script>
        let paymentProcessed = false;
        
        function processPayment() {
            if (paymentProcessed) return;
            paymentProcessed = true;
            
            // Deshabilitar botón
            document.getElementById('payBtn').disabled = true;
            
            // Mostrar progreso
            document.getElementById('paymentForm').style.display = 'none';
            document.getElementById('progressSection').style.display = 'block';
            
            // Simular procesamiento (2-4 segundos para realismo)
            const processingTime = 2000 + Math.random() * 2000;
            
            setTimeout(() => {
                // 95% éxito, 5% fallo (más realista)
                const success = Math.random() > 0.05;
                
                if (success) {
                    showSuccess();
                    window.paymentResult = { 
                        success: true,
                        transactionId: generateTransactionId(),
                        timestamp: new Date().toISOString()
                    };
                    
                    // Cerrar después de mostrar éxito
                    setTimeout(() => {
                        window.close();
                    }, 2000);
                } else {
                    showError('Error de conexión con PayPal. Intenta nuevamente.');
                    window.paymentResult = { 
                        success: false, 
                        error: 'Error de conexión con PayPal' 
                    };
                    
                    // Permitir reintentos
                    setTimeout(() => {
                        resetForm();
                    }, 3000);
                }
            }, processingTime);
        }
        
        function showSuccess() {
            document.getElementById('progressSection').style.display = 'none';
            document.getElementById('successSection').style.display = 'block';
        }
        
        function showError(message) {
            document.getElementById('progressSection').style.display = 'none';
            document.getElementById('errorMessage').textContent = message;
            document.getElementById('errorSection').style.display = 'block';
        }
        
        function resetForm() {
            paymentProcessed = false;
            document.getElementById('payBtn').disabled = false;
            document.getElementById('errorSection').style.display = 'none';
            document.getElementById('paymentForm').style.display = 'block';
        }
        
        function cancelPayment() {
            window.paymentResult = { 
                success: false, 
                error: 'Pago cancelado por el usuario' 
            };
            window.close();
        }
        
        function generateTransactionId() {
            const prefix = 'PAY';
            const timestamp = Date.now().toString().slice(-8);
            const random = Math.random().toString(36).substring(2, 8).toUpperCase();
            return prefix + '-' + timestamp + '-' + random;
        }
        
        // Detectar cierre de ventana
        window.addEventListener('beforeunload', function() {
            if (!window.paymentResult) {
                window.paymentResult = { 
                    success: false, 
                    error: 'Ventana cerrada por el usuario' 
                };
            }
        });
        
        // Prevenir cierre accidental durante procesamiento
        window.addEventListener('beforeunload', function(e) {
            if (paymentProcessed && !window.paymentResult) {
                e.preventDefault();
                e.returnValue = '¿Estás seguro de cerrar? El pago se está procesando.';
                return e.returnValue;
            }
        });
    </script>
</body>
</html>`;
  }

  // ✅ SIMULAR PROCESO DE PAGO - MEJORADO
  private simulatePaymentProcess(popup: Window, resolve: Function, reject: Function): void {
    let checkInterval: any;
    let timeoutId: any;
    let resolved = false;

    const cleanup = () => {
      if (checkInterval) clearInterval(checkInterval);
      if (timeoutId) clearTimeout(timeoutId);
    };

    const resolveOnce = (result: any) => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(result);
      }
    };

    const rejectOnce = (error: any) => {
      if (!resolved) {
        resolved = true;
        cleanup();
        reject(error);
      }
    };

    // Verificar estado de la ventana cada segundo
    checkInterval = setInterval(() => {
      try {
        if (popup.closed) {
          // Obtener resultado del pago
          const result = (popup as any).paymentResult || 
            { success: false, error: 'Ventana cerrada inesperadamente' };
          
          resolveOnce(result);
          return;
        }

        // Verificar si hay resultado disponible
        if ((popup as any).paymentResult) {
          const result = (popup as any).paymentResult;
          resolveOnce(result);
          return;
        }
      } catch (error) {
        // Error accediendo a la ventana (probablemente cerrada)
        resolveOnce({ success: false, error: 'Error de comunicación con PayPal' });
      }
    }, 1000);
    
    // Timeout de seguridad (5 minutos)
    timeoutId = setTimeout(() => {
      try {
        if (!popup.closed) {
          popup.close();
        }
      } catch (e) {
        // Ignorar errores al cerrar
      }
      rejectOnce(new Error('Timeout de PayPal (5 minutos)'));
    }, 300000);
  }

  // ✅ GENERAR ID DE TRANSACCIÓN REALISTA
  private generatePayPalTransactionId(): string {
    const prefix = 'PAY';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  // ✅ GENERAR PAYER ID
  private generatePayerId(): string {
    return Math.random().toString(36).substring(2, 15).toUpperCase();
  }

  // ✅ MÉTODO PÚBLICO PARA VERIFICAR COMPATIBILIDAD
  public isPayPalAvailable(): boolean {
    return this.canOpenPopup() && typeof window !== 'undefined';
  }

  // ✅ MÉTODO PARA MOSTRAR INSTRUCCIONES SI HAY PROBLEMAS
  public getPopupInstructions(): string {
    return `
      Para usar PayPal necesitas:
      1. Permitir ventanas emergentes en tu navegador
      2. Asegurarte de que JavaScript esté habilitado
      3. No tener bloqueadores de anuncios muy restrictivos
    `;
  }
}

// ✅ INTERFACE PAYPAL RESULT - EXPANDIDA
export interface PayPalResult {
  success: boolean;
  transactionId?: string;
  payerId?: string;
  paymentStatus?: string;
  amount?: string;
  timestamp?: string;
  method?: string;
  error?: string;
  metadata?: {
    processingTime?: number;
    retryAttempt?: number;
    userAgent?: string;
  };
}
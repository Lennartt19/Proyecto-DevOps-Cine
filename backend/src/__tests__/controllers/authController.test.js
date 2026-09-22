/**
 * PRUEBAS UNITARIAS - AuthController
 * ID de Pruebas: PU-08 a PU-13
 * Tipo: Unitarias
 * Objetivo: Verificar la lógica de autenticación y registro
 */

const authController = require('../../controllers/auth/authController');
const User = require('../../models/User');
const JWTUtils = require('../../utils/jwt');

// Mocks
jest.mock('../../models/User');
jest.mock('../../utils/jwt');

describe('AuthController - Pruebas Unitarias', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockReq = {
      body: {},
      user: null
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  /**
   * ID: PU-08
   * Tipo: Unitaria
   * Objetivo: Verificar validación de campos en registro
   * Requisito: Registro debe validar todos los campos obligatorios
   */
  describe('PU-08: register - Validación de campos', () => {
    test('Debe rechazar registro sin campos obligatorios', async () => {
      mockReq.body = {};

      await authController.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Todos los campos son obligatorios'
      });
    });

    test('Debe rechazar cuando las contraseñas no coinciden', async () => {
      mockReq.body = {
        nombre: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        confirmarPassword: 'password456'
      };

      await authController.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Las contraseñas no coinciden'
      });
    });

    test('Debe rechazar contraseña menor a 6 caracteres', async () => {
      mockReq.body = {
        nombre: 'Test User',
        email: 'test@example.com',
        password: '12345',
        confirmarPassword: '12345'
      };

      await authController.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'La contraseña debe tener al menos 6 caracteres'
      });
    });

    test('Debe rechazar email con formato inválido', async () => {
      mockReq.body = {
        nombre: 'Test User',
        email: 'invalidemail',
        password: 'password123',
        confirmarPassword: 'password123'
      };

      await authController.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Formato de email inválido'
      });
    });
  });

  /**
   * ID: PU-09
   * Tipo: Unitaria
   * Objetivo: Verificar creación exitosa de usuario
   * Requisito: Sistema debe crear usuario y retornar token JWT
   */
  describe('PU-09: register - Creación exitosa', () => {
    test('Debe registrar usuario correctamente y generar token', async () => {
      mockReq.body = {
        nombre: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        confirmarPassword: 'password123'
      };

      User.emailExists.mockResolvedValue(false);
      User.create.mockResolvedValue({
        id: 1,
        nombre: 'Test User',
        email: 'test@example.com',
        role: 'cliente',
        avatar: 'https://ui-avatars.com/api/?name=TU&background=4CAF50&color=fff&size=128&bold=true',
        fecha_registro: new Date()
      });
      JWTUtils.generateToken.mockReturnValue('fake-jwt-token');

      await authController.register(mockReq, mockRes);

      expect(User.emailExists).toHaveBeenCalledWith('test@example.com');
      expect(User.create).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Usuario registrado exitosamente',
          data: expect.objectContaining({
            user: expect.any(Object),
            token: 'fake-jwt-token'
          })
        })
      );
    });

    test('Debe rechazar email ya registrado', async () => {
      mockReq.body = {
        nombre: 'Test User',
        email: 'existing@example.com',
        password: 'password123',
        confirmarPassword: 'password123'
      };

      User.emailExists.mockResolvedValue(true);

      await authController.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'El email ya está registrado'
      });
    });
  });

  /**
   * ID: PU-10
   * Tipo: Unitaria
   * Objetivo: Verificar validación de login
   * Requisito: Login debe validar email y contraseña
   */
  describe('PU-10: login - Validación', () => {
    test('Debe rechazar login sin email o password', async () => {
      mockReq.body = {};

      await authController.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Email y contraseña son obligatorios'
      });
    });

    test('Debe rechazar credenciales incorrectas - usuario no existe', async () => {
      mockReq.body = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      User.findByEmail.mockResolvedValue(null);

      await authController.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Credenciales incorrectas'
      });
    });

    test('Debe rechazar credenciales incorrectas - contraseña inválida', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      User.findByEmail.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        password_hash: 'hashed_password'
      });
      User.verifyPassword.mockResolvedValue(false);

      await authController.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Credenciales incorrectas'
      });
    });
  });

  /**
   * ID: PU-11
   * Tipo: Unitaria
   * Objetivo: Verificar login exitoso
   * Requisito: Login debe generar token JWT válido
   */
  describe('PU-11: login - Login exitoso', () => {
    test('Debe iniciar sesión correctamente con credenciales válidas', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        id: 1,
        nombre: 'Test User',
        email: 'test@example.com',
        role: 'cliente',
        avatar: 'avatar-url',
        password_hash: 'hashed_password',
        fecha_registro: new Date()
      };

      User.findByEmail.mockResolvedValue(mockUser);
      User.verifyPassword.mockResolvedValue(true);
      JWTUtils.generateToken.mockReturnValue('fake-jwt-token');

      await authController.login(mockReq, mockRes);

      expect(User.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(User.verifyPassword).toHaveBeenCalledWith('password123', 'hashed_password');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Login exitoso',
        data: {
          user: {
            id: 1,
            nombre: 'Test User',
            email: 'test@example.com',
            role: 'cliente',
            avatar: 'avatar-url',
            fechaRegistro: mockUser.fecha_registro
          },
          token: 'fake-jwt-token'
        }
      });
    });
  });

  /**
   * ID: PU-12
   * Tipo: Unitaria
   * Objetivo: Verificar cambio de contraseña
   * Requisito: Usuario debe poder cambiar contraseña con validaciones
   */
  describe('PU-12: changePassword - Validaciones', () => {
    beforeEach(() => {
      mockReq.user = {
        id: 1,
        email: 'test@example.com'
      };
    });

    test('Debe rechazar si faltan campos', async () => {
      mockReq.body = {};

      await authController.changePassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Todos los campos son obligatorios'
      });
    });

    test('Debe rechazar si nuevas contraseñas no coinciden', async () => {
      mockReq.body = {
        currentPassword: 'oldpass',
        newPassword: 'newpass123',
        confirmNewPassword: 'differentpass'
      };

      await authController.changePassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Las nuevas contraseñas no coinciden'
      });
    });

    test('Debe rechazar nueva contraseña < 6 caracteres', async () => {
      mockReq.body = {
        currentPassword: 'oldpass',
        newPassword: '12345',
        confirmNewPassword: '12345'
      };

      await authController.changePassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    });

    test('Debe rechazar si contraseña actual es incorrecta', async () => {
      mockReq.body = {
        currentPassword: 'wrongpass',
        newPassword: 'newpass123',
        confirmNewPassword: 'newpass123'
      };

      User.findByEmail.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        password_hash: 'hashed'
      });
      User.verifyPassword.mockResolvedValue(false);

      await authController.changePassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Contraseña actual incorrecta'
      });
    });

    test('Debe cambiar contraseña exitosamente', async () => {
      mockReq.body = {
        currentPassword: 'oldpass',
        newPassword: 'newpass123',
        confirmNewPassword: 'newpass123'
      };

      User.findByEmail.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        password_hash: 'hashed'
      });
      User.verifyPassword.mockResolvedValue(true);
      User.updatePassword.mockResolvedValue(true);

      await authController.changePassword(mockReq, mockRes);

      expect(User.updatePassword).toHaveBeenCalledWith(1, 'newpass123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Contraseña actualizada exitosamente'
      });
    });
  });

  /**
   * ID: PU-13
   * Tipo: Unitaria
   * Objetivo: Verificar refresh token
   * Requisito: Sistema debe permitir renovar tokens expirados
   */
  describe('PU-13: refreshToken', () => {
    test('Debe generar nuevo token para usuario autenticado', async () => {
      // Silenciar console.log para esta prueba
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      mockReq.user = {
        id: 1,
        email: 'test@example.com',
        nombre: 'Test User',
        role: 'cliente',
        avatar: 'avatar-url'
      };

      JWTUtils.generateToken.mockReturnValue('new-jwt-token');

      await authController.refreshToken(mockReq, mockRes);

      expect(JWTUtils.generateToken).toHaveBeenCalledWith({
        id: 1,
        email: 'test@example.com',
        nombre: 'Test User',
        role: 'cliente'
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Token refrescado exitosamente',
        data: {
          token: 'new-jwt-token',
          user: expect.objectContaining({
            id: 1,
            email: 'test@example.com'
          })
        }
      });

      // Restaurar console.log
      consoleLogSpy.mockRestore();
    });

    test('Debe rechazar si no hay usuario autenticado', async () => {
      mockReq.user = null;

      await authController.refreshToken(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Usuario no autenticado'
      });
    });
  });
});

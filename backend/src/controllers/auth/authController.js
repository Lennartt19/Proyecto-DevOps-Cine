const User = require('../../models/User');
const JWTUtils = require('../../utils/jwt');

// Registro de usuario
const register = async (req, res) => {
  try {
    const { nombre, email, password, confirmarPassword } = req.body;

    // Validaciones básicas
    if (!nombre || !email || !password || !confirmarPassword) {
      return res.status(400).json({
        success: false,
        error: 'Todos los campos son obligatorios'
      });
    }

    if (password !== confirmarPassword) {
      return res.status(400).json({
        success: false,
        error: 'Las contraseñas no coinciden'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Formato de email inválido'
      });
    }

    // Verificar si el email ya existe
    const emailExists = await User.emailExists(email);
    if (emailExists) {
      return res.status(409).json({
        success: false,
        error: 'El email ya está registrado'
      });
    }

    // Generar avatar automático
    const nombreLimpio = nombre.trim();
    const iniciales = nombreLimpio.split(' ')
      .map(palabra => palabra.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
    
    const colores = ['4CAF50', '2196F3', 'FF9800', '9C27B0', 'F44336', '00BCD4', 'FFC107', '795548'];
    const colorAleatorio = colores[Math.floor(Math.random() * colores.length)];
    const avatar = `https://ui-avatars.com/api/?name=${iniciales}&background=${colorAleatorio}&color=fff&size=128&bold=true`;

    // Crear usuario
    const newUser = await User.create({
      nombre: nombreLimpio,
      email: email.toLowerCase(),
      password,
      avatar,
      role: 'cliente'
    });

    // Generar token
    const token = JWTUtils.generateToken(newUser);

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        user: {
          id: newUser.id,
          nombre: newUser.nombre,
          email: newUser.email,
          role: newUser.role,
          avatar: newUser.avatar,
          fechaRegistro: newUser.fecha_registro
        },
        token
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Login de usuario
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validaciones básicas
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email y contraseña son obligatorios'
      });
    }

    // Buscar usuario por email
    const user = await User.findByEmail(email.toLowerCase());
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales incorrectas'
      });
    }

    // Verificar contraseña
    const isValidPassword = await User.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales incorrectas'
      });
    }

    // Generar token
    const token = JWTUtils.generateToken(user);

    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          fechaRegistro: user.fecha_registro
        },
        token
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Verificar token y obtener info del usuario
const verifyToken = async (req, res) => {
  try {
    // El middleware ya verificó el token y agregó req.user
    res.json({
      success: true,
      data: {
        user: req.user,
        tokenValid: true
      }
    });
  } catch (error) {
    console.error('Error en verificación de token:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Refrescar token
const refreshToken = async (req, res) => {
  try {
    // El middleware ya verificó el token y agregó req.user
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    // Generar nuevo token con la misma información
    const newToken = JWTUtils.generateToken({
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      role: user.role
    });

    console.log(`✅ Token refrescado para usuario: ${user.nombre}`);

    res.json({
      success: true,
      message: 'Token refrescado exitosamente',
      data: {
        token: newToken,
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          role: user.role,
          avatar: user.avatar
        }
      }
    });

  } catch (error) {
    console.error('Error al refrescar token:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Logout (en el lado del servidor, solo informativo)
const logout = async (req, res) => {
  try {
    // En JWT, el logout real se maneja en el frontend eliminando el token
    // Aquí podríamos agregar el token a una blacklist si fuera necesario
    
    res.json({
      success: true,
      message: 'Logout exitoso'
    });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Cambiar contraseña
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    // Validaciones
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({
        success: false,
        error: 'Todos los campos son obligatorios'
      });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({
        success: false,
        error: 'Las nuevas contraseñas no coinciden'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }

    // Obtener usuario actual
    const user = await User.findByEmail(req.user.email);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Verificar contraseña actual
    const isValidPassword = await User.verifyPassword(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Contraseña actual incorrecta'
      });
    }

    // Actualizar contraseña
    await User.updatePassword(user.id, newPassword);

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

module.exports = {
  register,
  login,
  verifyToken,
  refreshToken,
  logout,
  changePassword
};
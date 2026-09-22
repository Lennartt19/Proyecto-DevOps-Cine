const JWTUtils = require('../utils/jwt');
const User = require('../models/User');

// Middleware para verificar autenticación
const authenticateToken = async (req, res, next) => {
  try {
    // Obtener token del header Authorization
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token de acceso requerido',
        code: 'NO_TOKEN'
      });
    }

    // Verificar token
    const decoded = JWTUtils.verifyToken(token);

    // Verificar que el usuario aún existe en la BD
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no encontrado o inactivo',
        code: 'USER_NOT_FOUND'
      });
    }

    // Agregar información del usuario al request
    req.user = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      role: user.role,
      avatar: user.avatar
    };

    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    
    // Diferentes tipos de errores de JWT
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expirado',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Token inválido',
        code: 'INVALID_TOKEN'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Error de autenticación',
      code: 'AUTH_ERROR'
    });
  }
};

// Middleware opcional (no falla si no hay token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = JWTUtils.verifyToken(token);
      const user = await User.findById(decoded.id);
      
      if (user) {
        req.user = {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          role: user.role,
          avatar: user.avatar
        };
      }
    }

    next();
  } catch (error) {
    // En autenticación opcional, continuamos sin usuario
    req.user = null;
    next();
  }
};

// Middleware para verificar roles específicos
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Autenticación requerida',
        code: 'AUTH_REQUIRED'
      });
    }

    // roles puede ser string o array
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Permisos insuficientes',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: allowedRoles,
        userRole: req.user.role
      });
    }

    next();
  };
};

// Middleware específico para admin
const requireAdmin = requireRole('admin');

// Middleware específico para cliente
const requireCliente = requireRole('cliente');

// Middleware para admin o el propio usuario
const requireAdminOrSelf = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Autenticación requerida'
    });
  }

  const targetUserId = parseInt(req.params.id);
  const isAdmin = req.user.role === 'admin';
  const isSelf = req.user.id === targetUserId;

  if (!isAdmin && !isSelf) {
    return res.status(403).json({
      success: false,
      error: 'Solo puedes acceder a tu propia información o ser administrador'
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireCliente,
  requireAdminOrSelf
};
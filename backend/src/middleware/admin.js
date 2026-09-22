// backend/src/middleware/admin.js
const requireAdmin = (req, res, next) => {
  try {
    // Verificar que el usuario esté autenticado (ya validado por authenticateToken)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    // Verificar que el usuario sea admin
    if (req.user.role !== 'admin') {
      console.log(`⚠️ Acceso denegado para usuario: ${req.user.email} (rol: ${req.user.role})`);
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado. Se requieren permisos de administrador'
      });
    }

    console.log(`✅ Acceso admin autorizado para: ${req.user.email}`);
    next();
    
  } catch (error) {
    console.error('❌ Error en middleware admin:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

module.exports = {
  requireAdmin
};
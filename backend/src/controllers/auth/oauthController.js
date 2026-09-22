const JWTUtils = require('../../utils/jwt');

// URL del frontend inyectada por entorno (.env FRONTEND_URL).
// Si falta, se usa http://localhost:8080 en local y se avisa por log.
const getFrontendUrl = () => {
  const url = process.env.FRONTEND_URL || 'http://localhost:8080';
  if (!process.env.FRONTEND_URL) {
    console.warn('⚠️  FRONTEND_URL no definido: usando http://localhost:8080 (solo local).');
  }
  return url;
};

// Manejar éxito de OAuth
const handleOAuthSuccess = async (req, res) => {
  try {
    const user = req.user;
    
    if (!user) {
      console.error('❌ No user found in OAuth callback');
      return res.redirect(`${getFrontendUrl()}/login?error=oauth_failed`);
    }

    console.log('✅ OAuth success for user:', user.email);
    
    // Generar token JWT
    const token = JWTUtils.generateToken(user);
    
    // Construir datos del usuario para el frontend
    const userData = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      fechaRegistro: user.fecha_registro,
      oauthProvider: user.oauth_provider
    };
    
    // Codificar los datos para pasarlos por URL
    const encodedUserData = encodeURIComponent(JSON.stringify(userData));
    
    // Redirigir al frontend con token y datos de usuario
    const redirectUrl = `${getFrontendUrl()}/auth/oauth/callback?token=${token}&user=${encodedUserData}&success=true`;
    
    console.log('🔄 Redirecting to:', redirectUrl);
    res.redirect(redirectUrl);
    
  } catch (error) {
    console.error('❌ Error in OAuth success handler:', error);
    res.redirect(`${getFrontendUrl()}/login?error=oauth_error`);
  }
};

// Manejar error de OAuth
const handleOAuthError = (req, res) => {
  console.error('❌ OAuth authentication failed');
  res.redirect(`${getFrontendUrl()}/login?error=oauth_failed`);
};

// Obtener información del usuario OAuth (endpoint adicional)
const getOAuthUserInfo = async (req, res) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          fechaRegistro: user.fecha_registro,
          oauthProvider: user.oauth_provider
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting OAuth user info:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

module.exports = {
  handleOAuthSuccess,
  handleOAuthError,
  getOAuthUserInfo
};
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const passport = require('passport');
const {
  register,
  login,
  verifyToken,
  refreshToken,
  logout,
  changePassword
} = require('../controllers/auth/authController');

// 🆕 IMPORTAR CONTROLADORES DE RECUPERACIÓN DE CONTRASEÑA
const {
  requestPasswordReset,
  validateResetToken,
  resetPassword
} = require('../controllers/auth/passwordResetController');

// 🆕 IMPORTAR CONTROLADOR DE OAUTH
const {
  handleOAuthSuccess,
  handleOAuthError
} = require('../controllers/auth/oauthController');

// ==================== RUTAS PÚBLICAS ====================

// POST /api/auth/register - Registrar nuevo usuario
router.post('/register', register);

// POST /api/auth/login - Iniciar sesión
router.post('/login', login);

// 🆕 RUTAS DE RECUPERACIÓN DE CONTRASEÑA (PÚBLICAS)
// POST /api/auth/forgot-password - Solicitar recuperación de contraseña
router.post('/forgot-password', requestPasswordReset);

// GET /api/auth/validate-reset-token/:token - Validar token de recuperación
router.get('/validate-reset-token/:token', validateResetToken);

// POST /api/auth/reset-password - Restablecer contraseña
router.post('/reset-password', resetPassword);

// ==================== RUTAS OAUTH ====================
// Si el proveedor no tiene claves en el .env, se responde 503 con mensaje claro
// en vez de "Unknown authentication strategy".
const requireOAuth = (provider, envVar) => (req, res, next) => {
  if (!process.env[envVar]) {
    return res.status(503).json({
      success: false,
      error: `OAuth con ${provider} desactivado: falta ${envVar} en el .env`
    });
  }
  next();
};

// 🔗 GOOGLE OAUTH
// GET /api/auth/google - Iniciar autenticación con Google
router.get('/google',
  requireOAuth('Google', 'GOOGLE_CLIENT_ID'),
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);

// GET /api/auth/google/callback - Callback de Google
router.get('/google/callback',
  requireOAuth('Google', 'GOOGLE_CLIENT_ID'),
  passport.authenticate('google', { failureRedirect: '/login' }),
  handleOAuthSuccess
);

// 🔗 FACEBOOK OAUTH
// GET /api/auth/facebook - Iniciar autenticación con Facebook
router.get('/facebook',
  requireOAuth('Facebook', 'FACEBOOK_CLIENT_ID'),
  passport.authenticate('facebook', {
    scope: ['email']
  })
);

// GET /api/auth/facebook/callback - Callback de Facebook
router.get('/facebook/callback',
  requireOAuth('Facebook', 'FACEBOOK_CLIENT_ID'),
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  handleOAuthSuccess
);

// 🔗 GITHUB OAUTH
// GET /api/auth/github - Iniciar autenticación con GitHub
router.get('/github',
  requireOAuth('GitHub', 'GITHUB_CLIENT_ID'),
  passport.authenticate('github', {
    scope: ['user:email']
  })
);

// GET /api/auth/github/callback - Callback de GitHub
router.get('/github/callback',
  requireOAuth('GitHub', 'GITHUB_CLIENT_ID'),
  passport.authenticate('github', { failureRedirect: '/login' }),
  handleOAuthSuccess
);

// ==================== RUTAS PROTEGIDAS ====================

// GET /api/auth/verify - Verificar token y obtener info del usuario
router.get('/verify', authenticateToken, verifyToken);

// POST /api/auth/refresh - Refrescar token ✅ CORREGIDO
router.post('/refresh', authenticateToken, refreshToken);

// POST /api/auth/logout - Cerrar sesión
router.post('/logout', authenticateToken, logout);

// PUT /api/auth/change-password - Cambiar contraseña
router.put('/change-password', authenticateToken, changePassword);

module.exports = router;
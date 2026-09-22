// Configuración de CORS para permitir peticiones desde el frontend
// NOTA: la lista real usada en producción está en backend/server.js
// (este archivo queda como referencia/alternativa; mantenlo sincronizado).
// Orígenes por entorno: FRONTEND_URL, BACKEND_URL, CORS_ORIGIN, CORS_EXTRA_ORIGINS.

const extraOrigins = (process.env.CORS_EXTRA_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const buildAllowedOrigins = () => [
  process.env.FRONTEND_URL,
  process.env.BACKEND_URL,
  process.env.CORS_ORIGIN,
  ...extraOrigins,
  ...(process.env.NODE_ENV === 'production' ? [] : [
    'http://localhost:4200',
    'http://localhost:8080',
    'http://localhost:3000',
    'http://127.0.0.1:4200',
    'http://127.0.0.1:8080'
  ])
].filter(Boolean);

const corsConfig = {
  origin: function (origin, callback) {
    // Lista de dominios permitidos (por entorno)
    const allowedOrigins = buildAllowedOrigins();

    // En desarrollo, permitir requests sin origin (ej: Postman, curl)
    if (process.env.NODE_ENV === 'development' && !origin) {
      return callback(null, true);
    }

    // Verificar si el origin está en la lista permitida
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('❌ CORS: Origin no permitido:', origin);
      callback(new Error('No permitido por CORS'));
    }
  },

  // Métodos HTTP permitidos
  methods: [
    'GET',
    'POST',
    'PUT',
    'DELETE',
    'PATCH',
    'OPTIONS'
  ],

  // Headers permitidos
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],

  // Headers expuestos al cliente
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count'
  ],

  // Permitir cookies cross-origin
  credentials: true,

  // Tiempo de cache para preflight requests (en segundos)
  maxAge: 86400, // 24 horas

  // Responder a OPTIONS requests
  optionsSuccessStatus: 200
};

module.exports = {
  corsConfig
};
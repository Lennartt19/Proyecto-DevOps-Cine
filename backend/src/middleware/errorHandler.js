// Middleware para manejo centralizado de errores

const errorHandler = (err, req, res, next) => {
  // Log del error
  console.error('🚨 Error capturado:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Error por defecto
  let error = {
    message: err.message || 'Error interno del servidor',
    status: err.status || 500
  };

  // Errores específicos de PostgreSQL
  if (err.code) {
    switch (err.code) {
      case '23505': // Violación de restricción única
        error = {
          message: 'Ya existe un registro con esos datos',
          status: 409,
          field: err.detail
        };
        break;
      
      case '23503': // Violación de clave foránea
        error = {
          message: 'Referencia a un registro que no existe',
          status: 400
        };
        break;
      
      case '23502': // Violación de NOT NULL
        error = {
          message: 'Faltan campos obligatorios',
          status: 400
        };
        break;
      
      case '42P01': // Tabla no existe
        error = {
          message: 'Recurso no encontrado',
          status: 404
        };
        break;
      
      case '42703': // Columna no existe
        error = {
          message: 'Campo no válido',
          status: 400
        };
        break;
      
      default:
        error = {
          message: 'Error en la base de datos',
          status: 500
        };
    }
  }

  // Errores de validación de Joi
  if (err.isJoi) {
    error = {
      message: 'Datos de entrada no válidos',
      status: 400,
      details: err.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    };
  }

  // Errores de JWT
  if (err.name === 'JsonWebTokenError') {
    error = {
      message: 'Token no válido',
      status: 401
    };
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      message: 'Token expirado',
      status: 401
    };
  }

  // Errores de validación de express-validator
  if (err.errors && Array.isArray(err.errors)) {
    error = {
      message: 'Datos de entrada no válidos',
      status: 400,
      details: err.errors.map(error => ({
        field: error.path,
        message: error.msg
      }))
    };
  }

  // Respuesta del error
  const response = {
    success: false,
    error: error.message,
    status: error.status
  };

  // En desarrollo, incluir más detalles
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.details = error.details;
    if (error.field) response.field = error.field;
  }

  res.status(error.status).json(response);
};

// Middleware para manejar rutas no encontradas
const notFound = (req, res, next) => {
  const error = new Error(`Ruta no encontrada: ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

// Middleware para errores asíncronos
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFound,
  asyncHandler
};
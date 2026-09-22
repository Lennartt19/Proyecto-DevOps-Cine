// middleware/validation.js
const { validationResult } = require('express-validator');

/**
 * Middleware para manejar errores de validación de express-validator
 */
const validation = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Datos de entrada inválidos',
      errors: errorMessages
    });
  }
  
  next();
};

module.exports = validation;
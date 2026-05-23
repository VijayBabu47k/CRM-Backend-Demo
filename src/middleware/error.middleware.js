// Custom error class
class AppError extends Error {
  constructor(message, statusCode, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errors = errors;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Not found middleware
const notFound = (req, res, next) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

// Global error handler
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;
  
  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode
    });
  }
  
  // PostgreSQL duplicate key error
  if (err.code === '23505') {
    const field = err.detail?.match(/\(([^)]+)\)/)?.[1] || 'field';
    error = new AppError(`${field} already exists`, 400);
  }
  
  // PostgreSQL foreign key error
  if (err.code === '23503') {
    error = new AppError('Related record not found', 400);
  }
  
  // PostgreSQL check constraint error
  if (err.code === '23514') {
    error = new AppError('Invalid value provided', 400);
  }
  
  // Validation errors from express-validator
  if (err.array && typeof err.array === 'function') {
    const errors = err.array();
    error = new AppError('Validation failed', 400, errors);
  }
  
  const statusCode = error.statusCode || 500;
  
  res.status(statusCode).json({
    success: false,
    message: error.message || 'Internal Server Error',
    ...(error.errors?.length && { errors: error.errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

// Async handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  AppError,
  notFound,
  errorHandler,
  asyncHandler
};

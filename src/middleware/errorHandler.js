/**
 * Error handling middleware for Express
 * Handles errors and returns appropriate HTTP responses
 */
export function errorHandler(err, req, res, next) {
  // Log error
  console.error('Error:', err);

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Determine error message
  const message = err.message || 'Internal Server Error';

  // Send error response
  res.status(statusCode).json({
    error: {
      message,
      statusCode,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req, res, next) {
  res.status(404).json({
    error: {
      message: `Route ${req.originalUrl} not found`,
      statusCode: 404
    }
  });
}

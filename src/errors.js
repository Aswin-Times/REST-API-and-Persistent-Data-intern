class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static validation(details, message = 'Request is invalid') {
    return new ApiError(400, 'VALIDATION_ERROR', message, details);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, 'NOT_FOUND', message);
  }
}

function sendError(res, status, code, message, details) {
  const error = { code, message };
  if (details && details.length) error.details = details;
  res.status(status).json({ error });
}

module.exports = { ApiError, sendError };

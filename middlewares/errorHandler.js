const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.stack);
  
  const errorMap = {
    ValidationError: { status: 400, message: 'Dados inválidos' },
    UnauthorizedError: { status: 401, message: 'Não autorizado' },
    JsonWebTokenError: { status: 401, message: 'Token inválido' },
    TokenExpiredError: { status: 401, message: 'Token expirado' },
    LIMIT_FILE_SIZE: { status: 413, message: 'Arquivo muito grande. Tamanho máximo: 5MB' },
    default: { status: 500, message: 'Erro interno do servidor' }
  };

  const errorType = err.name || err.code;
  const { status, message } = errorMap[errorType] || errorMap.default;

  const response = {
    success: false,
    message,
    code: errorType || 'SERVER_ERROR'
  };

  if (process.env.NODE_ENV === 'development') {
    response.error = err.message;
    response.stack = err.stack;
  }

  if (err.details) {
    response.details = err.details;
  }

  if (err.fields) {
    response.fields = err.fields;
  }

  res.status(status).json(response);
};

module.exports = errorHandler;
const { verifyToken } = require('../utils/auth');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1] || req.cookies?.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      code: 'TOKEN_NAO_FORNECIDO',
      message: 'Token de autenticação não fornecido'
    });
  }

  try {
    const decoded = await verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_INVALIDO',
        message: 'Token inválido ou expirado'
      });
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      perfil: decoded.perfil
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    let status = 401;
    let code = 'TOKEN_INVALIDO';
    let message = 'Token inválido';

    if (error.name === 'TokenExpiredError') {
      code = 'TOKEN_EXPIRADO';
      message = 'Sessão expirada. Por favor, faça login novamente.';
    } else if (error.name === 'JsonWebTokenError') {
      code = 'TOKEN_INVALIDO';
      message = 'Token inválido';
    } else {
      status = 500;
      code = 'ERRO_SERVIDOR';
      message = 'Erro durante a autenticação';
    }

    res.status(status).json({
      success: false,
      code,
      message
    });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.perfil !== 'Administrador') {
    return res.status(403).json({
      success: false,
      code: 'ACESSO_NEGADO',
      message: 'Acesso restrito a administradores'
    });
  }
  next();
};

module.exports = {
  authMiddleware,
  adminOnly
};
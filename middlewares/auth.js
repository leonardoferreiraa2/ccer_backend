// C:\Temp\ccer\backend\middlewares\auth.js
const { verifyToken } = require('../utils/auth');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.split(' ')[1] || req.cookies?.token || req.query?.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      code: 'MISSING_TOKEN',
      message: 'Token de autenticação não fornecido'
    });
  }

  try {
    const decoded = await verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_TOKEN',
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
    let code = 'AUTH_ERROR';
    let message = 'Erro de autenticação';

    if (error.name === 'TokenExpiredError') {
      code = 'TOKEN_EXPIRED';
      message = 'Sessão expirada. Por favor, faça login novamente.';
    } else if (error.name === 'JsonWebTokenError') {
      code = 'INVALID_TOKEN';
      message = 'Token inválido';
    } else {
      status = 500;
      code = 'SERVER_ERROR';
      message = 'Erro durante a autenticação';
    }

    res.status(status).json({
      success: false,
      code,
      message,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.perfil !== 'Administrador') {
    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN',
      message: 'Acesso restrito a administradores'
    });
  }
  next();
};

module.exports = {
  authMiddleware,
  adminOnly
};
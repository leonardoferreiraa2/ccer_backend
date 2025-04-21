const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const { generateToken, generateRefreshToken } = require('../utils/auth');
const cache = require('../config/cache');

const login = async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({
      success: false,
      code: 'CREDENCIAIS_INVALIDAS',
      message: 'Por favor, forneça email e senha',
      fields: {
        email: !email ? 'Email é obrigatório' : undefined,
        senha: !senha ? 'Senha é obrigatória' : undefined
      }
    });
  }

  try {
    const usuario = await Usuario.findByEmail(email);
    if (!usuario) {
      return res.status(401).json({
        success: false,
        code: 'CREDENCIAIS_INVALIDAS',
        message: 'Email ou senha incorretos'
      });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({
        success: false,
        code: 'CREDENCIAIS_INVALIDAS',
        message: 'Email ou senha incorretos'
      });
    }

    const token = await generateToken({
      id: usuario.id,
      email: usuario.email,
      perfil: usuario.perfil
    });

    const refreshToken = await generateRefreshToken(usuario.id);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
      sameSite: 'strict'
    });

    return res.status(200).json({
      success: true,
      token,
      expiresIn: process.env.JWT_EXPIRES_IN,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        status: usuario.status
      }
    });

  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({
      success: false,
      code: 'ERRO_INTERNO',
      message: 'Não foi possível realizar o login'
    });
  }
};

const refresh = async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      code: 'TOKEN_INVALIDO',
      message: 'Refresh token não fornecido'
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const usuario = await Usuario.findById(decoded.id);

    if (!usuario) {
      return res.status(401).json({
        success: false,
        code: 'USUARIO_NAO_ENCONTRADO',
        message: 'Usuário não encontrado'
      });
    }

    const newToken = await generateToken({
      id: usuario.id,
      email: usuario.email,
      perfil: usuario.perfil
    });

    return res.status(200).json({
      success: true,
      token: newToken,
      expiresIn: process.env.JWT_EXPIRES_IN
    });

  } catch (error) {
    console.error('Erro ao renovar token:', error);
    return res.status(401).json({
      success: false,
      code: 'TOKEN_INVALIDO',
      message: 'Refresh token inválido ou expirado'
    });
  }
};

const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const refreshToken = req.cookies?.refreshToken;

    if (!token && !refreshToken) {
      return res.status(400).json({
        success: false,
        code: 'TOKEN_INVALIDO',
        message: 'Nenhum token fornecido'
      });
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      await cache.invalidateToken(decoded.id);
    }

    if (refreshToken) {
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
      await cache.invalidateToken(decoded.id);
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true'
    });

    return res.status(200).json({
      success: true,
      message: 'Logout realizado com sucesso'
    });

  } catch (error) {
    console.error('Erro no logout:', error);
    return res.status(500).json({
      success: false,
      code: 'ERRO_LOGOUT',
      message: 'Ocorreu um erro durante o logout'
    });
  }
};

module.exports = {
  login,
  logout,
  refresh
};
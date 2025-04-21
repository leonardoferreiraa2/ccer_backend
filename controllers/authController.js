const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const { generateToken, verifyToken } = require('../utils/auth');
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

    return res.status(200).json({
      success: true,
      token,
      expiresIn: '1d',
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
      message: 'Não foi possível realizar o login',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        code: 'TOKEN_INVALIDO',
        message: 'Token não fornecido'
      });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_INVALIDO',
        message: 'Token inválido ou expirado'
      });
    }

    await cache.invalidateToken(decoded.id);

    return res.status(200).json({
      success: true,
      code: 'LOGOUT_SUCESSO',
      message: 'Logout realizado com sucesso'
    });

  } catch (error) {
    console.error('Erro no logout:', error);
    return res.status(500).json({
      success: false,
      code: 'ERRO_LOGOUT',
      message: 'Ocorreu um erro durante o logout',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const me = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.user.id);
    
    if (!usuario) {
      return res.status(404).json({
        success: false,
        code: 'USUARIO_NAO_ENCONTRADO',
        message: 'Usuário não encontrado'
      });
    }

    return res.status(200).json({
      success: true,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        status: usuario.status
      }
    });

  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return res.status(500).json({
      success: false,
      code: 'ERRO_INTERNO',
      message: 'Ocorreu um erro ao buscar dados do usuário',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  login,
  logout,
  me
};
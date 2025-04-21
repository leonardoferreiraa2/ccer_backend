const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');
const { generateToken } = require('../utils/auth');
const cache = require('../config/cache');

const login = async (req, res, next) => {
  try {
    const { email, senha } = req.body;

    if (!email?.trim() || !senha?.trim()) {
      return res.status(400).json({ 
        message: 'Email e senha são obrigatórios',
        code: 'CREDENCIAIS_VAZIAS'
      });
    }

    // Verificação de tentativas com cache
    const attemptsKey = `login_attempts:${email}`;
    const attempts = (await cache.get(attemptsKey)) || 0;
    
    if (attempts >= Number(process.env.LOGIN_ATTEMPTS_LIMIT || 5)) {
      return res.status(429).json({
        message: 'Muitas tentativas. Tente novamente em 5 minutos.',
        code: 'TOO_MANY_ATTEMPTS',
        retryAfter: 300
      });
    }

    // Busca usuário com cache
    const cacheKey = `user:${email}`;
    let usuario = await cache.get(cacheKey);
    
    if (!usuario) {
      usuario = await Usuario.findByEmail(email);
      if (usuario) {
        await cache.set(cacheKey, usuario, 3600); // Cache por 1 hora
      }
    }

    if (!usuario) {
      await cache.set(attemptsKey, attempts + 1, 300); // 5 minutos de bloqueio
      return res.status(401).json({ 
        message: 'Credenciais inválidas',
        code: 'CREDENCIAIS_INVALIDAS'
      });
    }

    if (usuario.status !== 'Ativo') {
      return res.status(403).json({
        message: 'Conta inativa. Contate o administrador.',
        code: 'CONTA_INATIVA'
      });
    }

    const isMatch = await bcrypt.compare(senha, usuario.senha);
    if (!isMatch) {
      await cache.set(attemptsKey, attempts + 1, 300);
      return res.status(401).json({ 
        message: 'Credenciais inválidas',
        code: 'CREDENCIAIS_INVALIDAS'
      });
    }

    // Login bem-sucedido
    await cache.del(attemptsKey);
    await Usuario.registrarLogin(usuario.id);
    await cache.del(cacheKey); // Invalida cache do usuário

    const token = generateToken({
      id: usuario.id,
      email: usuario.email,
      perfil: usuario.perfil,
      lastLogin: Date.now()
    });

    res.json({
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
    res.status(500).json({ 
      message: 'Erro interno no servidor',
      code: 'ERRO_INTERNO'
    });
  }
};

const me = async (req, res, next) => {
  try {
    const cacheKey = `user:${req.user.id}`;
    let usuario = await cache.get(cacheKey);
    
    if (!usuario) {
      usuario = await Usuario.findById(req.user.id);
      if (usuario) {
        await cache.set(cacheKey, {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          perfil: usuario.perfil,
          status: usuario.status
        }, 1800); // Cache por 30 minutos
      }
    }
    
    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    res.json(usuario);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  me
};
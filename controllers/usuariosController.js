const Usuario = require('../models/Usuario');
const cache = require('../config/cache');
const { hashPassword } = require('../utils/auth');

const clearUsersCache = async () => {
  await cache.del('users:list');
};

const listUsuarios = async (req, res, next) => {
  try {
    const { page = 1, perPage = 10, search = '' } = req.query;
    const cacheKey = `users:list:${page}:${perPage}:${search}`;
    
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const result = await Usuario.list({ page, perPage, search });
    await cache.set(cacheKey, result, 300); // Cache por 5 minutos
    
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cacheKey = `user:${id}`;
    
    const cachedUser = await cache.get(cacheKey);
    if (cachedUser) {
      return res.json(cachedUser);
    }

    const usuario = await Usuario.findById(id);
    
    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    const userResponse = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      status: usuario.status
    };
    
    await cache.set(cacheKey, userResponse, 3600); // Cache por 1 hora
    res.json(userResponse);
  } catch (error) {
    next(error);
  }
};

const createUsuario = async (req, res, next) => {
  try {
    const { nome, email, perfil, senha } = req.body;

    const existeUsuario = await Usuario.findByEmail(email);
    if (existeUsuario) {
      return res.status(400).json({ message: 'Email já cadastrado' });
    }

    const usuario = await Usuario.create({ nome, email, perfil, senha });
    
    await clearUsersCache();
    
    res.status(201).json({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      status: usuario.status
    });
  } catch (error) {
    next(error);
  }
};

const updateUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nome, email, perfil, senha, status } = req.body;

    const isUpdatingName = typeof nome !== 'undefined';
    const isUpdatingEmail = typeof email !== 'undefined';
    const isUpdatingProfile = typeof perfil !== 'undefined';
    const isUpdatingPassword = typeof senha !== 'undefined';
    const isUpdatingStatus = typeof status !== 'undefined';
    
    if (!isUpdatingName && !isUpdatingEmail && !isUpdatingProfile && 
        !isUpdatingPassword && !isUpdatingStatus) {
      return res.status(400).json({ 
        message: 'Envie pelo menos um campo para atualização (Nome, Email, Perfil, Senha ou Status)' 
      });
    }

    if ((isUpdatingName && !nome?.trim()) || 
        (isUpdatingEmail && !email?.trim()) || 
        (isUpdatingProfile && !perfil?.trim())) {
      return res.status(400).json({ 
        message: 'Campos não podem estar vazios quando enviados para atualização' 
      });
    }

    const existingUsuario = await Usuario.findById(id);
    if (!existingUsuario) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    if (isUpdatingEmail && email !== existingUsuario.email) {
      const usuarioComMesmoEmail = await Usuario.findByEmail(email, id);
      if (usuarioComMesmoEmail) {
        return res.status(400).json({ message: 'Email já está em uso por outro usuário' });
      }
    }

    const updates = {
      ...(isUpdatingName && { nome }),
      ...(isUpdatingEmail && { email }),
      ...(isUpdatingProfile && { perfil }),
      ...(isUpdatingStatus && { status }),
      updated_at: new Date()
    };

    if (isUpdatingPassword) {
      if (!senha.trim()) {
        return res.status(400).json({ message: 'Senha não pode estar vazia' });
      }
      updates.senha = await hashPassword(senha);
    }

    const usuario = await Usuario.update(id, updates);
    
    // Limpa caches relevantes
    await clearUsersCache();
    await cache.del(`user:${id}`);
    await cache.del(`user:${existingUsuario.email}`); // Limpa cache por email também
    
    res.json({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      status: usuario.status
    });

  } catch (error) {
    next(error);
  }
};

const deleteUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const usuario = await Usuario.findById(id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    await Usuario.delete(id);
    
    // Limpa caches relevantes
    await clearUsersCache();
    await cache.del(`user:${id}`);
    await cache.del(`user:${usuario.email}`);
    
    res.json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listUsuarios,
  getUsuario,
  createUsuario,
  updateUsuario,
  deleteUsuario
};

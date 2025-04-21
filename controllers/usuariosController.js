const Usuario = require('../models/Usuario');
const { hashPassword } = require('../utils/auth');

const listUsuarios = async (req, res, next) => {
  try {
    const { page = 1, perPage = 10, search = '' } = req.query;
    const result = await Usuario.list({ page, perPage, search });
    
    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

const getUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const usuario = await Usuario.findById(id);
    
    if (!usuario) {
      return res.status(404).json({
        success: false,
        code: 'USUARIO_NAO_ENCONTRADO',
        message: 'Usuário não encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        status: usuario.status
      }
    });
  } catch (error) {
    next(error);
  }
};

const createUsuario = async (req, res, next) => {
  try {
    const { nome, email, perfil = 'Usuario', senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({
        success: false,
        code: 'CAMPOS_OBRIGATORIOS',
        message: 'Nome, email e senha são obrigatórios',
        fields: {
          nome: !nome ? 'Campo obrigatório' : undefined,
          email: !email ? 'Campo obrigatório' : undefined,
          senha: !senha ? 'Campo obrigatório' : undefined
        }
      });
    }

    if (senha.length < 6) {
      return res.status(400).json({
        success: false,
        code: 'SENHA_INVALIDA',
        message: 'A senha deve ter pelo menos 6 caracteres'
      });
    }

    const existeUsuario = await Usuario.findByEmail(email);
    if (existeUsuario) {
      return res.status(409).json({
        success: false,
        code: 'EMAIL_EXISTENTE',
        message: 'Email já cadastrado'
      });
    }

    const usuario = await Usuario.create({ nome, email, perfil, senha });
    
    res.status(201).json({
      success: true,
      data: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        status: usuario.status
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nome, email, perfil, senha, status } = req.body;

    const existingUsuario = await Usuario.findById(id);
    if (!existingUsuario) {
      return res.status(404).json({
        success: false,
        code: 'USUARIO_NAO_ENCONTRADO',
        message: 'Usuário não encontrado'
      });
    }

    if (req.user.perfil !== 'Administrador' && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        code: 'SEM_PERMISSAO',
        message: 'Você só pode editar seu próprio usuário'
      });
    }

    if (email && email !== existingUsuario.email) {
      const usuarioComMesmoEmail = await Usuario.findByEmail(email, id);
      if (usuarioComMesmoEmail) {
        return res.status(409).json({
          success: false,
          code: 'EMAIL_EXISTENTE',
          message: 'Email já está em uso por outro usuário'
        });
      }
    }

    if (perfil && req.user.perfil !== 'Administrador') {
      return res.status(403).json({
        success: false,
        code: 'SEM_PERMISSAO',
        message: 'Apenas administradores podem alterar perfis'
      });
    }

    const updates = {
      ...(nome !== undefined && { nome }),
      ...(email !== undefined && { email }),
      ...(perfil !== undefined && { perfil }),
      ...(status !== undefined && { status }),
      updated_at: new Date()
    };

    if (senha) {
      if (senha.length < 6) {
        return res.status(400).json({
          success: false,
          code: 'SENHA_INVALIDA',
          message: 'A senha deve ter pelo menos 6 caracteres'
        });
      }
      updates.senha = await hashPassword(senha);
    }

    const usuario = await Usuario.update(id, updates);
    
    res.status(200).json({
      success: true,
      data: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        status: usuario.status
      }
    });
  } catch (error) {
    next(error);
  }
};

const deleteUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (req.user.id === id) {
      return res.status(403).json({
        success: false,
        code: 'AUTO_EXCLUSAO',
        message: 'Você não pode excluir sua própria conta'
      });
    }

    const usuario = await Usuario.findById(id);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        code: 'USUARIO_NAO_ENCONTRADO',
        message: 'Usuário não encontrado'
      });
    }

    if (req.user.perfil !== 'Administrador') {
      return res.status(403).json({
        success: false,
        code: 'SEM_PERMISSAO',
        message: 'Apenas administradores podem excluir usuários'
      });
    }

    await Usuario.delete(id);
    
    res.status(200).json({
      success: true,
      message: 'Usuário excluído com sucesso'
    });
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
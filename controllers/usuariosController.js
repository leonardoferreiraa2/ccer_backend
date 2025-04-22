const Usuario = require('../models/Usuario');
const { hashPassword } = require('../utils/auth');
const { sendNewPasswordEmail } = require('../services/emailService');

const listUsuarios = async (req, res, next) => {
    try {
        const { page = 1, perPage = 10, search = '' } = req.query;
        const result = await Usuario.list({ 
            page: parseInt(page), 
            perPage: parseInt(perPage), 
            search 
        });
        
        res.status(200).json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({
            success: false,
            code: 'INTERNAL_ERROR',
            message: 'Erro ao listar usuários',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const getUsuario = async (req, res, next) => {
    try {
        const { id } = req.params;
        const usuario = await Usuario.findById(id);
        
        if (!usuario) {
            return res.status(404).json({
                success: false,
                code: 'USER_NOT_FOUND',
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
        console.error('Erro ao buscar usuário:', error);
        res.status(500).json({
            success: false,
            code: 'INTERNAL_ERROR',
            message: 'Erro ao buscar usuário',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let password = '';
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

const createUsuario = async (req, res, next) => {
    try {
        const { nome, email, perfil = 'Editor' } = req.body;

        if (!nome || !email) {
            return res.status(400).json({
                success: false,
                code: 'MISSING_FIELDS',
                message: 'Nome e email são obrigatórios',
                fields: {
                    nome: !nome ? 'Campo obrigatório' : null,
                    email: !email ? 'Campo obrigatório' : null
                }
            });
        }

        // Gera senha automática para novo usuário
        const senha = generateRandomPassword();

        const existeUsuario = await Usuario.findByEmail(email);
        if (existeUsuario) {
            return res.status(409).json({
                success: false,
                code: 'EMAIL_EXISTS',
                message: 'Email já cadastrado'
            });
        }

        const usuario = await Usuario.create({ 
            nome, 
            email, 
            perfil, 
            senha 
        });

        // Envia e-mail com a senha gerada
        console.log('Email: ' + email + '\nSenha: ' + senha) // comente isso quando email funcionar
        //await sendNewPasswordEmail(email, nome, senha);
        
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
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({
            success: false,
            code: 'INTERNAL_ERROR',
            message: 'Erro ao criar usuário',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const updateUsuario = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { nome, email, perfil, status, senha: senhaRequest } = req.body;

        console.log('ID do usuário:', id);
        console.log('Senha recebida:', senhaRequest);
        
        const existingUsuario = await Usuario.findById(id);
        if (!existingUsuario) {
            return res.status(404).json({
                success: false,
                code: 'USER_NOT_FOUND',
                message: 'Usuário não encontrado'
            });
        }

        // Verificação de permissões (mantido igual)
        if (req.user.perfil !== 'Administrador' && req.user.id !== id) {
            return res.status(403).json({
                success: false,
                code: 'FORBIDDEN',
                message: 'Você só pode editar seu próprio usuário'
            });
        }

        // Verificação de email (mantido igual)
        if (email && email !== existingUsuario.email) {
            const usuarioComMesmoEmail = await Usuario.findByEmail(email, id);
            if (usuarioComMesmoEmail) {
                return res.status(409).json({
                    success: false,
                    code: 'EMAIL_EXISTS',
                    message: 'Email já está em uso por outro usuário'
                });
            }
        }

        // Verificação de perfil (mantido igual)
        if (perfil && req.user.perfil !== 'Administrador') {
            return res.status(403).json({
                success: false,
                code: 'FORBIDDEN',
                message: 'Apenas administradores podem alterar perfis'
            });
        }

        const updates = {
            ...(nome !== undefined && { nome }),
            ...(email !== undefined && { email }),
            ...(perfil !== undefined && { perfil }),
            ...(status !== undefined && { status })
        };

        // Lógica CORRIGIDA para senha na edição
        if (senhaRequest !== undefined && senhaRequest !== '') {
            // Se foi enviada uma senha (não vazia), usa a senha enviada
            updates.senha = senhaRequest;
            
            console.log('Usando senha definida pelo usuário');
        } else if (senhaRequest === '') {
            // Se foi enviada string vazia, gera senha aleatória (reset de senha)
            updates.senha = generateRandomPassword();
            
            console.log('Gerando senha aleatória para reset');
            console.log('Email: ' + existingUsuario.email + '\nSenha: ' + updates.senha);
            
            /*
            await sendNewPasswordEmail(
                email || existingUsuario.email, 
                nome || existingUsuario.nome, 
                updates.senha
            );
            */
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
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({
            success: false,
            code: 'INTERNAL_ERROR',
            message: 'Erro ao atualizar usuário',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const deleteUsuario = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        if (req.user.id === id) {
            return res.status(403).json({
                success: false,
                code: 'SELF_DELETE',
                message: 'Você não pode excluir sua própria conta'
            });
        }

        const usuario = await Usuario.findById(id);
        if (!usuario) {
            return res.status(404).json({
                success: false,
                code: 'USER_NOT_FOUND',
                message: 'Usuário não encontrado'
            });
        }

        if (req.user.perfil !== 'Administrador') {
            return res.status(403).json({
                success: false,
                code: 'FORBIDDEN',
                message: 'Apenas administradores podem excluir usuários'
            });
        }

        await Usuario.delete(id);
        
        res.status(200).json({
            success: true,
            message: 'Usuário excluído com sucesso'
        });
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        res.status(500).json({
            success: false,
            code: 'INTERNAL_ERROR',
            message: 'Erro ao excluir usuário',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    listUsuarios,
    getUsuario,
    createUsuario,
    updateUsuario,
    deleteUsuario
};
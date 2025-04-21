const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { hashPassword } = require('../utils/auth');

class Usuario {
    static async create({ nome, email, senha, perfil = 'Usuario' }) {
        try {
            if (!nome || !email || !senha) {
                throw new Error('Nome, email e senha são obrigatórios');
            }

            if (senha.length < 6) {
                throw new Error('Senha deve ter pelo menos 6 caracteres');
            }

            const exists = await this.findByEmail(email);
            if (exists) {
                throw new Error('Email já cadastrado');
            }

            const id = uuidv4();
            const hashedPassword = await hashPassword(senha);

            await db('usuarios').insert({
                id,
                nome,
                email,
                senha: hashedPassword,
                perfil,
                status: 'Ativo',
                created_at: db.fn.now(),
                updated_at: db.fn.now()
            });

            return this.findById(id);
        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            throw error;
        }
    }
    
    static async findByEmail(email, excludeId = null) {
        const query = db('usuarios').whereRaw('LOWER(email) = ?', email.toLowerCase());
        if (excludeId) query.whereNot('id', excludeId);
        return query.first();
    }

    static async findById(id) {
        return db('usuarios')
            .where('id', id)
            .select('id', 'nome', 'email', 'perfil', 'status', 'created_at', 'updated_at')
            .first();
    }

    static async update(id, updates) {
        try {
            if (updates.senha) {
                if (updates.senha.length < 6) {
                    throw new Error('Senha deve ter pelo menos 6 caracteres');
                }
                updates.senha = await hashPassword(updates.senha);
            }

            await db('usuarios')
                .where('id', id)
                .update({
                    ...updates,
                    updated_at: db.fn.now()
                });

            return this.findById(id);
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            throw error;
        }
    }

    static async delete(id) {
        try {
            return await db('usuarios').where('id', id).del();
        } catch (error) {
            console.error('Erro ao deletar usuário:', error);
            throw error;
        }
    }

    static async list({ page = 1, perPage = 10, search = '' }) {
        try {
            const query = db('usuarios')
                .select('id', 'nome', 'email', 'perfil', 'status')
                .orderBy('nome');

            if (search) {
                query.where(function() {
                    this.where('nome', 'like', `%${search}%`)
                        .orWhere('email', 'like', `%${search}%`);
                });
            }

            const [total] = await query.clone().count('* as total');
            const data = await query.offset((page - 1) * perPage).limit(perPage);

            return {
                data,
                pagination: {
                    total: parseInt(total.total),
                    page: parseInt(page),
                    perPage: parseInt(perPage),
                    totalPages: Math.ceil(total.total / perPage)
                }
            };
        } catch (error) {
            console.error('Erro ao listar usuários:', error);
            throw error;
        }
    }
}

module.exports = Usuario;
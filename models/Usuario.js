const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { hashPassword } = require('../utils/auth');

class Usuario {
  static async create({ nome, email, senha, perfil = 'Usuario' }) {
    if (!nome || !email || !senha) {
      throw new Error('Nome, email e senha são obrigatórios');
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
  }

  static async findByEmail(email, excludeId = null) {
    const query = db('usuarios').where('email', email);
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
    if (updates.senha) {
      updates.senha = await hashPassword(updates.senha);
    }

    await db('usuarios')
      .where('id', id)
      .update({
        ...updates,
        updated_at: db.fn.now()
      });

    return this.findById(id);
  }

  static async delete(id) {
    return db('usuarios').where('id', id).del();
  }

  static async list({ page = 1, perPage = 10, search = '' }) {
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
  }
}

module.exports = Usuario;
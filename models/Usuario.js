const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { hashPassword } = require('../utils/auth');

const Usuario = {
  async registrarLogin(id) {
    await db('usuarios')
      .where({ id })
      .update({ 
        last_login: new Date(),
        login_count: db.raw('login_count + 1') 
      });
  },

  async findByEmail(email, id = null) {
    if (id) {
      return db('usuarios').whereNot({ id }).where({ email }).first();
    }
    return db('usuarios').where({ email }).first();
  },

  async create(usuarioData) {
    usuarioData.id = uuidv4();
    usuarioData.senha = await hashPassword(usuarioData.senha);
    usuarioData.status = 'Ativo';
    
    await db('usuarios').insert(usuarioData);
    return this.findById(usuarioData.id);
  },

  async findById(id) {
    return db('usuarios').where({ id }).first();
  },

  async findByCredentials(email, senha) {
    const usuario = await this.findByEmail(email);
    if (!usuario) return null;
    
    const isMatch = await bcrypt.compare(senha, usuario.senha);
    if (!isMatch) return null;
    
    return usuario;
  },

  async count() {
    const result = await db('usuarios').count('* as total');
    return parseInt(result[0].total);
  },

  async list({ page = 1, perPage = 10, search = '' }) {
    const query = db('usuarios').orderBy('nome', 'asc');

    if (search) {
      query.where(function() {
        this.where('nome', 'like', `%${search}%`)
          .orWhere('email', 'like', `%${search}%`)
          .orWhere('perfil', 'like', `%${search}%`)
          .orWhere('status', 'like', `%${search}%`);
      });
    }

    const [total] = await query.clone().count('* as total');
    const usuarios = await query
      .offset((page - 1) * perPage)
      .limit(perPage);

    return {
      data: usuarios,
      pagination: {
        total: total.total,
        page,
        perPage,
        totalPages: Math.ceil(total.total / perPage)
      }
    };
  },

  async update(id, updates) {
    updates.updated_at = new Date();
    if (updates.senha) {
      updates.senha = await hashPassword(updates.senha);
    }
    await db('usuarios').where({ id }).update(updates);
    return this.findById(id);
  },

  async delete(id) {
    return db('usuarios').where({ id }).del();
  }
};

module.exports = Usuario;


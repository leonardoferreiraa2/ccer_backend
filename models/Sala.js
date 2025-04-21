const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Sala = {
  async findByTitle(titulo, id = null) {
    if (id) {
      return db('salas').whereNot({ id }).where({ titulo }).first();
    }
    return db('salas').where({ titulo }).first();
  },

  async create(salaData) {
    salaData.id = uuidv4();
    await db('salas').insert(salaData);
    return this.findById(salaData.id);
  },

  async findById(id) {
    return db('salas').where({ id }).first();
  },

  async update(id, updates) {
    updates.updated_at = new Date();
    await db('salas').where({ id }).update(updates);
    return this.findById(id);
  },

  async delete(id) {
    return db('salas').where({ id }).del();
  },

  async list({ page = 1, perPage = 10, search = '' }) {
    const query = db('salas').orderBy('titulo', 'asc');

    if (search) {
      query.where(function() {
        this.where('titulo', 'like', `%${search}%`)
          .orWhere('descricao', 'like', `%${search}%`);
      });
    }

    const totalQuery = query.clone().count('* as total');
    const resultsQuery = query.clone()
      .offset((page - 1) * perPage)
      .limit(perPage);

    const [totalResult] = await totalQuery;
    const total = parseInt(totalResult.total);
    const salas = await resultsQuery;

    return {
      data: salas,
      pagination: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage)
      }
    };
  },

  async getImageUrl(id) {
    const sala = await this.findById(id);
    return sala ? `/uploads/${sala.foto}` : null;
  }
};

module.exports = Sala;

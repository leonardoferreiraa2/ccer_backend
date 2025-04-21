// C:\Temp\ccer\backend\migrations/20240101000002_create_admin_user.js
const bcrypt = require('bcryptjs');

exports.up = async function(knex) {
  const exists = await knex('usuarios').select('id').first();
  if (!exists) {
    return knex('usuarios').insert({
      id: 'd5a8b1e0-3f9d-4a7c-8b2e-6f1c9d8e7a2b',
      nome: 'Administrador',
      email: 'admin@ccer.com',
      senha: await bcrypt.hash('Admin123@', 10),
      perfil: 'Administrador',
      status: 'Ativo',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    });
  }
};

exports.down = function(knex) {
  return knex('usuarios').where({ email: 'admin@ccer.com' }).del();
};

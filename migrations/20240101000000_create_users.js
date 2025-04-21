exports.up = function(knex) {
  return knex.schema.createTable('usuarios', function(table) {
    table.string('id', 36).primary(); // Usando UUID como string
    table.string('nome', 255).notNullable();
    table.string('email', 255).notNullable().unique();
    table.string('senha', 255).notNullable();
    table.string('perfil', 50).notNullable();
    table.string('status', 50).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('last_login').nullable();
    table.integer('login_count').defaultTo(0);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('usuarios');
};

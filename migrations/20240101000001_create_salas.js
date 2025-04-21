exports.up = function(knex) {
  return knex.schema.createTable('salas', function(table) {
    table.string('id', 36).primary(); // VARCHAR(36) para armazenar UUID
    table.string('titulo', 255).notNullable();
    table.text('descricao').notNullable();
    table.string('foto', 255);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('salas');
};

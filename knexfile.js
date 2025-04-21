// knexfile.js
module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: './database.sqlite3'  // Alterado para match com database.js
    },
    useNullAsDefault: true,
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations'
    },
    pool: {
      afterCreate: (conn, cb) => {
        conn.run('PRAGMA foreign_keys = ON', cb);
      }
    }
  }
};
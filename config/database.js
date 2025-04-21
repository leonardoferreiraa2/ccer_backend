require('dotenv').config();
const knex = require('knex');

const config = {
  client: process.env.DB_CLIENT || 'sqlite3',
  connection: process.env.DB_CLIENT === 'sqlite3' 
    ? { 
        filename: process.env.DB_FILENAME || './database.sqlite3',
        pool: {
          afterCreate: (conn, cb) => {
            conn.run('PRAGMA foreign_keys = ON', cb);
          }
        }
      }
    : {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
      },
  useNullAsDefault: true,
  migrations: {
    directory: './migrations'
  },
  seeds: {
    directory: './seeds'
  }
};

const db = knex(config);

// Teste de conexão imediata
db.raw('SELECT 1')
  .then(() => console.log('✅ Banco de dados conectado'))
  .catch(err => {
    console.error('❌ Erro no banco de dados:', err);
    process.exit(1);
  });

module.exports = db;
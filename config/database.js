require('dotenv').config();
const knex = require('knex');

module.exports = knex({
  client: process.env.DB_CLIENT || 'sqlite3',
  connection: process.env.DB_CLIENT === 'sqlite3' 
    ? { filename: process.env.DB_FILENAME || './dev.sqlite3' }
    : {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
      },
  useNullAsDefault: true,
  migrations: {
    directory: './migrations'
  }
});

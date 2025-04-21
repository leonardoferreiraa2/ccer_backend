// rode isso: C:\Temp\ccer\backend> node scripts/createAdmin.js 
require('dotenv').config();
const db = require('../config/database');
const { hashPassword } = require('../utils/auth');
const { v4: uuidv4 } = require('uuid');

(async () => {
  try {
    // Verifica se a tabela existe
    const tableExists = await db.schema.hasTable('usuarios');
    
    if (!tableExists) {
      console.error('❌ Tabela "usuarios" não existe. Execute as migrações primeiro:');
      console.error('npm run migrate');
      process.exit(1);
    }

    // Verifica se o admin já existe
    const adminExists = await db('usuarios')
      .where({ email: 'admin@ccer.com' })
      .first();

    if (!adminExists) {
      await db('usuarios').insert({
        id: uuidv4(),
        nome: 'Administrador',
        email: 'admin@ccer.com',
        senha: await hashPassword('Admin123@'),
        perfil: 'Administrador',
        status: 'Ativo',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      console.log('✅ Admin criado com sucesso');
      console.log('Email: admin@ccer.com');
      console.log('Senha: Admin123@');
    } else {
      console.log('ℹ️ Admin já existe no banco de dados');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar admin:', error.message);
    console.error('Detalhes:', error);
    process.exit(1);
  }
})();
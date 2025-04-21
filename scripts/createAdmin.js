// rode isso: C:\Temp\ccer\backend> node scripts/createAdmin.js 

require('dotenv').config();
const db = require('../config/database');
const { hashPassword } = require('../utils/auth');

(async () => {
  try {
    const adminExists = await db('usuarios')
      .where({ email: 'admin@ccer.com' })
      .first();

    if (!adminExists) {
      await db('usuarios').insert({
        id: require('uuid').v4(),
        nome: 'Administrador',
        email: 'admin@ccer.com',
        senha: await hashPassword('Admin123@'),
        perfil: 'Administrador',
        status: 'Ativo',
        created_at: new Date(),
        updated_at: new Date()
      });
      console.log('✅ Admin criado com sucesso');
    } else {
      console.log('⚠️  Admin já existe');
    }
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
})();


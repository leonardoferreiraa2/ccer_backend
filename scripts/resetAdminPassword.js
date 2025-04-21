// C:\Temp\ccer\backend> node scripts/resetAdminPassword.js
require('dotenv').config();
const db = require('../config/database');
const { hashPassword } = require('../utils/auth');

(async () => {
  try {
    await db('usuarios')
      .where({ email: 'admin@ccer.com' })
      .update({
        senha: await hashPassword('NovaSenhaSegura123'),
        updated_at: new Date()
      });
    
    console.log('✅ Senha do admin resetada com sucesso');
    console.log('Nova senha: NovaSenhaSegura123');
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
})();
const jwt = require('jsonwebtoken');
const cache = require('../config/cache');

const authMiddleware = async (req, res, next) => {
  const token = req.header('x-auth-token');
  
  if (!token) {
    console.log('❌ Token não fornecido no header');
    return res.status(401).json({ message: 'Token não fornecido' });
  }

  try {
    // 1. Verificação básica do JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(`🔍 Token decodificado para usuário: ${decoded.id}`);

    // 2. Verificação no cache com logs detalhados
    const cacheKey = `token:${decoded.id}`;
    console.log(`🔎 Buscando token no cache: ${cacheKey}`);
    
    const cachedToken = await cache.get(cacheKey);
    console.log(`📦 Token no cache: ${cachedToken ? 'Encontrado' : 'Não encontrado'}`);

    // 3. Validação completa
    if (!cachedToken) {
      console.log(`❌ Token não encontrado no cache para usuário: ${decoded.id}`);
      return res.status(401).json({ message: 'Token inválido (não encontrado no cache)' });
    }

    if (cachedToken !== token) {
      console.log(`❌ Token não coincide:
        Cache: ${cachedToken.substring(0, 10)}...
        Recebido: ${token.substring(0, 10)}...`);
      return res.status(401).json({ message: 'Token inválido (versão incorreta)' });
    }

    console.log(`✅ Token válido para usuário: ${decoded.id}`);
    req.user = decoded;
    next();

  } catch (err) {
    console.error('💥 Erro na verificação do token:', {
      error: err.message,
      token: token.substring(0, 15) + '...'
    });
    
    res.status(401).json({ 
      message: 'Token inválido',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

module.exports = {
  authMiddleware
};

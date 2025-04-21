const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cache = require('../config/cache');

const generateToken = async (userData) => {
  if (!userData?.id || !userData?.email) {
    throw new Error('Dados do usuário incompletos para gerar token');
  }

  const payload = {
    id: userData.id,
    email: userData.email,
    perfil: userData.perfil || 'Usuario',
    lastLogin: Date.now()
  };

  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
  
  await cache.setToken(userData.id, token);
  return token;
};

const hashPassword = async (password) => {
  if (!password || password.length < 6) {
    throw new Error('Senha deve ter pelo menos 6 caracteres');
  }
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

const comparePassword = async (password, hashedPassword) => {
  if (!password || !hashedPassword) {
    return false;
  }
  return await bcrypt.compare(password, hashedPassword);
};

const verifyToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const cachedToken = await cache.getToken(decoded.id);
    
    if (!cachedToken || cachedToken !== token) {
      return null;
    }
    
    return decoded;
  } catch (err) {
    console.error('Token verification failed:', err.message);
    return null;
  }
};

module.exports = {
  generateToken,
  hashPassword,
  comparePassword,
  invalidateToken: cache.invalidateToken.bind(cache),
  verifyToken
};
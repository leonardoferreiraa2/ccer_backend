const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cache = require('../config/cache');

const generateToken = (usuario) => {
  const token = jwt.sign(
    { id: usuario.id, email: usuario.email, perfil: usuario.perfil },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
  
  // Armazena token no cache para possível invalidação
  cache.set(`token:${usuario.id}`, token, parseInt(process.env.JWT_EXPIRES_IN));
  
  return token;
};

const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

const invalidateToken = async (userId) => {
  await cache.del(`token:${userId}`);
};

module.exports = {
  generateToken,
  hashPassword,
  comparePassword,
  invalidateToken
};

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
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    await cache.setToken(userData.id, token);
    return token;
};

const generateRefreshToken = async (userId) => {
    const refreshToken = jwt.sign(
        { id: userId },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN }
    );

    await cache.setToken(`refresh:${userId}`, refreshToken);
    return refreshToken;
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

const verifyRefreshToken = async (refreshToken) => {
    try {
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        const cachedToken = await cache.getToken(`refresh:${decoded.id}`);
        
        if (!cachedToken || cachedToken !== refreshToken) {
            return null;
        }
        
        return decoded;
    } catch (err) {
        console.error('Refresh token verification failed:', err.message);
        return null;
    }
};

const hashPassword = async (password) => {
    if (!password || password.length < 6) { // Alterado para 6 caracteres mínimos
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

module.exports = {
    generateToken,
    generateRefreshToken,
    verifyToken,
    verifyRefreshToken,
    hashPassword,
    comparePassword,
    invalidateToken: cache.invalidateToken.bind(cache)
};
require('dotenv').config();
const Redis = require('ioredis');

class Cache {
  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      connectTimeout: 10000,
      maxRetriesPerRequest: 1
    });

    this.client.on('connect', () => console.log('✅ Redis conectado'));
    this.client.on('error', (err) => console.error('❌ Redis error:', err));
  }

  async setToken(userId, token, ttl = 86400) {
    try {
      await this.client.setex(`token:${userId}`, ttl, token);
      return true;
    } catch (err) {
      console.error('Cache SET token error:', err);
      return false;
    }
  }

  async getToken(userId) {
    try {
      return await this.client.get(`token:${userId}`);
    } catch (err) {
      console.error('Cache GET token error:', err);
      return null;
    }
  }

  async invalidateToken(userId) {
    try {
      const result = await this.client.del(`token:${userId}`);
      return result > 0;
    } catch (err) {
      console.error('Cache DEL token error:', err);
      return false;
    }
  }

  async healthCheck() {
    try {
      await this.client.ping();
      return { healthy: true, message: 'Redis respondendo' };
    } catch (err) {
      return { 
        healthy: false, 
        error: err.message
      };
    }
  }
}

const cache = new Cache();
module.exports = cache;
require('dotenv').config();
const Redis = require('ioredis');

// Cache em memória como fallback
const memoryCache = new Map();
let redisReady = false;
let lastError = null;

const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  family: process.env.REDIS_FAMILY || 4, // 4 (IPv4) or 6 (IPv6)
  connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT) || 10000,
  commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT) || 5000,
  enableOfflineQueue: true,
  enableReadyCheck: true,
  autoResendUnfulfilledCommands: true,
  maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES) || 3,
  retryStrategy: (times) => {
    const delay = Math.min(times * 100, 5000);
    console.warn(`[Redis] Tentando reconectar (tentativa ${times}, delay ${delay}ms)`);
    return delay;
  },
  reconnectOnError: (err) => {
    lastError = err;
    const targetError = 'READONLY';
    return err.message.includes(targetError);
  },
  showFriendlyErrorStack: process.env.NODE_ENV === 'development'
});

// Eventos de conexão
redisClient.on('connect', () => {
  console.log('[Redis] Conexão TCP estabelecida');
});

redisClient.on('ready', () => {
  redisReady = true;
  console.log('[Redis] Servidor pronto para comandos');
  // Teste de saúde imediato
  healthCheck(true).then(result => {
    if (!result.healthy) {
      redisReady = false;
      console.error('[Redis] Teste de saúde falhou:', result.error);
    }
  });
});

redisClient.on('error', (err) => {
  redisReady = false;
  lastError = err;
  console.error('[Redis] Erro:', {
    message: err.message,
    code: err.code,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

redisClient.on('close', () => {
  redisReady = false;
  console.log('[Redis] Conexão fechada');
});

redisClient.on('reconnecting', (ms) => {
  console.log(`[Redis] Reconectando em ${ms}ms`);
});

redisClient.on('end', () => {
  redisReady = false;
  console.log('[Redis] Conexão terminada');
});

// Função de verificação de saúde
async function healthCheck(force = false) {
  if (!force && !redisReady) {
    return {
      healthy: false,
      error: 'Redis not ready',
      lastError: lastError?.message
    };
  }

  try {
    const start = Date.now();
    await redisClient.ping();
    const latency = Date.now() - start;
    
    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
    
    return {
      healthy: true,
      latency: `${latency}ms`,
      memoryUsage: `${memoryUsage.toFixed(2)}MB`,
      stats: {
        memoryCacheSize: memoryCache.size,
        redisInfo: await redisClient.info()
      }
    };
  } catch (err) {
    redisReady = false;
    return {
      healthy: false,
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    };
  }
}

// Interface pública do cache
module.exports = {
  /**
   * Obtém um valor do cache
   * @param {string} key - Chave do cache
   * @returns {Promise<any>} - Valor armazenado ou null
   */
  async get(key) {
    if (!key || typeof key !== 'string') {
      console.error('[Cache] Chave inválida:', key);
      return null;
    }

    // 1. Tentativa com Redis
    if (redisReady) {
      try {
        const start = Date.now();
        const data = await redisClient.get(key);
        const latency = Date.now() - start;
        
        if (data !== null) {
          console.debug(`[Cache] GET ${key} (Redis, ${latency}ms)`);
          const parsed = JSON.parse(data);
          memoryCache.set(key, parsed); // Atualiza cache local
          return parsed;
        }
      } catch (err) {
        console.error(`[Cache] GET ${key} falhou no Redis:`, err.message);
        redisReady = false;
      }
    }

    // 2. Fallback para memória
    if (memoryCache.has(key)) {
      console.warn(`[Cache] GET ${key} (fallback memória)`);
      return memoryCache.get(key);
    }

    // 3. Chave não encontrada
    console.debug(`[Cache] GET ${key} não encontrado`);
    return null;
  },

  /**
   * Armazena um valor no cache
   * @param {string} key - Chave do cache
   * @param {any} value - Valor a ser armazenado
   * @param {number} ttl - Tempo de vida em segundos
   * @returns {Promise<boolean>} - True se armazenado com sucesso
   */
  async set(key, value, ttl = 3600) {
    if (!key || typeof key !== 'string') {
      console.error('[Cache] Chave inválida:', key);
      return false;
    }

    const strValue = JSON.stringify(value);
    let redisSuccess = false;

    // 1. Sempre atualiza memória
    memoryCache.set(key, value);

    // 2. Tentativa com Redis
    if (redisReady) {
      try {
        const start = Date.now();
        if (ttl > 0) {
          await redisClient.setex(key, ttl, strValue);
        } else {
          await redisClient.set(key, strValue);
        }
        const latency = Date.now() - start;
        console.debug(`[Cache] SET ${key} (Redis, ${latency}ms)`);
        redisSuccess = true;
      } catch (err) {
        console.error(`[Cache] SET ${key} falhou no Redis:`, err.message);
        redisReady = false;
      }
    }

    return redisSuccess || !redisReady;
  },

  /**
   * Remove uma chave do cache
   * @param {string} key - Chave a ser removida
   * @returns {Promise<boolean>} - True se removido com sucesso
   */
  async del(key) {
    if (!key || typeof key !== 'string') {
      console.error('[Cache] Chave inválida:', key);
      return false;
    }

    // 1. Remove da memória
    const memoryDeleted = memoryCache.delete(key);

    // 2. Tentativa com Redis
    let redisDeleted = false;
    if (redisReady) {
      try {
        await redisClient.del(key);
        redisDeleted = true;
      } catch (err) {
        console.error(`[Cache] DEL ${key} falhou no Redis:`, err.message);
        redisReady = false;
      }
    }

    return memoryDeleted || redisDeleted;
  },

  /**
   * Verifica a saúde do cache
   * @returns {Promise<Object>} - Status detalhado
   */
  healthCheck,

  /**
   * Limpa todo o cache
   * @param {boolean} memoryOnly - Limpar apenas memória
   * @returns {Promise<boolean>} - True se limpeza bem-sucedida
   */
  async flush(memoryOnly = false) {
    memoryCache.clear();

    if (!memoryOnly && redisReady) {
      try {
        await redisClient.flushdb();
        return true;
      } catch (err) {
        console.error('[Cache] FLUSH falhou no Redis:', err.message);
        return false;
      }
    }
    return true;
  },

  /**
   * Obtém estatísticas do cache
   * @returns {Promise<Object>} - Estatísticas detalhadas
   */
  async stats() {
    return {
      memory: {
        size: memoryCache.size,
        keys: Array.from(memoryCache.keys())
      },
      redis: {
        status: redisReady ? 'ready' : 'not-ready',
        lastError: lastError?.message,
        info: redisReady ? await redisClient.info().catch(() => null) : null
      },
      timestamp: new Date().toISOString()
    };
  },

  // Expõe o cliente Redis para operações avançadas
  get client() {
    return redisReady ? redisClient : null;
  },

  // Status atual
  get status() {
    return {
      ready: redisReady,
      lastError: lastError?.message,
      memorySize: memoryCache.size
    };
  }
};


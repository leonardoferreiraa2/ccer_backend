require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./config/database');
const cache = require('./config/cache');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Verificação de variáveis de ambiente obrigatórias
const requiredEnvVars = [
  'JWT_SECRET', 'REDIS_HOST', 
  'UPLOADS_DIR', 'CORS_ORIGIN'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Variável de ambiente obrigatória faltando: ${varName}`);
    process.exit(1);
  }
});

// Configurações de Segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://seudominio.com"]
    }
  },
  hsts: {
    maxAge: 63072000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.LOGIN_LIMIT_MAX,
  message: "Muitas tentativas de login. Tente novamente mais tarde."
});

// Middlewares
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  exposedHeaders: ['Content-Disposition'] // Adicione esta linha
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.JWT_SECRET));

// Configuração de Uploads
// Adicione isso no seu server.js, após as outras configurações
const uploadsDir = path.resolve(process.env.UPLOADS_DIR || './uploads');

// Cria a pasta se não existir
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Rotas
app.use('/api/auth', authLimiter, require('./routes/authRoutes'));
app.use('/api', apiLimiter);
app.use('/api/usuarios', require('./routes/usuariosRoutes'));
app.use('/api/salas', require('./routes/salasRoutes'));
app.use('/uploads', express.static(uploadsDir));

// Health Check
app.get('/health', async (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      database: 'unhealthy',
      cache: 'unhealthy'
    }
  };

  try {
    await db.raw('SELECT 1');
    healthCheck.services.database = 'healthy';
  } catch (error) {
    console.error('❌ Database health check failed:', error);
  }

  try {
    const cacheHealth = await cache.healthCheck();
    healthCheck.services.cache = cacheHealth.healthy ? 'healthy' : 'unhealthy';
  } catch (error) {
    console.error('❌ Cache health check failed:', error);
  }

  const status = healthCheck.services.database === 'healthy' && 
                 healthCheck.services.cache === 'healthy' ? 200 : 503;

  res.status(status).json(healthCheck);
});

// Error Handler
app.use(errorHandler);

// Inicialização
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
  🚀 Servidor rodando na porta ${PORT}
  ⚡ Modo: ${process.env.NODE_ENV}
  📂 Uploads: ${uploadsDir}
  🔒 CORS: ${process.env.CORS_ORIGIN}
  `);
});
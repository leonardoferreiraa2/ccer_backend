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

// Middlewares de Segurança
app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // limite de 100 requisições por IP
}));

// Configurações
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://seudominio.com', // ATUALIZE COM SEU DOMÍNIO
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Configuração de Uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.chmodSync(uploadsDir, 0o755); // Permissões necessárias
}

// Rotas
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/usuarios', require('./routes/usuariosRoutes'));
app.use('/api/salas', require('./routes/salasRoutes'));
app.use('/uploads', express.static(uploadsDir));

// Health Check
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await db.raw('SELECT 1').then(() => 'healthy').catch(() => 'unhealthy');
    const cacheHealth = await cache.healthCheck();

    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth,
        cache: cacheHealth.healthy ? 'healthy' : 'unhealthy'
      },
      environment: process.env.NODE_ENV || 'production' // Alterado para production
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Health check failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Error Handler
app.use(errorHandler);

// Inicialização
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
  🚀 Servidor rodando na porta ${PORT}
  ⚡ Modo: ${process.env.NODE_ENV || 'production'}
  📂 Uploads: ${uploadsDir}
  🔒 CORS: ${process.env.CORS_ORIGIN || 'https://seudominio.com'}
  `);
});
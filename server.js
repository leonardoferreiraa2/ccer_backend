require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const db = require('./config/database');
const cache = require('./config/cache');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/usuarios', require('./routes/usuariosRoutes'));
app.use('/api/salas', require('./routes/salasRoutes'));
app.use('/uploads', express.static(uploadsDir));

app.get('/health', async (req, res) => {
  try {
    const dbHealth = await db.raw('SELECT 1').then(() => 'healthy').catch(() => 'unhealthy');
    const cacheHealth = await cache.healthCheck();

    res.status(200).json({
      status: 'OK',
      timestamp: new Date(),
      services: {
        database: dbHealth,
        cache: cacheHealth.healthy ? 'healthy' : 'unhealthy'
      },
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Health check failed',
      error: error.message
    });
  }
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
  🚀 Servidor rodando na porta ${PORT}
  ⚡ Modo: ${process.env.NODE_ENV || 'development'}
  📂 Uploads: ${uploadsDir}
  `);
});
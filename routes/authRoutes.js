const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middlewares/auth');

// Rota de login (pública)
router.post('/login', authController.login);

// Rota de logout (requer autenticação)
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;
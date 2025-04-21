const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middlewares/auth');

// Rota de login (pública)
router.post('/login', authController.login);

// Rota de logout (requer autenticação)
router.post('/logout', authMiddleware, authController.logout);

// Rota para obter dados do usuário logado (requer autenticação)
router.get('/me', authMiddleware, (req, res) => {
  res.json({
    user: req.user
  });
});

module.exports = router;
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { invalidateToken } = require('../utils/auth');

router.post('/login', authController.login);
router.get('/me', authController.me);
router.post('/logout', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(400).json({ message: 'Token não fornecido' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    await invalidateToken(decoded.id);
    
    res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao realizar logout' });
  }
});

module.exports = router;

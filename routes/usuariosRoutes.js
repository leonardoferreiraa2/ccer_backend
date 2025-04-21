const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController');
const { authMiddleware } = require('../middlewares/auth');

// Todas as rotas exigem autenticação (mas não específica de admin)
router.use(authMiddleware);

router.get('/', usuariosController.listUsuarios);
router.get('/:id', usuariosController.getUsuario);
router.post('/', usuariosController.createUsuario);
router.put('/:id', usuariosController.updateUsuario);
router.delete('/:id', usuariosController.deleteUsuario);

module.exports = router;

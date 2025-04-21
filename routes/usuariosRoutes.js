const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController');
const { authMiddleware, adminOnly } = require('../middlewares/auth');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Rotas acessíveis apenas para admin
router.post('/', adminOnly, usuariosController.createUsuario);
router.get('/', adminOnly, usuariosController.listUsuarios);

// Rotas para usuários comuns (próprio usuário)
router.get('/:id', usuariosController.getUsuario);
router.put('/:id', usuariosController.updateUsuario);
router.delete('/:id', adminOnly, usuariosController.deleteUsuario);

module.exports = router;
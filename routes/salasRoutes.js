const express = require('express');
const router = express.Router();
const salasController = require('../controllers/salasController');
const { authMiddleware } = require('../middlewares/auth');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Rotas principais
router.get('/', salasController.listSalas);
router.post('/', salasController.createSala);
router.get('/:id', salasController.getSala);
router.put('/:id', salasController.updateSala);
router.delete('/:id', salasController.deleteSala);

// Rota específica para imagens
router.get('/:id/image', salasController.getSalaImage);

module.exports = router;
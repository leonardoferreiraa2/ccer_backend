const express = require('express');
const router = express.Router();
const salasController = require('../controllers/salasController');
const { authMiddleware } = require('../middlewares/auth');

// Rotas principais
router.get('/', authMiddleware, salasController.listSalas);
router.post('/', authMiddleware, salasController.createSala);
router.get('/:id', salasController.getSala);
router.put('/:id', authMiddleware, salasController.updateSala);
router.delete('/:id', authMiddleware, salasController.deleteSala);

// Rota específica para imagens
router.get('/:id/image', authMiddleware, salasController.getSalaImage);

module.exports = router;
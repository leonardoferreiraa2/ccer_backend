const express = require('express');
const router = express.Router();
const salasController = require('../controllers/salasController');
const { authMiddleware } = require('../middlewares/auth');

// Todas as rotas exigem autenticação (mas não específica de admin)
router.use(authMiddleware);

router.get('/', salasController.listSalas);
router.get('/:id', salasController.getSala);
router.get('/:id/image', salasController.getSalaImage);
router.post('/', salasController.createSala);
router.put('/:id', salasController.updateSala);
router.delete('/:id', salasController.deleteSala);

module.exports = router;

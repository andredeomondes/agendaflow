const express = require('express');
const router = express.Router();
const bloqueioController = require('../controllers/bloqueioController');
const auth = require('../middlewares/authMiddleware');

router.get('/', auth, bloqueioController.listar);
router.post('/', auth, auth.requireAdmin, bloqueioController.criar);
router.patch('/:id', auth, auth.requireAdmin, bloqueioController.atualizar);
router.delete('/:id', auth, auth.requireAdmin, bloqueioController.deletar);

module.exports = router;

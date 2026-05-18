const express = require('express');
const router = express.Router();
const spaceController = require('../controllers/spaceController');
const auth = require('../middlewares/authMiddleware'); // O protetor que exige login

// Rota para Listar Espaços
router.get('/', auth, spaceController.listar);
router.post('/', auth, auth.requireAdmin, spaceController.criar);
router.patch('/:id', auth, auth.requireAdmin, spaceController.atualizar);
router.delete('/:id', auth, auth.requireAdmin, spaceController.deletar);

module.exports = router;

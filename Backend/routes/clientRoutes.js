const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const auth = require('../middlewares/authMiddleware');

router.get('/', auth, auth.requireAdmin, clientController.listar);
router.post('/', auth, auth.requireAdmin, clientController.criar);
router.post('/registro', clientController.registroPublico);
router.get('/confirmar-email', clientController.confirmarEmail);
router.post('/reenviar-verificacao', clientController.reenviarVerificacao);
router.patch('/:id', auth, auth.requireAdmin, clientController.atualizar);
router.delete('/:id', auth, auth.requireAdmin, clientController.deletar);

module.exports = router;

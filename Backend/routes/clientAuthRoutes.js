const express = require('express');
const router = express.Router();
const clientAuthController = require('../controllers/clientAuthController');
const auth = require('../middlewares/authMiddleware');

router.post('/login-cliente', clientAuthController.loginCliente);
router.put('/alterar-senha-cliente', clientAuthController.alterarSenha);
router.post('/esqueci-senha-cliente', clientAuthController.esqueciSenha);
router.put('/alterar-dados-cliente', auth, clientAuthController.atualizarDados);

module.exports = router;

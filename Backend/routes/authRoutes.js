const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middlewares/authMiddleware');

// Rota para fazer o login (admin)
router.post('/login', authController.login);

// Rota unificada de login (admin ou cliente)
router.post('/login-unificado', authController.loginUnificado);

// Rota para atualizar perfil do admin
router.patch('/perfil', auth, auth.requireAdmin, authController.atualizarPerfil);

module.exports = router;

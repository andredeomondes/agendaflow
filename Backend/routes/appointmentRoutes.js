const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const auth = require('../middlewares/authMiddleware'); // O protetor que exige login

// Rota para Listar Agendamentos
router.get('/', auth, appointmentController.listar);

// Rota para Marcar Agendamento (com a regra de capacidade)
router.post('/', auth, auth.requireAdmin, appointmentController.criar);

// Rota para Cancelar Agendamento
router.delete('/:id', auth, appointmentController.deletar);

// Rota para Atualizar Status
router.patch('/:id/status', auth, appointmentController.atualizarStatus);

// Rota para listar agendamentos do cliente (Cliente logado)
router.get('/cliente', auth, appointmentController.listarDoCliente);

// Rota pública para consulta de agendamentos por email (sem login)
router.get('/consulta', appointmentController.consultaPublica);

// Rota para buscar slots disponíveis (autenticado)
router.get('/slots', auth, appointmentController.slotsDisponiveis);

// Rota para cliente criar próprio agendamento
router.post('/self-service', auth, appointmentController.criarCliente);

module.exports = router;

const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const whatsapp = require('../services/whatsappService');

// Apenas admin acessa
router.use(auth);

// GET /api/whatsapp/status — retorna status e QR (se houver)
router.get('/status', (req, res) => {
    res.json(whatsapp.getStatus());
});

// POST /api/whatsapp/connect — inicia conexão / gera QR
router.post('/connect', async (req, res) => {
    try {
        await whatsapp.iniciarConexao();
        // Aguarda brevemente para o QR aparecer
        await new Promise(resolve => setTimeout(resolve, 1500));
        res.json(whatsapp.getStatus());
    } catch (e) {
        res.status(500).json({ erro: 'Erro ao iniciar WhatsApp: ' + e.message });
    }
});

// POST /api/whatsapp/disconnect — desconecta e apaga sessão
router.post('/disconnect', async (req, res) => {
    try {
        await whatsapp.desconectar();
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ erro: 'Erro ao desconectar: ' + e.message });
    }
});

// POST /api/whatsapp/test — envia mensagem de teste para um número
router.post('/test', async (req, res) => {
    const { telefone } = req.body;
    if (!telefone) return res.status(400).json({ erro: 'Informe o telefone.' });
    const status = whatsapp.getStatus();
    if (status.status !== 'connected') {
        return res.status(400).json({ erro: `WhatsApp não conectado (status: ${status.status}).` });
    }
    const ok = await whatsapp.enviarMensagem(telefone, '✅ *Teste AgendaFlow*\n\nSe você recebeu esta mensagem, as notificações via WhatsApp estão funcionando!');
    if (ok) res.json({ ok: true, mensagem: 'Mensagem de teste enviada com sucesso!' });
    else res.status(400).json({ erro: 'Número não encontrado no WhatsApp ou erro ao enviar. Verifique o console do backend.' });
});

module.exports = router;

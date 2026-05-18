const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const auth = require('../middlewares/authMiddleware');

router.get('/connect-cliente', auth, async (req, res) => {
  try {
    if (req.userRole !== 'client') return res.status(403).json({ erro: 'Apenas clientes' });
    const cliente = await prisma.client.findUnique({ where: { id: req.userId } });
    if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado' });
    const { getAuthUrl } = require('../services/googleCalendarService');
    const url = getAuthUrl(`client_${cliente.id}`);
    res.json({ url });
  } catch (error) {
    console.error("Erro em /google/connect-cliente:", error.message);
    res.status(500).json({ erro: 'Erro ao gerar link de conexão' });
  }
});

router.get('/status-cliente', auth, async (req, res) => {
  try {
    if (req.userRole !== 'client') return res.json({ connected: false });
    const cliente = await prisma.client.findUnique({ where: { id: req.userId } });
    res.json({ connected: !!cliente?.googleRefreshToken, email: cliente?.googleEmail || null });
  } catch (error) {
    res.json({ connected: false });
  }
});

router.post('/disconnect-cliente', auth, async (req, res) => {
  try {
    if (req.userRole !== 'client') return res.status(403).json({ erro: 'Apenas clientes' });
    const cliente = await prisma.client.findUnique({ where: { id: req.userId } });
    if (!cliente || !cliente.googleRefreshToken) return res.json({ message: 'Não conectado' });
    await prisma.client.update({
      where: { id: cliente.id },
      data: { googleRefreshToken: null, googleEmail: null }
    });
    res.json({ message: 'Google Calendar desconectado com sucesso!' });
  } catch (error) {
    console.error("Erro ao desconectar Google Calendar do cliente:", error.message);
    res.status(500).json({ erro: 'Erro ao desconectar Google Calendar' });
  }
});

module.exports = router;

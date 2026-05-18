const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { getAuthUrl, handleCallback, getOAuth2Client } = require('../services/googleCalendarService');
const auth = require('../middlewares/authMiddleware');
const { google } = require('googleapis');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const emailService = require('../services/emailService');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';
if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET não configurado. Defina a variável de ambiente JWT_SECRET.');
const JWT_SECRET = process.env.JWT_SECRET;

router.get('/debug-redirect', (req, res) => {
  res.json({
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || '(não definido)',
    BACKEND_URL: process.env.BACKEND_URL || '(não definido)',
    redirect_uri_em_uso: process.env.GOOGLE_REDIRECT_URI || `${process.env.BACKEND_URL || 'http://localhost:3333'}/api/google/callback`,
    FRONTEND_URL: process.env.FRONTEND_URL || '(não definido)',
  });
});

router.get('/connect', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ erro: 'Usuário não encontrado' });
    const url = getAuthUrl(`user_${user.id}`);
    res.json({ url });
  } catch (error) {
    console.error("Erro em /google/connect:", error.message);
    res.status(500).json({ erro: 'Erro ao gerar link de conexão' });
  }
});

router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) return res.redirect(`${FRONTEND_URL}/dashboard?google=no_code`);
    if (!state) return res.redirect(`${FRONTEND_URL}/dashboard?google=no_state`);

    // Login de cliente via Google (state = 'google_login')
    if (state === 'google_login') {
      const oauth2 = getOAuth2Client();
      const { tokens } = await oauth2.getToken(code);
      oauth2.setCredentials(tokens);
      const { google: googleApi } = require('googleapis');
      const oauth2api = googleApi.oauth2({ version: 'v2', auth: oauth2 });
      const userInfo = await oauth2api.userinfo.get();
      const { email, name } = userInfo.data;
      if (!email) return res.redirect(`${FRONTEND_URL}/login?google_login=error`);

      let cliente = await prisma.client.findUnique({ where: { email } });
      let primeiroAcesso = false;
      if (!cliente) {
        const senhaHash = require('bcryptjs').hashSync(Math.random().toString(36).slice(-8), 10);
        cliente = await prisma.client.create({ data: { nome: name || email.split('@')[0], email, telefone: '', senha: senhaHash } });
        primeiroAcesso = true;
        emailService.enviarEmailCadastro(cliente);
      }
      if (tokens.refresh_token) {
        await prisma.client.update({ where: { id: cliente.id }, data: { googleRefreshToken: tokens.refresh_token, googleEmail: email } });
      }
      const token = jwt.sign({ id: cliente.id, role: 'client', email: cliente.email }, JWT_SECRET, { expiresIn: '7d' });
      return res.redirect(`${FRONTEND_URL}/login?google_token=${token}&cliente_nome=${encodeURIComponent(cliente.nome)}&cliente_email=${encodeURIComponent(cliente.email)}&cliente_id=${cliente.id}&telefone=${cliente.telefone || ''}&primeiro_acesso=${primeiroAcesso}`);
    }

    // Conexão do Google Calendar (state = 'user_ID' ou 'client_ID')
    let frontendPath = '/dashboard';
    let dbModel = prisma.user;

    if (state.startsWith('client_')) {
      frontendPath = '/client/dashboard';
      dbModel = prisma.client;
    }

    const id = parseInt(state.replace(/^(user_|client_)/, ''));
    const record = await dbModel.findUnique({ where: { id } });
    if (!record) return res.redirect(`${FRONTEND_URL}${frontendPath}?google=user_not_found`);

    const result = await handleCallback(code);
    if (result.needsReconsent) {
      return res.redirect(`${FRONTEND_URL}${frontendPath}?google=no_refresh_token`);
    }

    await dbModel.update({
      where: { id },
      data: { googleRefreshToken: result.refreshToken, googleEmail: result.email },
    });

    res.redirect(`${FRONTEND_URL}${frontendPath}?google=connected`);
  } catch (error) {
    console.error("❌ Erro em /google/callback:", error.message, error.response?.data || '');
    const frontendPath = req.query.state?.startsWith('client_') ? '/client/dashboard' : '/dashboard';
    res.redirect(`${FRONTEND_URL}${frontendPath}?google=error`);
  }
});

router.get('/status', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    res.json({ connected: !!user?.googleRefreshToken, email: user?.googleEmail || null });
  } catch (error) {
    res.json({ connected: false });
  }
});

router.post('/disconnect', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || !user.googleRefreshToken) return res.json({ message: 'Não conectado' });
    await prisma.user.update({
      where: { id: user.id },
      data: { googleRefreshToken: null, googleEmail: null },
    });
    res.json({ message: 'Google Calendar desconectado com sucesso!' });
  } catch (error) {
    console.error("Erro ao desconectar Google Calendar:", error.message);
    res.status(500).json({ erro: 'Erro ao desconectar Google Calendar' });
  }
});

module.exports = router;

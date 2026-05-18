const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getOAuth2Client } = require('../services/googleCalendarService');
const { google } = require('googleapis');
const emailService = require('../services/emailService');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET não configurado. Defina a variável de ambiente JWT_SECRET.');
const JWT_SECRET = process.env.JWT_SECRET;

// Gera a URL de autorização do Google para login de clientes.
// O callback cai em /api/google/callback (mesmo URI registrado no Google Console).
router.get('/google', (req, res) => {
  const oauth2 = getOAuth2Client();
  const url = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/calendar',
    ],
    state: 'google_login'
  });
  res.json({ url });
});

// Callback para login de cliente via Google
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || state !== 'google_login') {
      return res.redirect(`${FRONTEND_URL}/login?google_login=error`);
    }

    const oauth2 = getOAuth2Client();
    const { tokens } = await oauth2.getToken(code);
    oauth2.setCredentials(tokens);

    const oauth2api = google.oauth2({ version: 'v2', auth: oauth2 });
    const userInfo = await oauth2api.userinfo.get();
    const { email, name } = userInfo.data;

    if (!email) {
      return res.redirect(`${FRONTEND_URL}/login?google_login=error`);
    }

    let cliente = await prisma.client.findUnique({ where: { email } });
    let primeiroAcesso = false;

    if (!cliente) {
      const senhaTemp = Math.random().toString(36).slice(-8);
      const senhaHash = await bcrypt.hash(senhaTemp, 10);
      cliente = await prisma.client.create({
        data: {
          nome: name || email.split('@')[0],
          email,
          telefone: '',
          senha: senhaHash
        }
      });
      primeiroAcesso = true;
      emailService.enviarEmailCadastro(cliente);
    }

    if (tokens.refresh_token) {
      await prisma.client.update({
        where: { id: cliente.id },
        data: { googleRefreshToken: tokens.refresh_token, googleEmail: email }
      });
    }

    const token = jwt.sign(
      { id: cliente.id, role: 'client', email: cliente.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.redirect(`${FRONTEND_URL}/login?google_token=${token}&cliente_nome=${encodeURIComponent(cliente.nome)}&cliente_email=${encodeURIComponent(cliente.email)}&cliente_id=${cliente.id}&telefone=${cliente.telefone || ''}&primeiro_acesso=${primeiroAcesso}`);
  } catch (error) {
    console.error("Erro no callback Google Login:", error.message);
    res.redirect(`${FRONTEND_URL}/login?google_login=error`);
  }
});

module.exports = router;

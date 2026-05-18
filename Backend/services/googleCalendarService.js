const { google } = require('googleapis');
const prisma = require('../config/database');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `${process.env.BACKEND_URL || 'http://localhost:3333'}/api/google/callback`;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

function getOAuth2Client() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

function getAuthUrl(state) {
  const oauth2 = getOAuth2Client();
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/calendar'
    ],
    state
  });
}

async function handleCallback(code) {
  const oauth2 = getOAuth2Client();
  const { tokens } = await oauth2.getToken(code);
  if (!tokens.refresh_token) {
    return { refreshToken: null, email: null, needsReconsent: true };
  }
  oauth2.setCredentials(tokens);
  const calendar = google.calendar({ version: 'v3', auth: oauth2 });
  let email = null;
  try {
    const res = await calendar.calendarList.get({ calendarId: 'primary' });
    email = res.data.summary || null;
  } catch (_) {}
  return { refreshToken: tokens.refresh_token, email, needsReconsent: false };
}

async function getAuthedCalendar(userOrClient) {
  if (!userOrClient || !userOrClient.googleRefreshToken) return null;
  const oauth2 = getOAuth2Client();
  oauth2.setCredentials({ refresh_token: userOrClient.googleRefreshToken });
  return google.calendar({ version: 'v3', auth: oauth2 });
}

async function criarEvento({ userId, titulo, descricao, dataInicio, dataFim }) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const calendar = await getAuthedCalendar(user);
    if (!calendar) return null;
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: titulo,
        description: descricao,
        start: { dateTime: dataInicio.toISOString(), timeZone: 'America/Bahia' },
        end: { dateTime: dataFim.toISOString(), timeZone: 'America/Bahia' }
      }
    });
    return response.data.id || null;
  } catch (error) {
    console.error("❌ Erro ao criar evento no Google Calendar:", error.message, error.response?.data || error.code || '');
    return null;
  }
}

async function deletarEvento({ userId, googleId }) {
  if (!googleId || !userId) return false;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const calendar = await getAuthedCalendar(user);
    if (!calendar) return false;
    await calendar.events.delete({ calendarId: 'primary', eventId: googleId });
    return true;
  } catch (error) {
    console.error("❌ Erro ao deletar evento no Google Calendar:", error.message, error.response?.data || '');
    return false;
  }
}

async function criarEventoCliente({ clientId, titulo, descricao, dataInicio, dataFim }) {
  try {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    const calendar = await getAuthedCalendar(client);
    if (!calendar) return null;
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: titulo,
        description: descricao,
        start: { dateTime: dataInicio.toISOString(), timeZone: 'America/Bahia' },
        end: { dateTime: dataFim.toISOString(), timeZone: 'America/Bahia' }
      }
    });
    return response.data.id || null;
  } catch (error) {
    console.error("❌ Erro ao criar evento no Google Calendar do cliente:", error.message, error.response?.data || '');
    return null;
  }
}

async function deletarEventoCliente({ clientId, googleId }) {
  if (!googleId || !clientId) return false;
  try {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    const calendar = await getAuthedCalendar(client);
    if (!calendar) return false;
    await calendar.events.delete({ calendarId: 'primary', eventId: googleId });
    return true;
  } catch (error) {
    console.error("❌ Erro ao deletar evento no Google Calendar do cliente:", error.message, error.response?.data || '');
    return false;
  }
}

module.exports = {
  getOAuth2Client,
  getAuthUrl,
  handleCallback,
  criarEvento,
  deletarEvento,
  criarEventoCliente,
  deletarEventoCliente
};

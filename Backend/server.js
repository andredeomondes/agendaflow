const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');

// Importação das Rotas Modularizadas
const authRoutes = require('./routes/authRoutes');
const clientAuthRoutes = require('./routes/clientAuthRoutes');
const clientRoutes = require('./routes/clientRoutes');
const spaceRoutes = require('./routes/spaceRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const googleRoutes = require('./routes/googleRoutes');
const googleClientRoutes = require('./routes/googleClientRoutes');
const googleAuthRoutes = require('./routes/googleAuthRoutes');
const bloqueioRoutes = require('./routes/bloqueioRoutes');
const configRoutes = require('./routes/configRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// Registro das Rotas
app.use('/api/auth', authRoutes);
app.use('/api/auth', clientAuthRoutes);
app.use('/api/clientes', clientRoutes);
app.use('/api/espacos', spaceRoutes);
app.use('/api/agendamentos', appointmentRoutes);
app.use('/api/google', googleRoutes);
app.use('/api/google', googleClientRoutes);
app.use('/api/auth', googleAuthRoutes);
app.use('/api/bloqueios', bloqueioRoutes);
app.use('/api/config', configRoutes);
app.use('/api/ai', aiRoutes);

// Rota de health check
app.get('/api/status', (req, res) => {
    res.json({ message: 'API do AgendaFlow rodando 100%!' });
});

// Diagnóstico de e-mail — remove após confirmar funcionamento
app.get('/api/test-email', async (req, res) => {
    const axios = require('axios');
    const apiKey = process.env.BREVO_API_KEY;
    const sender = process.env.EMAIL_USER || 'andredeomondes.dev@gmail.com';
    const dest = req.query.to || sender;
    const info = { sender, dest, hasApiKey: !!apiKey };

    if (!apiKey) return res.json({ ok: false, erro: 'BREVO_API_KEY ausente', info });

    try {
        await axios.post('https://api.brevo.com/v3/smtp/email', {
            sender: { name: 'AgendaFlow', email: sender },
            to: [{ email: dest }],
            subject: '✅ Teste AgendaFlow',
            htmlContent: '<p>E-mail de teste funcionando!</p>'
        }, {
            headers: { 'api-key': apiKey, 'Content-Type': 'application/json' }
        });
        return res.json({ ok: true, mensagem: `Enviado para ${dest}`, info });
    } catch (e) {
        const detail = e.response?.data || e.message;
        return res.json({ ok: false, erro: detail, info });
    }
});

// Diagnóstico: verifica email de um cliente no banco
app.get('/api/check-client-email', async (req, res) => {
    const prisma = require('./config/database');
    const { email } = req.query;
    if (!email) return res.json({ erro: 'Informe ?email=...' });
    const c = await prisma.client.findUnique({ where: { email } });
    if (!c) return res.json({ encontrado: false });
    return res.json({ encontrado: true, id: c.id, nome: c.nome, email: c.email });
});

// Testa o fluxo completo de email de confirmação com dados reais do banco
app.get('/api/test-booking-email', async (req, res) => {
    try {
        const prisma = require('./config/database');
        const emailService = require('./services/emailService');

        const clientes = await prisma.client.findMany({ take: 10 });
        const cliente = clientes.find(c => c.email);
        const espaco = await prisma.space.findFirst();
        const admin = await prisma.user.findFirst({ orderBy: { id: 'asc' } });

        if (!cliente) return res.json({ ok: false, erro: 'Nenhum cliente com email encontrado no banco' });
        if (!espaco) return res.json({ ok: false, erro: 'Nenhum espaço encontrado no banco' });

        const dest = req.query.to || cliente.email;
        const agendamentoFake = {
            id: 0,
            dataInicio: new Date(Date.now() + 86400000),
            dataFim: new Date(Date.now() + 86400000 + 3600000)
        };

        await emailService.enviarEmailConfirmacao(
            { ...cliente, email: dest },
            agendamentoFake,
            espaco,
            admin?.email
        );

        return res.json({ ok: true, mensagem: `Email de confirmação enviado para ${dest}`, cliente: cliente.nome, espaco: espaco.nome, adminEmail: admin?.email });
    } catch (e) {
        return res.json({ ok: false, erro: e.message });
    }
});

// WhatsApp e schedulers só rodam localmente (não em serverless)
if (!process.env.VERCEL) {
    const whatsappRoutes = require('./routes/whatsappRoutes');
    const whatsapp = require('./services/whatsappService');
    const startLembreteScheduler = require('./services/lembreteScheduler');
    const fs = require('fs');

    app.use('/api/whatsapp', whatsappRoutes);
    startLembreteScheduler();

    if (fs.existsSync(path.join(__dirname, '.whatsapp-session'))) {
        whatsapp.iniciarConexao().catch(e => console.error('[WhatsApp] Erro ao auto-reconectar:', e.message));
    }

    const PORT = process.env.PORT || 3333;
    app.listen(PORT, () => {
        console.log(`🚀 AGENDAFLOW V6 RODANDO NA PORTA ${PORT}`);
    });
}

module.exports = app;
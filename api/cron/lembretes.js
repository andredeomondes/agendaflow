const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', 'Backend', '.env') });
const prisma = require('../../Backend/config/database');
const { enviarLembreteProximoAgendamento } = require('../../Backend/services/emailService');

async function enviarLembrete(ag, tipo) {
    const jaEnviado = await prisma.lembrete.findFirst({
        where: { appointmentId: ag.id, tipo, status: 'enviado' }
    });
    if (jaEnviado) return false;
    if (ag.client.email) {
        await enviarLembreteProximoAgendamento(ag.client, ag, ag.space);
    }
    await prisma.lembrete.create({
        data: { appointmentId: ag.id, tipo, status: 'enviado', enviadoEm: new Date() }
    });
    return true;
}

async function buscarAgendamentos(minInicio, minFim) {
    const agora = new Date();
    const inicio = new Date(agora.getTime() + minInicio * 60 * 1000);
    const fim = new Date(agora.getTime() + minFim * 60 * 1000);
    return prisma.appointment.findMany({
        where: {
            dataInicio: { gte: inicio, lte: fim },
            status: { in: ['Agendado', 'Confirmado'] }
        },
        include: { client: true, space: true }
    });
}

module.exports = async (req, res) => {
    const authHeader = req.headers.authorization;
    const expectedToken = process.env.CRON_SECRET;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('Rodando cron de lembretes (1dia + 1hora + 10min)...');

    try {
        const resultados = { '1dia': 0, '1hora': 0, '10min': 0 };

        const [ags1dia, ags1hora, ags10min] = await Promise.all([
            buscarAgendamentos(23 * 60, 25 * 60),
            buscarAgendamentos(55, 65),
            buscarAgendamentos(8, 12),
        ]);

        for (const ag of ags1dia) if (await enviarLembrete(ag, '1dia')) resultados['1dia']++;
        for (const ag of ags1hora) if (await enviarLembrete(ag, '1hora')) resultados['1hora']++;
        for (const ag of ags10min) if (await enviarLembrete(ag, '10min')) resultados['10min']++;

        await prisma.$disconnect();
        console.log('[Lembretes] Enviados:', resultados);
        res.json({ success: true, enviados: resultados });
    } catch (error) {
        console.error('Erro no cron de lembretes:', error);
        await prisma.$disconnect();
        res.status(500).json({ error: error.message });
    }
};

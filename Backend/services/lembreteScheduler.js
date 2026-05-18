const cron = require('node-cron');
const prisma = require('../config/database');
const { enviarLembreteProximoAgendamento } = require('./emailService');
const whatsapp = require('./whatsappService');

async function enviarLembrete(ag, tipo) {
    const enviado = await prisma.lembrete.findFirst({
        where: { appointmentId: ag.id, tipo, status: 'enviado' }
    });
    if (enviado) return;

    let ok = false;
    if (ag.client.email) {
        try {
            await enviarLembreteProximoAgendamento(ag.client, ag, ag.space, tipo);
            ok = true;
        } catch (e) {
            console.error(`[Lembrete] Erro ao enviar email (${tipo}) para ${ag.client.email}:`, e.message);
        }
    }

    if (ag.client.telefone) {
        whatsapp.enviarMensagem(ag.client.telefone, whatsapp.mensagemLembrete(ag.client, ag, ag.space))
            .then(sent => console.log(`[Lembrete] WhatsApp (${tipo}) para ${ag.client.nome}: ${sent ? 'enviado' : 'falhou'}`))
            .catch(() => {});
        ok = true;
    }

    if (!ok) return;

    await prisma.lembrete.create({
        data: { appointmentId: ag.id, tipo, status: 'enviado', enviadoEm: new Date() }
    });
    console.log(`[Lembrete] ${tipo} registrado para agendamento #${ag.id} (${ag.client.nome})`);
}

async function buscarAgendamentos(minInicio, minFim) {
    const agora = new Date();
    const inicio = new Date(agora.getTime() + minInicio * 60 * 1000);
    const fim = new Date(agora.getTime() + minFim * 60 * 1000);
    console.log(`[Lembrete] Buscando agendamentos entre ${inicio.toISOString()} e ${fim.toISOString()} (agora UTC: ${agora.toISOString()})`);
    return prisma.appointment.findMany({
        where: {
            dataInicio: { gte: inicio, lte: fim },
            status: { in: ['Agendado', 'Confirmado'] }
        },
        include: { client: true, space: true }
    });
}

function startLembreteScheduler() {
    // 1 dia antes — roda diariamente às 9h Brasília (12h UTC)
    cron.schedule('0 12 * * *', async () => {
        console.log('[Lembrete] Verificando agendamentos de amanhã...');
        try {
            const ags = await buscarAgendamentos(23 * 60, 25 * 60);
            console.log(`[Lembrete] 1dia: ${ags.length} agendamento(s)`);
            for (const ag of ags) await enviarLembrete(ag, '1dia');
        } catch (e) {
            console.error('[Lembrete] Erro no job 1dia:', e.message);
        }
    });

    // 1 hora antes — roda todo início de hora
    cron.schedule('0 * * * *', async () => {
        console.log('[Lembrete] Verificando agendamentos em ~1h...');
        try {
            const ags = await buscarAgendamentos(55, 65);
            console.log(`[Lembrete] 1hora: ${ags.length} agendamento(s)`);
            for (const ag of ags) await enviarLembrete(ag, '1hora');
        } catch (e) {
            console.error('[Lembrete] Erro no job 1hora:', e.message);
        }
    });

    // 10 minutos antes — roda a cada 10min
    cron.schedule('*/10 * * * *', async () => {
        try {
            const ags = await buscarAgendamentos(8, 12);
            if (ags.length > 0) {
                console.log(`[Lembrete] 10min: ${ags.length} agendamento(s)`);
                for (const ag of ags) await enviarLembrete(ag, '10min');
            }
        } catch (e) {
            console.error('[Lembrete] Erro no job 10min:', e.message);
        }
    });

    console.log('✅ Scheduler de lembretes configurado (1dia @ 9h | 1hora @ :00 | 10min @ */10).');
}

module.exports = startLembreteScheduler;

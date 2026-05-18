const { makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');
const pino = require('pino');

const SESSION_DIR = path.join(__dirname, '../.whatsapp-session');

let sock = null;
let qrBase64 = null;
let connectionStatus = 'disconnected'; // 'disconnected' | 'qr' | 'connecting' | 'connected'
let reconnectTimer = null;

function getStatus() {
    return { status: connectionStatus, qr: connectionStatus === 'qr' ? qrBase64 : null };
}

async function iniciarConexao() {
    if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

    if (sock) {
        try { sock.end(); } catch (_) {}
        sock = null;
    }

    connectionStatus = 'connecting';
    qrBase64 = null;

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['AgendaFlow', 'Chrome', '1.0'],
        syncFullHistory: false,
        connectTimeoutMs: 30000,
        retryRequestDelayMs: 500,
        maxMsgRetryCount: 2,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
        if (qr) {
            connectionStatus = 'qr';
            try { qrBase64 = await qrcode.toDataURL(qr); } catch (_) {}
        }

        if (connection === 'open') {
            connectionStatus = 'connected';
            qrBase64 = null;
            console.log('[WhatsApp] Conectado com sucesso!');
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.log('[WhatsApp] Conexão encerrada. Motivo:', reason);

            const permanente = reason === DisconnectReason.loggedOut || reason === 405 || reason === 403;

            if (permanente) {
                connectionStatus = 'disconnected';
                qrBase64 = null;
                sock = null;
                // Remove sessão para forçar novo QR
                fs.rmSync(SESSION_DIR, { recursive: true, force: true });
            } else {
                connectionStatus = 'disconnected';
                // Reconecta automaticamente após 5s
                if (reconnectTimer) clearTimeout(reconnectTimer);
                reconnectTimer = setTimeout(() => iniciarConexao(), 5000);
            }
        }
    });
}

async function desconectar() {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    if (sock) {
        try { await sock.logout(); } catch (_) {}
        sock = null;
    }
    connectionStatus = 'disconnected';
    qrBase64 = null;
    fs.rmSync(SESSION_DIR, { recursive: true, force: true });
}

function formatarJid(telefone) {
    const digits = telefone.replace(/\D/g, '');
    if (digits.startsWith('55') && digits.length >= 12) return digits + '@s.whatsapp.net';
    if (digits.length === 11 || digits.length === 10) return '55' + digits + '@s.whatsapp.net';
    return digits + '@s.whatsapp.net';
}

async function enviarMensagem(telefone, texto) {
    if (connectionStatus !== 'connected' || !sock) {
        console.warn(`[WhatsApp] Não conectado (status: ${connectionStatus}). Msg para ${telefone} ignorada.`);
        return false;
    }
    try {
        const jid = formatarJid(telefone);
        console.log(`[WhatsApp] Tentando enviar para ${jid}...`);

        // Verifica se o número está registrado no WhatsApp
        const [result] = await sock.onWhatsApp(jid);
        if (!result?.exists) {
            console.warn(`[WhatsApp] ⚠️ Número ${jid} não encontrado no WhatsApp.`);
            return false;
        }

        await sock.sendMessage(result.jid, { text: texto });
        console.log(`[WhatsApp] ✅ Mensagem enviada para ${result.jid}`);
        return true;
    } catch (e) {
        console.error(`[WhatsApp] ❌ Erro ao enviar para ${telefone}:`, e.message, e.stack?.split('\n')[1]);
        return false;
    }
}

function mensagemConfirmacao(cliente, agendamento, espaco) {
    const inicio = new Date(agendamento.dataInicio);
    const fim = new Date(agendamento.dataFim);
    const data = inicio.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
    const horario = `${inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} às ${fim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    return `✅ *Agendamento Confirmado!*\n\nOlá, *${cliente.nome}*!\n\n📍 *Espaço:* ${espaco.nome}\n📅 *Data:* ${data}\n🕐 *Horário:* ${horario}\n\nPara remarcar ou cancelar, acesse o portal do AgendaFlow.\n\n_AgendaFlow — Sua agenda inteligente_`;
}

function mensagemCancelamento(cliente, agendamento, espaco) {
    const inicio = new Date(agendamento.dataInicio);
    const data = inicio.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
    const horario = inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `❌ *Agendamento Cancelado*\n\nOlá, *${cliente.nome}*.\n\nSeu agendamento foi cancelado:\n\n📍 *Espaço:* ${espaco.nome}\n📅 *Data:* ${data}\n🕐 *Horário:* ${horario}\n\nQualquer dúvida, entre em contato.\n\n_AgendaFlow — Sua agenda inteligente_`;
}

function mensagemLembrete(cliente, agendamento, espaco) {
    const inicio = new Date(agendamento.dataInicio);
    const fim = new Date(agendamento.dataFim);
    const horario = `${inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} às ${fim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    return `🔔 *Lembrete de Agendamento*\n\nOlá, *${cliente.nome}*!\n\nSeu compromisso está chegando:\n\n📍 *Espaço:* ${espaco.nome}\n🕐 *Hoje às:* ${horario}\n\n_AgendaFlow — Sua agenda inteligente_`;
}

function mensagemAdminNovoAgendamento(cliente, agendamento, espaco) {
    const inicio = new Date(agendamento.dataInicio);
    const fim = new Date(agendamento.dataFim);
    const data = inicio.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
    const horario = `${inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} às ${fim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    return `📅 *Novo Agendamento!*\n\n👤 *Cliente:* ${cliente.nome}\n📞 *Telefone:* ${cliente.telefone || 'não informado'}\n📧 *Email:* ${cliente.email}\n\n📍 *Espaço:* ${espaco.nome}\n📅 *Data:* ${data}\n🕐 *Horário:* ${horario}\n\n_AgendaFlow — Sua agenda inteligente_`;
}

function mensagemAdminCancelamento(cliente, agendamento, espaco) {
    const inicio = new Date(agendamento.dataInicio);
    const data = inicio.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
    const horario = inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `❌ *Agendamento Cancelado*\n\n👤 *Cliente:* ${cliente.nome}\n📞 *Telefone:* ${cliente.telefone || 'não informado'}\n\n📍 *Espaço:* ${espaco.nome}\n📅 *Data:* ${data}\n🕐 *Horário:* ${horario}\n\n_AgendaFlow — Sua agenda inteligente_`;
}

async function enviarMensagemAdmin(texto) {
    if (connectionStatus !== 'connected' || !sock?.user?.id) return false;
    try {
        await sock.sendMessage(sock.user.id, { text: texto });
        console.log('[WhatsApp] Notificação enviada para admin');
        return true;
    } catch (e) {
        console.error('[WhatsApp] Erro ao notificar admin:', e.message);
        return false;
    }
}

module.exports = {
    iniciarConexao,
    desconectar,
    enviarMensagem,
    enviarMensagemAdmin,
    getStatus,
    mensagemConfirmacao,
    mensagemCancelamento,
    mensagemLembrete,
    mensagemAdminNovoAgendamento,
    mensagemAdminCancelamento,
};

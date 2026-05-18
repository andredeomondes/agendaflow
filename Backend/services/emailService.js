const axios = require('axios');

if (!process.env.BREVO_API_KEY) {
  console.warn('[Email] ⚠️  BREVO_API_KEY não configurado.');
} else {
  console.log('[Email] ✅ Brevo API configurado.');
}

const senderEmail = process.env.EMAIL_USER || 'andredeomondes.dev@gmail.com';
const senderName = 'AgendaFlow';

async function enviar({ to, subject, html }) {
  if (!process.env.BREVO_API_KEY) {
    console.error('[Email] ❌ BREVO_API_KEY ausente, email não enviado para', to);
    return;
  }
  console.log(`[Email] Enviando para ${to} | assunto: ${subject}`);
  try {
    const resp = await axios.post('https://api.brevo.com/v3/smtp/email', {
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html
    }, {
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    console.log(`[Email] ✅ Enviado para ${to} | messageId: ${resp.data?.messageId}`);
  } catch (e) {
    console.error(`[Email] ❌ Falha ao enviar para ${to}:`, e.response?.data || e.message);
    throw e;
  }
}

const BR_TZ = 'America/Bahia';

function formatDate(date) {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: BR_TZ
  });
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: BR_TZ
  });
}

function gerarTemplate({ titulo, cor, saudacao, rodape, conteudo }) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titulo} — AgendaFlow</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Inter','Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <tr>
            <td style="background:${cor};border-radius:16px 16px 0 0;padding:32px 40px 24px;text-align:center;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:12px;">
                    <svg width="48" height="48" viewBox="0 0 32 32" fill="none" style="display:inline-block;">
                      <rect x="2" y="6" width="28" height="22" rx="4" stroke="white" stroke-width="2.5" fill="none" opacity="0.9"/>
                      <path d="M8 2V10M24 2V10M6 14H26M6 20H18" stroke="white" stroke-width="2.3" stroke-linecap="round" opacity="0.9"/>
                      <circle cx="24" cy="24" r="6" fill="white" opacity="0.95"/>
                      <path d="M22 24L23.5 25.5L26 22" stroke="#0a0a0f" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">
                    Agenda<span style="color:rgba(255,255,255,0.7);">Flow</span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:8px;">
                    <span style="display:inline-block;width:32px;height:2px;background:rgba(255,255,255,0.25);border-radius:1px;"></span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:12px;color:rgba(255,255,255,0.92);font-size:17px;font-weight:600;">
                    ${titulo}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background:#1a1a2e;padding:36px 40px;">
              ${saudacao ? `
              <p style="margin:0 0 24px;color:#e1e1e6;font-size:16px;line-height:1.7;">
                ${saudacao}
              </p>` : ''}
              ${conteudo}
            </td>
          </tr>

          <tr>
            <td style="background:linear-gradient(135deg,${cor},rgba(26,26,46,0.95));border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:rgba(255,255,255,0.5);font-size:13px;line-height:1.6;">
                <strong style="color:rgba(255,255,255,0.7);">AgendaFlow</strong> — Sua agenda inteligente<br/>
                <span style="color:rgba(255,255,255,0.35);font-size:12px;">Este é um e-mail automático, não responda.</span>
              </p>
              ${rodape ? `<p style="margin:8px 0 0;color:rgba(255,255,255,0.4);font-size:12px;">${rodape}</p>` : ''}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function cardDetalhes(espaco, inicio, fim, extraRows) {
  const rows = `
    <tr>
      <td style="padding:0 0 16px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width:50%;padding:0 8px 0 0;vertical-align:top;">
              <span style="color:#a0a0b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Data</span>
              <p style="margin:6px 0 0;color:#e1e1e6;font-size:15px;font-weight:600;">${formatDate(inicio)}</p>
            </td>
            <td style="width:50%;padding:0 0 0 8px;vertical-align:top;">
              <span style="color:#a0a0b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Horário</span>
              <p style="margin:6px 0 0;color:#e1e1e6;font-size:15px;font-weight:600;">${formatTime(inicio)} — ${formatTime(fim)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 0 4px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:8px 0;border-top:1px solid rgba(255,255,255,0.06);">
            <span style="color:#a0a0b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Espaço</span>
            <p style="margin:4px 0 0;color:#e1e1e6;font-size:16px;font-weight:700;">${espaco.nome}</p>
          </td></tr>
        </table>
      </td>
    </tr>
    ${extraRows || ''}`;
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px;margin:0 0 24px;">
    ${rows}
  </table>`;
}

async function enviarEmailCadastro(cliente) {
  try {
    await enviar({
      to: cliente.email,
      subject: `Bem-vindo ao AgendaFlow, ${cliente.nome}!`,
      html: gerarTemplate({
        titulo: 'Cadastro Realizado',
        cor: '#8257e5',
        saudacao: `Bem-vindo ao <strong style="color:#a78bfa;">AgendaFlow</strong>, ${cliente.nome}!`,
        conteudo: `
          <p style="color:#a0a0b8;font-size:15px;line-height:1.7;margin:0 0 24px;">
            Seu cadastro foi realizado com sucesso. Agora você pode agendar horários
            de forma rápida e prática.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px 20px;margin:0 0 24px;">
            <tr><td style="padding:6px 0;">
              <span style="color:#a0a0b8;font-size:12px;">Nome</span>
              <p style="margin:2px 0;color:#e1e1e6;font-size:15px;font-weight:600;">${cliente.nome}</p>
            </td></tr>
            <tr><td style="padding:6px 0;">
              <span style="color:#a0a0b8;font-size:12px;">Email</span>
              <p style="margin:2px 0;color:#e1e1e6;font-size:15px;font-weight:600;">${cliente.email}</p>
            </td></tr>
          </table>
          <p style="color:#a0a0b8;font-size:14px;line-height:1.6;margin:0;">
            Acesse sua conta e comece a agendar!<br/>
            Qualquer dúvida, entre em contato.
          </p>`
      })
    });
    console.log(`Boas-vindas enviado para ${cliente.email}`);
  } catch (error) {
    console.error("Erro email cadastro:", error.message);
  }
}

async function enviarEmailConfirmacao(cliente, agendamento, espaco, adminEmail) {
  console.log(`[Email] enviarEmailConfirmacao chamado — cliente.email=${cliente.email}, adminEmail=${adminEmail}`);
  const inicio = new Date(agendamento.dataInicio);
  const fim = new Date(agendamento.dataFim);

  try {
    await enviar({
      to: cliente.email,
      subject: `Agendamento Confirmado — ${espaco.nome}`,
      html: gerarTemplate({
        titulo: 'Agendamento Confirmado!',
        cor: '#04d361',
        saudacao: `Olá <strong style="color:#34d399;">${cliente.nome}</strong>, seu horário está garantido!`,
        conteudo: `
          ${cardDetalhes(espaco, inicio, fim)}
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="padding:4px 0 12px;">
                <span style="display:inline-block;background:rgba(4,211,97,0.12);color:#04d361;font-size:12px;font-weight:700;padding:6px 18px;border-radius:20px;border:1px solid rgba(4,211,97,0.2);letter-spacing:0.5px;text-transform:uppercase;">
                  Status: Agendado
                </span>
              </td>
            </tr>
          </table>
          <p style="color:#a0a0b8;font-size:14px;line-height:1.6;margin:0;">
            Para remarcar ou cancelar, acesse o portal do cliente no AgendaFlow.
          </p>`
      })
    });
    console.log(`Confirmacao enviada para ${cliente.email}`);
  } catch (error) {
    console.error("Erro email confirmacao cliente:", error.message);
  }

  if (adminEmail) {
    try {
      await enviar({
        to: adminEmail,
        subject: `Novo Agendamento — ${cliente.nome} — ${espaco.nome}`,
        html: gerarTemplate({
          titulo: 'Novo Agendamento',
          cor: '#8257e5',
          saudacao: `Novo agendamento criado por <strong style="color:#a78bfa;">${cliente.nome}</strong>.`,
          conteudo: `
            ${cardDetalhes(espaco, inicio, fim, `
            <tr>
              <td style="padding:12px 0 0;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.04);border-radius:8px;padding:12px 16px;">
                  <tr><td style="padding:3px 0;"><span style="color:#a0a0b8;font-size:12px;">Telefone</span><p style="margin:1px 0;color:#e1e1e6;font-size:14px;">${cliente.telefone}</p></td></tr>
                  <tr><td style="padding:3px 0;"><span style="color:#a0a0b8;font-size:12px;">Email</span><p style="margin:1px 0;color:#e1e1e6;font-size:14px;">${cliente.email}</p></td></tr>
                </table>
              </td>
            </tr>`)}
          </table>`
        })
      });
      console.log(`Notificacao enviada para administrador (${adminEmail})`);
    } catch (error) {
      console.error("Erro email confirmacao admin:", error.message);
    }
  }
}

async function enviarEmailCancelamento(cliente, agendamento, espaco, adminEmail) {
  const inicio = new Date(agendamento.dataInicio);
  const fim = new Date(agendamento.dataFim);

  try {
    await enviar({
      to: cliente.email,
      subject: `Agendamento Cancelado — ${espaco.nome}`,
      html: gerarTemplate({
        titulo: 'Agendamento Cancelado',
        cor: '#ef4444',
        saudacao: `Olá <strong style="color:#f87171;">${cliente.nome}</strong>, seu agendamento foi cancelado.`,
        conteudo: `
          ${cardDetalhes(espaco, inicio, fim)}
          <p style="color:#a0a0b8;font-size:14px;line-height:1.6;margin:0;">
            Se precisar de ajuda ou quiser remarcar, acesse o portal do cliente
            no AgendaFlow.
          </p>`
      })
    });
    console.log(`Cancelamento enviado para ${cliente.email}`);
  } catch (error) {
    console.error("Erro email cancelamento cliente:", error.message);
  }

  if (adminEmail) {
    try {
      await enviar({
        to: adminEmail,
        subject: `Cancelamento — ${cliente.nome} — ${espaco.nome}`,
        html: gerarTemplate({
          titulo: 'Cancelamento',
          cor: '#ef4444',
          saudacao: `Agendamento de <strong style="color:#f87171;">${cliente.nome}</strong> foi cancelado.`,
          conteudo: `
            ${cardDetalhes(espaco, inicio, fim, `
            <tr>
              <td style="padding:12px 0 0;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.04);border-radius:8px;padding:12px 16px;">
                  <tr><td style="padding:3px 0;"><span style="color:#a0a0b8;font-size:12px;">Cliente</span><p style="margin:1px 0;color:#e1e1e6;font-size:14px;font-weight:600;">${cliente.nome}</p></td></tr>
                  <tr><td style="padding:3px 0;"><span style="color:#a0a0b8;font-size:12px;">Telefone</span><p style="margin:1px 0;color:#e1e1e6;font-size:14px;">${cliente.telefone}</p></td></tr>
                  <tr><td style="padding:3px 0;"><span style="color:#a0a0b8;font-size:12px;">Email</span><p style="margin:1px 0;color:#e1e1e6;font-size:14px;">${cliente.email}</p></td></tr>
                </table>
              </td>
            </tr>`)}
          </table>`
        })
      });
      console.log(`Notificacao de cancelamento enviada para administrador (${adminEmail})`);
    } catch (error) {
      console.error("Erro email cancelamento admin:", error.message);
    }
  }
}

async function enviarLembreteProximoAgendamento(cliente, agendamento, espaco, tipo = '1hora') {
  const inicio = new Date(agendamento.dataInicio);
  const fim = new Date(agendamento.dataFim);

  const configs = {
    '1dia': {
      cor: '#8257e5',
      badge: 'Lembrete — Amanhã',
      titulo: 'Seu compromisso é amanhã!',
      saudacao: `Olá <strong style="color:#a78bfa;">${cliente.nome}</strong>, você tem um agendamento <strong style="color:#a78bfa;">amanhã</strong>. Prepare-se com antecedência!`,
      extra: `<table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(130,87,229,0.08);border:1px solid rgba(130,87,229,0.2);border-radius:12px;padding:16px 20px;margin:0 0 20px;">
        <tr><td>
          <p style="margin:0 0 8px;color:#a78bfa;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;">✅ Dicas para amanhã</p>
          <p style="margin:0 0 5px;color:#e1e1e6;font-size:14px;">📌 Confirme o local e o acesso ao espaço</p>
          <p style="margin:0 0 5px;color:#e1e1e6;font-size:14px;">🧠 Revise o que precisa levar ou preparar</p>
          <p style="margin:0;color:#e1e1e6;font-size:14px;">🚗 Planeje sua chegada com folga</p>
        </td></tr>
      </table>`
    },
    '1hora': {
      cor: '#f59e0b',
      badge: '⏰ Em 1 hora!',
      titulo: 'Seu compromisso começa em 1 hora!',
      saudacao: `Olá <strong style="color:#fbbf24;">${cliente.nome}</strong>, seu compromisso começa em <strong style="color:#fbbf24;">1 hora</strong>. Está tudo pronto?`,
      extra: `<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
        <tr><td align="center">
          <div style="display:inline-block;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:12px 32px;">
            <p style="margin:0;color:#fbbf24;font-size:32px;font-weight:800;line-height:1;">01:00</p>
            <p style="margin:4px 0 0;color:#a0a0b8;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">hora restante</p>
          </div>
        </td></tr>
      </table>`
    },
    '10min': {
      cor: '#ef4444',
      badge: '🚨 Agora em 10 minutos!',
      titulo: 'Seu compromisso começa em 10 minutos!',
      saudacao: `Olá <strong style="color:#f87171;">${cliente.nome}</strong>, seu compromisso começa em <strong style="color:#f87171;">10 minutos</strong>. É agora!`,
      extra: `<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
        <tr><td align="center">
          <div style="display:inline-block;background:rgba(239,68,68,0.12);border:2px solid rgba(239,68,68,0.4);border-radius:12px;padding:12px 32px;">
            <p style="margin:0;color:#f87171;font-size:36px;font-weight:900;line-height:1;">10:00</p>
            <p style="margin:4px 0 0;color:#a0a0b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;">minutos restantes</p>
          </div>
        </td></tr>
      </table>`
    }
  };

  const cfg = configs[tipo] || configs['1hora'];
  const subjects = { '1dia': `Amanhã você tem agendamento — ${espaco.nome}`, '1hora': `Em 1 hora: ${espaco.nome} — AgendaFlow`, '10min': `🔔 10 minutos! ${espaco.nome} começa agora — AgendaFlow` };

  try {
    await enviar({
      to: cliente.email,
      subject: subjects[tipo] || `Lembrete — ${espaco.nome} — AgendaFlow`,
      html: gerarTemplate({
        titulo: cfg.titulo,
        cor: cfg.cor,
        saudacao: cfg.saudacao,
        conteudo: `
          ${cardDetalhes(espaco, inicio, fim)}
          ${cfg.extra}
          <p style="color:#a0a0b8;font-size:13px;line-height:1.6;margin:0;text-align:center;">
            Precisa remarcar ou cancelar? Acesse o portal do cliente no AgendaFlow.
          </p>`
      })
    });
    console.log(`Lembrete (${tipo}) enviado para ${cliente.email}`);
  } catch (error) {
    console.error(`Erro email lembrete (${tipo}):`, error.message);
  }
}

async function enviarEmailVerificacao(cliente, token) {
  const link = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/confirmar-email?token=${token}`;
  try {
    await enviar({
      to: cliente.email,
      subject: `Confirme seu email — AgendaFlow`,
      html: gerarTemplate({
        titulo: 'Confirme seu Email',
        cor: '#8257e5',
        saudacao: `Olá <strong style="color:#a78bfa;">${cliente.nome}</strong>, quase lá!`,
        conteudo: `
          <p style="color:#a0a0b8;font-size:15px;line-height:1.7;margin:0 0 24px;">
            Clique no botão abaixo para confirmar seu email e ativar sua conta.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="padding:8px 0 24px;">
                <a href="${link}" target="_blank"
                   style="display:inline-block;background:#8257e5;color:#ffffff;font-size:16px;font-weight:700;padding:14px 40px;border-radius:12px;text-decoration:none;letter-spacing:0.3px;">
                  Confirmar Email
                </a>
              </td>
            </tr>
          </table>
          <p style="color:#a0a0b8;font-size:13px;line-height:1.6;margin:0;">
            Se o botão não funcionar, copie e cole este link no navegador:<br/>
            <span style="color:#a78bfa;font-size:12px;word-break:break-all;">${link}</span>
          </p>
          <p style="color:#6b7280;font-size:12px;line-height:1.5;margin:16px 0 0;">
            Este link expira em 24 horas.
          </p>`
      })
    });
    console.log(`Verificacao enviada para ${cliente.email}`);
  } catch (error) {
    console.error("Erro email verificacao:", error.message);
  }
}

module.exports = {
  enviarEmailCadastro,
  enviarEmailVerificacao,
  enviarEmailConfirmacao,
  enviarEmailCancelamento,
  enviarLembreteProximoAgendamento
};

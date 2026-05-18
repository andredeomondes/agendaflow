const prisma = require('../config/database');

async function montarContextoAdmin(userId) {
    const hoje = new Date();
    const inicioHoje = new Date(hoje);
    inicioHoje.setHours(0, 0, 0, 0);
    const fimHoje = new Date(hoje);
    fimHoje.setHours(23, 59, 59, 999);

    const [agendamentosHoje, espacos, clientes, config] = await Promise.all([
        prisma.appointment.findMany({
            where: { dataInicio: { gte: inicioHoje, lte: fimHoje }, status: { not: 'Cancelado' } },
            include: { client: true, space: true },
            orderBy: { dataInicio: 'asc' }
        }),
        prisma.space.findMany({ orderBy: { id: 'asc' } }),
        prisma.client.findMany({ take: 10, orderBy: { createdAt: 'desc' } }),
        prisma.configAgenda.findFirst()
    ]);

    const diasNomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    const diasLegivel = config
        ? config.diasFuncionamento.split(',').map(d => diasNomes[parseInt(d)]).join(', ')
        : 'Nao configurado';

    return `
DATA: ${hoje.toLocaleDateString('pt-BR')} (${hoje.toLocaleDateString('pt-BR', { weekday: 'long' })}) | HORA: ${hoje.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}

AGENDA HOJE (${agendamentosHoje.length} agendamentos):
${agendamentosHoje.map(a => `  #${a.id} | ${a.client.nome} | ${a.space.nome} | ${new Date(a.dataInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}-${new Date(a.dataFim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} | ${a.status}`).join('\n') || '  Nenhum agendamento hoje'}

ESPACOS (${espacos.length}):
${espacos.map(e => `  ID:${e.id} | ${e.nome} | cap:${e.capacidade || 1} | ${e.disponivel ? 'ativo' : 'inativo'}`).join('\n') || '  Nenhum espaco'}

CLIENTES RECENTES (${clientes.length}):
${clientes.map(c => `  ID:${c.id} | ${c.nome} | ${c.email} | ${c.telefone || 'sem tel'}`).join('\n') || '  Nenhum cliente'}

CONFIGURACAO DA AGENDA:
${config
    ? `  Horario: ${config.horaInicio} as ${config.horaFim} | Duracao: ${config.duracaoAtendimento}min | Intervalo: ${config.intervaloEntreAtend}min\n  Dias: ${diasLegivel} (numeros: ${config.diasFuncionamento})`
    : '  Nao configurada — use atualizar_configuracao para configurar'}
`.trim();
}

async function montarContextoCliente(clientId) {
    const hoje = new Date();
    const cliente = await prisma.client.findUnique({ where: { id: clientId } });
    if (!cliente) return '';

    const [agendamentos, espacos, config] = await Promise.all([
        prisma.appointment.findMany({
            where: { clientId },
            include: { space: true },
            orderBy: { dataInicio: 'desc' },
            take: 20
        }),
        prisma.space.findMany({ where: { disponivel: true }, orderBy: { id: 'asc' } }),
        prisma.configAgenda.findFirst()
    ]);

    const ativos = agendamentos.filter(a => a.status !== 'Cancelado' && a.status !== 'Concluído');
    const historico = agendamentos.filter(a => a.status === 'Cancelado' || a.status === 'Concluído');

    const diasNomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    const diasLegivel = config
        ? config.diasFuncionamento.split(',').map(d => diasNomes[parseInt(d)]).join(', ')
        : 'Nao configurado';

    return `
DATA: ${hoje.toLocaleDateString('pt-BR')} (${hoje.toLocaleDateString('pt-BR', { weekday: 'long' })}) | HORA: ${hoje.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}

SEU PERFIL:
  ID:${cliente.id} | ${cliente.nome} | ${cliente.email} | ${cliente.telefone || 'sem telefone'}

SEUS AGENDAMENTOS ATIVOS (${ativos.length}):
${ativos.map(a => `  #${a.id} | ${a.space.nome} | ${new Date(a.dataInicio).toLocaleDateString('pt-BR')} ${new Date(a.dataInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}-${new Date(a.dataFim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} | ${a.status}`).join('\n') || '  Nenhum agendamento ativo'}

HISTORICO (${historico.length}):
${historico.slice(0, 5).map(a => `  #${a.id} | ${a.space.nome} | ${new Date(a.dataInicio).toLocaleDateString('pt-BR')} | ${a.status}`).join('\n') || '  Nenhum'}

ESPACOS DISPONIVEIS PARA AGENDAR (${espacos.length}):
${espacos.map(e => `  ID:${e.id} | ${e.nome} | capacidade: ${e.capacidade || 1}`).join('\n') || '  Nenhum espaco disponivel'}

FUNCIONAMENTO: ${config ? `${config.horaInicio} as ${config.horaFim} | ${diasLegivel}` : 'Nao configurado'}
DURACAO POR AGENDAMENTO: ${config ? config.duracaoAtendimento : 50} minutos
`.trim();
}

module.exports = { montarContextoAdmin, montarContextoCliente };

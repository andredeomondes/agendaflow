const prisma = require('../config/database');
const bcrypt = require('bcryptjs');
const { validarAgendamento } = require('./appointmentValidator');
const emailService = require('./emailService');
const whatsapp = process.env.VERCEL ? null : require('./whatsappService');

async function getAdmin() {
    return prisma.user.findFirst({ orderBy: { id: 'asc' } });
}

function notificarAgendamento(cliente, agendamento, espaco, adminEmail) {
    if (cliente.email) emailService.enviarEmailConfirmacao(cliente, agendamento, espaco, adminEmail);
    if (whatsapp && cliente.telefone) {
        whatsapp.enviarMensagem(cliente.telefone, whatsapp.mensagemConfirmacao(cliente, agendamento, espaco))
            .then(ok => console.log(`[WhatsApp] Confirmação para ${cliente.nome}: ${ok ? 'enviado' : 'falhou'}`))
            .catch(() => {});
    }
    if (whatsapp) {
        whatsapp.enviarMensagemAdmin(whatsapp.mensagemAdminNovoAgendamento(cliente, agendamento, espaco)).catch(() => {});
    }
}

function notificarCancelamento(cliente, agendamento, espaco, adminEmail) {
    if (cliente.email) emailService.enviarEmailCancelamento(cliente, agendamento, espaco, adminEmail);
    if (whatsapp && cliente.telefone) {
        whatsapp.enviarMensagem(cliente.telefone, whatsapp.mensagemCancelamento(cliente, agendamento, espaco))
            .then(ok => console.log(`[WhatsApp] Cancelamento para ${cliente.nome}: ${ok ? 'enviado' : 'falhou'}`))
            .catch(() => {});
    }
    if (whatsapp) {
        whatsapp.enviarMensagemAdmin(whatsapp.mensagemAdminCancelamento(cliente, agendamento, espaco)).catch(() => {});
    }
}

const ferramentasPorRole = {
    admin: [
        // Agendamentos
        'criar_agendamento',
        'cancelar_agendamento',
        'atualizar_status_agendamento',
        'listar_agendamentos_hoje',
        'listar_agendamentos_por_data',
        'buscar_slots_admin',
        // Clientes
        'listar_clientes',
        'buscar_cliente_por_nome',
        'buscar_cliente_por_email',
        'analisar_cliente',
        'criar_cliente',
        'atualizar_cliente',
        'deletar_cliente',
        // Espacos
        'listar_espacos',
        'criar_espaco',
        'atualizar_espaco',
        'deletar_espaco',
        // Configuracao
        'ver_configuracao',
        'atualizar_configuracao',
    ],
    client: [
        // Agendamentos
        'meus_agendamentos',
        'buscar_slots',
        'criar_meu_agendamento',
        'cancelar_meu_agendamento',
        // Perfil
        'ver_meu_perfil',
        'atualizar_meu_perfil',
        // Info
        'perguntar_faq',
    ]
};

const toolMap = {

    // ══════════════════════════════════════════
    // ADMIN — AGENDAMENTOS
    // ══════════════════════════════════════════

    criar_agendamento: async (args) => {
        const { clientId, spaceId, dataInicio, dataFim, status } = args;

        const validacao = await validarAgendamento({ spaceId, dataInicio, dataFim });
        if (!validacao.ok) return { erro: validacao.erro };

        const cliente = await prisma.client.findUnique({ where: { id: parseInt(clientId) } });
        if (!cliente) return { erro: 'Cliente não encontrado.' };

        const agendamento = await prisma.appointment.create({
            data: {
                clientId: parseInt(clientId),
                spaceId: parseInt(spaceId),
                dataInicio: new Date(dataInicio),
                dataFim: new Date(dataFim),
                status: status || 'Agendado'
            },
            include: { client: true, space: true }
        });

        const admin = await getAdmin();
        notificarAgendamento(agendamento.client, agendamento, agendamento.space, admin?.email);

        return {
            sucesso: true,
            agendamento: {
                id: agendamento.id,
                cliente: agendamento.client.nome,
                espaco: agendamento.space.nome,
                inicio: new Date(agendamento.dataInicio).toLocaleString('pt-BR'),
                fim: new Date(agendamento.dataFim).toLocaleString('pt-BR'),
                status: agendamento.status
            }
        };
    },

    cancelar_agendamento: async (args) => {
        const agendamento = await prisma.appointment.findUnique({
            where: { id: parseInt(args.id) },
            include: { client: true, space: true }
        });
        if (!agendamento) return { erro: 'Agendamento nao encontrado' };
        if (agendamento.status === 'Cancelado') return { erro: 'Agendamento já está cancelado.' };
        await prisma.appointment.update({ where: { id: agendamento.id }, data: { status: 'Cancelado' } });

        const admin = await getAdmin();
        notificarCancelamento(agendamento.client, agendamento, agendamento.space, admin?.email);

        return { sucesso: true, mensagem: `Agendamento #${agendamento.id} de ${agendamento.client.nome} cancelado.` };
    },

    atualizar_status_agendamento: async (args) => {
        const agendamento = await prisma.appointment.findUnique({ where: { id: parseInt(args.id) } });
        if (!agendamento) return { erro: 'Agendamento nao encontrado' };
        await prisma.appointment.update({ where: { id: agendamento.id }, data: { status: args.status } });
        return { sucesso: true, mensagem: `Agendamento #${agendamento.id} atualizado para "${args.status}".` };
    },

    listar_agendamentos_hoje: async () => {
        const hoje = new Date();
        const inicio = new Date(hoje); inicio.setHours(0, 0, 0, 0);
        const fim = new Date(hoje); fim.setHours(23, 59, 59, 999);
        const agendamentos = await prisma.appointment.findMany({
            where: { dataInicio: { gte: inicio, lte: fim }, status: { not: 'Cancelado' } },
            include: { client: true, space: true },
            orderBy: { dataInicio: 'asc' }
        });
        if (agendamentos.length === 0) return { agendamentos: [], mensagem: 'Nenhum agendamento hoje.' };
        return agendamentos.map(a => ({
            id: a.id,
            cliente: a.client.nome,
            espaco: a.space.nome,
            horario: `${new Date(a.dataInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}-${new Date(a.dataFim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
            status: a.status
        }));
    },

    listar_agendamentos_por_data: async (args) => {
        const inicio = new Date(args.data + 'T00:00:00');
        const fim = new Date(args.data + 'T23:59:59');
        const agendamentos = await prisma.appointment.findMany({
            where: { dataInicio: { gte: inicio, lte: fim }, status: { not: 'Cancelado' } },
            include: { client: true, space: true },
            orderBy: { dataInicio: 'asc' }
        });
        if (agendamentos.length === 0) return { agendamentos: [], mensagem: `Nenhum agendamento em ${args.data}.` };
        return agendamentos.map(a => ({
            id: a.id,
            cliente: a.client.nome,
            espaco: a.space.nome,
            horario: `${new Date(a.dataInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}-${new Date(a.dataFim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
            status: a.status
        }));
    },

    buscar_slots_admin: async (args) => toolMap.buscar_slots(args),

    // ══════════════════════════════════════════
    // ADMIN — CLIENTES
    // ══════════════════════════════════════════

    listar_clientes: async (args) => {
        const clientes = await prisma.client.findMany({
            orderBy: { nome: 'asc' },
            take: 50
        });
        if (clientes.length === 0) return { clientes: [], mensagem: 'Nenhum cliente cadastrado.' };
        return clientes.map(c => ({ id: c.id, nome: c.nome, email: c.email, telefone: c.telefone || 'sem tel' }));
    },

    buscar_cliente_por_nome: async (args) => {
        const clientes = await prisma.client.findMany({
            where: { nome: { contains: args.nome, mode: 'insensitive' } },
            take: 10
        });
        if (clientes.length === 0) return { erro: `Nenhum cliente encontrado com nome "${args.nome}".` };
        return clientes.map(c => ({ id: c.id, nome: c.nome, email: c.email, telefone: c.telefone }));
    },

    buscar_cliente_por_email: async (args) => {
        const cliente = await prisma.client.findUnique({ where: { email: args.email } });
        if (!cliente) return { erro: 'Cliente nao encontrado.' };
        return { id: cliente.id, nome: cliente.nome, email: cliente.email, telefone: cliente.telefone };
    },

    analisar_cliente: async (args) => {
        const cliente = await prisma.client.findUnique({ where: { id: parseInt(args.clientId) } });
        if (!cliente) return { erro: 'Cliente nao encontrado.' };
        const agendamentos = await prisma.appointment.findMany({
            where: { clientId: cliente.id },
            include: { space: true },
            orderBy: { dataInicio: 'desc' }
        });
        const total = agendamentos.length;
        const cancelados = agendamentos.filter(a => a.status === 'Cancelado').length;
        const concluidos = agendamentos.filter(a => a.status === 'Concluído').length;
        const espacos = [...new Set(agendamentos.map(a => a.space?.nome).filter(Boolean))];
        return {
            id: cliente.id, nome: cliente.nome, email: cliente.email, telefone: cliente.telefone,
            totalAgendamentos: total,
            cancelamentos: cancelados,
            concluidos,
            taxaCancelamento: total > 0 ? `${Math.round((cancelados / total) * 100)}%` : '0%',
            espacosFavoritos: espacos,
            ultimoAgendamento: agendamentos[0] ? new Date(agendamentos[0].dataInicio).toLocaleDateString('pt-BR') : 'Nunca'
        };
    },

    criar_cliente: async (args) => {
        const { nome, email, telefone, senha } = args;
        const existe = await prisma.client.findUnique({ where: { email } });
        if (existe) return { erro: `Ja existe um cliente com o email ${email}.` };
        const senhaHash = await bcrypt.hash(senha || Math.random().toString(36).slice(-8), 10);
        const cliente = await prisma.client.create({
            data: { nome, email, telefone: telefone || '', senha: senhaHash, emailVerificado: true }
        });
        return { sucesso: true, cliente: { id: cliente.id, nome: cliente.nome, email: cliente.email } };
    },

    atualizar_cliente: async (args) => {
        const { clientId, nome, email, telefone } = args;
        const cliente = await prisma.client.findUnique({ where: { id: parseInt(clientId) } });
        if (!cliente) return { erro: 'Cliente nao encontrado.' };
        const atualizado = await prisma.client.update({
            where: { id: cliente.id },
            data: {
                ...(nome && { nome }),
                ...(email && { email }),
                ...(telefone !== undefined && { telefone })
            }
        });
        return { sucesso: true, mensagem: `Cliente ${atualizado.nome} atualizado.`, cliente: { id: atualizado.id, nome: atualizado.nome, email: atualizado.email, telefone: atualizado.telefone } };
    },

    deletar_cliente: async (args) => {
        const cliente = await prisma.client.findUnique({ where: { id: parseInt(args.clientId) } });
        if (!cliente) return { erro: 'Cliente nao encontrado.' };
        const agendamentosAtivos = await prisma.appointment.count({
            where: { clientId: cliente.id, status: { notIn: ['Cancelado', 'Concluído'] } }
        });
        if (agendamentosAtivos > 0) return { erro: `Cliente tem ${agendamentosAtivos} agendamento(s) ativo(s). Cancele-os antes de deletar.` };
        await prisma.appointment.deleteMany({ where: { clientId: cliente.id } });
        await prisma.client.delete({ where: { id: cliente.id } });
        return { sucesso: true, mensagem: `Cliente ${cliente.nome} deletado.` };
    },

    // ══════════════════════════════════════════
    // ADMIN — ESPACOS
    // ══════════════════════════════════════════

    listar_espacos: async () => {
        const espacos = await prisma.space.findMany({ orderBy: { id: 'asc' } });
        if (espacos.length === 0) return { espacos: [], mensagem: 'Nenhum espaco cadastrado.' };
        return espacos.map(e => ({ id: e.id, nome: e.nome, capacidade: e.capacidade || 1, disponivel: e.disponivel }));
    },

    criar_espaco: async (args) => {
        const { nome, capacidade, disponivel } = args;
        const espaco = await prisma.space.create({
            data: { nome, capacidade: parseInt(capacidade) || 1, disponivel: disponivel !== false }
        });
        return { sucesso: true, espaco: { id: espaco.id, nome: espaco.nome, capacidade: espaco.capacidade } };
    },

    atualizar_espaco: async (args) => {
        const { spaceId, nome, capacidade, disponivel } = args;
        const espaco = await prisma.space.findUnique({ where: { id: parseInt(spaceId) } });
        if (!espaco) return { erro: 'Espaco nao encontrado.' };
        const atualizado = await prisma.space.update({
            where: { id: espaco.id },
            data: {
                ...(nome && { nome }),
                ...(capacidade !== undefined && { capacidade: parseInt(capacidade) }),
                ...(disponivel !== undefined && { disponivel })
            }
        });
        return { sucesso: true, mensagem: `Espaco "${atualizado.nome}" atualizado.`, espaco: { id: atualizado.id, nome: atualizado.nome, capacidade: atualizado.capacidade, disponivel: atualizado.disponivel } };
    },

    deletar_espaco: async (args) => {
        const espaco = await prisma.space.findUnique({ where: { id: parseInt(args.spaceId) } });
        if (!espaco) return { erro: 'Espaco nao encontrado.' };
        const agendamentosAtivos = await prisma.appointment.count({
            where: { spaceId: espaco.id, status: { notIn: ['Cancelado', 'Concluído'] } }
        });
        if (agendamentosAtivos > 0) return { erro: `Espaco tem ${agendamentosAtivos} agendamento(s) ativo(s). Cancele-os antes.` };
        await prisma.space.update({ where: { id: espaco.id }, data: { disponivel: false } });
        return { sucesso: true, mensagem: `Espaco "${espaco.nome}" desativado.` };
    },

    // ══════════════════════════════════════════
    // ADMIN — CONFIGURACAO
    // ══════════════════════════════════════════

    ver_configuracao: async () => {
        const config = await prisma.configAgenda.findFirst();
        if (!config) return { mensagem: 'Agenda nao configurada. Use atualizar_configuracao para configurar.', configurada: false };
        const diasNomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
        return {
            configurada: true,
            horaInicio: config.horaInicio,
            horaFim: config.horaFim,
            duracaoAtendimento: config.duracaoAtendimento,
            intervaloEntreAtend: config.intervaloEntreAtend,
            diasFuncionamento: config.diasFuncionamento,
            diasLegivel: config.diasFuncionamento.split(',').map(d => diasNomes[parseInt(d)]).join(', ')
        };
    },

    atualizar_configuracao: async (args) => {
        const { horaInicio, horaFim, duracaoAtendimento, intervaloEntreAtend, diasFuncionamento } = args;
        const data = {};
        if (horaInicio) data.horaInicio = horaInicio;
        if (horaFim) data.horaFim = horaFim;
        if (duracaoAtendimento) data.duracaoAtendimento = parseInt(duracaoAtendimento);
        if (intervaloEntreAtend !== undefined) data.intervaloEntreAtend = parseInt(intervaloEntreAtend);
        if (diasFuncionamento) data.diasFuncionamento = diasFuncionamento;

        const config = await prisma.configAgenda.upsert({
            where: { id: 1 },
            update: data,
            create: {
                horaInicio: horaInicio || '08:00',
                horaFim: horaFim || '18:00',
                duracaoAtendimento: parseInt(duracaoAtendimento) || 50,
                intervaloEntreAtend: parseInt(intervaloEntreAtend) || 10,
                diasFuncionamento: diasFuncionamento || '1,2,3,4,5'
            }
        });
        return { sucesso: true, mensagem: 'Configuracao atualizada.', config: { horaInicio: config.horaInicio, horaFim: config.horaFim, duracao: config.duracaoAtendimento, intervalo: config.intervaloEntreAtend, dias: config.diasFuncionamento } };
    },

    // ══════════════════════════════════════════
    // CLIENTE — AGENDAMENTOS
    // ══════════════════════════════════════════

    meus_agendamentos: async (args, userId) => {
        const agendamentos = await prisma.appointment.findMany({
            where: { clientId: userId },
            include: { space: true },
            orderBy: { dataInicio: 'desc' },
            take: 20
        });
        if (agendamentos.length === 0) return { agendamentos: [], mensagem: 'Voce nao tem agendamentos.' };
        return agendamentos.map(a => ({
            id: a.id,
            espaco: a.space.nome,
            data: new Date(a.dataInicio).toLocaleDateString('pt-BR'),
            horario: `${new Date(a.dataInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}-${new Date(a.dataFim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
            status: a.status
        }));
    },

    buscar_slots: async (args) => {
        const { data } = args;
        if (!data) return { slots: [], mensagem: 'Informe a data no formato YYYY-MM-DD.' };

        // Bahia = UTC-3 (sem horário de verão)
        const [ano, mes, dia] = data.split('-').map(Number);
        const brToUTC = (h, m) => new Date(Date.UTC(ano, mes - 1, dia, h + 3, m, 0));

        const dataDate = brToUTC(0, 0); // meia-noite Bahia
        const agora = new Date();
        if (dataDate < new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate(), 3, 0, 0))) {
            return { slots: [], mensagem: 'Esta data ja passou. Informe uma data futura.' };
        }

        const config = await prisma.configAgenda.findFirst();
        if (!config) return { slots: [], mensagem: 'Agenda nao configurada pelo administrador.' };

        // Dia da semana em Bahia (UTC-3)
        const diaSemana = new Date(data + 'T12:00:00-03:00').getDay();
        const diasFunc = config.diasFuncionamento.split(',').map(Number);
        const diasNomes = ['domingo', 'segunda-feira', 'terca-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sabado'];
        if (!diasFunc.includes(diaSemana)) {
            let proximaData = null;
            for (let i = 1; i <= 7; i++) {
                const cand = new Date(Date.UTC(ano, mes - 1, dia + i, 12, 0, 0));
                const candDia = new Date(cand.toLocaleDateString('en-CA') + 'T12:00:00-03:00').getDay();
                if (diasFunc.includes(candDia)) {
                    proximaData = cand.toISOString().split('T')[0];
                    break;
                }
            }
            return {
                slots: [],
                mensagem: `${diasNomes[diaSemana].charAt(0).toUpperCase() + diasNomes[diaSemana].slice(1)} nao e dia de atendimento. Proximo dia disponivel: ${proximaData || 'a definir'}.`,
                proximaData
            };
        }

        const [hI, mI] = config.horaInicio.split(':').map(Number);
        const [hF, mF] = config.horaFim.split(':').map(Number);
        const duracao = config.duracaoAtendimento || 50;
        const ciclo = duracao + (config.intervaloEntreAtend || 10);

        const startTime = brToUTC(hI, mI);
        const endTime = brToUTC(hF, mF);

        const slots = [];
        let current = new Date(startTime);
        while (current < endTime) {
            const slotEnd = new Date(current.getTime() + duracao * 60000);
            if (slotEnd <= endTime) slots.push({ dataInicio: new Date(current), dataFim: new Date(slotEnd) });
            current = new Date(current.getTime() + ciclo * 60000);
        }

        const [appointments, blocks, space] = await Promise.all([
            prisma.appointment.findMany({
                where: { spaceId: parseInt(args.spaceId), dataInicio: { gte: startTime, lt: endTime }, status: { not: 'Cancelado' } }
            }),
            prisma.bloqueio.findMany({
                where: { spaceId: parseInt(args.spaceId), dataInicio: { lt: endTime }, dataFim: { gt: startTime } }
            }),
            prisma.space.findUnique({ where: { id: parseInt(args.spaceId) } })
        ]);

        const capacity = space?.capacidade || 1;
        let available = slots.filter(slot => {
            const conc = appointments.filter(a => slot.dataInicio < new Date(a.dataFim) && slot.dataFim > new Date(a.dataInicio));
            if (conc.length >= capacity) return false;
            return !blocks.some(b => slot.dataInicio < new Date(b.dataFim) && slot.dataFim > new Date(b.dataInicio));
        });

        available = available.filter(s => s.dataInicio > agora);

        if (available.length === 0) return { slots: [], mensagem: 'Nenhum horario disponivel nesta data. Tente outra data.' };

        const BR_TZ = 'America/Bahia';
        return {
            slots: available.map(s => ({
                dataInicio: s.dataInicio.toISOString(),
                dataFim: s.dataFim.toISOString(),
                inicio: s.dataInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: BR_TZ }),
                fim: s.dataFim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: BR_TZ })
            })),
            total: available.length,
            espaco: space?.nome || `Espaco #${args.spaceId}`,
            data
        };
    },

    criar_meu_agendamento: async (args, userId) => {
        const { spaceId, dataInicio, dataFim } = args;

        const validacao = await validarAgendamento({ spaceId, dataInicio, dataFim });
        if (!validacao.ok) return { erro: validacao.erro };

        const agendamento = await prisma.appointment.create({
            data: {
                clientId: userId,
                spaceId: parseInt(spaceId),
                dataInicio: new Date(dataInicio),
                dataFim: new Date(dataFim),
                status: 'Agendado'
            },
            include: { client: true, space: true }
        });

        const admin = await getAdmin();
        notificarAgendamento(agendamento.client, agendamento, agendamento.space, admin?.email);

        return {
            sucesso: true,
            mensagem: `Agendamento criado com sucesso! ${agendamento.space.nome} em ${new Date(agendamento.dataInicio).toLocaleDateString('pt-BR')} das ${new Date(agendamento.dataInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} às ${new Date(agendamento.dataFim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`,
            agendamento: { id: agendamento.id, espaco: agendamento.space.nome, dataInicio: agendamento.dataInicio, dataFim: agendamento.dataFim }
        };
    },

    cancelar_meu_agendamento: async (args, userId) => {
        const agendamento = await prisma.appointment.findFirst({
            where: { id: parseInt(args.id), clientId: userId },
            include: { client: true, space: true }
        });
        if (!agendamento) return { erro: 'Agendamento nao encontrado ou nao pertence a voce.' };
        if (agendamento.status === 'Cancelado') return { erro: 'Este agendamento ja esta cancelado.' };
        await prisma.appointment.update({ where: { id: agendamento.id }, data: { status: 'Cancelado' } });

        const admin = await getAdmin();
        notificarCancelamento(agendamento.client, agendamento, agendamento.space, admin?.email);

        return { sucesso: true, mensagem: `Agendamento de ${agendamento.space.nome} em ${new Date(agendamento.dataInicio).toLocaleDateString('pt-BR')} cancelado.` };
    },

    // ══════════════════════════════════════════
    // CLIENTE — PERFIL
    // ══════════════════════════════════════════

    ver_meu_perfil: async (args, userId) => {
        const cliente = await prisma.client.findUnique({ where: { id: userId } });
        if (!cliente) return { erro: 'Perfil nao encontrado.' };
        return { id: cliente.id, nome: cliente.nome, email: cliente.email, telefone: cliente.telefone || 'nao informado' };
    },

    atualizar_meu_perfil: async (args, userId) => {
        const { nome, telefone } = args;
        if (!nome && !telefone) return { erro: 'Informe ao menos um campo para atualizar (nome ou telefone).' };
        const atualizado = await prisma.client.update({
            where: { id: userId },
            data: { ...(nome && { nome }), ...(telefone && { telefone }) }
        });
        return { sucesso: true, mensagem: `Perfil atualizado.`, perfil: { nome: atualizado.nome, email: atualizado.email, telefone: atualizado.telefone } };
    },

    // ══════════════════════════════════════════
    // CLIENTE — INFO
    // ══════════════════════════════════════════

    perguntar_faq: async () => {
        const config = await prisma.configAgenda.findFirst();
        const diasNomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
        return {
            horario: config ? `${config.horaInicio} as ${config.horaFim}` : 'Nao configurado',
            duracao: `${config?.duracaoAtendimento || 50} minutos por agendamento`,
            dias: config ? config.diasFuncionamento.split(',').map(d => diasNomes[parseInt(d)]).join(', ') : 'Nao configurado',
            cancelamento: 'Voce pode cancelar seu agendamento pela dashboard ou pedindo para a IA',
            reagendamento: 'Para reagendar, cancele o atual e crie um novo no horario desejado'
        };
    }
};

async function executarFerramenta(nome, args, role, userId) {
    const fn = toolMap[nome];
    if (!fn) return { erro: `Ferramenta "${nome}" nao existe.` };
    if (!ferramentasPorRole[role]?.includes(nome)) return { erro: `Sem permissao para usar "${nome}".` };
    try {
        return await fn(args, userId);
    } catch (e) {
        console.error(`Erro na ferramenta ${nome}:`, e.message);
        return { erro: e.message };
    }
}

module.exports = { executarFerramenta, ferramentasPorRole };

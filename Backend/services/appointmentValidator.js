const prisma = require('../config/database');

/**
 * Valida todas as regras de negócio antes de criar um agendamento.
 * Retorna { ok: true } ou { ok: false, erro: "mensagem" }
 */
async function validarAgendamento({ spaceId, dataInicio, dataFim }) {
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    const spaceIdInt = parseInt(spaceId);

    if (isNaN(inicio) || isNaN(fim)) return { ok: false, erro: 'Datas inválidas.' };
    if (inicio >= fim) return { ok: false, erro: 'O horário de início deve ser anterior ao horário de fim.' };
    if (inicio < new Date()) return { ok: false, erro: 'Não é possível agendar em horários passados.' };

    const espaco = await prisma.space.findUnique({ where: { id: spaceIdInt } });
    if (!espaco) return { ok: false, erro: 'Espaço não encontrado.' };
    if (!espaco.disponivel) return { ok: false, erro: `O espaço "${espaco.nome}" está inativo.` };

    const config = await prisma.configAgenda.findFirst();
    if (!config) return { ok: false, erro: 'A agenda não foi configurada pelo administrador.' };

    // Dia da semana
    const diasNomes = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    const diaSemana = inicio.getDay();
    const diasFunc = config.diasFuncionamento.split(',').map(Number);
    if (!diasFunc.includes(diaSemana)) {
        // Próximo dia disponível
        let proxData = null;
        for (let i = 1; i <= 7; i++) {
            const cand = new Date(inicio.getTime() + i * 86400000);
            if (diasFunc.includes(cand.getDay())) { proxData = cand; break; }
        }
        const sugestao = proxData ? ` Próximo dia disponível: ${diasNomes[proxData.getDay()]} (${proxData.toLocaleDateString('pt-BR')}).` : '';
        return { ok: false, erro: `Não atendemos aos ${diasNomes[diaSemana]}.${sugestao}` };
    }

    // Horário de funcionamento
    const [hA, mA] = config.horaInicio.split(':').map(Number);
    const [hF, mF] = config.horaFim.split(':').map(Number);
    const aberturaMin = hA * 60 + mA;
    const fechamentoMin = hF * 60 + mF;
    const inicioMin = inicio.getHours() * 60 + inicio.getMinutes();
    const fimMin = fim.getHours() * 60 + fim.getMinutes();
    if (inicioMin < aberturaMin || fimMin > fechamentoMin) {
        return { ok: false, erro: `Horário de funcionamento: ${config.horaInicio} às ${config.horaFim}. Escolha um horário dentro desse período.` };
    }

    // Bloqueios
    const bloqueio = await prisma.bloqueio.findFirst({
        where: { spaceId: spaceIdInt, dataInicio: { lt: fim }, dataFim: { gt: inicio } }
    });
    if (bloqueio) {
        return { ok: false, erro: `Horário bloqueado: "${bloqueio.motivo || 'indisponível'}". Escolha outro horário.` };
    }

    // Capacidade / sobreposição
    const capacidade = espaco.capacidade || 1;
    const simultaneos = await prisma.appointment.count({
        where: {
            spaceId: spaceIdInt,
            dataInicio: { lt: fim },
            dataFim: { gt: inicio },
            status: { not: 'Cancelado' }
        }
    });
    if (simultaneos >= capacidade) {
        return { ok: false, erro: `"${espaco.nome}" já está lotado neste horário (máx. ${capacidade} pessoa(s)). Tente outro horário.` };
    }

    return { ok: true, espaco, config };
}

module.exports = { validarAgendamento };

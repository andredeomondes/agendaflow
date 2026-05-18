const prisma = require('../config/database');
const emailService = require('../services/emailService');
const googleCalendarService = require('../services/googleCalendarService');
const whatsapp = process.env.VERCEL ? null : require('../services/whatsappService');

async function getAdminEmail() {
  const admin = await prisma.user.findFirst({ orderBy: { id: 'asc' } });
  return admin?.email || null;
}

async function getAdmin() {
  return await prisma.user.findFirst({ orderBy: { id: 'asc' } });
}

exports.listar = async (req, res) => {
    try {
        const agendamentos = await prisma.appointment.findMany({ include: { client: true, space: true } });
        res.json(agendamentos);
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao buscar agendamentos' });
    }
};

exports.criar = async (req, res) => {
    try {
        const { clientId, spaceId, dataInicio, dataFim, status } = req.body;
        const inicioStr = new Date(dataInicio);
        const fimStr = new Date(dataFim);

        if (inicioStr < new Date()) {
            return res.status(400).json({ erro: 'Não é permitido agendar em horários passados.' });
        }

        const statusValidos = ['Agendado', 'Confirmado', 'Pendente', 'Cancelado', 'Concluído'];
        const statusFinal = status && statusValidos.includes(status) ? status : 'Agendado';

        const espaco = await prisma.space.findUnique({ where: { id: parseInt(spaceId) } });

        const configAgenda = await prisma.configAgenda.findFirst();
        if (configAgenda) {
            const diaSemana = inicioStr.getDay();
            const diasFunc = configAgenda.diasFuncionamento.split(',').map(Number);
            if (!diasFunc.includes(diaSemana)) {
                const diasNomes = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
                return res.status(400).json({ erro: `O espaço não funciona aos ${diasNomes[diaSemana]}.` });
            }

            const horaSlot = inicioStr.getHours() * 60 + inicioStr.getMinutes();
            const [hA, mA] = configAgenda.horaInicio.split(':').map(Number);
            const [hF, mF] = configAgenda.horaFim.split(':').map(Number);
            const abertura = hA * 60 + mA;
            const fechamento = hF * 60 + mF;
            if (horaSlot < abertura || horaSlot + (fimStr - inicioStr) / 60000 > fechamento) {
                return res.status(400).json({ erro: `O horário de funcionamento é das ${configAgenda.horaInicio} às ${configAgenda.horaFim}.` });
            }
        }
        
        // Verifica se há bloqueios no horário
        const bloqueio = await prisma.bloqueio.findFirst({
            where: {
                spaceId: parseInt(spaceId),
                dataInicio: { lt: fimStr },
                dataFim: { gt: inicioStr }
            }
        });

        if (bloqueio) {
            return res.status(400).json({ erro: `Horário bloqueado: ${bloqueio.motivo || 'indisponível'}. Escolha outro horário.` });
        }

        const agendamentosSimultaneos = await prisma.appointment.count({
            where: {
                spaceId: parseInt(spaceId),
                dataInicio: { lt: fimStr },
                dataFim: { gt: inicioStr },
                status: { not: 'Cancelado' }
            }
        });

        if (agendamentosSimultaneos >= espaco.capacidade) {
            return res.status(400).json({ erro: `"${espaco.nome}" está lotado neste horário (capacidade máxima: ${espaco.capacidade} pessoa(s)). Tente outro horário.` });
        }

        const adminUser = await getAdmin();

        const agendamento = await prisma.appointment.create({
            data: { 
                clientId: parseInt(clientId), 
                spaceId: parseInt(spaceId), 
                dataInicio: inicioStr, 
                dataFim: fimStr,
                status: statusFinal,
                userId: req.userId
            },
            include: { client: true, space: true }
        });

        // Fire-and-forget emails (cliente + admin)
        if (agendamento.client.email) {
            emailService.enviarEmailConfirmacao(agendamento.client, agendamento, agendamento.space, adminUser?.email);
        }
        if (whatsapp && agendamento.client.telefone) {
            whatsapp.enviarMensagem(agendamento.client.telefone, whatsapp.mensagemConfirmacao(agendamento.client, agendamento, agendamento.space));
        }
        if (whatsapp) {
            whatsapp.enviarMensagemAdmin(whatsapp.mensagemAdminNovoAgendamento(agendamento.client, agendamento, agendamento.space));
        }

        // Google Calendar - Admin
        if (req.userId) {
            const googleId = await googleCalendarService.criarEvento({
                userId: req.userId,
                titulo: `${agendamento.client.nome} - ${agendamento.space.nome}`,
                descricao: `Cliente: ${agendamento.client.nome}\nTelefone: ${agendamento.client.telefone}\nEmail: ${agendamento.client.email}\nEspaço: ${agendamento.space.nome}\nStatus: ${agendamento.status}`,
                dataInicio: inicioStr,
                dataFim: fimStr
            });
            
            if (googleId) {
                await prisma.appointment.update({
                    where: { id: agendamento.id },
                    data: { googleId }
                });
                agendamento.googleId = googleId;
            }
        }

        // Google Calendar - Cliente (if connected)
        if (agendamento.client.googleRefreshToken) {
            const clientGoogleId = await googleCalendarService.criarEventoCliente({
                clientId: agendamento.clientId,
                titulo: `Agendamento: ${agendamento.space.nome}`,
                descricao: `Atendimento com ${adminUser?.nome || 'Administrador'}\nEspaço: ${agendamento.space.nome}\nData: ${inicioStr.toLocaleString('pt-BR')}`,
                dataInicio: inicioStr,
                dataFim: fimStr
            });
            if (clientGoogleId) {
                console.log(`✅ Evento criado no Google Calendar do cliente ${agendamento.client.nome}`);
            }
        }

        res.status(201).json(agendamento);
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
};

exports.deletar = async (req, res) => {
    try {
        const agendamento = await prisma.appointment.findUnique({
            where: { id: parseInt(req.params.id) },
            include: { client: true, space: true, user: true }
        });

        if (!agendamento) return res.status(404).json({ erro: 'Agendamento não encontrado' });

        const adminEmail = agendamento.user?.email || await getAdminEmail();

        await prisma.lembrete.deleteMany({ where: { appointmentId: parseInt(req.params.id) } });
        await prisma.appointment.delete({ where: { id: parseInt(req.params.id) } });

        // Fire-and-forget email (cliente + admin)
        if (agendamento.client.email) {
            emailService.enviarEmailCancelamento(agendamento.client, agendamento, agendamento.space, adminEmail);
        }
        if (whatsapp && agendamento.client.telefone) {
            whatsapp.enviarMensagem(agendamento.client.telefone, whatsapp.mensagemCancelamento(agendamento.client, agendamento, agendamento.space));
        }
        if (whatsapp) {
            whatsapp.enviarMensagemAdmin(whatsapp.mensagemAdminCancelamento(agendamento.client, agendamento, agendamento.space));
        }

        // Google Calendar — deleta evento do admin
        const ownerId = agendamento.userId || (await getAdmin())?.id;
        if (ownerId && agendamento.googleId) {
            await googleCalendarService.deletarEvento({
                userId: ownerId,
                googleId: agendamento.googleId
            });
        }

        // Google Calendar — deleta evento do cliente (se conectado)
        if (agendamento.client.googleRefreshToken) {
            await googleCalendarService.deletarEventoCliente({
                clientId: agendamento.clientId,
                googleId: agendamento.googleId
            });
        }

        res.json({ message: 'Agendamento deletado!' });
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
};

exports.listarDoCliente = async (req, res) => {
    try {
        const clientId = req.userRole === 'client' ? req.userId : parseInt(req.params.clientId);
        const agendamentos = await prisma.appointment.findMany({
            where: { clientId },
            include: { client: true, space: true },
            orderBy: { dataInicio: 'desc' }
        });
        res.json(agendamentos);
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
};

exports.slotsDisponiveis = async (req, res) => {
    try {
        const { spaceId, data } = req.query;
        if (!spaceId || !data) return res.status(400).json({ erro: 'spaceId e data são obrigatórios' });

        const spaceIdInt = parseInt(spaceId);
        const dataDate = new Date(data + 'T00:00:00');

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dataDate < today) {
            return res.json({ slots: [], espaco: null, message: 'Não é possível agendar em datas passadas. Escolha uma data futura.' });
        }

        const config = await prisma.configAgenda.findFirst();
        if (!config) return res.status(400).json({ erro: 'A agenda ainda não foi configurada.' });

        const diaSemana = dataDate.getDay();
        const diasFuncionamento = config.diasFuncionamento.split(',').map(Number);
        if (!diasFuncionamento.includes(diaSemana)) {
            const diasNomes = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
            return res.json({ slots: [], espaco: null, message: `Não funcionamos aos ${diasNomes[diaSemana]}. Escolha outro dia.` });
        }

        const [horaInicio, minInicio] = config.horaInicio.split(':').map(Number);
        const [horaFim, minFim] = config.horaFim.split(':').map(Number);
        const duracaoSlot = config.duracaoAtendimento || 50;
        const intervalo = config.intervaloEntreAtend || 10;
        const ciclo = duracaoSlot + intervalo;

        const [ano, mes, dia] = data.split('-').map(Number);
        const brToUTC = (h, m) => new Date(Date.UTC(ano, mes - 1, dia, h + 3, m, 0));
        const startTime = brToUTC(horaInicio, minInicio);
        const endTime = brToUTC(horaFim, minFim);

        const slots = [];
        let current = new Date(startTime);
        while (current < endTime) {
            const slotEnd = new Date(current.getTime() + duracaoSlot * 60000);
            if (slotEnd <= endTime) {
                slots.push({ dataInicio: new Date(current), dataFim: new Date(slotEnd) });
            }
            current = new Date(current.getTime() + ciclo * 60000);
        }

        const appointments = await prisma.appointment.findMany({
            where: {
                spaceId: spaceIdInt,
                dataInicio: { gte: startTime, lt: endTime },
                status: { not: 'Cancelado' }
            }
        });

        const blocks = await prisma.bloqueio.findMany({
            where: {
                spaceId: spaceIdInt,
                dataInicio: { lt: endTime },
                dataFim: { gt: startTime }
            }
        });

        const space = await prisma.space.findUnique({ where: { id: spaceIdInt } });
        const capacity = space?.capacidade || 1;

        let availableSlots = slots.filter(slot => {
            const concurrentAppts = appointments.filter(appt => {
                const apptStart = new Date(appt.dataInicio);
                const apptEnd = new Date(appt.dataFim);
                return slot.dataInicio < apptEnd && slot.dataFim > apptStart;
            });
            if (concurrentAppts.length >= capacity) return false;

            const hasBlock = blocks.some(block => {
                const blockStart = new Date(block.dataInicio);
                const blockEnd = new Date(block.dataFim);
                return slot.dataInicio < blockEnd && slot.dataFim > blockStart;
            });
            return !hasBlock;
        });

        const now = new Date();
        if (dataDate.toDateString() === now.toDateString()) {
            availableSlots = availableSlots.filter(slot => new Date(slot.dataInicio) > now);
        }

        let message = null;
        if (availableSlots.length === 0 && slots.length > 0) {
            if (blocks.length > 0) {
                const motivos = [...new Set(blocks.map(b => b.motivo).filter(Boolean))];
                message = motivos.length > 0
                    ? `Dia com bloqueio: ${motivos.join(', ')}`
                    : 'Este espaço está bloqueado neste dia.';
            } else if (appointments.length >= capacity * slots.length) {
                message = 'Todos os horários estão ocupados neste dia.';
            } else {
                message = 'Nenhum horário disponível para esta data.';
            }
        }

        const blockInfo = blocks
            .filter(b => new Date(b.dataInicio) < endTime && new Date(b.dataFim) > startTime)
            .map(b => ({
                dataInicio: b.dataInicio,
                dataFim: b.dataFim,
                motivo: b.motivo || 'Indisponível'
            }));

        res.json({
            slots: availableSlots,
            espaco: space ? { id: space.id, nome: space.nome, capacidade: capacity } : null,
            message,
            blockInfo,
            businessHours: { inicio: config.horaInicio, fim: config.horaFim }
        });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
};

exports.criarCliente = async (req, res) => {
    try {
        const { spaceId, dataInicio, dataFim } = req.body;
        const clientId = req.userId;

        const inicioStr = new Date(dataInicio);
        const fimStr = new Date(dataFim);

        if (inicioStr < new Date()) {
            return res.status(400).json({ erro: 'Este horário já passou. Por favor, escolha um horário futuro.' });
        }

        const espaco = await prisma.space.findUnique({ where: { id: parseInt(spaceId) } });
        if (!espaco) return res.status(404).json({ erro: 'Espaço não encontrado.' });

        const config = await prisma.configAgenda.findFirst();
        if (!config) return res.status(400).json({ erro: 'A agenda ainda não foi configurada pelo administrador.' });

        const diaSemana = inicioStr.getDay();
        const diasFuncionamento = config.diasFuncionamento.split(',').map(Number);
        if (!diasFuncionamento.includes(diaSemana)) {
            const diasNomes = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
            return res.status(400).json({ erro: `Infelizmente não funcionamos aos ${diasNomes[diaSemana]}. Por favor, escolha outro dia.` });
        }

        const horaSlot = inicioStr.getHours() * 60 + inicioStr.getMinutes();
        const [hAbertura, mAbertura] = config.horaInicio.split(':').map(Number);
        const [hFechamento, mFechamento] = config.horaFim.split(':').map(Number);
        const aberturaMin = hAbertura * 60 + mAbertura;
        const fechamentoMin = hFechamento * 60 + mFechamento;

        if (horaSlot < aberturaMin || horaSlot + (fimStr - inicioStr) / 60000 > fechamentoMin) {
            return res.status(400).json({
                erro: `Nosso horário de funcionamento é das ${config.horaInicio} às ${config.horaFim}. Por favor, escolha um horário dentro desse período.`
            });
        }

        const bloqueio = await prisma.bloqueio.findFirst({
            where: {
                spaceId: parseInt(spaceId),
                dataInicio: { lt: fimStr },
                dataFim: { gt: inicioStr }
            }
        });
        if (bloqueio) {
            return res.status(400).json({ erro: `Este horário está bloqueado: ${bloqueio.motivo || 'indisponível'}. Por favor, escolha outro horário.` });
        }

        const agendamentosSimultaneos = await prisma.appointment.count({
            where: {
                spaceId: parseInt(spaceId),
                dataInicio: { lt: fimStr },
                dataFim: { gt: inicioStr },
                status: { not: 'Cancelado' }
            }
        });
        if (agendamentosSimultaneos >= espaco.capacidade) {
            const vagasRestantes = espaco.capacidade - agendamentosSimultaneos;
            return res.status(400).json({ erro: `O "${espaco.nome}" está lotado neste horário (máximo ${espaco.capacidade} pessoa(s)). Tente outro horário ou espaço.` });
        }

        const adminUser = await getAdmin();

        const agendamento = await prisma.appointment.create({
            data: {
                clientId,
                spaceId: parseInt(spaceId),
                dataInicio: inicioStr,
                dataFim: fimStr,
                userId: adminUser?.id || null
            },
            include: { client: true, space: true }
        });

        if (agendamento.client.email) {
            emailService.enviarEmailConfirmacao(agendamento.client, agendamento, agendamento.space, adminUser?.email);
        }
        if (whatsapp && agendamento.client.telefone) {
            whatsapp.enviarMensagem(agendamento.client.telefone, whatsapp.mensagemConfirmacao(agendamento.client, agendamento, agendamento.space));
        }
        if (whatsapp) {
            whatsapp.enviarMensagemAdmin(whatsapp.mensagemAdminNovoAgendamento(agendamento.client, agendamento, agendamento.space));
        }

        if (adminUser?.googleRefreshToken) {
            const googleId = await googleCalendarService.criarEvento({
                userId: adminUser.id,
                titulo: `${agendamento.client.nome} - ${agendamento.space.nome}`,
                descricao: `Cliente: ${agendamento.client.nome}\nTelefone: ${agendamento.client.telefone}\nEmail: ${agendamento.client.email}\nEspaço: ${agendamento.space.nome}`,
                dataInicio: inicioStr,
                dataFim: fimStr
            });
            if (googleId) {
                await prisma.appointment.update({ where: { id: agendamento.id }, data: { googleId } });
                console.log(`✅ Google Calendar admin: evento ${googleId} criado para agendamento ${agendamento.id}`);
            } else {
                console.warn(`⚠️  Google Calendar admin: falha ao criar evento para agendamento ${agendamento.id}`);
            }
        } else {
            console.warn(`⚠️  Google Calendar admin: adminUser sem googleRefreshToken — não sincronizado`);
        }

        const clientData = await prisma.client.findUnique({ where: { id: clientId } });
        if (clientData?.googleRefreshToken) {
            const clientGoogleId = await googleCalendarService.criarEventoCliente({
                clientId,
                titulo: `Agendamento: ${agendamento.space.nome}`,
                descricao: `Atendimento\nEspaço: ${agendamento.space.nome}\nData: ${inicioStr.toLocaleString('pt-BR')}`,
                dataInicio: inicioStr,
                dataFim: fimStr
            });
            if (clientGoogleId) console.log(`✅ Google Calendar cliente: evento criado`);
        }

        res.status(201).json(agendamento);
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
};

exports.consultaPublica = async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) return res.status(400).json({ erro: "Email é obrigatório." });

        const cliente = await prisma.client.findUnique({ where: { email } });
        if (!cliente) return res.status(404).json({ erro: "Cliente não encontrado com este email." });

        const agendamentos = await prisma.appointment.findMany({
            where: { clientId: cliente.id },
            include: { space: true },
            orderBy: { dataInicio: 'desc' }
        });

        res.json({ cliente: { id: cliente.id, nome: cliente.nome, email: cliente.email }, agendamentos });
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao buscar agendamentos' });
    }
};

exports.atualizarStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const agendamento = await prisma.appointment.findUnique({
            where: { id: parseInt(req.params.id) },
            include: { client: true, space: true, user: true }
        });
        if (!agendamento) return res.status(404).json({ erro: 'Agendamento não encontrado' });

        const adminEmail = agendamento.user?.email || await getAdminEmail();

        // Se cancelar, remove do Google Calendar (admin + cliente)
        if (status === 'Cancelado' && agendamento.googleId) {
            const userId = agendamento.userId || (await getAdmin())?.id;
            if (userId) {
                await googleCalendarService.deletarEvento({ userId, googleId: agendamento.googleId });
            }
            if (agendamento.client.googleRefreshToken) {
                await googleCalendarService.deletarEventoCliente({
                    clientId: agendamento.clientId,
                    googleId: agendamento.googleId
                });
            }
        }

        const updated = await prisma.appointment.update({
            where: { id: parseInt(req.params.id) },
            data: { status, ...(status === 'Cancelado' ? { googleId: null } : {}) }
        });

        // Notificar admin e cliente sobre cancelamento
        if (status === 'Cancelado' && agendamento.status !== 'Cancelado') {
            if (agendamento.client.email) {
                emailService.enviarEmailCancelamento(agendamento.client, agendamento, agendamento.space, adminEmail);
            }
            if (whatsapp && agendamento.client.telefone) {
                whatsapp.enviarMensagem(agendamento.client.telefone, whatsapp.mensagemCancelamento(agendamento.client, agendamento, agendamento.space));
            }
            if (whatsapp) {
                whatsapp.enviarMensagemAdmin(whatsapp.mensagemAdminCancelamento(agendamento.client, agendamento, agendamento.space));
            }
        }

        // Se voltar a ativar e não tem googleId, recria no Google Calendar
        if (status !== 'Cancelado' && !agendamento.googleId && agendamento.status === 'Cancelado') {
            const admin = await getAdmin();
            const fullAg = await prisma.appointment.findUnique({
                where: { id: agendamento.id },
                include: { client: true, space: true }
            });

            // Recria no admin
            if (admin?.id) {
                const googleId = await googleCalendarService.criarEvento({
                    userId: admin.id,
                    titulo: `Agendamento: ${fullAg.client.nome}`,
                    descricao: `Atendimento no espaço ${fullAg.space.nome} - Status: ${status}`,
                    dataInicio: agendamento.dataInicio,
                    dataFim: agendamento.dataFim
                });
                if (googleId) {
                    await prisma.appointment.update({
                        where: { id: agendamento.id },
                        data: { googleId }
                    });
                    updated.googleId = googleId;
                }
            }

            // Recria no cliente
            if (fullAg.client.googleRefreshToken) {
                await googleCalendarService.criarEventoCliente({
                    clientId: fullAg.client.id,
                    titulo: `Agendamento: ${fullAg.space.nome}`,
                    descricao: `Atendimento\nEspaço: ${fullAg.space.nome}\nStatus: ${status}`,
                    dataInicio: agendamento.dataInicio,
                    dataFim: agendamento.dataFim
                });
            }
        }

        res.json(updated);
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
};

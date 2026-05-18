const prisma = require('../config/database');
const googleCalendarService = require('../services/googleCalendarService');

exports.listar = async (req, res) => {
    try {
        const bloqueios = await prisma.bloqueio.findMany({ include: { space: true } });
        res.json(bloqueios);
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao buscar bloqueios' });
    }
};

exports.criar = async (req, res) => {
    try {
        const { spaceId, dataInicio, dataFim, motivo, cancelOverlapping } = req.body;
        const inicioStr = new Date(dataInicio);
        const fimStr = new Date(dataFim);

        // Check for overlapping appointments
        const conflitos = await prisma.appointment.findMany({
            where: {
                spaceId: parseInt(spaceId),
                dataInicio: { lt: fimStr },
                dataFim: { gt: inicioStr },
                status: { notIn: ['Cancelado', 'Concluído'] }
            },
            include: { client: true, space: true }
        });

        if (conflitos.length > 0) {
            // If cancelOverlapping is true, cancel all conflicting appointments
            if (cancelOverlapping) {
                for (const appt of conflitos) {
                    // Remove do Google Calendar se tiver googleId
                    if (appt.googleId && req.userId) {
                        await googleCalendarService.deletarEvento({ userId: req.userId, googleId: appt.googleId });
                    }
                    await prisma.appointment.update({
                        where: { id: appt.id },
                        data: { status: 'Cancelado', googleId: null }
                    });
                }
            } else {
                // Return conflicting appointments for frontend to ask
                return res.status(409).json({
                    conflitos: conflitos.map(a => ({
                        id: a.id,
                        cliente: a.client?.nome || 'Cliente',
                        espaco: a.space?.nome || 'Espaço',
                        dataInicio: a.dataInicio,
                        dataFim: a.dataFim,
                        status: a.status
                    }))
                });
            }
        }

        const bloqueio = await prisma.bloqueio.create({
            data: { spaceId: parseInt(spaceId), dataInicio: inicioStr, dataFim: fimStr, motivo }
        });
        res.status(201).json(bloqueio);
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
};

exports.atualizar = async (req, res) => {
    try {
        const { spaceId, dataInicio, dataFim, motivo } = req.body;
        const data = {};
        if (spaceId !== undefined) data.spaceId = parseInt(spaceId);
        if (dataInicio !== undefined) data.dataInicio = new Date(dataInicio);
        if (dataFim !== undefined) data.dataFim = new Date(dataFim);
        if (motivo !== undefined) data.motivo = motivo;
        const bloqueio = await prisma.bloqueio.update({
            where: { id: parseInt(req.params.id) },
            data
        });
        res.json(bloqueio);
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
};

exports.deletar = async (req, res) => {
    try {
        await prisma.bloqueio.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ message: 'Bloqueio deletado!' });
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
};

const prisma = require('../config/database');

exports.buscar = async (req, res) => {
    try {
        let config = await prisma.configAgenda.findFirst();
        if (!config) {
            config = await prisma.configAgenda.create({ data: {} });
        }
        res.json(config);
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao buscar configurações' });
    }
};

exports.atualizar = async (req, res) => {
    try {
        const { id, horaInicio, horaFim, intervaloEntreAtend, diasFuncionamento } = req.body;
        const config = await prisma.configAgenda.update({
            where: { id: parseInt(id) },
            data: { horaInicio, horaFim, intervaloEntreAtend: parseInt(intervaloEntreAtend), diasFuncionamento }
        });
        res.json(config);
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
};

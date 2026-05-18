const prisma = require('../config/database');

exports.listar = async (req, res) => {
    try {
        const espacos = await prisma.space.findMany();
        res.json(espacos);
    } catch (error) {
        res.status(500).json({ erro: 'Erro buscar espaços' });
    }
};

exports.criar = async (req, res) => {
    try {
        const { nome, capacidade } = req.body;
        const espaco = await prisma.space.create({ data: { nome, capacidade: parseInt(capacidade) } });
        res.status(201).json(espaco);
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
};

exports.atualizar = async (req, res) => {
    try {
        const { nome, capacidade, disponivel } = req.body;
        const data = {};
        if (nome !== undefined) data.nome = nome;
        if (capacidade !== undefined) data.capacidade = parseInt(capacidade);
        if (disponivel !== undefined) data.disponivel = disponivel;
        const espaco = await prisma.space.update({
            where: { id: parseInt(req.params.id) },
            data
        });
        res.json(espaco);
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
};

exports.deletar = async (req, res) => {
    try {
        await prisma.space.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ message: 'Espaço deletado!' });
    } catch (error) {
        res.status(400).json({ erro: 'Não é possível deletar um espaço com agendamentos.' });
    }
};

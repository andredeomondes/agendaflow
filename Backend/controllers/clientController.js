const prisma = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const emailService = require('../services/emailService');
const { normalizePhone, isValidPhone, DEFAULT_DDI } = require('../utils/phone');

exports.listar = async (req, res) => {
    const clientes = await prisma.client.findMany();
    res.json(clientes);
};

exports.criar = async (req, res) => {
    try {
        const { nome, telefone, email, senha } = req.body;
        const DEFAULT_SENHA = '123456';
        if (!nome || !telefone || !email || !senha) return res.status(400).json({ erro: "Nome, telefone, email e senha são obrigatórios." });
        if (senha.length < 4) return res.status(400).json({ erro: "A senha deve ter no mínimo 4 caracteres." });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ erro: "Email inválido." });
        if (!isValidPhone(telefone, DEFAULT_DDI)) return res.status(400).json({ erro: "Telefone inválido. Informe DDD e número." });

        const normalizedPhoneWithPlus = normalizePhone(telefone, DEFAULT_DDI);
        const normalizedPhone = normalizedPhoneWithPlus.slice(1); // remove leading '+'

        const data = { nome, telefone: normalizedPhone, email };
        data.senha = await bcrypt.hash(senha || DEFAULT_SENHA, 10);
        const cliente = await prisma.client.create({ data });
        emailService.enviarEmailCadastro(cliente);
        res.status(201).json(cliente);
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
};

exports.atualizar = async (req, res) => {
    try {
        const { nome, telefone, email, senha } = req.body;
        const data = {};
        if (nome !== undefined) data.nome = nome;
        if (telefone !== undefined) {
            const normalizedPhoneWithPlus = normalizePhone(telefone, DEFAULT_DDI);
            data.telefone = normalizedPhoneWithPlus.slice(1); // remove leading '+'
        }
        if (email !== undefined) data.email = email;
        if (senha) {
            data.senha = await bcrypt.hash(senha, 10);
        }
        const cliente = await prisma.client.update({
            where: { id: parseInt(req.params.id) },
            data
        });
        res.json(cliente);
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
};

exports.registroPublico = async (req, res) => {
    try {
        const { nome, telefone, email, senha } = req.body;
        if (!nome || !telefone || !email || !senha) return res.status(400).json({ erro: "Nome, telefone, email e senha são obrigatórios." });
        if (senha.length < 4) return res.status(400).json({ erro: "A senha deve ter no mínimo 4 caracteres." });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ erro: "Email inválido." });
        if (!isValidPhone(telefone, DEFAULT_DDI)) return res.status(400).json({ erro: "Telefone inválido. Informe DDD e número." });

        const normalizedPhoneWithPlus = normalizePhone(telefone, DEFAULT_DDI);
        const normalizedPhone = normalizedPhoneWithPlus.slice(1); // remove leading '+'

        const existente = await prisma.client.findUnique({ where: { email } });
        if (existente) return res.status(400).json({ erro: "Já existe um cliente com este email." });

        const confirmacaoToken = crypto.randomBytes(32).toString('hex');
        const data = {
            nome, telefone: normalizedPhone, email,
            senha: await bcrypt.hash(senha, 10),
            confirmacaoToken,
            emailVerificado: false
        };
        const cliente = await prisma.client.create({ data });
        emailService.enviarEmailVerificacao(cliente, confirmacaoToken);
        res.status(201).json({
            mensagem: "Cadastro realizado! Verifique seu email para ativar sua conta.",
            cliente: { id: cliente.id, nome: cliente.nome, email: cliente.email }
        });
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
};

exports.confirmarEmail = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) return res.status(400).json({ erro: "Token é obrigatório." });

        const cliente = await prisma.client.findUnique({ where: { confirmacaoToken: token } });
        if (!cliente) return res.status(400).json({ erro: "Token inválido ou expirado." });

        await prisma.client.update({
            where: { id: cliente.id },
            data: { emailVerificado: true, confirmacaoToken: null }
        });

        res.json({ mensagem: "Email confirmado com sucesso! Agora você pode fazer login." });
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
};

exports.reenviarVerificacao = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ erro: "Email é obrigatório." });

        const cliente = await prisma.client.findUnique({ where: { email } });
        if (!cliente) return res.status(404).json({ erro: "Cliente não encontrado." });
        if (cliente.emailVerificado) return res.status(400).json({ erro: "Email já verificado." });

        const confirmacaoToken = crypto.randomBytes(32).toString('hex');
        await prisma.client.update({
            where: { id: cliente.id },
            data: { confirmacaoToken }
        });

        emailService.enviarEmailVerificacao(cliente, confirmacaoToken);
        res.json({ mensagem: "Email de verificação reenviado!" });
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
};

exports.deletar = async (req, res) => {
    try {
        await prisma.client.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ message: 'Cliente deletado!' });
    } catch (error) {
        res.status(400).json({ erro: 'Não é possível deletar um cliente com agendamentos.' });
    }
};
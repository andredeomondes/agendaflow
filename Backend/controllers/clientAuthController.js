const prisma = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { normalizePhone, DEFAULT_DDI } = require('../utils/phone');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET não configurado. Defina a variável de ambiente JWT_SECRET.');
}
const JWT_SECRET = process.env.JWT_SECRET;
const DEFAULT_SENHA = '123456';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: parseInt(process.env.EMAIL_PORT) === 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.loginCliente = async (req, res) => {
    try {
        const { email, senha } = req.body;
        const cliente = await prisma.client.findUnique({ where: { email } });

        if (!cliente || !cliente.senha || !(await bcrypt.compare(senha, cliente.senha))) {
            return res.status(401).json({ erro: "Credenciais inválidas." });
        }

        if (!cliente.emailVerificado) {
            return res.status(403).json({ erro: "Confirme seu email antes de fazer login.", emailNaoVerificado: true });
        }

        const primeiroAcesso = await bcrypt.compare(DEFAULT_SENHA, cliente.senha);

        const token = jwt.sign({ id: cliente.id, role: 'client', clientId: cliente.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
            token,
            cliente: { id: cliente.id, nome: cliente.nome, email: cliente.email },
            primeiroAcesso
        });
    } catch (e) {
        res.status(500).json({ erro: "Erro interno no servidor" });
    }
};

exports.alterarSenha = async (req, res) => {
    try {
        const { clienteId, senhaAtual, novaSenha } = req.body;
        const cliente = await prisma.client.findUnique({ where: { id: clienteId } });

        if (!cliente) return res.status(404).json({ erro: "Cliente não encontrado." });

        if (!(await bcrypt.compare(senhaAtual, cliente.senha))) {
            return res.status(401).json({ erro: "Senha atual incorreta." });
        }

        if (!novaSenha || novaSenha.length < 4) {
            return res.status(400).json({ erro: "Nova senha deve ter no mínimo 4 caracteres." });
        }

        const hash = await bcrypt.hash(novaSenha, 10);
        await prisma.client.update({ where: { id: clienteId }, data: { senha: hash } });

        res.json({ mensagem: "Senha alterada com sucesso!" });
    } catch (e) {
        res.status(500).json({ erro: "Erro interno no servidor" });
    }
};

exports.atualizarDados = async (req, res) => {
    try {
        if (req.userRole !== 'client') return res.status(403).json({ erro: 'Apenas clientes' });
        const { nome, telefone, senhaAtual, novaSenha } = req.body;
        const cliente = await prisma.client.findUnique({ where: { id: req.userId } });
        if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado' });

        const data = {};
        if (nome) data.nome = nome;
        if (telefone) data.telefone = normalizePhone(telefone, DEFAULT_DDI);

        if (senhaAtual && novaSenha) {
            if (!cliente.senha) return res.status(400).json({ erro: 'Cliente não possui senha definida.' });
            if (!(await bcrypt.compare(senhaAtual, cliente.senha))) {
                return res.status(401).json({ erro: 'Senha atual incorreta.' });
            }
            if (novaSenha.length < 4) {
                return res.status(400).json({ erro: 'Nova senha deve ter no mínimo 4 caracteres.' });
            }
            data.senha = await bcrypt.hash(novaSenha, 10);
        }

        await prisma.client.update({ where: { id: req.userId }, data });
        res.json({ mensagem: 'Dados atualizados com sucesso!' });
    } catch (e) {
        res.status(500).json({ erro: 'Erro ao atualizar dados.' });
    }
};

exports.esqueciSenha = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ erro: "Email é obrigatório." });

        const cliente = await prisma.client.findUnique({ where: { email } });
        if (!cliente) return res.status(404).json({ erro: "Cliente não encontrado com este email." });

        const hash = await bcrypt.hash(DEFAULT_SENHA, 10);
        await prisma.client.update({ where: { id: cliente.id }, data: { senha: hash } });

        if (process.env.EMAIL_USER) {
            try {
                await transporter.sendMail({
                    from: process.env.EMAIL_FROM || '"AgendaFlow" <no-reply@agendaflow.com>',
                    to: cliente.email,
                    subject: 'Sua senha foi redefinida - AgendaFlow',
                    text: `Olá ${cliente.nome},\n\nSua senha foi redefinida para a senha padrão: ${DEFAULT_SENHA}\n\nRecomendamos que você troque a senha após o login.\n\nEquipe AgendaFlow`,
                    html: `<p>Olá <strong>${cliente.nome}</strong>,</p><p>Sua senha foi redefinida para a senha padrão: <strong>${DEFAULT_SENHA}</strong></p><p>Recomendamos que você troque a senha após o login.</p><p>Equipe AgendaFlow</p>`
                });
                console.log(`✅ Senha redefinida e email enviado para ${cliente.email}`);
            } catch (mailErr) {
                console.error("❌ Erro ao enviar email de redefinição:", mailErr);
            }
        }

        res.json({ mensagem: "Senha redefinida! Verifique seu email para mais instruções." });
    } catch (e) {
        res.status(500).json({ erro: "Erro interno no servidor" });
    }
};

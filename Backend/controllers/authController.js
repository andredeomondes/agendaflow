const prisma = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET não configurado. Defina a variável de ambiente JWT_SECRET.');
}
const JWT_SECRET = process.env.JWT_SECRET;

exports.login = async (req, res) => {
    try {
        const { email, senha } = req.body;
        const usuario = await prisma.user.findUnique({ where: { email } });

        // Banco de dados retorna "usuario.senha" (que é a senha já criptografada)
        if (!usuario || !(await bcrypt.compare(senha, usuario.senha))) {
            return res.status(401).json({ erro: "Credenciais inválidas." });
        }

        const token = jwt.sign({ id: usuario.id, role: usuario.role }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, usuario: { nome: usuario.nome, email: usuario.email } });
    } catch (e) {
        console.error("Erro no login:", e);
        res.status(500).json({ erro: "Erro interno no servidor" });
    }
};

exports.loginUnificado = async (req, res) => {
    try {
        const { email, senha } = req.body;

        const usuario = await prisma.user.findUnique({ where: { email } });
        if (usuario && (await bcrypt.compare(senha, usuario.senha))) {
            const token = jwt.sign({ id: usuario.id, role: 'admin' }, JWT_SECRET, { expiresIn: '1d' });
            return res.json({
                token,
                usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, role: 'admin' }
            });
        }

        const cliente = await prisma.client.findUnique({ where: { email } });
        if (cliente && cliente.senha && (await bcrypt.compare(senha, cliente.senha))) {
            if (!cliente.emailVerificado) {
                return res.status(403).json({ erro: "Confirme seu email antes de fazer login.", emailNaoVerificado: true });
            }
            const DEFAULT_SENHA = '123456';
            const primeiroAcesso = await bcrypt.compare(DEFAULT_SENHA, cliente.senha);
            const token = jwt.sign({ id: cliente.id, role: 'client', clientId: cliente.id }, JWT_SECRET, { expiresIn: '7d' });
            return res.json({
                token,
                usuario: { id: cliente.id, nome: cliente.nome, email: cliente.email, role: 'client' },
                primeiroAcesso
            });
        }

        return res.status(401).json({ erro: "Credenciais inválidas." });
    } catch (e) {
        console.error("Erro no login unificado:", e);
        res.status(500).json({ erro: "Erro interno no servidor" });
    }
};

exports.atualizarPerfil = async (req, res) => {
    try {
        const { nome, senhaAtual, novaSenha } = req.body;
        const usuario = await prisma.user.findUnique({ where: { id: req.userId } });
        if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });

        const data = {};
        if (nome) data.nome = nome;

        if (senhaAtual && novaSenha) {
            if (!(await bcrypt.compare(senhaAtual, usuario.senha))) {
                return res.status(401).json({ erro: 'Senha atual incorreta.' });
            }
            if (novaSenha.length < 4) {
                return res.status(400).json({ erro: 'Nova senha deve ter no mínimo 4 caracteres.' });
            }
            data.senha = await bcrypt.hash(novaSenha, 10);
        }

        const updated = await prisma.user.update({
            where: { id: req.userId },
            data,
            select: { id: true, nome: true, email: true }
        });

        res.json({ mensagem: 'Perfil atualizado com sucesso!', usuario: updated });
    } catch (e) {
        console.error("Erro ao atualizar perfil:", e);
        res.status(500).json({ erro: 'Erro ao atualizar perfil.' });
    }
};

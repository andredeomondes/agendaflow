const jwt = require('jsonwebtoken');
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET não configurado. Defina a variável de ambiente JWT_SECRET.');
}
const JWT_SECRET = process.env.JWT_SECRET;

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ erro: 'Token não fornecido' });

    const [, token] = authHeader.split(' ');

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id;
        req.userRole = decoded.role || 'admin';
        next();
    } catch (err) {
        return res.status(401).json({ erro: 'Token inválido' });
    }
};

module.exports.requireAdmin = (req, res, next) => {
    if (req.userRole !== 'admin') {
        return res.status(403).json({ erro: 'Acesso restrito a administradores' });
    }
    next();
};
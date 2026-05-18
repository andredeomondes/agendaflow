const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'Backend', '.env') });

let app;
try {
    app = require('../Backend/server');
} catch (e) {
    app = (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({ erro: 'Falha ao carregar servidor', detalhe: e.message, stack: e.stack });
    };
}

module.exports = app;

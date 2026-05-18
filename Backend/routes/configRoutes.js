const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const auth = require('../middlewares/authMiddleware');

router.get('/', auth, configController.buscar);
router.put('/', auth, auth.requireAdmin, configController.atualizar);

module.exports = router;

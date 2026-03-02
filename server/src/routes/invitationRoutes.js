const express = require('express');
const router = express.Router();
const invitationController = require('../controllers/invitationController');
const { authMiddleware, authorize } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

// --- Rotas Públicas (Uso do Convidado) ---
// Estes endpoints NÃO usam o middleware de proteção JWT
router.get('/access/:token', apiLimiter, invitationController.getPublicInvitation);
router.post('/access/:token/unlock', apiLimiter, invitationController.unlockByInvitation);

// --- Rotas Privadas (Gerenciamento) ---
router.use(authMiddleware);

router.get('/', invitationController.getInvitations);
router.post('/', invitationController.createInvitation);
router.delete('/:id', invitationController.deleteInvitation);

module.exports = router;

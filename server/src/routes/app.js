const express = require('express');
const router = express.Router();
const appController = require('../controllers/appController');
const { locationUserAuthMiddleware, requireSindico } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

router.use(apiLimiter);
router.use(locationUserAuthMiddleware);

router.get('/me', appController.getMe);
router.get('/automations', appController.getAutomations);
router.get('/relays', appController.getRelays);
router.get('/invitations', appController.getInvitations);
router.post('/invitations', appController.createInvitation);
router.delete('/invitations/:id', appController.deleteInvitation);
router.get('/logs', requireSindico, appController.getLogs);

module.exports = router;

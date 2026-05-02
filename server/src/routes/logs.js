const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const { authMiddleware, rejectInviteManager } = require('../middleware/auth');

router.use(authMiddleware);
router.use(rejectInviteManager);

router.get('/', logController.getLogs);
router.get('/stats', logController.getStats);

module.exports = router;

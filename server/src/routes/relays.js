const express = require('express');
const router = express.Router();
const relayController = require('../controllers/relayController');
const { authMiddleware, authorize } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

router.post('/public/qr-trigger', apiLimiter, relayController.triggerRelayByQrPublic);

router.use(authMiddleware);

router.get('/', relayController.getRelays);
router.post('/access/qr-trigger', authorize('admin', 'operator'), relayController.triggerRelayByQr);
router.get('/:id', relayController.getRelay);
router.get('/:id/access-qr', authorize('admin', 'operator'), relayController.generateRelayAccessQr);
router.post('/', authorize('admin', 'operator'), relayController.createRelay);
router.put('/:id', authorize('admin', 'operator'), relayController.updateRelay);
router.post('/:id/toggle', authorize('admin', 'operator'), relayController.toggleRelay);
router.delete('/:id', authorize('admin'), relayController.deleteRelay);

module.exports = router;

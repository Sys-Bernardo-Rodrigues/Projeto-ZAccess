const express = require('express');
const router = express.Router();
const relayController = require('../controllers/relayController');
const { authMiddleware, authorize } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', relayController.getRelays);
router.get('/:id', relayController.getRelay);
router.post('/', authorize('admin', 'operator'), relayController.createRelay);
router.put('/:id', authorize('admin', 'operator'), relayController.updateRelay);
router.post('/:id/toggle', authorize('admin', 'operator'), relayController.toggleRelay);
router.delete('/:id', authorize('admin'), relayController.deleteRelay);

module.exports = router;

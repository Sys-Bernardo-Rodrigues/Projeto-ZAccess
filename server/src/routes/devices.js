const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { authMiddleware, authorize, rejectInviteManager } = require('../middleware/auth');

router.use(authMiddleware);
router.use(rejectInviteManager);

router.get('/', deviceController.getDevices);
router.get('/:id', deviceController.getDevice);
router.post('/', authorize('admin'), deviceController.createDevice);
router.put('/:id', authorize('admin'), deviceController.updateDevice);
router.delete('/:id', authorize('admin'), deviceController.deleteDevice);
router.post('/:id/regenerate-token', authorize('admin', 'operator'), deviceController.regenerateAuthToken);
router.post('/:id/command', authorize('admin', 'operator'), deviceController.sendCommand);

module.exports = router;

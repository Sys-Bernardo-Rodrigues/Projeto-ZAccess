const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { authMiddleware, authorize } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', locationController.getLocations);
router.get('/:id', locationController.getLocation);
router.post('/', authorize('admin', 'operator'), locationController.createLocation);
router.put('/:id', authorize('admin', 'operator'), locationController.updateLocation);
router.delete('/:id', authorize('admin'), locationController.deleteLocation);

module.exports = router;

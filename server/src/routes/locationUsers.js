const express = require('express');
const router = express.Router({ mergeParams: true });
const locationUserController = require('../controllers/locationUserController');
const { authMiddleware, authorize } = require('../middleware/auth');

router.use(authMiddleware);
router.use(authorize('admin', 'operator'));

router.get('/', locationUserController.getByLocation);
router.post('/', locationUserController.create);
router.put('/:userId', locationUserController.update);
router.delete('/:userId', locationUserController.remove);

module.exports = router;

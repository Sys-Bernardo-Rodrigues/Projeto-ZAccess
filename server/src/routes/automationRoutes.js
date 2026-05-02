const express = require('express');
const router = express.Router();
const {
    getAutomations,
    createAutomation,
    updateAutomation,
    deleteAutomation
} = require('../controllers/automationController');
const { authMiddleware, authorize, rejectInviteManager } = require('../middleware/auth');

router.use(authMiddleware);
router.use(rejectInviteManager);

router.route('/')
    .get(getAutomations)
    .post(authorize('admin'), createAutomation);

router.route('/:id')
    .put(authorize('admin'), updateAutomation)
    .delete(authorize('admin'), deleteAutomation);

module.exports = router;

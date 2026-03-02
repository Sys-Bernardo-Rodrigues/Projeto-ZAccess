const express = require('express');
const router = express.Router();
const {
    getSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
} = require('../controllers/scheduleController');
const { authMiddleware, authorize } = require('../middleware/auth');

router.use(authMiddleware);

router
    .route('/')
    .get(getSchedules)
    .post(authorize('admin'), createSchedule);

router
    .route('/:id')
    .put(authorize('admin'), updateSchedule)
    .delete(authorize('admin'), deleteSchedule);

module.exports = router;

const express = require('express');
const router = express.Router();
const { getAccessReport } = require('../controllers/reportController');
const { authMiddleware, authorize } = require('../middleware/auth');

router.use(authMiddleware);
router.use(authorize('admin')); // Only admins can see reports

router.get('/access', getAccessReport);

module.exports = router;

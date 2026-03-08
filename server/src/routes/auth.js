const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/location-user/login', authLimiter, authController.locationUserLogin);
router.get('/me', authMiddleware, authController.getMe);
router.put('/update-password', authMiddleware, authController.updatePassword);

module.exports = router;

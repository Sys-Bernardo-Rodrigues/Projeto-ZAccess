const express = require('express');
const router = express.Router();
const {
    getInputs,
    createInput,
    updateInput,
    deleteInput,
} = require('../controllers/inputController');
const { authMiddleware, authorize } = require('../middleware/auth');

router.use(authMiddleware);

router
    .route('/')
    .get(getInputs)
    .post(authorize('admin'), createInput);

router
    .route('/:id')
    .put(authorize('admin'), updateInput)
    .delete(authorize('admin'), deleteInput);

module.exports = router;

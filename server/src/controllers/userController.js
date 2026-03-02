const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { apiResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });
        apiResponse(res, 200, { users });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return apiResponse(res, 404, null, 'Usuário não encontrado.');
        }
        apiResponse(res, 200, { user });
    } catch (error) {
        next(error);
    }
};

// @desc    Create user by admin
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return apiResponse(res, 409, null, 'Email já cadastrado.');
        }

        const user = await User.create({ name, email, password, role });

        await ActivityLog.create({
            action: 'device_registered', // Reusing for user registration log
            description: `Administrador ${req.user.name} criou o usuário ${user.email}`,
            userId: req.user._id,
        });

        apiResponse(res, 201, { user }, 'Usuário criado com sucesso.');
    } catch (error) {
        next(error);
    }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res, next) => {
    try {
        const { name, email, role, active } = req.body;

        let user = await User.findById(req.params.id);
        if (!user) {
            return apiResponse(res, 404, null, 'Usuário não encontrado.');
        }

        // Prevent admin from deactivating themselves or changing their own role (optional but safe)
        if (user._id.toString() === req.user._id.toString()) {
            if (active === false) return apiResponse(res, 400, null, 'Você não pode desativar sua própria conta.');
        }

        user = await User.findByIdAndUpdate(
            req.params.id,
            { name, email, role, active },
            { new: true, runValidators: true }
        );

        await ActivityLog.create({
            action: 'device_updated',
            description: `Administrador ${req.user.name} atualizou o usuário ${user.email}`,
            userId: req.user._id,
        });

        apiResponse(res, 200, { user }, 'Usuário atualizado com sucesso.');
    } catch (error) {
        next(error);
    }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return apiResponse(res, 404, null, 'Usuário não encontrado.');
        }

        if (user._id.toString() === req.user._id.toString()) {
            return apiResponse(res, 400, null, 'Você não pode excluir sua própria conta.');
        }

        await user.deleteOne();

        await ActivityLog.create({
            action: 'device_removed',
            description: `Administrador ${req.user.name} excluiu o usuário ${user.email}`,
            userId: req.user._id,
        });

        apiResponse(res, 200, null, 'Usuário removido com sucesso.');
    } catch (error) {
        next(error);
    }
};

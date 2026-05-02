const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { apiResponse, sanitizeObject } = require('../utils/helpers');
const { USER_PANEL_ROLES, isValidUserPanelRole } = require('../constants/userRoles');
const logger = require('../utils/logger');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
    try {
        const users = await User.find().populate('locationId', 'name address').sort({ createdAt: -1 });
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
        const user = await User.findById(req.params.id).populate('locationId', 'name address');
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
        const { name, email, password, role, locationId } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return apiResponse(res, 409, null, 'Email já cadastrado.');
        }

        const resolvedRole = role || 'operator';
        if (!isValidUserPanelRole(resolvedRole)) {
            return apiResponse(
                res,
                400,
                null,
                `Papel inválido. Use um dos seguintes: ${USER_PANEL_ROLES.join(', ')}.`
            );
        }

        if (resolvedRole === 'invite_manager' && !locationId) {
            return apiResponse(res, 400, null, 'Gestor de convites deve ter um local designado.');
        }

        if (!password || String(password).trim().length < 6) {
            return apiResponse(res, 400, null, 'Senha é obrigatória (mínimo 6 caracteres).');
        }

        const user = await User.create({
            name,
            email,
            password,
            role: resolvedRole,
            locationId: locationId && String(locationId).trim() ? locationId : undefined,
        });

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
        const { name, email, role, active, locationId } = req.body;

        let user = await User.findById(req.params.id);
        if (!user) {
            return apiResponse(res, 404, null, 'Usuário não encontrado.');
        }

        const nextRole = role !== undefined ? role : user.role;
        if (!isValidUserPanelRole(nextRole)) {
            return apiResponse(
                res,
                400,
                null,
                `Papel inválido. Use um dos seguintes: ${USER_PANEL_ROLES.join(', ')}.`
            );
        }

        const nextLocationId = locationId !== undefined ? (locationId === '' ? null : locationId) : user.locationId;

        if (nextRole === 'invite_manager' && !nextLocationId) {
            return apiResponse(res, 400, null, 'Gestor de convites deve ter um local designado.');
        }

        // Prevent admin from deactivating themselves or changing their own role (optional but safe)
        if (user._id.toString() === req.user._id.toString()) {
            if (active === false) return apiResponse(res, 400, null, 'Você não pode desativar sua própria conta.');
        }

        const updatePayload = sanitizeObject({
            name,
            email,
            role,
            active,
        });
        if (locationId !== undefined) {
            updatePayload.locationId = locationId === '' || locationId === null ? null : locationId;
        }

        user = await User.findByIdAndUpdate(req.params.id, updatePayload, {
            new: true,
            runValidators: true,
        });

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

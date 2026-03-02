const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const config = require('../config/env');
const { apiResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

const signToken = (id) => {
    return jwt.sign({ id }, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
    });
};

// POST /api/auth/register
exports.register = async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return apiResponse(res, 409, null, 'Email já cadastrado.');
        }

        const user = await User.create({ name, email, password, role });
        const token = signToken(user._id);

        logger.info(`New user registered: ${email}`);

        apiResponse(res, 201, { user, token }, 'Usuário criado com sucesso.');
    } catch (error) {
        next(error);
    }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return apiResponse(res, 400, null, 'Email e senha são obrigatórios.');
        }

        const user = await User.findOne({ email }).select('+password');
        if (!user || !(await user.comparePassword(password))) {
            return apiResponse(res, 401, null, 'Email ou senha incorretos.');
        }

        if (!user.active) {
            return apiResponse(res, 403, null, 'Conta desativada.');
        }

        const token = signToken(user._id);

        await ActivityLog.create({
            action: 'user_login',
            description: `Usuário ${user.name} fez login`,
            userId: user._id,
            ipAddress: req.ip,
        });

        logger.info(`User login: ${email}`);

        apiResponse(res, 200, { user, token }, 'Login realizado com sucesso.');
    } catch (error) {
        next(error);
    }
};

// GET /api/auth/me
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        apiResponse(res, 200, { user });
    } catch (error) {
        next(error);
    }
};

// PUT /api/auth/update-password
exports.updatePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user._id).select('+password');
        if (!(await user.comparePassword(currentPassword))) {
            return apiResponse(res, 401, null, 'Senha atual incorreta.');
        }

        user.password = newPassword;
        await user.save();

        const token = signToken(user._id);
        apiResponse(res, 200, { token }, 'Senha atualizada com sucesso.');
    } catch (error) {
        next(error);
    }
};

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const LocationUser = require('../models/LocationUser');
const Location = require('../models/Location');
const ActivityLog = require('../models/ActivityLog');
const config = require('../config/env');
const { apiResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

const signToken = (id) => {
    return jwt.sign({ id }, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
    });
};

/** Token para usuários do local (app): id + locationId + role + type */
const signLocationUserToken = (locationUser) => {
    return jwt.sign(
        {
            id: locationUser._id,
            locationId: locationUser.locationId.toString(),
            role: locationUser.role,
            type: 'location_user',
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );
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

        const userPopulated = await User.findById(user._id).populate('locationId', 'name address');
        const userResponse = userPopulated ? userPopulated.toJSON ? userPopulated.toJSON() : userPopulated : user;

        apiResponse(res, 200, { user: userResponse, token }, 'Login realizado com sucesso.');
    } catch (error) {
        next(error);
    }
};

// GET /api/auth/me
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).populate('locationId', 'name address');
        const userJson = user ? (user.toJSON ? user.toJSON() : user) : null;
        apiResponse(res, 200, { user: userJson });
    } catch (error) {
        next(error);
    }
};

// POST /api/auth/location-user/login (app moradores/síndicos)
exports.locationUserLogin = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return apiResponse(res, 400, null, 'E-mail e senha são obrigatórios.');
        }

        const locationUser = await LocationUser.findOne({
            email: email.toLowerCase().trim(),
            active: true,
        })
            .select('+password')
            .populate('locationId', 'name address');

        if (!locationUser || !(await locationUser.comparePassword(password))) {
            return apiResponse(res, 401, null, 'E-mail ou senha incorretos.');
        }

        const token = signLocationUserToken(locationUser);
        const userJson = locationUser.toJSON ? locationUser.toJSON() : locationUser;
        const location = locationUser.locationId;

        apiResponse(res, 200, {
            user: userJson,
            location: location ? { _id: location._id, name: location.name, address: location.address } : null,
            token,
            role: locationUser.role,
        }, 'Login realizado com sucesso.');
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

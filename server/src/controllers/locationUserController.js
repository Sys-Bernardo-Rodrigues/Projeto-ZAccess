const bcrypt = require('bcryptjs');
const LocationUser = require('../models/LocationUser');
const Location = require('../models/Location');
const { apiResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * Lista usuários do local (moradores/síndicos)
 * GET /api/locations/:locationId/users
 */
exports.getByLocation = async (req, res, next) => {
    try {
        const { locationId } = req.params;
        const location = await Location.findOne({ _id: locationId, active: true });
        if (!location) {
            return apiResponse(res, 404, null, 'Local não encontrado.');
        }

        const users = await LocationUser.find({ locationId })
            .select('-password')
            .sort({ role: 1, name: 1 });

        apiResponse(res, 200, { users, count: users.length });
    } catch (error) {
        next(error);
    }
};

/**
 * Cria usuário do local
 * POST /api/locations/:locationId/users
 */
exports.create = async (req, res, next) => {
    try {
        const { locationId } = req.params;
        const { name, email, password, role, phone, unit } = req.body;

        const location = await Location.findOne({ _id: locationId, active: true });
        if (!location) {
            return apiResponse(res, 404, null, 'Local não encontrado.');
        }

        const existing = await LocationUser.findOne({ locationId, email: email?.toLowerCase() });
        if (existing) {
            return apiResponse(res, 409, null, 'Já existe um usuário com este e-mail neste local.');
        }

        const user = await LocationUser.create({
            locationId,
            name,
            email: email?.toLowerCase(),
            password,
            role: role || 'morador',
            phone: phone || undefined,
            unit: unit || undefined,
            createdBy: req.user._id,
        });

        const userJson = user.toJSON ? user.toJSON() : user;
        logger.info(`LocationUser created: ${user.email} @ location ${locationId}`);
        apiResponse(res, 201, { user: userJson }, 'Usuário do local criado com sucesso.');
    } catch (error) {
        next(error);
    }
};

/**
 * Atualiza usuário do local
 * PUT /api/locations/:locationId/users/:userId
 */
exports.update = async (req, res, next) => {
    try {
        const { locationId, userId } = req.params;
        const { name, email, password, role, phone, unit, active } = req.body;

        const locationUser = await LocationUser.findOne({
            _id: userId,
            locationId,
        });

        if (!locationUser) {
            return apiResponse(res, 404, null, 'Usuário do local não encontrado.');
        }

        if (email && email.toLowerCase() !== locationUser.email) {
            const existing = await LocationUser.findOne({
                locationId,
                email: email.toLowerCase(),
                _id: { $ne: userId },
            });
            if (existing) {
                return apiResponse(res, 409, null, 'Já existe um usuário com este e-mail neste local.');
            }
        }

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (email !== undefined) updates.email = email.toLowerCase();
        if (password !== undefined && password.length >= 6) {
            updates.password = await bcrypt.hash(password, 12);
        }
        if (role !== undefined) updates.role = role;
        if (phone !== undefined) updates.phone = phone;
        if (unit !== undefined) updates.unit = unit;
        if (active !== undefined) updates.active = active;

        const updated = await LocationUser.findByIdAndUpdate(
            userId,
            updates,
            { new: true, runValidators: true }
        ).select('-password');

        apiResponse(res, 200, { user: updated }, 'Usuário do local atualizado.');
    } catch (error) {
        next(error);
    }
};

/**
 * Remove usuário do local
 * DELETE /api/locations/:locationId/users/:userId
 */
exports.remove = async (req, res, next) => {
    try {
        const { locationId, userId } = req.params;

        const locationUser = await LocationUser.findOneAndDelete({
            _id: userId,
            locationId,
        });

        if (!locationUser) {
            return apiResponse(res, 404, null, 'Usuário do local não encontrado.');
        }

        logger.info(`LocationUser removed: ${locationUser.email} from location ${locationId}`);
        apiResponse(res, 200, null, 'Usuário do local removido.');
    } catch (error) {
        next(error);
    }
};

const Location = require('../models/Location');
const { apiResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

// GET /api/locations
exports.getLocations = async (req, res, next) => {
    try {
        const locations = await Location.find({ active: true })
            .populate('devices')
            .sort({ createdAt: -1 });

        apiResponse(res, 200, { locations, count: locations.length });
    } catch (error) {
        next(error);
    }
};

// GET /api/locations/:id
exports.getLocation = async (req, res, next) => {
    try {
        const location = await Location.findById(req.params.id).populate('devices');

        if (!location) {
            return apiResponse(res, 404, null, 'Local não encontrado.');
        }

        apiResponse(res, 200, { location });
    } catch (error) {
        next(error);
    }
};

// POST /api/locations
exports.createLocation = async (req, res, next) => {
    try {
        const { name, address, description, coordinates } = req.body;

        const location = await Location.create({
            name,
            address,
            description,
            coordinates,
            createdBy: req.user._id,
        });

        logger.info(`Location created: ${name}`);
        apiResponse(res, 201, { location }, 'Local criado com sucesso.');
    } catch (error) {
        next(error);
    }
};

// PUT /api/locations/:id
exports.updateLocation = async (req, res, next) => {
    try {
        const location = await Location.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!location) {
            return apiResponse(res, 404, null, 'Local não encontrado.');
        }

        apiResponse(res, 200, { location }, 'Local atualizado com sucesso.');
    } catch (error) {
        next(error);
    }
};

// DELETE /api/locations/:id (soft delete)
exports.deleteLocation = async (req, res, next) => {
    try {
        const location = await Location.findByIdAndUpdate(
            req.params.id,
            { active: false },
            { new: true }
        );

        if (!location) {
            return apiResponse(res, 404, null, 'Local não encontrado.');
        }

        apiResponse(res, 200, null, 'Local removido com sucesso.');
    } catch (error) {
        next(error);
    }
};

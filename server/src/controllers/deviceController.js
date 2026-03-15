const Device = require('../models/Device');
const ActivityLog = require('../models/ActivityLog');
const { apiResponse, generateSerialNumber, generateAuthToken } = require('../utils/helpers');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

// GET /api/devices
exports.getDevices = async (req, res, next) => {
    try {
        const { status, locationId } = req.query;
        const filter = { active: true };

        if (status) filter.status = status;
        if (locationId) filter.locationId = locationId;

        const devices = await Device.find(filter)
            .populate('locationId', 'name address')
            .populate('relays')
            .sort({ createdAt: -1 })
            .lean(); // Objetos simples com todos os campos (name, status, health, ipAddress, etc.)

        apiResponse(res, 200, { devices, count: devices.length });
    } catch (error) {
        next(error);
    }
};

// GET /api/devices/:id
exports.getDevice = async (req, res, next) => {
    try {
        const device = await Device.findById(req.params.id)
            .select('+authToken')
            .populate('locationId', 'name address')
            .populate('relays');

        if (!device) {
            return apiResponse(res, 404, null, 'Dispositivo não encontrado.');
        }

        // Buscar status em tempo real do Redis
        const redis = getRedisClient();
        const cachedStatus = await redis.get(`device:status:${device._id}`);
        const deviceObj = device.toObject();
        if (cachedStatus) {
            deviceObj.realtimeStatus = JSON.parse(cachedStatus);
        }

        apiResponse(res, 200, { device: deviceObj });
    } catch (error) {
        next(error);
    }
};

// POST /api/devices
exports.createDevice = async (req, res, next) => {
    try {
        const { name, locationId, metadata, ipAddress } = req.body;
        const serialNumber = req.body.serialNumber || generateSerialNumber();
        const authToken = generateAuthToken();

        const device = await Device.create({
            name,
            serialNumber,
            locationId,
            metadata,
            ipAddress,
            authToken,
        });

        await ActivityLog.create({
            action: 'device_registered',
            description: `Dispositivo ${name} (${serialNumber}) registrado`,
            deviceId: device._id,
            userId: req.user._id,
        });

        logger.info(`Device registered: ${name} (${serialNumber})`);
        const deviceObj = device.toObject();
        apiResponse(res, 201, { device: deviceObj, authToken }, 'Dispositivo registrado. Copie o token para configurar o dispositivo.');
    } catch (error) {
        next(error);
    }
};

// PUT /api/devices/:id
exports.updateDevice = async (req, res, next) => {
    try {
        const device = await Device.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('locationId', 'name address');

        if (!device) {
            return apiResponse(res, 404, null, 'Dispositivo não encontrado.');
        }

        await ActivityLog.create({
            action: 'device_updated',
            description: `Dispositivo ${device.name} atualizado`,
            deviceId: device._id,
            userId: req.user._id,
        });

        apiResponse(res, 200, { device }, 'Dispositivo atualizado com sucesso.');
    } catch (error) {
        next(error);
    }
};

// DELETE /api/devices/:id (soft delete)
exports.deleteDevice = async (req, res, next) => {
    try {
        const device = await Device.findByIdAndUpdate(
            req.params.id,
            { active: false, status: 'offline' },
            { new: true }
        );

        if (!device) {
            return apiResponse(res, 404, null, 'Dispositivo não encontrado.');
        }

        await ActivityLog.create({
            action: 'device_removed',
            description: `Dispositivo ${device.name} removido`,
            deviceId: device._id,
            userId: req.user._id,
        });

        apiResponse(res, 200, null, 'Dispositivo removido com sucesso.');
    } catch (error) {
        next(error);
    }
};

// POST /api/devices/:id/regenerate-token
exports.regenerateAuthToken = async (req, res, next) => {
    try {
        const device = await Device.findById(req.params.id).select('+authToken');
        if (!device) {
            return apiResponse(res, 404, null, 'Dispositivo não encontrado.');
        }
        const authToken = generateAuthToken();
        device.authToken = authToken;
        await device.save();

        await ActivityLog.create({
            action: 'device_updated',
            description: `Token do dispositivo ${device.name} regenerado`,
            deviceId: device._id,
            userId: req.user._id,
        });

        logger.info(`Auth token regenerated for device: ${device.name}`);
        apiResponse(res, 200, { authToken }, 'Token regenerado. Atualize a configuração do dispositivo.');
    } catch (error) {
        next(error);
    }
};

// POST /api/devices/:id/command
exports.sendCommand = async (req, res, next) => {
    try {
        const { command, payload } = req.body;
        const device = await Device.findById(req.params.id);

        if (!device) {
            return apiResponse(res, 404, null, 'Dispositivo não encontrado.');
        }

        if (device.status !== 'online') {
            return apiResponse(res, 400, null, 'Dispositivo está offline.');
        }

        // Enviar comando via Socket.IO (dispositivos no namespace /devices)
        const io = req.app.get('io');
        if (device.socketId) {
            io.of('/devices').to(device.socketId).emit('device:command', {
                command,
                payload,
                timestamp: new Date().toISOString(),
            });

            await ActivityLog.create({
                action: 'command_sent',
                description: `Comando "${command}" enviado para ${device.name}`,
                deviceId: device._id,
                userId: req.user._id,
                metadata: { command, payload },
            });

            apiResponse(res, 200, null, 'Comando enviado com sucesso.');
        } else {
            apiResponse(res, 400, null, 'Dispositivo sem conexão WebSocket ativa.');
        }
    } catch (error) {
        next(error);
    }
};

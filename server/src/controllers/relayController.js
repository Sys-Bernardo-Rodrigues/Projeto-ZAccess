const Relay = require('../models/Relay');
const Device = require('../models/Device');
const ActivityLog = require('../models/ActivityLog');
const Schedule = require('../models/Schedule');
const Invitation = require('../models/Invitation');
const Automation = require('../models/Automation');
const { pushDeviceConfig } = require('../services/deviceSyncService');
const { apiResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

// GET /api/relays?deviceId=xxx
exports.getRelays = async (req, res, next) => {
    try {
        const { deviceId } = req.query;
        const filter = { active: true };
        if (deviceId) filter.deviceId = deviceId;
        if (req.allowedLocationId) {
            const deviceIds = await Device.find({ locationId: req.allowedLocationId, active: true }).select('_id');
            filter.deviceId = { $in: deviceIds.map((d) => d._id) };
        }

        const relays = await Relay.find(filter)
            .populate('deviceId', 'name serialNumber status locationId')
            .sort({ channel: 1 });

        apiResponse(res, 200, { relays, count: relays.length });
    } catch (error) {
        next(error);
    }
};

// GET /api/relays/:id
exports.getRelay = async (req, res, next) => {
    try {
        const relay = await Relay.findById(req.params.id)
            .populate('deviceId', 'name serialNumber status socketId locationId');

        if (!relay) {
            return apiResponse(res, 404, null, 'Relé não encontrado.');
        }
        if (req.allowedLocationId && relay.deviceId?.locationId?.toString() !== req.allowedLocationId.toString()) {
            return apiResponse(res, 403, null, 'Acesso a este relé não permitido.');
        }

        apiResponse(res, 200, { relay });
    } catch (error) {
        next(error);
    }
};

// POST /api/relays
exports.createRelay = async (req, res, next) => {
    try {
        const { name, type, gpioPin, channel, mode, pulseDuration, deviceId } = req.body;

        // Verificar se dispositivo existe
        const device = await Device.findById(deviceId);
        if (!device) {
            return apiResponse(res, 404, null, 'Dispositivo não encontrado.');
        }

        const relay = await Relay.create({
            name,
            type,
            gpioPin,
            channel,
            mode,
            pulseDuration,
            deviceId,
        });

        await ActivityLog.create({
            action: 'relay_created',
            description: `Relé "${name}" criado no canal ${channel} do dispositivo ${device.name}`,
            deviceId,
            relayId: relay._id,
            userId: req.user._id,
        });

        logger.info(`Relay created: ${name} on channel ${channel} (device: ${device.name})`);

        const io = req.app.get('io');
        if (io) await pushDeviceConfig(io, deviceId);

        apiResponse(res, 201, { relay }, 'Relé criado com sucesso.');
    } catch (error) {
        next(error);
    }
};

// PUT /api/relays/:id
exports.updateRelay = async (req, res, next) => {
    try {
        const relay = await Relay.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('deviceId', 'name serialNumber');

        if (!relay) {
            return apiResponse(res, 404, null, 'Relé não encontrado.');
        }

        await ActivityLog.create({
            action: 'relay_updated',
            description: `Relé "${relay.name}" atualizado`,
            deviceId: relay.deviceId._id,
            relayId: relay._id,
            userId: req.user._id,
        });

        const io = req.app.get('io');
        const deviceId = relay.deviceId._id || relay.deviceId;
        if (io && deviceId) await pushDeviceConfig(io, deviceId);

        apiResponse(res, 200, { relay }, 'Relé atualizado com sucesso.');
    } catch (error) {
        next(error);
    }
};

// POST /api/relays/:id/toggle
exports.toggleRelay = async (req, res, next) => {
    try {
        const relay = await Relay.findById(req.params.id)
            .populate('deviceId', 'name serialNumber status socketId');

        if (!relay) {
            return apiResponse(res, 404, null, 'Relé não encontrado.');
        }

        const device = relay.deviceId;
        if (device.status !== 'online') {
            return apiResponse(res, 400, null, 'Dispositivo está offline.');
        }

        if (!device.socketId) {
            return apiResponse(res, 400, null, 'Dispositivo sem conexão WebSocket.');
        }

        const newState = relay.state === 'closed' ? 'open' : 'closed';
        const io = req.app.get('io');

        // Enviar comando para o dispositivo via WebSocket (namespace /devices)
        io.of('/devices').to(device.socketId).emit('relay:toggle', {
            relayId: relay._id,
            channel: relay.channel,
            gpioPin: relay.gpioPin,
            targetState: newState,
            mode: relay.mode,
            pulseDuration: relay.pulseDuration,
            timestamp: new Date().toISOString(),
        });

        // Atualizar o estado no banco
        relay.state = newState;
        relay.lastToggled = new Date();
        await relay.save();

        const action = newState === 'open' ? 'relay_activated' : 'relay_deactivated';
        await ActivityLog.create({
            action,
            description: `Relé "${relay.name}" ${newState === 'open' ? 'ativado' : 'desativado'}`,
            deviceId: device._id,
            relayId: relay._id,
            userId: req.user._id,
        });

        logger.info(`Relay toggled: ${relay.name} -> ${newState}`);
        apiResponse(res, 200, { relay, newState }, `Relé ${newState === 'open' ? 'ativado' : 'desativado'} com sucesso.`);
    } catch (error) {
        next(error);
    }
};

// DELETE /api/relays/:id (exclusão real para liberar GPIO/canal para novo cadastro)
exports.deleteRelay = async (req, res, next) => {
    try {
        const relayId = req.params.id;
        const relay = await Relay.findById(relayId).populate('deviceId', '_id');
        if (!relay) {
            return apiResponse(res, 404, null, 'Relé não encontrado.');
        }

        const deviceId = relay.deviceId?._id || relay.deviceId;
        const relayObjId = relay._id;

        // Remove referências em agendamentos
        await Schedule.updateMany(
            { relayIds: relayObjId },
            { $pull: { relayIds: relayObjId } }
        );
        await Schedule.updateMany(
            { relayId: relayObjId },
            { $unset: { relayId: 1 } }
        );
        await Schedule.deleteMany({
            $and: [
                { $or: [{ relayId: { $exists: false } }, { relayId: null }] },
                { $or: [{ relayIds: [] }, { relayIds: { $exists: false } }] },
            ],
        });

        // Remove do array relayIds dos convites; desativa convite se ficar sem portas
        await Invitation.updateMany(
            { relayIds: relayObjId },
            { $pull: { relayIds: relayObjId } }
        );
        await Invitation.updateMany(
            { relayIds: { $size: 0 } },
            { $set: { active: false } }
        );

        // Desativa automações que usavam este relé (relayId é obrigatório no schema)
        await Automation.updateMany({ 'action.relayId': relayObjId }, { enabled: false });

        await Relay.findByIdAndDelete(relayId);

        const io = req.app.get('io');
        if (io && deviceId) await pushDeviceConfig(io, deviceId);

        apiResponse(res, 200, null, 'Relé removido com sucesso.');
    } catch (error) {
        next(error);
    }
};

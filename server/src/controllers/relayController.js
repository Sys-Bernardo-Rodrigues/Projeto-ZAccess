const Relay = require('../models/Relay');
const Device = require('../models/Device');
const ActivityLog = require('../models/ActivityLog');
const Schedule = require('../models/Schedule');
const Invitation = require('../models/Invitation');
const Automation = require('../models/Automation');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { pushDeviceConfig } = require('../services/deviceSyncService');
const { apiResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

const toggleRelayInternal = async ({ relayId, app, userId, source = 'manual', logMetadata = {} }) => {
    const relay = await Relay.findById(relayId)
        .populate('deviceId', 'name serialNumber status socketId locationId');

    if (!relay) {
        return { statusCode: 404, message: 'Relé não encontrado.' };
    }

    const device = relay.deviceId;
    if (device.status !== 'online') {
        return { statusCode: 400, message: 'Dispositivo está offline.' };
    }

    if (!device.socketId) {
        return { statusCode: 400, message: 'Dispositivo sem conexão WebSocket.' };
    }

    const newState = relay.state === 'closed' ? 'open' : 'closed';
    const io = app.get('io');

    io.of('/devices').to(device.socketId).emit('relay:toggle', {
        relayId: relay._id,
        channel: relay.channel,
        gpioPin: relay.gpioPin,
        targetState: newState,
        mode: relay.mode,
        pulseDuration: relay.pulseDuration,
        timestamp: new Date().toISOString(),
    });

    relay.state = newState;
    relay.lastToggled = new Date();
    await relay.save();

    const action = newState === 'open' ? 'relay_activated' : 'relay_deactivated';
    const metaKeys = Object.keys(logMetadata || {});
    await ActivityLog.create({
        action,
        description: `Relé "${relay.name}" ${newState === 'open' ? 'ativado' : 'desativado'} via ${source}`,
        deviceId: device._id,
        relayId: relay._id,
        userId: userId || null,
        ...(metaKeys.length ? { metadata: logMetadata } : {}),
    });

    logger.info(`Relay toggled (${source}): ${relay.name} -> ${newState}`);

    return {
        statusCode: 200,
        message: `Relé ${newState === 'open' ? 'ativado' : 'desativado'} com sucesso.`,
        data: { relay, newState },
    };
};

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
        const result = await toggleRelayInternal({
            relayId: req.params.id,
            app: req.app,
            userId: req.user?._id,
            source: 'painel',
        });
        apiResponse(res, result.statusCode, result.data || null, result.message);
    } catch (error) {
        next(error);
    }
};

// GET /api/relays/:id/access-qr
exports.generateRelayAccessQr = async (req, res, next) => {
    try {
        const relay = await Relay.findById(req.params.id)
            .populate('deviceId', 'name locationId');

        if (!relay) {
            return apiResponse(res, 404, null, 'Relé não encontrado.');
        }

        const relayLocationId = relay.deviceId?.locationId?.toString();
        if (req.allowedLocationId && relayLocationId !== req.allowedLocationId.toString()) {
            return apiResponse(res, 403, null, 'Acesso a este relé não permitido.');
        }

        const token = jwt.sign(
            {
                type: 'relay_qr',
                relayId: relay._id.toString(),
            },
            config.jwt.secret,
            { expiresIn: '365d' }
        );

        const publicPath = `/relay-qr/${token}`;

        apiResponse(res, 200, {
            token,
            publicPath,
            relay: {
                id: relay._id,
                name: relay.name,
                deviceName: relay.deviceId?.name || '',
            },
        }, 'QR gerado. O convidado deve ler este código apenas na página do convite (/invite/…).');
    } catch (error) {
        next(error);
    }
};

// POST /api/relays/access/qr-trigger
exports.triggerRelayByQr = async (req, res, next) => {
    try {
        const { token } = req.body;
        if (!token) {
            return apiResponse(res, 400, null, 'Token QR é obrigatório.');
        }

        const decoded = jwt.verify(token, config.jwt.secret);
        if (decoded.type !== 'relay_qr' || !decoded.relayId) {
            return apiResponse(res, 400, null, 'Token QR inválido.');
        }

        const relay = await Relay.findById(decoded.relayId).populate('deviceId', 'locationId');
        if (!relay) {
            return apiResponse(res, 404, null, 'Relé não encontrado.');
        }

        const relayLocationId = relay.deviceId?.locationId?.toString();
        if (req.allowedLocationId && relayLocationId !== req.allowedLocationId.toString()) {
            return apiResponse(res, 403, null, 'Sem permissão para acionar este relé.');
        }

        const result = await toggleRelayInternal({
            relayId: decoded.relayId,
            app: req.app,
            userId: req.user?._id,
            source: 'qr_code',
        });
        apiResponse(res, result.statusCode, result.data || null, result.message);
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return apiResponse(res, 400, null, 'QR Code inválido ou expirado.');
        }
        next(error);
    }
};

// POST /api/relays/public/qr-trigger
// Exige inviteToken: só funciona no contexto da página /invite/:token (leitor de QR do convite).
exports.triggerRelayByQrPublic = async (req, res, next) => {
    try {
        const { token, inviteToken } = req.body;
        if (!token) {
            return apiResponse(res, 400, null, 'Token QR é obrigatório.');
        }
        if (!inviteToken || typeof inviteToken !== 'string' || !inviteToken.trim()) {
            return apiResponse(res, 400, null, 'Este QR da porta só funciona dentro do link de convite. Abra /invite/… no navegador e use «Ler QR Code para liberar».');
        }

        const invitation = await Invitation.findOne({ token: inviteToken.trim(), active: true })
            .populate({
                path: 'relayIds',
                populate: { path: 'deviceId' },
            });

        if (!invitation) {
            return apiResponse(res, 404, null, 'Convite não encontrado ou inválido.');
        }

        const now = new Date();
        if (now < invitation.validFrom) {
            return apiResponse(res, 403, null, 'Este convite ainda não é válido.');
        }
        if (now > invitation.validUntil) {
            return apiResponse(res, 403, null, 'Este convite expirou.');
        }

        let decoded;
        try {
            decoded = jwt.verify(token, config.jwt.secret);
        } catch (err) {
            if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
                return apiResponse(res, 400, null, 'QR Code inválido ou expirado.');
            }
            throw err;
        }
        if (decoded.type !== 'relay_qr' || !decoded.relayId) {
            return apiResponse(res, 400, null, 'Token QR inválido.');
        }

        const relayAllowed = invitation.relayIds.some(
            (r) => (r._id || r).toString() === decoded.relayId
        );
        if (!relayAllowed) {
            return apiResponse(res, 403, null, 'Esta porta não faz parte deste convite.');
        }

        const result = await toggleRelayInternal({
            relayId: decoded.relayId,
            app: req.app,
            source: 'qr_public_invite',
            logMetadata: { guestName: invitation.name, viaInviteQr: true },
        });

        apiResponse(res, result.statusCode, result.data || null, result.message);
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

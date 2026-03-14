const Device = require('../models/Device');
const Relay = require('../models/Relay');
const Input = require('../models/Input');
const Automation = require('../models/Automation');
const Invitation = require('../models/Invitation');
const ActivityLog = require('../models/ActivityLog');
const Location = require('../models/Location');
const LocationUser = require('../models/LocationUser');
const { apiResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

/** Helper: deviceIds e relayIds do local */
async function getLocationDeviceAndRelayIds(locationId) {
    const devices = await Device.find({ locationId, active: true }).select('_id');
    const deviceIds = devices.map((d) => d._id);
    const relays = await Relay.find({ deviceId: { $in: deviceIds } }).select('_id');
    const relayIds = relays.map((r) => r._id);
    const inputs = await Input.find({ deviceId: { $in: deviceIds } }).select('_id');
    const inputIds = inputs.map((i) => i._id);
    return { deviceIds, relayIds, inputIds };
}

// GET /api/app/me
exports.getMe = async (req, res, next) => {
    try {
        const locationUser = await LocationUser.findById(req.locationUser._id)
            .select('-password')
            .populate('locationId', 'name address');
        const location = locationUser.locationId;
        apiResponse(res, 200, {
            user: locationUser,
            location: location ? { _id: location._id, name: location.name, address: location.address } : null,
            role: req.locationUserRole,
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/app/automations – automações do local
exports.getAutomations = async (req, res, next) => {
    try {
        const { inputIds, relayIds } = await getLocationDeviceAndRelayIds(req.locationId);

        if (inputIds.length === 0 || relayIds.length === 0) {
            return apiResponse(res, 200, { automations: [], count: 0 });
        }

        const automations = await Automation.find({
            'trigger.inputId': { $in: inputIds },
            'action.relayId': { $in: relayIds },
            enabled: true,
        })
            .populate('trigger.inputId', 'name state')
            .populate('action.relayId', 'name state')
            .sort({ createdAt: -1 });

        apiResponse(res, 200, { automations, count: automations.length });
    } catch (error) {
        next(error);
    }
};

// GET /api/app/relays – relés do local (para convites e exibição)
exports.getRelays = async (req, res, next) => {
    try {
        const devices = await Device.find({ locationId: req.locationId, active: true }).select('_id name');
        const deviceIds = devices.map((d) => d._id);
        const relays = await Relay.find({ deviceId: { $in: deviceIds }, active: true })
            .populate('deviceId', 'name')
            .sort({ name: 1 });

        apiResponse(res, 200, { relays, count: relays.length });
    } catch (error) {
        next(error);
    }
};

// GET /api/app/invitations – convites do local
exports.getInvitations = async (req, res, next) => {
    try {
        const invitations = await Invitation.find({
            locationId: req.locationId,
            active: true,
        })
            .populate({
                path: 'relayIds',
                select: 'name',
                populate: { path: 'deviceId', select: 'name' },
            })
            .sort({ validUntil: -1 });

        apiResponse(res, 200, { invitations, count: invitations.length });
    } catch (error) {
        next(error);
    }
};

// POST /api/app/invitations – criar convite (morador/síndico)
exports.createInvitation = async (req, res, next) => {
    try {
        const { name, relayIds, validFrom, validUntil } = req.body;

        if (!name || !relayIds || !Array.isArray(relayIds) || relayIds.length === 0 || !validFrom || !validUntil) {
            return apiResponse(res, 400, null, 'Preencha nome, pelo menos uma porta e o período de validade.');
        }

        const dateFrom = new Date(validFrom);
        const dateUntil = new Date(validUntil);
        if (isNaN(dateFrom.getTime()) || isNaN(dateUntil.getTime()) || dateFrom >= dateUntil) {
            return apiResponse(res, 400, null, 'Datas inválidas.');
        }

        const { relayIds: allowedRelayIds } = await getLocationDeviceAndRelayIds(req.locationId);
        const validRelayIds = relayIds.filter((id) => allowedRelayIds.some((r) => r.toString() === id.toString()));
        if (validRelayIds.length === 0) {
            return apiResponse(res, 400, null, 'Nenhuma porta válida do seu local foi selecionada.');
        }

        const invitation = await Invitation.create({
            name,
            relayIds: validRelayIds,
            validFrom: dateFrom,
            validUntil: dateUntil,
            locationId: req.locationId,
            createdByLocationUser: req.locationUser._id,
        });

        const populated = await Invitation.findById(invitation._id).populate({
            path: 'relayIds',
            select: 'name',
            populate: { path: 'deviceId', select: 'name' },
        });

        apiResponse(res, 201, { invitation: populated }, 'Convite criado com sucesso.');
    } catch (error) {
        next(error);
    }
};

// DELETE /api/app/invitations/:id – só próprio convite ou síndico
exports.deleteInvitation = async (req, res, next) => {
    try {
        const invitation = await Invitation.findOne({
            _id: req.params.id,
            locationId: req.locationId,
        });

        if (!invitation) {
            return apiResponse(res, 404, null, 'Convite não encontrado.');
        }

        const isOwner = invitation.createdByLocationUser?.toString() === req.locationUser._id.toString();
        const isSindico = req.locationUserRole === 'sindico';
        if (!isOwner && !isSindico) {
            return apiResponse(res, 403, null, 'Sem permissão para remover este convite.');
        }

        invitation.active = false;
        await invitation.save();
        apiResponse(res, 200, null, 'Convite removido.');
    } catch (error) {
        next(error);
    }
};

// GET /api/app/logs – verificações de acessos e uso de automações (apenas síndico)
exports.getLogs = async (req, res, next) => {
    try {
        const { deviceIds, relayIds } = await getLocationDeviceAndRelayIds(req.locationId);

        const actions = [
            'relay_activated',
            'relay_deactivated',
            'public_access_invitation',
            'automation_executed',
            'schedule_executed',
            'command_sent',
        ];

        const logs = await ActivityLog.find({
            $or: [{ deviceId: { $in: deviceIds } }, { relayId: { $in: relayIds } }],
            action: { $in: actions },
        })
            .sort({ createdAt: -1 })
            .limit(200)
            .populate('deviceId', 'name')
            .populate('relayId', 'name')
            .lean();

        apiResponse(res, 200, { logs, count: logs.length });
    } catch (error) {
        next(error);
    }
};

// POST /api/app/relays/:id/toggle – abrir/fechar porta (morador/síndico)
exports.toggleRelay = async (req, res, next) => {
    try {
        const { relayIds } = await getLocationDeviceAndRelayIds(req.locationId);
        if (!relayIds.some((r) => r.toString() === req.params.id)) {
            return apiResponse(res, 403, null, 'Porta não pertence ao seu local.');
        }

        const relay = await Relay.findById(req.params.id)
            .populate('deviceId', 'name serialNumber status socketId');

        if (!relay) {
            return apiResponse(res, 404, null, 'Porta não encontrada.');
        }

        const device = relay.deviceId;
        if (device.status !== 'online') {
            return apiResponse(res, 400, null, 'Dispositivo está offline. Tente novamente em instantes.');
        }

        if (!device.socketId) {
            return apiResponse(res, 400, null, 'Dispositivo sem conexão.');
        }

        const newState = relay.state === 'closed' ? 'open' : 'closed';
        const io = req.app.get('io');

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
        const userName = req.locationUser?.name || 'App';
        await ActivityLog.create({
            action,
            description: `Porta "${relay.name}" ${newState === 'open' ? 'aberta' : 'fechada'} pelo app (${userName})`,
            deviceId: device._id,
            relayId: relay._id,
        });

        logger.info(`App relay toggled: ${relay.name} -> ${newState} by ${userName}`);
        apiResponse(res, 200, { relay, newState }, newState === 'open' ? 'Porta aberta.' : 'Porta fechada.');
    } catch (error) {
        next(error);
    }
};

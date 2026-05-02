const Invitation = require('../models/Invitation');
const Relay = require('../models/Relay');
const Device = require('../models/Device');
const ActivityLog = require('../models/ActivityLog');
const { apiResponse } = require('../utils/helpers');
const logger = require('../utils/logger');
const crypto = require('crypto');

// Create a new invitation (ADMIN/USER)
exports.createInvitation = async (req, res, next) => {
    try {
        const { name, relayIds, validFrom, validUntil } = req.body;

        // Basic validation
        if (!name || !relayIds || !Array.isArray(relayIds) || relayIds.length === 0 || !validFrom || !validUntil) {
            return apiResponse(res, 400, null, 'Todos os campos são obrigatórios, incluindo pelo menos uma porta.');
        }

        const dateFrom = new Date(validFrom);
        const dateUntil = new Date(validUntil);

        if (isNaN(dateFrom.getTime()) || isNaN(dateUntil.getTime())) {
            return apiResponse(res, 400, null, 'Formato de data inválido.');
        }

        if (dateFrom >= dateUntil) {
            return apiResponse(res, 400, null, 'A data de início deve ser anterior à data de expiração.');
        }

        // Check if all relays exist and (if gestor) belong to allowed location
        const relays = await Relay.find({ _id: { $in: relayIds } }).populate('deviceId', 'locationId');
        if (relays.length !== relayIds.length) {
            return apiResponse(res, 404, null, 'Uma ou mais portas selecionadas não foram encontradas.');
        }
        let locationId = null;
        if (req.allowedLocationId) {
            const allowed = req.allowedLocationId.toString();
            const allInLocation = relays.every((r) => r.deviceId?.locationId?.toString() === allowed);
            if (!allInLocation) {
                return apiResponse(res, 403, null, 'Só é permitido criar convites para portas do seu local.');
            }
            locationId = req.allowedLocationId;
        } else if (relays.length > 0 && relays[0].deviceId?.locationId) {
            locationId = relays[0].deviceId.locationId;
        }

        const invitation = await Invitation.create({
            name,
            relayIds,
            validFrom: dateFrom,
            validUntil: dateUntil,
            locationId: locationId || undefined,
            createdBy: req.user._id,
        });

        logger.info(`Invitation created for ${name} (Gates: ${relays.map(r => r.name).join(', ')})`);

        await ActivityLog.create({
            action: 'invitation_created',
            description: `Convite criado para "${name}" (Link para múltiplas portas)`,
            metadata: { relayIds },
            userId: req.user._id,
        });

        apiResponse(res, 201, { invitation }, 'Convite criado com sucesso!');
    } catch (error) {
        next(error);
    }
};

// Get all invitations (ADMIN/USER)
exports.getInvitations = async (req, res, next) => {
    try {
        const filter = { active: true };
        if (req.allowedLocationId) {
            filter.locationId = req.allowedLocationId;
        }
        const invitations = await Invitation.find(filter)
            .populate({
                path: 'relayIds',
                populate: { path: 'deviceId', select: 'name' }
            })
            .sort({ validUntil: -1 });

        apiResponse(res, 200, { invitations, count: invitations.length });
    } catch (error) {
        next(error);
    }
};

// Get public info for an invitation link (PUBLIC)
exports.getPublicInvitation = async (req, res, next) => {
    try {
        const { token } = req.params;
        const invitation = await Invitation.findOne({ token, active: true })
            .populate({
                path: 'relayIds',
                populate: {
                    path: 'deviceId',
                    populate: { path: 'locationId' }
                }
            });

        if (!invitation) {
            return apiResponse(res, 404, null, 'Convite não encontrado ou desativado.');
        }

        // Validity check
        const now = new Date();
        if (now < invitation.validFrom) {
            return apiResponse(res, 403, {
                name: invitation.name,
                startsAt: invitation.validFrom
            }, 'Este convite ainda não é válido.');
        }

        if (now > invitation.validUntil) {
            // Auto-deactivate check can happen here or later
            return apiResponse(res, 401, null, 'Este convite expirou.');
        }

        const responseData = {
            guestName: invitation.name,
            gates: invitation.relayIds.map(r => ({
                id: r._id,
                name: r.name,
                deviceName: r.deviceId?.name,
                address: r.deviceId?.locationId?.address
            })),
            validUntil: invitation.validUntil,
            validFrom: invitation.validFrom
        };

        apiResponse(res, 200, responseData);
    } catch (error) {
        next(error);
    }
};

// Unlock via invitation (PUBLIC)
exports.unlockByInvitation = async (req, res, next) => {
    try {
        const { token } = req.params;
        const { relayId } = req.body; // Guest picks which gate to open

        const invitation = await Invitation.findOne({ token, active: true })
            .populate({
                path: 'relayIds',
                populate: { path: 'deviceId' }
            });

        if (!invitation) {
            return apiResponse(res, 404, null, 'Acesso negado.');
        }

        // Check if the requested relay is part of this invitation
        const relay = invitation.relayIds.find(r => r._id.toString() === relayId);
        if (!relay) {
            return apiResponse(res, 403, null, 'Você não tem permissão para esta porta.');
        }

        // Standard checks
        const now = new Date();
        if (now < invitation.validFrom || now > invitation.validUntil) {
            return apiResponse(res, 403, null, 'Convite fora do período de validade.');
        }

        // const relay = invitation.relayId; // Already found above
        const device = relay.deviceId;

        if (device.status !== 'online') {
            return apiResponse(res, 503, null, 'Houve um erro: Dispositivo de acesso offline.');
        }

        const io = req.app.get('io');
        if (!device.socketId) {
            return apiResponse(res, 503, null, 'Houve um erro: Sem conexão com o gateway.');
        }

        // Toggle command (dispositivos conectam no namespace /devices)
        const newState = 'open'; // Pulse mode usually opens and then closes
        io.of('/devices').to(device.socketId).emit('relay:toggle', {
            relayId: relay._id,
            channel: relay.channel,
            gpioPin: relay.gpioPin,
            targetState: newState,
            mode: relay.mode,
            pulseDuration: relay.pulseDuration,
            timestamp: new Date().toISOString(),
        });

        // Log public access
        await ActivityLog.create({
            action: 'public_access_invitation',
            description: `Acesso público via convite: "${invitation.name}" abriu "${relay.name}"`,
            relayId: relay._id,
            deviceId: device._id,
            metadata: { token: invitation.token, guestName: invitation.name },
        });

        logger.info(`Public access via invitation: ${invitation.name} unlocked ${relay.name}`);

        apiResponse(res, 200, null, 'Acesso liberado! Seja bem-vindo.');
    } catch (error) {
        next(error);
    }
};

// Delete invitation
exports.deleteInvitation = async (req, res, next) => {
    try {
        const invitation = await Invitation.findById(req.params.id);
        if (!invitation) return apiResponse(res, 404, null, 'Convite não encontrado.');
        if (req.allowedLocationId && invitation.locationId?.toString() !== req.allowedLocationId.toString()) {
            return apiResponse(res, 403, null, 'Só é permitido remover convites do seu local.');
        }
        await Invitation.findByIdAndUpdate(req.params.id, { active: false });
        apiResponse(res, 200, null, 'Convite removido.');
    } catch (error) {
        next(error);
    }
};

const ActivityLog = require('../models/ActivityLog');
const Device = require('../models/Device');
const Relay = require('../models/Relay');
const Invitation = require('../models/Invitation');
const { apiResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

function guestFromPublicInvitationDescription(description) {
    if (!description) return null;
    const m = description.match(/via convite:\s*"([^"]+)"/i);
    return m ? m[1].trim() : null;
}

/**
 * Deriva método, operador e nome do convite para auditoria (painel, QR, convite, app, etc.)
 */
function resolveAccessReportFields(log) {
    const meta = log.metadata || {};
    const desc = log.description || '';
    let method = '—';
    let operator = '—';
    let inviteName = '—';

    if (log.action === 'public_access_invitation') {
        method = 'Convite (link)';
        inviteName = meta.guestName || guestFromPublicInvitationDescription(desc) || '—';
        operator = inviteName !== '—' ? inviteName : 'Visitante';
        return { method, operator, inviteName };
    }

    if (log.action === 'automation_executed') {
        method = 'Automação';
        const m = desc.match(/Automação\s+"([^"]+)"/);
        operator = m ? m[1].trim() : 'Automação';
        return { method, operator, inviteName: '—' };
    }

    if (log.action === 'schedule_executed') {
        method = 'Agendamento';
        operator = '—';
        return { method, operator, inviteName: '—' };
    }

    if (log.action === 'relay_activated') {
        if (desc.includes('via qr_public_invite')) {
            method = 'QR Code (convite)';
            inviteName = meta.guestName || meta.invitationGuestName || '—';
            operator = inviteName !== '—' ? inviteName : 'Visitante (convite)';
            return { method, operator, inviteName };
        }
        if (desc.includes('via qr_code')) {
            method = 'QR Code (painel)';
            operator = log.userId?.name || log.userId?.email || '—';
            return { method, operator, inviteName: '—' };
        }
        if (desc.includes('via painel')) {
            method = 'Painel web';
            operator = log.userId?.name || log.userId?.email || '—';
            return { method, operator, inviteName: '—' };
        }
        if (desc.includes('pelo app')) {
            method = 'App móvel';
            const m = desc.match(/pelo app\s*\(([^)]+)\)/i);
            operator = m ? m[1].trim() : 'App';
            return { method, operator, inviteName: '—' };
        }
        if (desc.includes('Agendamento automático')) {
            method = 'Agendamento';
            const m = desc.match(/Agendamento automático:\s*([^\n]+?)\s+executou/i);
            operator = m ? m[1].trim() : '—';
            return { method, operator, inviteName: '—' };
        }
        method = 'Abertura';
        operator = log.userId?.name || log.userId?.email || '—';
        return { method, operator, inviteName: '—' };
    }

    return { method, operator, inviteName };
}

// @desc    Get access reports (relay activations)
// @route   GET /api/reports/access
// @access  Private/Admin ou gestor de convites (escopo do local)
exports.getAccessReport = async (req, res, next) => {
    try {
        const { startDate, endDate, deviceId, relayId } = req.query;
        const rawPage = parseInt(req.query.page, 10);
        const rawLimit = parseInt(req.query.limit, 10);
        const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
        const defaultPageSize = 15;
        const limit = Math.min(
            Math.max(Number.isFinite(rawLimit) ? rawLimit : defaultPageSize, 1),
            10000
        );
        const skip = (page - 1) * limit;

        const query = {
            action: {
                $in: [
                    'relay_activated',
                    'public_access_invitation',
                    'automation_executed',
                    'schedule_executed',
                ],
            },
        };

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        if (req.allowedLocationId) {
            // Sem exigir active:true: histórico de aberturas deve aparecer mesmo se o gateway estiver inativo no momento.
            const deviceDocs = await Device.find({ locationId: req.allowedLocationId }).select('_id');
            const allowedDeviceIds = deviceDocs.map((d) => d._id);
            const relayDocs = await Relay.find({ deviceId: { $in: allowedDeviceIds } }).select('_id');
            const allowedRelayIds = relayDocs.map((r) => r._id);

            if (deviceId) {
                const ok = allowedDeviceIds.some((id) => id.toString() === deviceId);
                if (!ok) {
                    return apiResponse(res, 403, null, 'Dispositivo fora do seu local.');
                }
                query.deviceId = deviceId;
            } else if (relayId) {
                const ok = allowedRelayIds.some((id) => id.toString() === relayId);
                if (!ok) {
                    return apiResponse(res, 403, null, 'Relé fora do seu local.');
                }
                query.relayId = relayId;
            } else {
                const orConditions = [
                    { deviceId: { $in: allowedDeviceIds } },
                    { relayId: { $in: allowedRelayIds } },
                ];

                // Convites sem locationId preenchido ainda assim ligam relés do local: incluir pelo token do log.
                if (allowedRelayIds.length) {
                    const invs = await Invitation.find({
                        active: true,
                        relayIds: { $in: allowedRelayIds },
                    })
                        .select('token')
                        .lean();
                    const tokens = invs.map((i) => i.token).filter(Boolean);
                    if (tokens.length) {
                        orConditions.push({
                            action: 'public_access_invitation',
                            'metadata.token': { $in: tokens },
                        });
                    }
                }

                query.$or = orConditions;
            }
        } else {
            if (deviceId) query.deviceId = deviceId;
            if (relayId) query.relayId = relayId;
        }

        const [logs, total] = await Promise.all([
            ActivityLog.find(query)
                .populate('deviceId', 'name')
                .populate('relayId', 'name')
                .populate('userId', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            ActivityLog.countDocuments(query),
        ]);

        const report = logs.map((log) => {
            const { method, operator, inviteName } = resolveAccessReportFields(log);
            return {
                id: log._id,
                timestamp: log.createdAt,
                door: log.relayId?.name || 'Desconhecido',
                device: log.deviceId?.name || 'Sistêmica',
                operator,
                inviteName,
                method,
                action: log.action,
                description: log.description,
            };
        });

        apiResponse(res, 200, {
            report,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit) || 1,
            },
        });
    } catch (error) {
        next(error);
    }
};

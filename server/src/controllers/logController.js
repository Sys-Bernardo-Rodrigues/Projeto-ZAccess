const ActivityLog = require('../models/ActivityLog');
const Device = require('../models/Device');
const Relay = require('../models/Relay');
const Invitation = require('../models/Invitation');
const { apiResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

// GET /api/logs
exports.getLogs = async (req, res, next) => {
    try {
        const { deviceId, action, limit = 50, page = 1, createdFrom, createdTo } = req.query;
        const filter = {};

        if (deviceId) filter.deviceId = deviceId;
        if (action) filter.action = action;

        if (createdFrom || createdTo) {
            const range = {};
            if (createdFrom) {
                const t = new Date(createdFrom);
                if (!isNaN(t.getTime())) range.$gte = t;
            }
            if (createdTo) {
                const t = new Date(createdTo);
                if (!isNaN(t.getTime())) range.$lte = t;
            }
            if (Object.keys(range).length) filter.createdAt = range;
        }

        if (req.allowedLocationId) {
            const deviceDocs = await Device.find({ locationId: req.allowedLocationId }).select('_id');
            const allowedDeviceIds = deviceDocs.map((d) => d._id);
            const relayDocs = await Relay.find({ deviceId: { $in: allowedDeviceIds } }).select('_id');
            const allowedRelayIds = relayDocs.map((r) => r._id);
            const orConditions = [
                { deviceId: { $in: allowedDeviceIds } },
                { relayId: { $in: allowedRelayIds } },
            ];
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
            filter.$or = orConditions;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [logs, total] = await Promise.all([
            ActivityLog.find(filter)
                .populate('deviceId', 'name serialNumber')
                .populate('relayId', 'name channel')
                .populate('userId', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            ActivityLog.countDocuments(filter),
        ]);

        apiResponse(res, 200, {
            logs,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/logs/stats
exports.getStats = async (req, res, next) => {
    try {
        const matchStage = {};
        if (req.allowedLocationId) {
            const deviceDocs = await Device.find({ locationId: req.allowedLocationId }).select('_id');
            const allowedDeviceIds = deviceDocs.map((d) => d._id);
            const relayDocs = await Relay.find({ deviceId: { $in: allowedDeviceIds } }).select('_id');
            const allowedRelayIds = relayDocs.map((r) => r._id);
            const orConditions = [
                { deviceId: { $in: allowedDeviceIds } },
                { relayId: { $in: allowedRelayIds } },
            ];
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
            matchStage.$or = orConditions;
        }
        const pipeline = [];
        if (Object.keys(matchStage).length) pipeline.push({ $match: matchStage });
        pipeline.push(
            {
                $group: {
                    _id: '$action',
                    count: { $sum: 1 },
                    lastOccurrence: { $max: '$createdAt' },
                },
            },
            { $sort: { count: -1 } },
        );
        const stats = await ActivityLog.aggregate(pipeline);

        apiResponse(res, 200, { stats });
    } catch (error) {
        next(error);
    }
};

/**
 * Remove registros de ActivityLog no intervalo (admin global).
 * POST /api/logs/purge  body: { createdFrom, createdTo } ISO 8601
 */
exports.purgeLogsByDateRange = async (req, res, next) => {
    try {
        const { createdFrom, createdTo } = req.body || {};

        if (!createdFrom || !createdTo) {
            return apiResponse(res, 400, null, 'Informe data de início e data de fim (createdFrom e createdTo).');
        }

        const from = new Date(createdFrom);
        const to = new Date(createdTo);

        if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
            return apiResponse(res, 400, null, 'Datas inválidas.');
        }

        if (from > to) {
            return apiResponse(res, 400, null, 'A data de início deve ser anterior ou igual à data de fim.');
        }

        const result = await ActivityLog.deleteMany({
            createdAt: { $gte: from, $lte: to },
        });

        logger.info('activity_logs_purge', {
            adminEmail: req.user?.email,
            adminId: req.user?._id?.toString(),
            createdFrom: from.toISOString(),
            createdTo: to.toISOString(),
            deletedCount: result.deletedCount,
        });

        apiResponse(res, 200, {
            deletedCount: result.deletedCount,
            createdFrom: from.toISOString(),
            createdTo: to.toISOString(),
        });
    } catch (error) {
        next(error);
    }
};

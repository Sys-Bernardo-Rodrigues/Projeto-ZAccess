const ActivityLog = require('../models/ActivityLog');
const { apiResponse } = require('../utils/helpers');

// GET /api/logs
exports.getLogs = async (req, res, next) => {
    try {
        const { deviceId, action, limit = 50, page = 1 } = req.query;
        const filter = {};

        if (deviceId) filter.deviceId = deviceId;
        if (action) filter.action = action;

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
        const stats = await ActivityLog.aggregate([
            {
                $group: {
                    _id: '$action',
                    count: { $sum: 1 },
                    lastOccurrence: { $max: '$createdAt' },
                },
            },
            { $sort: { count: -1 } },
        ]);

        apiResponse(res, 200, { stats });
    } catch (error) {
        next(error);
    }
};

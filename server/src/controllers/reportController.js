const ActivityLog = require('../models/ActivityLog');
const { apiResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

// @desc    Get access reports (relay activations)
// @route   GET /api/reports/access
// @access  Private/Admin
exports.getAccessReport = async (req, res, next) => {
    try {
        const { startDate, endDate, deviceId, relayId } = req.query;

        const query = {
            action: { $in: ['relay_activated', 'automation_executed', 'schedule_executed'] }
        };

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        if (deviceId) query.deviceId = deviceId;
        if (relayId) query.relayId = relayId;

        const logs = await ActivityLog.find(query)
            .populate('deviceId', 'name')
            .populate('relayId', 'name')
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });

        // Map to a more report-friendly format
        const report = logs.map(log => ({
            id: log._id,
            timestamp: log.createdAt,
            door: log.relayId?.name || 'Desconhecido',
            device: log.deviceId?.name || 'Sistêmica',
            operator: log.userId?.name || (log.action === 'automation_executed' ? '🤖 Automação' : '🕒 Agendamento'),
            action: log.action === 'relay_activated' ? 'Abertura Manual' : (log.action === 'automation_executed' ? 'Automação' : 'Agendamento'),
            description: log.description
        }));

        apiResponse(res, 200, { report });
    } catch (error) {
        next(error);
    }
};

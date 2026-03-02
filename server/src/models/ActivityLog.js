const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
    {
        action: {
            type: String,
            required: true,
            enum: [
                'device_connected',
                'device_disconnected',
                'relay_activated',
                'relay_deactivated',
                'device_registered',
                'device_updated',
                'device_removed',
                'relay_created',
                'relay_updated',
                'location_created',
                'user_login',
                'user_logout',
                'command_sent',
                'command_response',
                'heartbeat_timeout',
                'emergency_alert',
                'input_created',
                'schedule_created',
                'schedule_executed',
                'automation_executed',
                'invitation_created',
                'public_access_invitation',
            ],
        },
        severity: {
            type: String,
            enum: ['info', 'warning', 'danger', 'critical'],
            default: 'info'
        },
        description: {
            type: String,
            maxlength: 500,
        },
        deviceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Device',
        },
        relayId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Relay',
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        ipAddress: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

// TTL index - logs expiram em 90 dias
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });
activityLogSchema.index({ deviceId: 1, createdAt: -1 });
activityLogSchema.index({ action: 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);

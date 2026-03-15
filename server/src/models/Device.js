const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Nome do dispositivo é obrigatório'],
            trim: true,
            maxlength: 200,
        },
        serialNumber: {
            type: String,
            required: [true, 'Número serial é obrigatório'],
            unique: true,
            trim: true,
        },
        locationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Location',
            required: [true, 'Local é obrigatório'],
        },
        status: {
            type: String,
            enum: ['online', 'offline', 'maintenance'],
            default: 'offline',
        },
        ipAddress: {
            type: String,
            trim: true,
        },
        lastHeartbeat: {
            type: Date,
            default: null,
        },
        metadata: {
            model: {
                type: String,
                default: 'Gateway IoT',
            },
            firmware: {
                type: String,
                default: '1.0.0',
            },
            totalRelays: {
                type: Number,
                default: 8,
            },
        },
        socketId: {
            type: String,
            default: null,
        },
        authToken: {
            type: String,
            select: false,
        },
        active: {
            type: Boolean,
            default: true,
        },
        health: {
            cpuTemp: Number,
            memoryUsage: {
                total: Number,
                used: Number,
                percent: Number
            },
            uptime: Number,
            lastChecked: Date
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual para puxar relés
deviceSchema.virtual('relays', {
    ref: 'Relay',
    localField: '_id',
    foreignField: 'deviceId',
});

// Virtual para puxar sensores (inputs)
deviceSchema.virtual('inputs', {
    ref: 'Input',
    localField: '_id',
    foreignField: 'deviceId',
});

// Index para busca
deviceSchema.index({ status: 1 });
deviceSchema.index({ locationId: 1 });

module.exports = mongoose.model('Device', deviceSchema);

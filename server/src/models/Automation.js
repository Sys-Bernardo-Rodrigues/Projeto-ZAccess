const mongoose = require('mongoose');

const automationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        enabled: {
            type: Boolean,
            default: true,
        },
        trigger: {
            type: {
                type: String,
                enum: ['input_state_change'],
                default: 'input_state_change',
            },
            inputId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Input',
                required: true,
            },
            condition: {
                type: String,
                enum: ['active', 'inactive'],
                required: true,
            }
        },
        action: {
            type: {
                type: String,
                enum: ['relay_control'],
                default: 'relay_control',
            },
            relayId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Relay',
                required: true,
            },
            command: {
                type: String,
                enum: ['on', 'off', 'pulse'],
                required: true,
            },
            duration: {
                type: Number,
                default: 1000, //ms para pulse
            }
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        lastRun: {
            type: Date,
        }
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Automation', automationSchema);

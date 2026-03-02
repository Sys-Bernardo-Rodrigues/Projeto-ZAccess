const mongoose = require('mongoose');

const inputSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Nome do sensor é obrigatório'],
            trim: true,
        },
        type: {
            type: String,
            enum: ['door_sensor', 'motion', 'button', 'emergency', 'other'],
            default: 'door_sensor',
        },
        gpioPin: {
            type: Number,
            required: [true, 'Pino GPIO é obrigatório'],
        },
        activeLow: {
            type: Boolean,
            default: true, // Geralmente pull-up (GND = ativado)
        },
        state: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'inactive',
        },
        deviceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Device',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Índice para evitar duplicidade de GPIO no mesmo dispositivo
inputSchema.index({ deviceId: 1, gpioPin: 1 }, { unique: true });

module.exports = mongoose.model('Input', inputSchema);

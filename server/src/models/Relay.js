const mongoose = require('mongoose');

const relaySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Nome do relé é obrigatório'],
            trim: true,
            maxlength: 200,
        },
        type: {
            type: String,
            enum: ['door', 'gate', 'light', 'lock', 'automation', 'other'],
            default: 'automation',
        },
        gpioPin: {
            type: Number,
            required: [true, 'Pino GPIO é obrigatório'],
            min: 0,
            max: 40,
        },
        channel: {
            type: Number,
            required: [true, 'Canal do relé é obrigatório'],
            min: 1,
            max: 4, // Módulo de Relé de 4 Canais
        },
        state: {
            type: String,
            enum: ['open', 'closed'],
            default: 'closed',
        },
        mode: {
            type: String,
            enum: ['toggle', 'pulse', 'hold'],
            default: 'pulse',
            // toggle: muda estado, pulse: ativa por X ms, hold: precisa manter pressionado
        },
        pulseDuration: {
            type: Number,
            default: 1000, // ms
            min: 100,
            max: 30000,
        },
        deviceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Device',
            required: [true, 'Dispositivo é obrigatório'],
        },
        lastToggled: {
            type: Date,
            default: null,
        },
        active: {
            type: Boolean,
            default: true,
        },
        allowResidentInvitation: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Index composto - um pino por dispositivo
relaySchema.index({ deviceId: 1, gpioPin: 1 }, { unique: true });
relaySchema.index({ deviceId: 1, channel: 1 }, { unique: true });

module.exports = mongoose.model('Relay', relaySchema);

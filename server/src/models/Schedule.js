const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Nome do agendamento é obrigatório'],
            trim: true,
        },
        relayId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Relay',
            required: [true, 'Relé é obrigatório'],
        },
        action: {
            type: String,
            enum: ['open', 'close', 'pulse'],
            required: [true, 'Ação é obrigatória'],
        },
        // Dias da semana (0-6, onde 0 é domingo)
        daysOfWeek: {
            type: [Number],
            default: [1, 2, 3, 4, 5], // Padrão: seg-sex
        },
        // Horário no formato HH:mm
        time: {
            type: String,
            required: [true, 'Horário é obrigatório'],
            validate: {
                validator: function (v) {
                    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
                },
                message: props => `${props.value} não é um formato de hora válido (HH:mm)!`
            }
        },
        enabled: {
            type: Boolean,
            default: true,
        },
        lastRun: {
            type: Date,
            default: null,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Schedule', scheduleSchema);

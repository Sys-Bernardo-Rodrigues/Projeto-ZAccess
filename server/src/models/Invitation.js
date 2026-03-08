const mongoose = require('mongoose');
const crypto = require('crypto');

const invitationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Nome do convidado é obrigatório'],
            trim: true,
        },
        token: {
            type: String,
            unique: true,
            default: () => crypto.randomBytes(16).toString('hex'),
        },
        relayIds: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Relay',
            required: [true, 'Pelo menos uma porta é obrigatória'],
        }],
        validFrom: {
            type: Date,
            required: [true, 'Data de início é obrigatória'],
        },
        validUntil: {
            type: Date,
            required: [true, 'Data de expiração é obrigatória'],
        },
        active: {
            type: Boolean,
            default: true,
        },
        locationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Location',
            default: null,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false,
        },
        createdByLocationUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'LocationUser',
            required: false,
        },
    },
    {
        timestamps: true,
    }
);

// Middleware para verificar se ainda está válido (opcional, pode ser feito no controller)
invitationSchema.methods.isValid = function () {
    const now = new Date();
    return this.active && now >= this.validFrom && now <= this.validUntil;
};

module.exports = mongoose.model('Invitation', invitationSchema);

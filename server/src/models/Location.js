const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Nome do local é obrigatório'],
            trim: true,
            maxlength: 200,
        },
        address: {
            type: String,
            trim: true,
            maxlength: 500,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 1000,
        },
        coordinates: {
            lat: { type: Number },
            lng: { type: Number },
        },
        active: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual para contar dispositivos
locationSchema.virtual('devices', {
    ref: 'Device',
    localField: '_id',
    foreignField: 'locationId',
});

module.exports = mongoose.model('Location', locationSchema);

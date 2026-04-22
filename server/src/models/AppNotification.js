const mongoose = require('mongoose');

const appNotificationSchema = new mongoose.Schema(
    {
        locationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Location',
            required: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },
        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 1000,
        },
        audience: {
            type: String,
            enum: ['all', 'morador', 'sindico'],
            default: 'morador',
            index: true,
        },
        createdByLocationUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'LocationUser',
            required: true,
        },
        active: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    { timestamps: true }
);

appNotificationSchema.index({ locationId: 1, audience: 1, createdAt: -1 });

module.exports = mongoose.model('AppNotification', appNotificationSchema);

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Usuários do local: moradores e síndicos.
 * Vinculados a um Location; farão login no app (não no painel admin).
 */
const locationUserSchema = new mongoose.Schema(
    {
        locationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Location',
            required: [true, 'Local é obrigatório'],
            index: true,
        },
        name: {
            type: String,
            required: [true, 'Nome é obrigatório'],
            trim: true,
            minlength: 2,
            maxlength: 120,
        },
        email: {
            type: String,
            required: [true, 'E-mail é obrigatório'],
            trim: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, 'E-mail inválido'],
        },
        password: {
            type: String,
            required: [true, 'Senha é obrigatória'],
            minlength: 6,
            select: false,
        },
        role: {
            type: String,
            enum: ['morador', 'sindico'],
            default: 'morador',
        },
        phone: {
            type: String,
            trim: true,
            maxlength: 20,
        },
        unit: {
            type: String,
            trim: true,
            maxlength: 50,
        },
        active: {
            type: Boolean,
            default: true,
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

// E-mail único por local (mesmo e-mail pode existir em locais diferentes)
locationUserSchema.index({ locationId: 1, email: 1 }, { unique: true });

locationUserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

locationUserSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

locationUserSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

module.exports = mongoose.model('LocationUser', locationUserSchema);

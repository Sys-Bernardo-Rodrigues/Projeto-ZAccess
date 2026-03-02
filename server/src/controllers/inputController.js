const Input = require('../models/Input');
const Device = require('../models/Device');
const ActivityLog = require('../models/ActivityLog');

/**
 * @desc    Obter todos os sensores
 * @route   GET /api/inputs
 * @access  Private
 */
exports.getInputs = async (req, res) => {
    try {
        const inputs = await Input.find().populate('deviceId', 'name serialNumber status');
        res.status(200).json({
            success: true,
            count: inputs.length,
            data: { inputs },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Erro ao buscar sensores', error: err.message });
    }
};

/**
 * @desc    Criar novo sensor
 * @route   POST /api/inputs
 * @access  Private/Admin
 */
exports.createInput = async (req, res) => {
    try {
        const { deviceId, gpioPin } = req.body;

        const device = await Device.findById(deviceId);
        if (!device) {
            return res.status(404).json({ success: false, message: 'Dispositivo não encontrado' });
        }

        const input = await Input.create(req.body);

        await ActivityLog.create({
            action: 'input_created',
            description: `Sensor ${input.name} (GPIO ${gpioPin}) criado para ${device.name}`,
            deviceId: device._id,
            userId: req.user._id,
        });

        res.status(201).json({ success: true, data: input });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Atualizar sensor
 * @route   PUT /api/inputs/:id
 * @access  Private/Admin
 */
exports.updateInput = async (req, res) => {
    try {
        const input = await Input.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!input) {
            return res.status(404).json({ success: false, message: 'Sensor não encontrado' });
        }

        res.status(200).json({ success: true, data: input });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Remover sensor
 * @route   DELETE /api/inputs/:id
 * @access  Private/Admin
 */
exports.deleteInput = async (req, res) => {
    try {
        const input = await Input.findById(req.params.id);
        if (!input) {
            return res.status(404).json({ success: false, message: 'Sensor não encontrado' });
        }

        await input.deleteOne();

        res.status(200).json({ success: true, message: 'Sensor removido com sucesso' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

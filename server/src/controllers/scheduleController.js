const Schedule = require('../models/Schedule');
const Relay = require('../models/Relay');
const ActivityLog = require('../models/ActivityLog');

/**
 * @desc    Obter todos os agendamentos
 * @route   GET /api/schedules
 * @access  Private
 */
exports.getSchedules = async (req, res) => {
    try {
        const schedules = await Schedule.find()
            .populate({
                path: 'relayId',
                populate: { path: 'deviceId', select: 'name status' }
            })
            .populate({
                path: 'relayIds',
                populate: { path: 'deviceId', select: 'name status' }
            });

        res.status(200).json({
            success: true,
            count: schedules.length,
            data: { schedules },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Erro ao buscar agendamentos', error: err.message });
    }
};

/**
 * @desc    Criar novo agendamento
 * @route   POST /api/schedules
 * @access  Private/Admin
 */
exports.createSchedule = async (req, res) => {
    try {
        req.body.createdBy = req.user._id;
        // Normalizar: se vier relayIds não enviar relayId
        if (req.body.relayIds && req.body.relayIds.length) {
            req.body.relayId = undefined;
        } else if (req.body.relayId) {
            req.body.relayIds = [req.body.relayId];
        }
        const schedule = await Schedule.create(req.body);

        await ActivityLog.create({
            action: 'schedule_created',
            description: `Agendamento "${schedule.name}" criado para o horário ${schedule.time}`,
            userId: req.user._id,
        });

        res.status(201).json({ success: true, data: schedule });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Atualizar agendamento
 * @route   PUT /api/schedules/:id
 * @access  Private/Admin
 */
exports.updateSchedule = async (req, res) => {
    try {
        if (req.body.relayIds && req.body.relayIds.length) {
            req.body.relayId = undefined;
        } else if (req.body.relayId) {
            req.body.relayIds = [req.body.relayId];
        }
        const schedule = await Schedule.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!schedule) {
            return res.status(404).json({ success: false, message: 'Agendamento não encontrado' });
        }

        res.status(200).json({ success: true, data: schedule });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Remover agendamento
 * @route   DELETE /api/schedules/:id
 * @access  Private/Admin
 */
exports.deleteSchedule = async (req, res) => {
    try {
        const schedule = await Schedule.findById(req.params.id);
        if (!schedule) {
            return res.status(404).json({ success: false, message: 'Agendamento não encontrado' });
        }

        await schedule.deleteOne();

        res.status(200).json({ success: true, message: 'Agendamento removido com sucesso' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

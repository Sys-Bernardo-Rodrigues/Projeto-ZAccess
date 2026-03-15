const Schedule = require('../models/Schedule');
const Relay = require('../models/Relay');
const Device = require('../models/Device');
const ActivityLog = require('../models/ActivityLog');

/**
 * @desc    Obter todos os agendamentos
 * @route   GET /api/schedules
 * @access  Private
 */
exports.getSchedules = async (req, res) => {
    try {
        let query = {};
        if (req.allowedLocationId) {
            const deviceIds = await Device.find({ locationId: req.allowedLocationId, active: true }).select('_id');
            const allowedRelayIds = (await Relay.find({ deviceId: { $in: deviceIds } }).select('_id')).map((r) => r._id);
            if (allowedRelayIds.length === 0) {
                return res.status(200).json({ success: true, count: 0, data: { schedules: [] } });
            }
            query = {
                $or: [
                    { relayId: { $in: allowedRelayIds } },
                    { relayIds: { $not: { $elemMatch: { $nin: allowedRelayIds } } }, relayIds: { $exists: true, $ne: [] } },
                ],
            };
        }
        const schedules = await Schedule.find(query)
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
        if (req.allowedLocationId) {
            const deviceIds = await Device.find({ locationId: req.allowedLocationId, active: true }).select('_id');
            const allowedRelayIds = (await Relay.find({ deviceId: { $in: deviceIds } }).select('_id')).map((r) => r._id.toString());
            const ids = (req.body.relayIds && req.body.relayIds.length) ? req.body.relayIds : (req.body.relayId ? [req.body.relayId] : []);
            const allAllowed = ids.every((id) => allowedRelayIds.includes(id.toString()));
            if (!allAllowed || ids.length === 0) {
                return res.status(403).json({ success: false, message: 'Só é permitido agendar relés do seu local.' });
            }
        }
        req.body.createdBy = req.user._id;
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
        if (req.allowedLocationId) {
            const deviceIds = await Device.find({ locationId: req.allowedLocationId, active: true }).select('_id');
            const allowedRelayIds = (await Relay.find({ deviceId: { $in: deviceIds } }).select('_id')).map((r) => r._id.toString());
            const ids = (req.body.relayIds && req.body.relayIds.length) ? req.body.relayIds : (req.body.relayId ? [req.body.relayId] : []);
            if (ids.length > 0) {
                const allAllowed = ids.every((id) => allowedRelayIds.includes(id.toString()));
                if (!allAllowed) {
                    return res.status(403).json({ success: false, message: 'Só é permitido agendar relés do seu local.' });
                }
            }
        }
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
        const schedule = await Schedule.findById(req.params.id)
            .populate('relayId')
            .populate('relayIds');
        if (!schedule) {
            return res.status(404).json({ success: false, message: 'Agendamento não encontrado' });
        }
        if (req.allowedLocationId) {
            const deviceIds = await Device.find({ locationId: req.allowedLocationId, active: true }).select('_id');
            const allowedRelayIds = (await Relay.find({ deviceId: { $in: deviceIds } }).select('_id')).map((r) => r._id.toString());
            const ids = (schedule.relayIds && schedule.relayIds.length) ? schedule.relayIds.map((r) => r._id) : (schedule.relayId ? [schedule.relayId._id] : []);
            const allAllowed = ids.length > 0 && ids.every((id) => allowedRelayIds.includes(id.toString()));
            if (!allAllowed) {
                return res.status(403).json({ success: false, message: 'Só é permitido remover agendamentos do seu local.' });
            }
        }

        await schedule.deleteOne();

        res.status(200).json({ success: true, message: 'Agendamento removido com sucesso' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

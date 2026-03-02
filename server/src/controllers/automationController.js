const Automation = require('../models/Automation');
const logger = require('../utils/logger');
const ActivityLog = require('../models/ActivityLog');

exports.getAutomations = async (req, res) => {
    try {
        const automations = await Automation.find()
            .populate('trigger.inputId', 'name')
            .populate('action.relayId', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: automations.length,
            data: { automations }
        });
    } catch (err) {
        logger.error(`Error in getAutomations: ${err.message}`);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

exports.createAutomation = async (req, res) => {
    try {
        const automation = await Automation.create({
            ...req.body,
            createdBy: req.user.id
        });

        await ActivityLog.create({
            action: 'input_created', // Usando um genérico ou adicionando um novo
            description: `Automação "${automation.name}" criada por ${req.user.name}`,
            userId: req.user.id
        });

        res.status(201).json({ success: true, data: automation });
    } catch (err) {
        logger.error(`Error in createAutomation: ${err.message}`);
        res.status(400).json({ success: false, message: err.message });
    }
};

exports.updateAutomation = async (req, res) => {
    try {
        const automation = await Automation.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!automation) {
            return res.status(404).json({ success: false, message: 'Automação não encontrada' });
        }

        res.status(200).json({ success: true, data: automation });
    } catch (err) {
        logger.error(`Error in updateAutomation: ${err.message}`);
        res.status(400).json({ success: false, message: err.message });
    }
};

exports.deleteAutomation = async (req, res) => {
    try {
        const automation = await Automation.findByIdAndDelete(req.params.id);

        if (!automation) {
            return res.status(404).json({ success: false, message: 'Automação não encontrada' });
        }

        await ActivityLog.create({
            action: 'device_removed',
            description: `Automação "${automation.name}" removida por ${req.user.name}`,
            userId: req.user.id
        });

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        logger.error(`Error in deleteAutomation: ${err.message}`);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

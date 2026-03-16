const mongoose = require('mongoose');
const Automation = require('../models/Automation');
const Relay = require('../models/Relay');
const logger = require('../utils/logger');
const ActivityLog = require('../models/ActivityLog');

/**
 * Service to process automation rules based on events
 */
class AutomationService {
    constructor() {
        this.io = null;
    }

    init(io) {
        this.io = io;
    }

    async processInputTrigger(inputId, state) {
        if (!this.io) return;
        try {
            const inputIdObj = typeof inputId === 'string' && mongoose.Types.ObjectId.isValid(inputId)
                ? new mongoose.Types.ObjectId(inputId)
                : inputId;

            const automations = await Automation.find({
                'trigger.inputId': inputIdObj,
                'trigger.condition': state,
                enabled: true
            }).populate('action.relayId').lean();

            if (automations.length === 0) return;

            const now = new Date();
            for (const auto of automations) {
                const actionType = auto.action?.type;
                if (actionType === 'relay_control' || !actionType) {
                    await this.executeRelayAction(auto);
                }
                Automation.updateOne({ _id: auto._id }, { lastRun: now }).catch(() => {});
            }
        } catch (err) {
            logger.error(`Automation processInputTrigger: ${err.message}`);
        }
    }

    async executeRelayAction(automation) {
        const action = automation.action;
        if (!action || !action.relayId) return;

        const relayIdRaw = action.relayId._id || action.relayId;
        const command = action.command || 'pulse';
        const duration = action.duration != null ? action.duration : 1000;

        try {
            const relay = await Relay.findById(relayIdRaw).populate('deviceId', 'name serialNumber status socketId').lean();
            if (!relay || !relay.deviceId) return;

            const device = relay.deviceId;
            if (device.status !== 'online') return;

            const target = device.socketId || device.serialNumber;
            if (!target) return;

            const deviceNsp = this.io.of('/devices');
            const isPulse = command === 'pulse';
            const targetState = command === 'off' ? 'closed' : 'open';
            const mode = isPulse ? 'pulse' : 'toggle';
            const pulseDuration = isPulse ? duration : (relay.pulseDuration ?? 1000);

            const payload = {
                relayId: relay._id,
                channel: relay.channel,
                gpioPin: relay.gpioPin,
                targetState,
                mode,
                pulseDuration,
                timestamp: new Date().toISOString(),
            };

            deviceNsp.to(target).emit('relay:toggle', payload);

            ActivityLog.create({
                action: 'automation_executed',
                description: `Automação "${automation.name}" executou ${command} no relé ${relay.name}`,
                deviceId: device._id,
                relayId: relay._id,
                severity: 'info'
            }).catch(() => {});
        } catch (err) {
            logger.error(`Automation executeRelayAction: ${err.message}`);
        }
    }
}

module.exports = new AutomationService();

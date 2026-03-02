const Automation = require('../models/Automation');
const Input = require('../models/Input');
const Relay = require('../models/Relay');
const Device = require('../models/Device');
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
        logger.info('🤖 Rule Engine (Automation Service) initialized');
    }

    async processInputTrigger(inputId, state) {
        try {
            // Find enabled automations triggered by this input and state
            const automations = await Automation.find({
                'trigger.inputId': inputId,
                'trigger.condition': state,
                enabled: true
            }).populate('action.relayId');

            if (automations.length === 0) return;

            for (const auto of automations) {
                logger.info(`🤖 Running automation: ${auto.name}`);

                if (auto.action.type === 'relay_control') {
                    await this.executeRelayAction(auto);
                }

                // Update last run
                auto.lastRun = new Date();
                await auto.save();
            }
        } catch (err) {
            logger.error(`Error in processInputTrigger: ${err.message}`);
        }
    }

    async executeRelayAction(automation) {
        const { relayId, command, duration } = automation.action;

        if (!relayId) return;

        try {
            const relay = await Relay.findById(relayId).populate('deviceId');
            if (!relay || !relay.deviceId) return;

            const device = relay.deviceId;

            // Check if device is online
            if (device.status !== 'online') {
                logger.warn(`🤖 Automation ${automation.name} failed: Device ${device.name} is offline`);
                return;
            }

            // Emit command to device via Socket.IO
            // Note: We need the socket ID of the device. We can find it through the namespace.
            const deviceNsp = this.io.of('/devices');

            // Send command
            deviceNsp.to(device.serialNumber).emit('relay:control', {
                relayId: relay._id,
                command,
                duration: command === 'pulse' ? duration : undefined
            });

            // Log activity
            await ActivityLog.create({
                action: 'automation_executed',
                description: `🤖 Automação "${automation.name}" executou comando ${command} no relé ${relay.name}`,
                deviceId: device._id,
                relayId: relay._id,
                severity: 'info'
            });

        } catch (err) {
            logger.error(`Error executing automation relay action: ${err.message}`);
        }
    }
}

module.exports = new AutomationService();

const Device = require('../models/Device');
const Relay = require('../models/Relay');
const Input = require('../models/Input');
const logger = require('../utils/logger');

/**
 * Envia a configuração atualizada (relés e sensores) para o dispositivo,
 * se ele estiver conectado via WebSocket. Assim o dispositivo sincroniza
 * quando um relé/sensor é criado, editado ou removido no painel.
 */
async function pushDeviceConfig(io, deviceId) {
    try {
        const device = await Device.findById(deviceId).select('name socketId');
        if (!device || !device.socketId) {
            return;
        }

        const deviceNsp = io.of('/devices');
        const [relays, inputs] = await Promise.all([
            Relay.find({ deviceId, active: true }),
            Input.find({ deviceId }),
        ]);

        const payload = {
            deviceId: device._id,
            name: device.name,
            relays: relays.map((r) => ({
                id: r._id,
                name: r.name,
                channel: r.channel,
                gpioPin: r.gpioPin,
                state: r.state,
                mode: r.mode,
                pulseDuration: r.pulseDuration,
            })),
            inputs: inputs.map((i) => ({
                id: i._id,
                name: i.name,
                gpioPin: i.gpioPin,
                activeLow: i.activeLow,
                type: i.type,
            })),
        };

        deviceNsp.to(device.socketId).emit('device:config', payload);
        logger.info(`Device config pushed to ${device.name} (${deviceId}) — ${relays.length} relays, ${inputs.length} inputs`);
    } catch (err) {
        logger.error('pushDeviceConfig error:', err);
    }
}

module.exports = { pushDeviceConfig };

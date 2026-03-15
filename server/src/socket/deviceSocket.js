const Device = require('../models/Device');
const Relay = require('../models/Relay');
const Input = require('../models/Input');
const ActivityLog = require('../models/ActivityLog');
const automationService = require('../services/automationService');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const HEARTBEAT_TIMEOUT = 90000;  // 90 seconds

module.exports = (io) => {
    // Namespace para dispositivos
    const deviceNsp = io.of('/devices');

    // Namespace para dashboard (Frontend)
    const dashboardNsp = io.of('/dashboard');

    // ========================================
    // DISPOSITIVOS (clientes de campo)
    // ========================================
    deviceNsp.on('connection', async (socket) => {
        const { serialNumber, authToken } = socket.handshake.auth;
        logger.info(`🔌 Device attempting connection: ${serialNumber} (${socket.id})`);

        if (!serialNumber) {
            logger.warn(`Device connection rejected: no serial number`);
            socket.disconnect();
            return;
        }

        try {
            // Buscar dispositivo no banco (incluir authToken para validação)
            const device = await Device.findOne({ serialNumber, active: true }).select('+authToken');
            if (!device) {
                logger.warn(`Device not found: ${serialNumber}`);
                socket.emit('error', { message: 'Dispositivo não registrado' });
                socket.disconnect();
                return;
            }
            if (device.authToken && device.authToken !== authToken) {
                logger.warn(`Device auth failed: ${serialNumber}`);
                socket.emit('error', { message: 'Token de autenticação inválido' });
                socket.disconnect();
                return;
            }

            // Atualizar status do dispositivo (findByIdAndUpdate evita save() paralelo depois)
            const now = new Date();
            await Device.findByIdAndUpdate(device._id, {
                status: 'online',
                socketId: socket.id,
                lastHeartbeat: now,
                ipAddress: socket.handshake.address,
            });

            // Cache no Redis
            const redis = getRedisClient();
            await redis.set(
                `device:status:${device._id}`,
                JSON.stringify({ status: 'online', socketId: socket.id, lastHeartbeat: new Date() }),
                'EX',
                120
            );

            // Log de atividade
            await ActivityLog.create({
                action: 'device_connected',
                description: `Dispositivo ${device.name} conectou`,
                deviceId: device._id,
                ipAddress: socket.handshake.address,
            });

            // Notificar dashboard
            dashboardNsp.emit('device:status-change', {
                deviceId: device._id,
                status: 'online',
                name: device.name,
                timestamp: new Date(),
            });

            socket.join(serialNumber);
            logger.info(`✅ Device connected: ${device.name} (${serialNumber})`);

            // Enviar configuração dos relés e sensores para o dispositivo
            const [relays, inputs] = await Promise.all([
                Relay.find({ deviceId: device._id, active: true }),
                Input.find({ deviceId: device._id })
            ]);

            socket.emit('device:config', {
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
            });

            // ---- Heartbeat ----
            const heartbeatTimer = setInterval(async () => {
                const lastBeat = device.lastHeartbeat;
                if (lastBeat && Date.now() - lastBeat.getTime() > HEARTBEAT_TIMEOUT) {
                    logger.warn(`💔 Heartbeat timeout: ${device.name}`);
                    clearInterval(heartbeatTimer);
                    socket.disconnect();
                }
            }, HEARTBEAT_INTERVAL);

            socket.on('heartbeat', async (data) => {
                const now = new Date();
                await Device.findByIdAndUpdate(device._id, { lastHeartbeat: now });

                await redis.set(
                    `device:status:${device._id}`,
                    JSON.stringify({
                        status: 'online',
                        socketId: socket.id,
                        lastHeartbeat: new Date(),
                        systemInfo: data,
                    }),
                    'EX',
                    120
                );
            });

            // ---- Relay State Feedback ----
            socket.on('relay:state-update', async (data) => {
                const { relayId, state } = data;
                try {
                    const relay = await Relay.findByIdAndUpdate(
                        relayId,
                        { state, lastToggled: new Date() },
                        { new: true }
                    );

                    // Notificar dashboard
                    dashboardNsp.emit('relay:state-change', {
                        relayId,
                        deviceId: device._id,
                        state,
                        name: relay?.name,
                        timestamp: new Date(),
                    });

                    logger.info(`Relay state update: ${relay?.name} -> ${state}`);
                } catch (err) {
                    logger.error('Relay state update error:', err);
                }
            });

            // ---- Input State Feedback ----
            socket.on('input:state-update', async (data) => {
                const { inputId, state } = data;
                try {
                    const input = await Input.findByIdAndUpdate(
                        inputId,
                        { state },
                        { new: true }
                    );

                    // Notificar dashboard
                    dashboardNsp.emit('input:state-change', {
                        inputId,
                        deviceId: device._id,
                        state,
                        name: input?.name,
                        type: input?.type,
                        timestamp: new Date(),
                    });

                    // Logar eventos críticos (opcional, ex: emergência)
                    if (input?.type === 'emergency' && state === 'active') {
                        // Log no banco
                        await ActivityLog.create({
                            action: 'emergency_alert',
                            description: `ALERTA CRÍTICO: Sensor de emergência ${input.name} ativado no dispositivo ${device.name}!`,
                            deviceId: device._id,
                            severity: 'critical'
                        });

                        // Notificação de alerta instantânea para o Dashboard
                        dashboardNsp.emit('notification:alert', {
                            type: 'emergency',
                            title: 'ALERTA DE EMERGÊNCIA',
                            message: `O sensor ${input.name} foi acionado no dispositivo ${device.name}!`,
                            deviceId: device._id,
                            deviceName: device.name,
                            timestamp: new Date()
                        });
                    }

                    // Processar automações
                    automationService.processInputTrigger(inputId, state);

                    logger.info(`Input state change: ${input?.name} -> ${state}`);
                } catch (err) {
                    logger.error('Input state change error:', err);
                }
            });

            // ---- Command Response ----
            socket.on('command:response', async (data) => {
                await ActivityLog.create({
                    action: 'command_response',
                    description: `Resposta de comando do dispositivo ${device.name}`,
                    deviceId: device._id,
                    metadata: data,
                });
                dashboardNsp.emit('command:response', { ...data, deviceId: device._id });
            });

            // ---- Health Update ----
            socket.on('device:health-update', async (data) => {
                try {
                    const health = {
                        ...data,
                        lastChecked: new Date()
                    };
                    await Device.findByIdAndUpdate(device._id, { health });

                    // Notificar dashboard para gráficos em tempo real
                    dashboardNsp.emit('device:health-change', {
                        deviceId: device._id,
                        health
                    });
                } catch (err) {
                    logger.error('Health update error:', err);
                }
            });

            // ---- Disconnect ----
            socket.on('disconnect', async (reason) => {
                clearInterval(heartbeatTimer);

                try {
                    await Device.findByIdAndUpdate(device._id, {
                        status: 'offline',
                        socketId: null,
                    });

                    await redis.del(`device:status:${device._id}`);

                    await ActivityLog.create({
                        action: 'device_disconnected',
                        description: `Dispositivo ${device.name} desconectou: ${reason}`,
                        deviceId: device._id,
                    });

                    dashboardNsp.emit('device:status-change', {
                        deviceId: device._id,
                        status: 'offline',
                        name: device.name,
                        timestamp: new Date(),
                    });

                    logger.info(`🔌 Device disconnected: ${device.name} (${reason})`);
                } catch (err) {
                    logger.error('Disconnect handler error:', err);
                }
            });
        } catch (error) {
            logger.error('Device connection error:', error);
            socket.disconnect();
        }
    });

    // ========================================
    // DASHBOARD (Frontend clients)
    // ========================================
    dashboardNsp.on('connection', (socket) => {
        logger.info(`📊 Dashboard client connected: ${socket.id}`);

        socket.on('disconnect', () => {
            logger.info(`📊 Dashboard client disconnected: ${socket.id}`);
        });
    });

    logger.info('🔌 Socket.IO handlers initialized');
};

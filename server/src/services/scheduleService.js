const cron = require('node-cron');
const Schedule = require('../models/Schedule');
const Relay = require('../models/Relay');
const Device = require('../models/Device');
const ActivityLog = require('../models/ActivityLog');
const logger = require('../utils/logger');

const initScheduleService = (io) => {
    // Rodar a cada minuto
    cron.schedule('* * * * *', async () => {
        const now = new Date();
        const currentDay = now.getDay(); // 0-6
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        try {
            // Buscar agendamentos habilitados que coincidem com o horário e dia atual
            const schedules = await Schedule.find({
                enabled: true,
                daysOfWeek: currentDay,
                time: currentTime
            }).populate({
                path: 'relayId',
                populate: { path: 'deviceId' }
            });

            if (schedules.length > 0) {
                logger.info(`⏰ Verificando ${schedules.length} agendamentos para ${currentTime}`);
            }

            for (const schedule of schedules) {
                const relay = schedule.relayId;
                const device = relay?.deviceId;

                if (!relay || !device || device.status !== 'online' || !device.socketId) {
                    logger.warn(`⚠️ Agendamento "${schedule.name}" pulado: Dispositivo offline ou não encontrado`);
                    continue;
                }

                // Executar a ação
                logger.info(`🚀 Executando agendamento: ${schedule.name} (${schedule.action}) no relé ${relay.name}`);

                const targetState = schedule.action === 'open' ? 'open' : 'closed';

                // Emitir comando para o dispositivo
                io.of('/devices').to(device.socketId).emit('relay:toggle', {
                    relayId: relay._id,
                    channel: relay.channel,
                    gpioPin: relay.gpioPin,
                    targetState: targetState,
                    mode: schedule.action === 'pulse' ? 'pulse' : 'toggle',
                    pulseDuration: relay.pulseDuration || 1000
                });

                // Atualizar última execução
                schedule.lastRun = now;
                await schedule.save();

                // Log de atividade
                await ActivityLog.create({
                    action: 'relay_activated',
                    description: `Agendamento automático: ${schedule.name} executou ${schedule.action} em ${relay.name}`,
                    deviceId: device._id,
                    metadata: { scheduleId: schedule._id }
                });
            }
        } catch (err) {
            logger.error('❌ Erro no serviço de agendamentos:', err);
        }
    });

    logger.info('🕒 Serviço de agendamentos iniciado (Check a cada minuto)');
};

module.exports = { initScheduleService };

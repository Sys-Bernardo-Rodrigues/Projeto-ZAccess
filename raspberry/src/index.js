require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { io } = require('socket.io-client');
const config = require('./config');
const { loadConfig } = require('./config/load');
const RelayController = require('./relayController');
const inputController = require('./inputController');
const logger = require('./utils/logger');
const settings = require('./db/settings');
const { startWebServer } = require('./web/server');
const os = require('os');

// ============================================
// Configuração de conexão (SQLite → .env → env)
// ============================================
const connectionConfig = loadConfig();

// ============================================
// Relay Controller (será configurado pelo servidor em device:config)
// ============================================
const relayController = new RelayController(config.channelToGpio);

// ============================================
// Conectar ao Servidor Zaccess
// ============================================
logger.info(`Iniciando cliente. Servidor: ${connectionConfig.serverUrl || '(não configurado)'} | Serial: ${connectionConfig.serialNumber}`);

const socket = io(`${connectionConfig.serverUrl || 'http://localhost:3001'}/devices`, {
    auth: {
        serialNumber: connectionConfig.serialNumber,
        authToken: connectionConfig.authToken,
    },
    transports: ['websocket', 'polling'],
    reconnection: config.reconnect.enabled,
    reconnectionAttempts: config.reconnect.maxAttempts,
    reconnectionDelay: config.reconnect.delay,
    reconnectionDelayMax: config.reconnect.delayMax || 60000,
});

// Só envia mudança de sensor quando estiver conectado
inputController.setCallback((inputId, state) => {
    if (socket.connected) {
        socket.emit('input:state-update', { inputId, state });
    }
});

// ============================================
// Eventos de Conexão (logs em tempo real)
// ============================================
socket.on('connect', () => {
    logger.conexao(`Conectado ao servidor. Socket ID: ${socket.id}`);
});

socket.on('disconnect', (reason) => {
    logger.conexao(`Desconectado: ${reason}`);
});

socket.on('connect_error', (err) => {
    logger.erro(`Conexão: ${err.message}`);
});

socket.on('reconnect_attempt', (attempt) => {
    if (attempt === 1 || attempt % 5 === 0) {
        logger.conexao(`Reconectando... (tentativa ${attempt})`);
    }
});

socket.on('reconnect', () => {
    logger.conexao('Reconectado ao servidor.');
});

socket.on('reconnect_failed', () => {
    logger.erro('Reconexão falhou após várias tentativas. O cliente continuará tentando.');
});

socket.on('error', (data) => {
    logger.erro(`Servidor: ${data.message || JSON.stringify(data)}`);
});

// ============================================
// Receber Configuração do Servidor (também na reconexão)
// ============================================
socket.on('device:config', (data) => {
    const numRelays = (data.relays || []).length;
    const numInputs = (data.inputs || []).length;
    logger.config(`Configuração recebida: "${data.name}" | Relés: ${numRelays} | Sensores: ${numInputs}`);

    relayController.initFromServerConfig(data.relays || []);

    if (data.inputs && data.inputs.length > 0) {
        inputController.initAll(data.inputs);
    }
});

// ============================================
// Receber Comando de Toggle (log em tempo real)
// ============================================
socket.on('relay:toggle', (data) => {
    const gpio = relayController.getGpioForChannel(data.channel);
    const gpioStr = gpio != null ? `GPIO ${gpio}` : 'canal ' + data.channel;
    logger.servidor(`Comando do servidor: acionar ${gpioStr} -> ${data.targetState} (modo: ${data.mode || 'toggle'})${data.mode === 'pulse' ? `, duração ${data.pulseDuration || 1000} ms` : ''}`);

    let success = false;

    switch (data.mode) {
        case 'pulse':
            success = relayController.pulseRelay(data.channel, data.pulseDuration);
            break;
        case 'toggle':
            success = relayController.setRelay(data.channel, data.targetState);
            break;
        case 'hold':
            success = relayController.setRelay(data.channel, data.targetState);
            break;
        default:
            success = relayController.setRelay(data.channel, data.targetState);
    }

    if (success) {
        const currentState = relayController.getState(data.channel);
        socket.emit('relay:state-update', {
            relayId: data.relayId,
            state: data.mode === 'pulse' ? 'closed' : currentState,
        });
        logger.relay(`Confirmação enviada ao servidor: estado ${currentState}`);
    } else {
        logger.erro(`Falha ao acionar relé canal ${data.channel} (${gpioStr})`);
    }
});

// ============================================
// Receber Comandos Genéricos (log em tempo real)
// ============================================
socket.on('device:command', (data) => {
    logger.comando(`Comando recebido do servidor: ${data.command}`);

    switch (data.command) {
        case 'reboot':
            logger.comando('Reiniciando dispositivo conforme comando do servidor...');
            socket.emit('command:response', {
                command: data.command,
                status: 'executing',
                message: 'Reiniciando dispositivo...',
            });

            // Simulação de delay para o usuário ver a resposta antes de cair a conexão
            setTimeout(() => {
                if (process.platform === 'linux') {
                    const { exec } = require('child_process');
                    exec('sudo reboot');
                } else {
                    logger.info('Simulação de reboot (não é Linux). Encerrando processo.');
                    process.exit(1);
                }
            }, 2000);
            break;

        case 'status':
            logger.comando('Enviando status (relés, uptime, memória, CPU) ao servidor.');
            socket.emit('command:response', {
                command: data.command,
                status: 'success',
                data: {
                    relayStates: relayController.getAllStates(),
                    uptime: os.uptime(),
                    memory: {
                        total: os.totalmem(),
                        free: os.freemem(),
                    },
                    cpu: os.loadavg(),
                },
            });
            break;

        case 'get-states':
            logger.comando('Enviando estados dos relés ao servidor.');
            socket.emit('command:response', {
                command: data.command,
                status: 'success',
                data: relayController.getAllStates(),
            });
            break;

        default:
            logger.comando(`Comando desconhecido: ${data.command}`);
            socket.emit('command:response', {
                command: data.command,
                status: 'unknown',
                message: `Comando desconhecido: ${data.command}`,
            });
    }
});

// ============================================
// Heartbeat & Health Reporting
// ============================================
function getCpuTemp() {
    if (process.platform === 'linux') {
        try {
            const p = '/sys/class/thermal/thermal_zone0/temp';
            if (fs.existsSync(p)) {
                const raw = fs.readFileSync(p, 'utf8').trim();
                return Math.round(parseInt(raw, 10) / 1000); // millidegrees -> °C
            }
        } catch (e) { /* ignore */ }
    }
    return 0;
}

setInterval(() => {
    if (socket.connected) {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const uptime = os.uptime();

        // Enviar Heartbeat (Legacy/Keep-alive)
        socket.emit('heartbeat', {
            uptime,
            memory: { total: totalMem, free: freeMem, used: usedMem },
            cpu: os.loadavg(),
            temperature: getCpuTemp(),
            relayStates: relayController.getAllStates(),
        });

        // Enviar Health Update (Novo Dashboard)
        socket.emit('device:health-update', {
            cpuTemp: getCpuTemp(),
            memoryUsage: {
                total: Math.round(totalMem / 1024 / 1024), // MB
                used: Math.round(usedMem / 1024 / 1024), // MB
                percent: Math.round((usedMem / totalMem) * 100)
            },
            uptime: Math.round(uptime / 3600), // Horas
        });
    }
}, config.heartbeatInterval);

// ============================================
// Graceful Shutdown
// ============================================
const shutdown = () => {
    logger.info('Encerrando cliente (SIGINT/SIGTERM)...');
    relayController.cleanup();
    inputController.cleanup();
    socket.disconnect();
    process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Painel web local (porta 5080) — config via SQLite
function getStatus() {
    return {
        connected: socket.connected,
        relayStates: relayController.getAllStates(),
        uptime: os.uptime(),
        memory: { total: os.totalmem(), free: os.freemem() },
        cpuTemp: getCpuTemp(),
    };
}
startWebServer(logger, getStatus, settings);

logger.info('Zaccess Raspberry Pi Client iniciado. Pressione Ctrl+C para encerrar.');

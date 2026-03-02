require('dotenv').config();
const { io } = require('socket.io-client');
const config = require('./config');
const RelayController = require('./relayController');
const inputController = require('./inputController');
const os = require('os');

// ============================================
// Inicializar Relay Controller
// ============================================
const relayController = new RelayController(config.channelToGpio);
relayController.initAll();

// Configurar o callback de mudança de sensor
inputController.setCallback((inputId, state) => {
    socket.emit('input:state-update', { inputId, state });
});

// ============================================
// Conectar ao Servidor Zaccess
// ============================================
console.log(`🔌 Conectando ao servidor: ${config.serverUrl}`);
console.log(`📟 Serial: ${config.serialNumber}`);

const socket = io(`${config.serverUrl}/devices`, {
    auth: {
        serialNumber: config.serialNumber,
        authToken: config.authToken,
    },
    transports: ['websocket', 'polling'],
    reconnection: config.reconnect.enabled,
    reconnectionAttempts: config.reconnect.maxAttempts,
    reconnectionDelay: config.reconnect.delay,
});

// ============================================
// Eventos de Conexão
// ============================================
socket.on('connect', () => {
    console.log('✅ Conectado ao servidor Zaccess!');
    console.log(`   Socket ID: ${socket.id}`);
});

socket.on('disconnect', (reason) => {
    console.log(`🔌 Desconectado: ${reason}`);
});

socket.on('connect_error', (err) => {
    console.error(`❌ Erro de conexão: ${err.message}`);
});

socket.on('reconnect_attempt', (attempt) => {
    console.log(`🔄 Tentativa de reconexão #${attempt}...`);
});

socket.on('error', (data) => {
    console.error(`❌ Erro do servidor: ${data.message}`);
});

// ============================================
// Receber Configuração do Servidor
// ============================================
socket.on('device:config', (data) => {
    console.log(`📋 Configuração recebida: ${data.name}`);
    console.log(`   Relés configurados: ${data.relays.length}`);

    // Inicializar relés conforme configuração do servidor
    data.relays.forEach((relay) => {
        relayController.initRelay(relay.channel, relay.gpioPin);
        // Restaurar o estado salvo no servidor
        if (relay.state === 'open') {
            relayController.setRelay(relay.channel, 'open');
        }
    });

    // Inicializar sensores conforme configuração do servidor
    if (data.inputs) {
        console.log(`   Sensores configurados: ${data.inputs.length}`);
        inputController.initAll(data.inputs);
    }
});

// ============================================
// Receber Comando de Toggle
// ============================================
socket.on('relay:toggle', (data) => {
    console.log(`⚡ Comando de toggle: Canal ${data.channel} -> ${data.targetState}`);

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

    // Enviar confirmação de estado para o servidor
    if (success) {
        const currentState = relayController.getState(data.channel);
        socket.emit('relay:state-update', {
            relayId: data.relayId,
            state: data.mode === 'pulse' ? 'closed' : currentState,
        });
        console.log(`   ✅ Relé acionado com sucesso`);
    } else {
        console.log(`   ❌ Falha ao acionar relé`);
    }
});

// ============================================
// Receber Comandos Genéricos
// ============================================
socket.on('device:command', (data) => {
    console.log(`📩 Comando recebido: ${data.command}`);

    switch (data.command) {
        case 'reboot':
            console.log('🔄 Reiniciando dispositivo conforme comando do servidor...');
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
                    console.log('⚠️ Simulação de Reboot: (sudo reboot) - Sistema operacional não Linux.');
                    process.exit(1); // Simula a queda da conexão
                }
            }, 2000);
            break;

        case 'status':
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
            socket.emit('command:response', {
                command: data.command,
                status: 'success',
                data: relayController.getAllStates(),
            });
            break;

        default:
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
const getCpuTemp = () => {
    // Em produção: usar fs.readFileSync('/sys/class/thermal/thermal_zone0/temp')
    // Simulação para desenvolvimento
    return 45 + Math.random() * 15;
};

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
    console.log('\n🛑 Encerrando...');
    relayController.cleanup();
    inputController.cleanup();
    socket.disconnect();
    process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('🚀 Zaccess Raspberry Pi Client iniciado');
console.log('   Pressione Ctrl+C para encerrar');

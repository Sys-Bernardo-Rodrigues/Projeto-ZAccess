module.exports = {
    // URL do servidor Zacess (com porta)
    serverUrl: process.env.ZACESS_SERVER_URL || 'http://localhost:3001',

    // Serial number do dispositivo (deve ser registrado no servidor antes)
    serialNumber: process.env.ZACESS_SERIAL || 'RPi4-TEST-001',

    // Token de autenticação
    authToken: process.env.ZACESS_AUTH_TOKEN || '',

    // Intervalo de heartbeat em ms
    heartbeatInterval: 15000,

    // Reconexão automática
    reconnect: {
        enabled: true,
        maxAttempts: Infinity,
        delay: 5000,
    },

    // Mapeamento de canais para pinos GPIO
    // Ajuste conforme sua fiação
    channelToGpio: {
        1: 17,
        2: 18,
        3: 27,
        4: 22,
        5: 23,
        6: 24,
        7: 25,
        8: 4,
    },
};

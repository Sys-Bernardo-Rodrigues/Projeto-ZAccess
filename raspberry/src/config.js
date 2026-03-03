/**
 * Configuração estática do cliente (GPIO, heartbeat, reconexão).
 * Conexão (serverUrl, serialNumber, authToken) vem de loadConfig() = SQLite + .env
 */

module.exports = {
    heartbeatInterval: 15000,
    reconnect: {
        enabled: true,
        maxAttempts: Infinity,
        delay: 5000,
        delayMax: 60000,
    },
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

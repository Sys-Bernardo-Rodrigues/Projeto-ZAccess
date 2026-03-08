/**
 * Configuração estática do cliente (GPIO, heartbeat, reconexão).
 * Conexão (serverUrl, serialNumber, authToken) vem de loadConfig() = SQLite + .env
 *
 * Hardware: Módulo de Relé de 4 Canais (apenas canais 1–4).
 */

module.exports = {
    heartbeatInterval: 15000,
    reconnect: {
        enabled: true,
        maxAttempts: Infinity,
        delay: 5000,
        delayMax: 60000,
    },
    /** Módulo de Relé de 4 Canais: canal -> pino GPIO (BCM) */
    channelToGpio: {
        1: 17,
        2: 18,
        3: 27,
        4: 22,
    },
};

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
        delay: 10000,       // Primeira tentativa após 10s
        delayMax: 10000,    // Sempre 10s entre tentativas (sem aumentar)
    },
    /**
     * Módulo de Relé de 4 Canais: canal -> pino GPIO (BCM) para entradas de controle (IN1–IN4).
     * Alimentação: VCC=17, JD-VCC=4, GND=20 (conectar no hardware; não controlados por software).
     */
    channelToGpio: {
        1: 29,  // IN1
        2: 31,  // IN2
        3: 33,  // IN3
        4: 35,  // IN4
    },
};

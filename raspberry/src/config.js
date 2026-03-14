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
     * Módulo de Relé de 4 Canais: canal -> número GPIO BCM para entradas de controle (IN1–IN4).
     * Raspberry Pi 4: BCM 5, 6, 13, 19 (pinos físicos 29, 31, 33, 35 no header 40-pin).
     * Alimentação do módulo: VCC, JD-VCC, GND (conectar no hardware; não controlados por software).
     */
    channelToGpio: {
        1: 5,   // IN1 (BCM 5 = pino físico 29)
        2: 6,   // IN2 (BCM 6 = pino físico 31)
        3: 13,  // IN3 (BCM 13 = pino físico 33)
        4: 19,  // IN4 (BCM 19 = pino físico 35)
    },
};

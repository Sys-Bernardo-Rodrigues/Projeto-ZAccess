/**
 * Zacess - Relay Controller for Raspberry Pi
 *
 * Controla relés via pinos GPIO usando a lib onoff.
 * Em ambiente de desenvolvimento (sem GPIO real), opera em modo simulado.
 */

let Gpio;
try {
    Gpio = require('onoff').Gpio;
} catch (err) {
    console.warn('⚠️  onoff não disponível - modo simulado ativado');
    Gpio = null;
}

const logger = require('./utils/logger');

class RelayController {
    constructor(channelToGpio) {
        this.channelToGpio = channelToGpio;
        this.relays = {};
        this.states = {};
        this.gpioByChannel = {};
        this.simulated = !Gpio;
    }

    /**
     * Retorna o número do GPIO para um canal (para logs)
     */
    getGpioForChannel(channel) {
        return this.gpioByChannel[channel] ?? this.channelToGpio[channel] ?? null;
    }

    /**
     * Inicializa um relé em um canal/pino específico
     */
    initRelay(channel, gpioPin) {
        this.gpioByChannel[channel] = gpioPin;

        if (this.simulated) {
            logger.gpio(`Relé inicializado: Canal ${channel} -> GPIO ${gpioPin} (simulado)`);
            this.states[channel] = 0;
            return;
        }

        try {
            this.relays[channel] = new Gpio(gpioPin, 'out');
            this.relays[channel].writeSync(0);
            this.states[channel] = 0;
            logger.gpio(`Relé inicializado: Canal ${channel} -> GPIO ${gpioPin}`);
        } catch (err) {
            logger.erro(`Relé canal ${channel} (GPIO ${gpioPin}): ${err.message}`);
        }
    }

    /**
     * Inicializa todos os relés baseado no mapeamento de config (fallback se servidor não enviar config)
     */
    initAll() {
        for (const [channel, gpioPin] of Object.entries(this.channelToGpio)) {
            this.initRelay(parseInt(channel), gpioPin);
        }
        logger.config(`${Object.keys(this.channelToGpio).length} relés inicializados (config local)`);
    }

    /**
     * Inicializa apenas os relés definidos pelo servidor (limpa os atuais antes)
     */
    initFromServerConfig(relays) {
        this.cleanup();
        if (!relays || relays.length === 0) return;

        relays.forEach((relay) => {
            const gpioPin = relay.gpioPin != null ? relay.gpioPin : this.channelToGpio[relay.channel];
            if (gpioPin == null) return;
            this.initRelay(relay.channel, gpioPin);
            if (relay.state === 'open') {
                this.setRelay(relay.channel, 'open');
            }
        });
        logger.config(`${relays.length} relés configurados pelo servidor`);
    }

    /**
     * Ativa/Desativa um relé
     */
    setRelay(channel, state) {
        const value = state === 'open' ? 1 : 0;
        const gpio = this.getGpioForChannel(channel);

        if (this.simulated) {
            logger.gpio(`Relé canal ${channel} (GPIO ${gpio ?? '?'}): ${state} (simulado)`);
            this.states[channel] = value;
            return true;
        }

        const relay = this.relays[channel];
        if (!relay) {
            logger.erro(`Relé canal ${channel} (GPIO ${gpio ?? '?'}) não inicializado`);
            return false;
        }

        try {
            relay.writeSync(value);
            this.states[channel] = value;
            logger.gpio(`GPIO ${gpio} (canal ${channel}) acionado: ${state}`);
            return true;
        } catch (err) {
            logger.erro(`Relé canal ${channel} (GPIO ${gpio}): ${err.message}`);
            return false;
        }
    }

    /**
     * Toggle de relé (inverte estado)
     */
    toggleRelay(channel) {
        const currentState = this.states[channel] || 0;
        const newState = currentState === 0 ? 'open' : 'closed';
        return this.setRelay(channel, newState);
    }

    /**
     * Modo pulso: ativa por X ms e depois desativa (mínimo 100 ms)
     */
    pulseRelay(channel, durationMs = 1000) {
        const duration = Math.max(100, Number(durationMs) || 1000);
        const gpio = this.getGpioForChannel(channel);
        logger.gpio(`GPIO ${gpio} (canal ${channel}): pulso ${duration} ms`);
        this.setRelay(channel, 'open');
        setTimeout(() => {
            this.setRelay(channel, 'closed');
        }, duration);
        return true;
    }

    /**
     * Retorna o estado atual de um relé
     */
    getState(channel) {
        return this.states[channel] === 1 ? 'open' : 'closed';
    }

    /**
     * Retorna todos os estados
     */
    getAllStates() {
        const result = {};
        for (const channel of Object.keys(this.states)) {
            result[channel] = this.getState(parseInt(channel));
        }
        return result;
    }

    /**
     * Libera os recursos GPIO e limpa estado interno
     */
    cleanup() {
        if (this.simulated) {
            this.relays = {};
            this.states = {};
            this.gpioByChannel = {};
            return;
        }

        for (const [channel, relay] of Object.entries(this.relays)) {
            try {
                relay.writeSync(0);
                relay.unexport();
            } catch (err) {
                logger.erro(`Liberar relé canal ${channel}: ${err.message}`);
            }
        }
        this.relays = {};
        this.states = {};
        this.gpioByChannel = {};
    }
}

module.exports = RelayController;

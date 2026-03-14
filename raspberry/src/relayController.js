/**
 * Zacess - Relay Controller for Raspberry Pi
 *
 * Controla relés via GPIO.
 *
 * Suporte a dois modos:
 * - Modo libgpiod (comando `gpioset` disponível no sistema) – recomendado em Raspberry Pi OS recentes (Bookworm).
 * - Modo simulado (quando `gpioset` não está disponível ou em ambiente de desenvolvimento).
 */

const { execSync } = require('child_process');
const fs = require('fs');
const logger = require('./utils/logger');

class RelayController {
    constructor(channelToGpio) {
        this.channelToGpio = channelToGpio;
        this.relays = {};
        this.states = {};
        this.gpioByChannel = {};
        this.useGpiod = process.platform === 'linux' && this.hasGpioSet();
        this.simulated = !this.useGpiod;

        if (this.useGpiod) {
            logger.info('RelayController: usando gpioset (libgpiod) para controle de GPIO.');
        } else {
            logger.info('RelayController: modo simulado (gpioset não encontrado ou plataforma não suportada).');
        }
    }

    hasGpioSet() {
        try {
            // Verifica se o binário gpioset está disponível no PATH
            const which = execSync('command -v gpioset', { encoding: 'utf8' }).trim();
            return which && fs.existsSync(which);
        } catch (e) {
            return false;
        }
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
 
        // No modo libgpiod não é necessário reservar explicitamente o pino aqui,
        // o gpioset cuida da configuração como saída quando usado.
        this.states[channel] = 0;
        if (this.simulated) {
            logger.gpio(`Relé inicializado: Canal ${channel} -> GPIO ${gpioPin} (simulado)`);
        } else {
            logger.gpio(`Relé inicializado: Canal ${channel} -> GPIO ${gpioPin} (gpioset)`);
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

        if (gpio == null) {
            logger.erro(`Relé canal ${channel}: GPIO não definido`);
            return false;
        }

        try {
            // Usar chip 0 (gpiochip0) e linha = número BCM do GPIO.
            // Ex.: gpioset -c 0 19=1
            const cmd = `gpioset -c 0 ${gpio}=${value}`;
            execSync(cmd);
            this.states[channel] = value;
            logger.gpio(`GPIO ${gpio} (canal ${channel}) acionado via gpioset: ${state}`);
            return true;
        } catch (err) {
            logger.erro(`Relé canal ${channel} (GPIO ${gpio}) via gpioset: ${err.message}`);
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
        this.relays = {};
        this.states = {};
        this.gpioByChannel = {};
    }
}

module.exports = RelayController;

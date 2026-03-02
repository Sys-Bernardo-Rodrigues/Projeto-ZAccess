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

class RelayController {
    constructor(channelToGpio) {
        this.channelToGpio = channelToGpio;
        this.relays = {};
        this.states = {};
        this.simulated = !Gpio;
    }

    /**
     * Inicializa um relé em um canal/pino específico
     */
    initRelay(channel, gpioPin) {
        if (this.simulated) {
            console.log(`[SIM] Relé inicializado: Canal ${channel} -> GPIO ${gpioPin}`);
            this.states[channel] = 0; // 0 = closed/off
            return;
        }

        try {
            this.relays[channel] = new Gpio(gpioPin, 'out');
            this.relays[channel].writeSync(0); // Start with relay off
            this.states[channel] = 0;
            console.log(`✅ Relé inicializado: Canal ${channel} -> GPIO ${gpioPin}`);
        } catch (err) {
            console.error(`❌ Erro ao inicializar relé canal ${channel}:`, err.message);
        }
    }

    /**
     * Inicializa todos os relés baseado no mapeamento de config
     */
    initAll() {
        for (const [channel, gpioPin] of Object.entries(this.channelToGpio)) {
            this.initRelay(parseInt(channel), gpioPin);
        }
        console.log(`📡 ${Object.keys(this.channelToGpio).length} relés inicializados`);
    }

    /**
     * Ativa/Desativa um relé
     */
    setRelay(channel, state) {
        const value = state === 'open' ? 1 : 0;

        if (this.simulated) {
            console.log(`[SIM] Relé canal ${channel}: ${state} (${value})`);
            this.states[channel] = value;
            return true;
        }

        const relay = this.relays[channel];
        if (!relay) {
            console.error(`Relé canal ${channel} não inicializado`);
            return false;
        }

        try {
            relay.writeSync(value);
            this.states[channel] = value;
            console.log(`⚡ Relé canal ${channel}: ${state}`);
            return true;
        } catch (err) {
            console.error(`Erro ao acionar relé canal ${channel}:`, err.message);
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
     * Modo pulso: ativa por X ms e depois desativa
     */
    pulseRelay(channel, durationMs = 1000) {
        this.setRelay(channel, 'open');
        setTimeout(() => {
            this.setRelay(channel, 'closed');
        }, durationMs);
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
     * Libera os recursos GPIO
     */
    cleanup() {
        if (this.simulated) {
            console.log('[SIM] Cleanup: relés liberados');
            return;
        }

        for (const [channel, relay] of Object.entries(this.relays)) {
            try {
                relay.writeSync(0); // Desligar antes de liberar
                relay.unexport();
                console.log(`Relé canal ${channel} liberado`);
            } catch (err) {
                console.error(`Erro ao liberar relé canal ${channel}:`, err.message);
            }
        }
    }
}

module.exports = RelayController;

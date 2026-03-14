/**
 * Controle dos 4 relés via GPIO (Raspberry Pi)
 * Módulo 4 relés: IN1→GPIO5, IN2→GPIO6, IN3→GPIO13, IN4→GPIO19
 * GND→pin20, VCC→17 (3.3V), JD-VCC→pin2 (5V)
 */

let Gpio;
try {
  Gpio = require('onoff').Gpio;
} catch (e) {
  Gpio = null; // sem hardware (desenvolvimento no PC)
}

const CHANNEL_TO_BCM = {
  1: 5,
  2: 6,
  3: 13,
  4: 19,
};

let pins = {};
let customMap = null;

/**
 * Inicializa GPIO com mapa de canais (opcional).
 * @param {Object} channelToGpio - ex: { 1: 5, 2: 6, 3: 13, 4: 19 }
 */
function init(channelToGpio = null) {
  const map = channelToGpio || CHANNEL_TO_BCM;
  customMap = map;

  if (!Gpio) {
    console.warn('[GPIO] Módulo onoff não disponível (simulação).');
    return;
  }

  close();
  for (const [channel, bcm] of Object.entries(map)) {
    try {
      pins[Number(channel)] = new Gpio(bcm, 'out');
      pins[Number(channel)].writeSync(0); // relé desligado (LOW = comum em módulos ópticos)
    } catch (err) {
      console.error(`[GPIO] Erro ao inicializar canal ${channel} (BCM ${bcm}):`, err.message);
    }
  }
}

/**
 * Fecha todos os pinos e libera recursos.
 */
function close() {
  for (const ch of Object.keys(pins)) {
    try {
      pins[ch].writeSync(0);
      pins[ch].unexport();
    } catch (_) {}
  }
  pins = {};
}

/**
 * Ativa (1) ou desativa (0) um canal. Relés ópticos: LOW = ligado, HIGH = desligado (pode variar por módulo).
 * @param {number} channel - 1 a 4
 * @param {boolean} on - true = relé ativo
 */
function setRelay(channel, on) {
  const ch = Number(channel);
  if (!pins[ch]) {
    if (Gpio) return;
    console.log(`[GPIO] Simulação: canal ${ch} -> ${on ? 'ON' : 'OFF'}`);
    return;
  }
  // Módulo típico: 0 = relé ligado, 1 = relé desligado
  pins[ch].writeSync(on ? 1 : 0);
}

/**
 * Liga o relé do canal por um tempo (pulse) e desliga.
 * @param {number} channel - 1 a 4
 * @param {number} durationMs - duração em ms
 * @returns {Promise<void>}
 */
function pulseRelay(channel, durationMs = 1000) {
  return new Promise((resolve) => {
    setRelay(channel, true);
    setTimeout(() => {
      setRelay(channel, false);
      resolve();
    }, Math.max(100, durationMs));
  });
}

/**
 * Retorna mapa de canais para BCM usado.
 */
function getChannelMap() {
  return customMap || CHANNEL_TO_BCM;
}

module.exports = {
  init,
  close,
  setRelay,
  pulseRelay,
  getChannelMap,
  isAvailable: !!Gpio,
};

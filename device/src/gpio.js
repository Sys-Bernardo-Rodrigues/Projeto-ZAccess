/**
 * Controle dos 4 relés via GPIO — Raspberry Pi 4 Model B + Raspberry OS (Bookworm+).
 * Usa gpiod (gpioset) — a interface sysfs foi removida no kernel recente.
 * Módulo 4 relés: IN1→BCM5, IN2→BCM6, IN3→BCM13, IN4→BCM19
 * GND→pin20, VCC→17 (3.3V), JD-VCC→pin2 (5V)
 */

const { spawnSync } = require('child_process');

const CHANNEL_TO_BCM = {
  1: 5,
  2: 6,
  3: 13,
  4: 19,
};

const GPIO_CHIP = 'gpiochip0'; // Raspberry Pi 4
let customMap = null;

function useGpiod() {
  if (process.platform !== 'linux') return false;
  const r = spawnSync('which', ['gpioset'], { encoding: 'utf8' });
  return r.status === 0 && !!r.stdout.trim();
}

const hasGpiod = useGpiod();

/**
 * Define o mapa de canais (BCM). Chamado por init().
 */
function setChannelMap(channelToGpio) {
  customMap = channelToGpio || CHANNEL_TO_BCM;
}

/**
 * Escreve no pino via gpioset.
 * Sintaxe conforme a versão do gpiod no sistema:
 * - Algumas: gpioset <chip> <line>=<value>
 * - Outras (ex.: Raspberry OS): gpioset <chip> <line> <value> (três argumentos)
 */
function gpioWrite(bcm, value) {
  if (!hasGpiod) return { ok: false, error: 'gpioset não disponível' };
  const v = value ? 1 : 0;
  const args = [GPIO_CHIP, String(bcm), String(v)];
  const r = spawnSync('gpioset', args, {
    encoding: 'utf8',
    timeout: 2000,
  });
  if (r.status !== 0) {
    return { ok: false, error: r.stderr || r.error?.message || `exit ${r.status}` };
  }
  return { ok: true };
}

/**
 * Inicializa o mapa de canais. Com gpiod não há “export”; só guardamos o mapa.
 * @param {Object} channelToGpio - ex: { 1: 5, 2: 6, 3: 13, 4: 19 }
 */
function init(channelToGpio = null) {
  const map = channelToGpio || CHANNEL_TO_BCM;
  customMap = Object.fromEntries(
    Object.entries(map).map(([k, v]) => [Number(k), Number(v)])
  );
  if (!hasGpiod) {
    console.warn('[GPIO] gpioset não encontrado. Instale: sudo apt install gpiod');
    return;
  }
  // Deixar todos em 0 (relé desligado) ao iniciar
  for (const bcm of Object.values(customMap)) {
    gpioWrite(bcm, false);
  }
}

/**
 * Nada a liberar com gpiod (cada gpioset -m exit sai logo).
 */
function close() {
  const map = customMap || CHANNEL_TO_BCM;
  for (const bcm of Object.values(map)) {
    gpioWrite(bcm, false);
  }
}

/**
 * Ativa (1) ou desativa (0) um canal.
 * @param {number} channel - 1 a 4
 * @param {boolean} on - true = relé ativo
 */
function setRelay(channel, on) {
  const ch = Number(channel);
  const map = customMap || CHANNEL_TO_BCM;
  const bcm = map[ch];
  if (bcm == null) {
    console.log(`[GPIO] Simulação: canal ${ch} -> ${on ? 'ON' : 'OFF'}`);
    return;
  }
  const r = gpioWrite(bcm, on);
  if (!r.ok) {
    console.error(`[GPIO] Canal ${ch} (BCM ${bcm}):`, r.error);
  }
}

/**
 * Pulso no relé: liga, espera durationMs, desliga.
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

function getChannelMap() {
  return customMap || CHANNEL_TO_BCM;
}

module.exports = {
  init,
  close,
  setRelay,
  pulseRelay,
  getChannelMap,
  isAvailable: hasGpiod,
};

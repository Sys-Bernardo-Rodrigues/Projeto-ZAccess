/**
 * Controle dos 4 relés via gpioset (libgpiod v2).
 * - Não usar -z (daemonize): o processo fica a segurar a linha e o próximo gpioset dá "device busy".
 * - setRelay / init / close: gpioset -c chip -t 0,0 line=value (define e sai logo).
 * - pulseRelay: gpioset -c chip -t durationMs,0 line=1 (liga, espera, faz toggle para 0, sai).
 */

const { spawnSync, spawn } = require('child_process');

const CHANNEL_TO_BCM = {
  1: 5,
  2: 6,
  3: 13,
  4: 19,
};

const GPIO_CHIP = 'gpiochip0';
let customMap = null;

function useGpiod() {
  if (process.platform !== 'linux') return false;
  const r = spawnSync('which', ['gpioset'], { encoding: 'utf8' });
  return r.status === 0 && !!r.stdout.trim();
}

const hasGpiod = useGpiod();

/**
 * Define valor e sai imediatamente (sem segurar a linha): -t 0,0
 */
function gpioWrite(bcm, value) {
  if (!hasGpiod) return { ok: false, error: 'gpioset não disponível' };
  const v = value ? 1 : 0;
  const args = ['-c', GPIO_CHIP, '-t', '0,0', `${bcm}=${v}`];
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
 * Inicializa o mapa de canais e deixa todos em 0.
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
  for (const bcm of Object.values(customMap)) {
    gpioWrite(bcm, false);
  }
}

function close() {
  const map = customMap || CHANNEL_TO_BCM;
  for (const bcm of Object.values(map)) {
    gpioWrite(bcm, false);
  }
}

/**
 * Ativa (1) ou desativa (0) um canal. Usa -t 0,0 para não segurar a linha.
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
 * Pulso: um único gpioset com -t durationMs,0 (liga, espera, faz toggle para 0, sai).
 * Não usa dois processos, evita "device busy".
 */
function pulseRelay(channel, durationMs = 1000) {
  const map = customMap || CHANNEL_TO_BCM;
  const bcm = map[Number(channel)];
  if (bcm == null) {
    return Promise.resolve();
  }
  const duration = Math.max(100, durationMs);
  return new Promise((resolve, reject) => {
    const child = spawn('gpioset', ['-c', GPIO_CHIP, '-t', `${duration},0`, `${bcm}=1`], {
      stdio: 'ignore',
    });
    child.on('error', (err) => {
      console.error('[GPIO] pulseRelay spawn error:', err.message);
      reject(err);
    });
    child.on('exit', (code) => {
      resolve();
    });
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

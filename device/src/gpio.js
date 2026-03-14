/**
 * Controle dos 4 relés via GPIO (Raspberry Pi)
 * Módulo 4 relés: IN1→GPIO5, IN2→GPIO6, IN3→GPIO13, IN4→GPIO19
 * GND→pin20, VCC→17 (3.3V), JD-VCC→pin2 (5V)
 *
 * Usa "onoff" (sysfs) em Raspberry Pi antigos; em Pi 5 / Bookworm (kernel novo)
 * a interface legada foi removida — fallback para ferramentas "gpiod" (gpioset).
 */

const { spawn } = require('child_process');

let Gpio;
try {
  Gpio = require('onoff').Gpio;
} catch (e) {
  Gpio = null;
}

const CHANNEL_TO_BCM = {
  1: 5,
  2: 6,
  3: 13,
  4: 19,
};

const GPIO_CHIP = 'gpiochip0';

let pins = {};
let gpiodChildren = {}; // canal -> ChildProcess (para hold com gpioset)
let customMap = null;
let useGpiodCli = false;

function useGpiodFallback() {
  if (useGpiodCli) return true;
  useGpiodCli = true;
  console.warn('[GPIO] Usando fallback gpiod (gpioset). Instale se necessário: sudo apt install gpiod');
  return true;
}

/**
 * Define o relé via gpioset (mantém processo para manter estado).
 */
function setRelayGpiod(channel, on) {
  const map = customMap || CHANNEL_TO_BCM;
  const bcm = map[Number(channel)];
  if (bcm == null) return;

  const key = Number(channel);
  if (gpiodChildren[key]) {
    try {
      gpiodChildren[key].kill('SIGKILL');
    } catch (_) {}
    gpiodChildren[key] = null;
  }

  const value = on ? '1' : '0';
  const child = spawn('gpioset', [GPIO_CHIP, `${bcm}=${value}`], {
    stdio: 'ignore',
    detached: true,
  });
  child.unref();
  gpiodChildren[key] = child;
}

/**
 * Pulse via gpioset -p <duration> (segundos).
 */
function pulseRelayGpiod(channel, durationMs) {
  const map = customMap || CHANNEL_TO_BCM;
  const bcm = map[Number(channel)];
  if (bcm == null) return Promise.resolve();

  const sec = Math.max(0.001, durationMs / 1000);
  return new Promise((resolve, reject) => {
    const child = spawn('gpioset', ['-p', `${sec}s`, GPIO_CHIP, `${bcm}=1`], {
      stdio: 'ignore',
    });
    child.on('close', (code) => resolve());
    child.on('error', (err) => reject(err));
  });
}

function closeGpiod() {
  for (const ch of Object.keys(gpiodChildren)) {
    try {
      if (gpiodChildren[ch]) gpiodChildren[ch].kill('SIGKILL');
    } catch (_) {}
  }
  gpiodChildren = {};
}

/**
 * Inicializa GPIO com mapa de canais (opcional).
 */
function init(channelToGpio = null) {
  const map = channelToGpio || CHANNEL_TO_BCM;
  customMap = map;

  close();

  if (!Gpio) {
    console.warn('[GPIO] Módulo onoff não disponível (simulação).');
    return;
  }

  useGpiodCli = false;
  for (const [channel, bcm] of Object.entries(map)) {
    try {
      const pin = new Gpio(Number(bcm), 'out');
      pin.writeSync(0);
      pins[Number(channel)] = pin;
    } catch (err) {
      if (err.code === 'EINVAL' || err.message.includes('EINVAL')) {
        useGpiodFallback();
        close();
        return;
      }
      console.error(`[GPIO] Erro ao inicializar canal ${channel} (BCM ${bcm}):`, err.message);
    }
  }

  if (useGpiodCli) {
    close();
    return;
  }
}

/**
 * Fecha todos os pinos e libera recursos.
 */
function close() {
  closeGpiod();
  for (const ch of Object.keys(pins)) {
    try {
      pins[ch].writeSync(0);
      pins[ch].unexport();
    } catch (_) {}
  }
  pins = {};
}

/**
 * Ativa (1) ou desativa (0) um canal.
 */
function setRelay(channel, on) {
  const ch = Number(channel);
  if (useGpiodCli) {
    setRelayGpiod(ch, on);
    return;
  }
  if (!pins[ch]) {
    if (Gpio) return;
    console.log(`[GPIO] Simulação: canal ${ch} -> ${on ? 'ON' : 'OFF'}`);
    return;
  }
  pins[ch].writeSync(on ? 1 : 0);
}

/**
 * Liga o relé do canal por um tempo (pulse) e desliga.
 */
function pulseRelay(channel, durationMs = 1000) {
  if (useGpiodCli) {
    return pulseRelayGpiod(channel, durationMs);
  }
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
  isAvailable: () => !!Gpio || useGpiodCli,
};

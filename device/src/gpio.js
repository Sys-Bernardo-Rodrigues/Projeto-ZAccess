/**
 * Controle dos 4 relés — Raspberry Pi 4 + Raspberry OS.
 * Usa a biblioteca pigpio (acesso via /dev/gpiomem), evitando conflito
 * com gpiochip que causa "device or resource busy".
 * IN1→BCM5, IN2→BCM6, IN3→BCM13, IN4→BCM19
 */

let pigpio = null;
let Gpio = null;

try {
  pigpio = require('pigpio');
  Gpio = pigpio.Gpio;
  // Se o módulo nativo não carregou, gpioInitialise não existe e o Gpio vai falhar
  if (typeof pigpio.gpioInitialise !== 'function') {
    console.warn('[GPIO] Módulo nativo pigpio não carregou. Execute no Raspberry: npm rebuild e reinicie o serviço. LD_LIBRARY_PATH=/usr/local/lib pode ser necessário.');
    Gpio = null;
  }
} catch (e) {
  Gpio = null;
}

const CHANNEL_TO_BCM = {
  1: 5,
  2: 6,
  3: 13,
  4: 19,
};

let pins = {};
let customMap = null;

function init(channelToGpio = null) {
  const map = channelToGpio || CHANNEL_TO_BCM;
  customMap = Object.fromEntries(
    Object.entries(map).map(([k, v]) => [Number(k), Number(v)])
  );

  if (!Gpio) {
    console.warn('[GPIO] pigpio não disponível (instale: sudo apt install pigpio e npm install pigpio).');
    return;
  }

  close();
  for (const [channel, bcm] of Object.entries(customMap)) {
    try {
      const pin = new Gpio(Number(bcm), { mode: Gpio.OUTPUT });
      pin.digitalWrite(0);
      pins[Number(channel)] = pin;
    } catch (err) {
      console.error(`[GPIO] Erro ao inicializar canal ${channel} (BCM ${bcm}):`, err.message);
      if (/gpioInitialise|self-register|different Node/.test(err.message)) {
        console.error('[GPIO] Dica: no Raspberry execute "cd /opt/zaccess-device && npm rebuild" e reinicie o serviço. Se pigpio foi instalado de fonte, use LD_LIBRARY_PATH=/usr/local/lib.');
      }
    }
  }
}

function close() {
  for (const ch of Object.keys(pins)) {
    try {
      pins[ch].digitalWrite(0);
      if (typeof pins[ch].unexport === 'function') {
        pins[ch].unexport();
      }
    } catch (_) {}
  }
  pins = {};
}

function setRelay(channel, on) {
  const ch = Number(channel);
  if (!pins[ch]) {
    if (Gpio) return;
    console.log(`[GPIO] Simulação: canal ${ch} -> ${on ? 'ON' : 'OFF'}`);
    return;
  }
  pins[ch].digitalWrite(on ? 1 : 0);
}

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
  isAvailable: !!Gpio,
};

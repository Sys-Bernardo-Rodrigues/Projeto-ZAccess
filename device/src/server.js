/**
 * Servidor local ZAccess: interface web para ativar/desativar relés via pigpio.
 * Um botão por IN da placa (IN1–IN4). Acesso: http://<IP-do-Raspberry>:3080
 */

const path = require('path');
const express = require('express');
const configLoader = require('./configLoader');
const gpio = require('./gpio');

const app = express();
const PORT = process.env.DEVICE_UI_PORT || 3080;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Estado em memória dos relés (1–4). Inicializado ao iniciar GPIO.
const relayState = { 1: false, 2: false, 3: false, 4: false };

function initGpio() {
  const config = configLoader.load();
  const relayMap = config?.gpio?.relays || { 1: 5, 2: 6, 3: 13, 4: 19 };
  gpio.init(relayMap);
  // Garantir que todos começam desligados
  [1, 2, 3, 4].forEach((ch) => {
    gpio.setRelay(ch, false);
    relayState[ch] = false;
  });
}

// GET /api/relays — estado de todos os canais
app.get('/api/relays', (req, res) => {
  res.json({ success: true, relays: { ...relayState } });
});

// POST /api/relay/:channel — definir estado (on/off). Body: { state: true|false }
app.post('/api/relay/:channel', (req, res) => {
  const channel = parseInt(req.params.channel, 10);
  if (channel < 1 || channel > 4) {
    return res.status(400).json({ success: false, message: 'Canal deve ser 1 a 4.' });
  }
  const state = req.body.state === true || req.body.state === 'true' || req.body.state === 1;
  try {
    gpio.setRelay(channel, state);
    relayState[channel] = state;
    res.json({ success: true, channel, state });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Erro ao alterar relé.' });
  }
});

// GET /api/config (opcional: para mostrar mapa de pins)
app.get('/api/config', (req, res) => {
  const config = configLoader.load();
  res.json({
    success: true,
    gpio: config?.gpio || { relays: { 1: 5, 2: 6, 3: 13, 4: 19 } },
  });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

initGpio();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ZAccess Relés — interface web: http://0.0.0.0:${PORT}`);
});

/**
 * Agente ZAccess: conecta ao servidor via Socket.IO, recebe comandos de relé e controla GPIO.
 */

const { io } = require('socket.io-client');
const gpio = require('./gpio');

let socket = null;
let heartbeatTimer = null;
let config = null;
let relayConfig = []; // lista { id, channel, gpioPin, mode, pulseDuration } do device:config

const HEARTBEAT_INTERVAL = 25000; // 25s

function clearHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function startHeartbeat() {
  clearHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (socket?.connected) {
      socket.emit('heartbeat', {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
      });
    }
  }, HEARTBEAT_INTERVAL);
}

function applyRelay(channel, targetState, mode, pulseDuration) {
  const ch = Number(channel);
  if (mode === 'pulse') {
    const duration = Number(pulseDuration) || 1000;
    gpio.pulseRelay(ch, duration).then(() => {
      if (socket?.connected) {
        socket.emit('relay:state-update', { relayId: getRelayIdByChannel(ch), state: 'closed' });
      }
    });
    if (socket?.connected) {
      socket.emit('relay:state-update', { relayId: getRelayIdByChannel(ch), state: 'open' });
    }
  } else {
    gpio.setRelay(ch, targetState === 'open');
    if (socket?.connected) {
      socket.emit('relay:state-update', { relayId: getRelayIdByChannel(ch), state: targetState });
    }
  }
}

function getRelayIdByChannel(channel) {
  const r = relayConfig.find((x) => Number(x.channel) === Number(channel));
  return r?.id || null;
}

function setupSocketHandlers(sock, serverUrl, onStatusChange) {
  sock.on('connect', () => {
    console.log(`[ZAccess] Conectado ao servidor: ${serverUrl}`);
    startHeartbeat();
    onStatusChange?.('connected');
  });

  sock.on('connect_error', (err) => {
    const msg = err?.message || err?.description || String(err);
    console.error('[ZAccess] Erro ao conectar ao servidor:', msg);
    onStatusChange?.('error', msg);
  });

  sock.on('disconnect', (reason) => {
    console.log('[ZAccess] Desconectado do servidor:', reason || 'sem motivo');
    clearHeartbeat();
    onStatusChange?.('disconnected', reason);
  });

  sock.on('error', (payload) => {
    const msg = payload?.message || payload?.description || (payload && String(payload));
    console.error('[ZAccess] Erro do socket:', msg || payload);
    onStatusChange?.('error', msg);
  });

  sock.on('device:config', (data) => {
    relayConfig = (data.relays || []).map((r) => ({
      id: r.id,
      channel: r.channel,
      gpioPin: r.gpioPin,
      mode: r.mode || 'pulse',
      pulseDuration: r.pulseDuration || 1000,
    }));
    onStatusChange?.('config', data);
  });

  sock.on('relay:toggle', (data) => {
    const { relayId, channel, targetState, mode, pulseDuration } = data;
    if (relayId) {
      const r = relayConfig.find((x) => x.id === relayId);
      if (r) {
        applyRelay(r.channel, targetState, r.mode, r.pulseDuration);
        return;
      }
    }
    applyRelay(channel, targetState, mode || 'pulse', pulseDuration || 1000);
  });

  sock.on('relay:control', (data) => {
    const { relayId, command, channel, duration } = data || {};
    const targetState = command === 'open' || command === 'activate' ? 'open' : 'closed';
    const ch = channel ?? relayConfig.find((r) => r.id === relayId)?.channel;
    if (ch != null) {
      applyRelay(ch, targetState, 'pulse', duration || 1000);
    }
  });

  sock.on('device:command', (data) => {
    const { command, payload } = data || {};
    if (command === 'relay' && payload) {
      const ch = payload.channel ?? payload.ch;
      const state = payload.state ?? payload.targetState ?? 'open';
      applyRelay(ch, state, payload.mode || 'pulse', payload.pulseDuration || 1000);
    }
  });
}

/**
 * Inicia o agente: carrega config, inicializa GPIO e conecta ao servidor.
 * @param {Object} cfg - { server: { url, serialNumber, authToken }, gpio: { relays } }
 * @param {Function} onStatusChange - (status, detail?) => {}
 * @returns {Object} { socket, stop }
 */
function start(cfg, onStatusChange) {
  if (socket) {
    try {
      socket.removeAllListeners();
      socket.disconnect();
    } catch (_) {}
    socket = null;
  }

  config = cfg;
  const serverUrl = (config?.server?.url || '').replace(/\/$/, '');
  const serialNumber = config?.server?.serialNumber || '';
  const authToken = config?.server?.authToken || '';

  if (!serverUrl || !serialNumber) {
    onStatusChange?.('error', 'URL do servidor e número de série são obrigatórios.');
    return { socket: null, stop: () => {} };
  }

  const relayMap = config?.gpio?.relays || { 1: 5, 2: 6, 3: 13, 4: 19 };
  const channelToGpio = Object.fromEntries(
    Object.entries(relayMap).map(([k, v]) => [Number(k), Number(v)])
  );
  gpio.init(channelToGpio);

  console.log(`[ZAccess] A conectar a ${serverUrl} (serial: ${serialNumber})...`);
  const sock = io(serverUrl, {
    path: '/socket.io',
    auth: { serialNumber, authToken },
    transports: ['websocket', 'polling'],
  });

  setupSocketHandlers(sock, serverUrl, onStatusChange);
  socket = sock;

  return {
    socket: sock,
    stop() {
      clearHeartbeat();
      if (sock) {
        sock.removeAllListeners();
        sock.disconnect();
      }
      gpio.close();
      socket = null;
      onStatusChange?.('disconnected');
    },
  };
}

module.exports = {
  start,
  getSocket: () => socket,
  getRelayConfig: () => relayConfig,
};

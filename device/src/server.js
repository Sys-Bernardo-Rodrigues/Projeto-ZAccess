/**
 * Servidor local do dispositivo ZAccess: frontend de configuração + agente (Socket.IO + GPIO).
 * Acesso: http://<IP-do-Raspberry>:3080
 */

const path = require('path');
const express = require('express');
const configLoader = require('./configLoader');
const agent = require('./agent');

const app = express();
const PORT = process.env.DEVICE_UI_PORT || 3080;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

let agentHandle = null;
let lastStatus = { status: 'disconnected', detail: null };

// GET /api/config
app.get('/api/config', (req, res) => {
  const config = configLoader.load();
  res.json({ success: true, config });
});

// POST /api/config
app.post('/api/config', (req, res) => {
  try {
    const current = configLoader.load();
    const next = {
      server: { ...current.server, ...(req.body.server || {}) },
      gpio: { ...current.gpio, ...(req.body.gpio || {}) },
      autoConnect: req.body.autoConnect !== undefined ? req.body.autoConnect : current.autoConnect,
    };
    const saved = configLoader.save(next);
    res.json({ success: true, config: saved });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/status
app.get('/api/status', (req, res) => {
  const sock = agent.getSocket();
  res.json({
    success: true,
    status: sock?.connected ? 'connected' : lastStatus.status,
    detail: lastStatus.detail,
    connected: !!sock?.connected,
  });
});

// POST /api/connect
app.post('/api/connect', (req, res) => {
  if (agentHandle) {
    return res.json({ success: true, message: 'Já conectado.', connected: true });
  }
  const config = configLoader.load();
  agentHandle = agent.start(config, (status, detail) => {
    lastStatus = { status, detail: detail || null };
  });
  if (agentHandle.socket) {
    res.json({ success: true, message: 'Conectando...', connected: false });
  } else {
    res.json({ success: false, message: lastStatus.detail || 'Falha ao iniciar conexão.' });
  }
});

// POST /api/disconnect
app.post('/api/disconnect', (req, res) => {
  if (agentHandle) {
    agentHandle.stop();
    agentHandle = null;
  }
  lastStatus = { status: 'disconnected', detail: null };
  res.json({ success: true, message: 'Desconectado.' });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ZAccess Device UI: http://0.0.0.0:${PORT}`);
  const config = configLoader.load();
  if (config.autoConnect && config.server?.url && config.server?.serialNumber) {
    console.log('Auto-connect ativado. Iniciando agente...');
    agentHandle = agent.start(config, (status, detail) => {
      lastStatus = { status, detail: detail || null };
      if (status === 'connected') console.log('[ZAccess] Backend: conectado.');
      if (status === 'error') console.error('[ZAccess] Backend:', detail);
      if (status === 'disconnected') console.log('[ZAccess] Backend: desconectado.', detail || '');
    });
  }
});

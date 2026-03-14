/**
 * Painel web local do cliente Zaccess (Raspberry)
 * Porta 5080 - logs, configuração (SQLite), status do sistema
 */

const express = require('express');
const path = require('path');
const { exec } = require('child_process');

const PORT = 5080;

function createServer(logger, getStatus, settings, relayController) {
    const app = express();
    app.use(express.json({ limit: '1mb' }));
    app.use(express.static(path.join(__dirname, 'public')));

    app.get('/api/logs', (req, res) => {
        try {
            res.json({ logs: logger.getBuffer() });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.get('/api/logs/stream', (req, res) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
        const unbind = logger.onLog((line) => res.write(`data: ${JSON.stringify(line)}\n\n`));
        req.on('close', unbind);
    });

    app.get('/api/status', (req, res) => {
        try {
            res.json(typeof getStatus === 'function' ? getStatus() : {});
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // Configuração (SQLite)
    app.get('/api/config', (req, res) => {
        try {
            const c = settings.getConfig();
            res.json({
                serverUrl: c.serverUrl || '',
                serialNumber: c.serialNumber || '',
                authToken: c.authToken || '',
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.post('/api/config', (req, res) => {
        try {
            const { serverUrl, serialNumber, authToken } = req.body || {};
            settings.setConfig({
                serverUrl: serverUrl != null ? String(serverUrl).trim() : undefined,
                serialNumber: serialNumber != null ? String(serialNumber).trim() : undefined,
                authToken: authToken != null ? String(authToken).trim() : undefined,
            });
            res.json({
                ok: true,
                message: 'Configuração salva. Reinicie o serviço para aplicar (botão abaixo).',
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // Reiniciar o serviço zaccess (sudo systemctl restart zaccess)
    app.post('/api/restart', (req, res) => {
        res.json({ ok: true, message: 'Reiniciando serviço em 2 segundos... A página pode desconectar.' });
        setTimeout(() => {
            exec('sudo systemctl restart zaccess', (err, stdout, stderr) => {
                if (err) logger.erro(`Restart falhou: ${err.message}`);
            });
        }, 2000);
    });

    // Controle local de relés (sem passar pelo servidor central)
    app.post('/api/local/relay-toggle', (req, res) => {
        try {
            if (!relayController) {
                return res.status(400).json({ error: 'Controle de relés não disponível neste modo.' });
            }

            const { channel, targetState } = req.body || {};
            const ch = Number(channel);
            const desired = targetState === 'open' ? 'open' : 'closed';

            if (!ch || ch < 1) {
                return res.status(400).json({ error: 'Canal inválido.' });
            }

            const ok = relayController.setRelay(ch, desired);
            if (!ok) {
                return res.status(500).json({ error: 'Falha ao acionar relé.' });
            }

            logger.relay(`Comando local: canal ${ch} -> ${desired}`);
            return res.json({ ok: true, channel: ch, state: desired });
        } catch (e) {
            logger.erro(`Erro em /api/local/relay-toggle: ${e.message}`);
            return res.status(500).json({ error: e.message });
        }
    });

    return app;
}

function startWebServer(logger, getStatus, settings, relayController) {
    const app = createServer(logger, getStatus, settings, relayController);
    const server = app.listen(PORT, '0.0.0.0', () => {
        logger.info(`Painel web em http://0.0.0.0:${PORT} (acesse pelo IP da rede na porta ${PORT})`);
    });
    return server;
}

module.exports = { createServer, startWebServer, PORT };

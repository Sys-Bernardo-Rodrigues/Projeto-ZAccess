/**
 * Carrega configuração: SQLite primeiro, depois .env, depois defaults
 */

const path = require('path');
const fs = require('fs');
const settings = require('../db/settings');

const DEFAULTS = {
    serverUrl: 'http://localhost:3001',
    serialNumber: 'RPi4-TEST-001',
    authToken: '',
};

function loadFromEnv() {
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) return {};
    const content = fs.readFileSync(envPath, 'utf8');
    const out = {};
    content.split('\n').forEach((line) => {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
        if (m) {
            const v = m[2].replace(/^["']|["']$/g, '').trim();
            if (m[1] === 'ZACESS_SERVER_URL') out.serverUrl = v;
            else if (m[1] === 'ZACESS_SERIAL') out.serialNumber = v;
            else if (m[1] === 'ZACESS_AUTH_TOKEN') out.authToken = v;
        }
    });
    return out;
}

/**
 * Retorna { serverUrl, serialNumber, authToken } para conexão.
 * Ordem: SQLite -> .env -> defaults
 */
function loadConfig() {
    try {
        settings.ensureDir();
        const fromDb = settings.getConfig();
        const fromEnv = loadFromEnv();
        return {
            serverUrl: fromDb.serverUrl || fromEnv.serverUrl || process.env.ZACESS_SERVER_URL || DEFAULTS.serverUrl,
            serialNumber: fromDb.serialNumber || fromEnv.serialNumber || process.env.ZACESS_SERIAL || DEFAULTS.serialNumber,
            authToken: fromDb.authToken || fromEnv.authToken || process.env.ZACESS_AUTH_TOKEN || DEFAULTS.authToken,
        };
    } catch (e) {
        return {
            serverUrl: process.env.ZACESS_SERVER_URL || DEFAULTS.serverUrl,
            serialNumber: process.env.ZACESS_SERIAL || DEFAULTS.serialNumber,
            authToken: process.env.ZACESS_AUTH_TOKEN || DEFAULTS.authToken,
        };
    }
}

module.exports = { loadConfig, DEFAULTS };

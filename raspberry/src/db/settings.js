/**
 * Configuração persistida em SQLite (substitui .env para o painel web)
 * Banco: data/zaccess.db
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'zaccess.db');

const KEYS = {
    SERVER_URL: 'server_url',
    SERIAL_NUMBER: 'serial_number',
    AUTH_TOKEN: 'auth_token',
};

let db = null;

function ensureDir() {
    if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
    }
}

function getDb() {
    if (!db) {
        ensureDir();
        db = new Database(DB_FILE);
        db.exec(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL DEFAULT ''
            );
        `);
    }
    return db;
}

function get(key) {
    const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : null;
}

function set(key, value) {
    getDb().prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?')
        .run(key, String(value ?? ''), String(value ?? ''));
}

function getAll() {
    const rows = getDb().prepare('SELECT key, value FROM settings').all();
    const out = {};
    rows.forEach((r) => { out[r.key] = r.value; });
    return out;
}

function getConfig() {
    const all = getAll();
    return {
        serverUrl: all[KEYS.SERVER_URL] ?? '',
        serialNumber: all[KEYS.SERIAL_NUMBER] ?? '',
        authToken: all[KEYS.AUTH_TOKEN] ?? '',
    };
}

function setConfig(config) {
    if (config.serverUrl != null) set(KEYS.SERVER_URL, config.serverUrl);
    if (config.serialNumber != null) set(KEYS.SERIAL_NUMBER, config.serialNumber);
    if (config.authToken != null) set(KEYS.AUTH_TOKEN, config.authToken);
}

function getDataPath() {
    return DB_DIR;
}

function getDbPath() {
    return DB_FILE;
}

module.exports = {
    get,
    set,
    getAll,
    getConfig,
    setConfig,
    getDataPath,
    getDbPath,
    ensureDir,
    KEYS,
};

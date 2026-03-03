/**
 * Logger em tempo real para o cliente Zaccess (Raspberry).
 * Saídas vão para stdout (journalctl) e para um buffer para o painel web.
 */

const { EventEmitter } = require('events');

const MAX_BUFFER = 1000;
const logBuffer = [];
const emitter = new EventEmitter();
emitter.setMaxListeners(50);

function timestamp() {
    const now = new Date();
    return now.toISOString().replace('T', ' ').slice(0, 19);
}

function pushToBuffer(category, message, isError) {
    const line = {
        ts: timestamp(),
        category,
        message,
        level: isError ? 'error' : 'info',
    };
    logBuffer.push(line);
    if (logBuffer.length > MAX_BUFFER) logBuffer.shift();
    emitter.emit('log', line);
}

function log(category, message) {
    const full = `[${timestamp()}] [${category}] ${message}`;
    console.log(full);
    pushToBuffer(category, message, false);
}

function error(category, message) {
    const full = `[${timestamp()}] [${category}] ${message}`;
    console.error(full);
    pushToBuffer(category, message, true);
}

function getBuffer() {
    return [...logBuffer];
}

function onLog(callback) {
    emitter.on('log', callback);
    return () => emitter.off('log', callback);
}

module.exports = {
    log,
    error,
    getBuffer,
    onLog,
    // Atalhos por categoria
    conexao: (msg) => log('CONEXÃO', msg),
    config: (msg) => log('CONFIG', msg),
    servidor: (msg) => log('SERVIDOR', msg),
    relay: (msg) => log('RELAY', msg),
    gpio: (msg) => log('GPIO', msg),
    sensor: (msg) => log('SENSOR', msg),
    comando: (msg) => log('COMANDO', msg),
    erro: (msg) => error('ERRO', msg),
    info: (msg) => log('INFO', msg),
};

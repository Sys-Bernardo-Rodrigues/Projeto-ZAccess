/**
 * Controlador de Sensores (Inputs)
 * Gerencia a leitura de pinos GPIO configurados como entrada.
 */

const logger = require('./utils/logger');

let Gpio;
try {
    Gpio = require('onoff').Gpio;
    logger.info('Biblioteca onoff carregada para Inputs');
} catch (err) {
    logger.info('Biblioteca onoff não encontrada. Modo simulação para Inputs.');
    Gpio = null;
}

const inputs = new Map();
const inputConfigs = new Map(); // id -> { id, name, gpioPin } para o painel/diagrama
let onInputChange = null;

/**
 * Inicializa um sensor no pino GPIO especificado
 */
function initInput(inputConfig) {
    const { id, name, gpioPin, activeLow } = inputConfig;
    inputConfigs.set(id, { id, name, gpioPin: gpioPin != null ? gpioPin : 0 });

    try {
        if (Gpio) {
            // No modo real, configuramos o pino como entrada
            // 'both' dispara o evento tanto na subida quanto na descida
            const sensor = new Gpio(gpioPin, 'in', 'both', {
                debounceTimeout: 100, // Debounce de 100ms para evitar ruído
                activeLow: activeLow,
            });

            sensor.watch((err, value) => {
                if (err) {
                    logger.erro(`Sensor ${name} (GPIO ${gpioPin}): ${err.message}`);
                    return;
                }
                const state = value === 1 ? 'active' : 'inactive';
                logger.sensor(`Sensor "${name}" (GPIO ${gpioPin}) -> ${state}`);

                if (onInputChange) {
                    onInputChange(id, state);
                }
            });

            inputs.set(id, sensor);
            logger.sensor(`Sensor "${name}" (GPIO ${gpioPin}) inicializado`);
        } else {
            logger.sensor(`Sensor "${name}" (GPIO ${gpioPin}) - modo simulação`);

            // Simular mudança aleatória para teste (apenas exemplo)
            /*
            setInterval(() => {
                const state = Math.random() > 0.5 ? 'active' : 'inactive';
                if (onInputChange) onInputChange(id, state);
            }, 30000);
            */
        }
    } catch (err) {
        logger.erro(`Falha ao inicializar sensor "${name}" (GPIO ${gpioPin}): ${err.message}`);
    }
}

/**
 * Define o callback para quando o estado de um sensor mudar
 */
function setCallback(callback) {
    onInputChange = callback;
}

/**
 * Inicializa todos os sensores recebidos do servidor
 */
function initAll(configs) {
    // Limpar sensores existentes se houver
    cleanup();

    if (!configs || configs.length === 0) return;

    logger.config(`Inicializando ${configs.length} sensores...`);
    configs.forEach(initInput);
}

/**
 * Libera os pinos GPIO de forma segura
 */
function cleanup() {
    inputs.forEach((sensor) => {
        try {
            if (sensor && typeof sensor.unexport === 'function') {
                sensor.unexport();
            }
        } catch (err) {
            logger.erro(`Liberar sensor: ${err.message}`);
        }
    });
    inputs.clear();
    inputConfigs.clear();
}

/**
 * Retorna lista de sensores configurados (para painel/diagrama)
 */
function getInputsInfo() {
    return Array.from(inputConfigs.values());
}

/**
 * Simula uma mudança de estado no modo simulação
 */
function simulateTrigger(id, state) {
    if (!Gpio && onInputChange) {
        logger.sensor(`Simulação: sensor ${id} -> ${state}`);
        onInputChange(id, state);
    }
}

module.exports = {
    initAll,
    setCallback,
    cleanup,
    simulateTrigger,
    getInputsInfo,
};

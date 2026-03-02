/**
 * Controlador de Sensores (Inputs)
 * Gerencia a leitura de pinos GPIO configurados como entrada.
 */

let Gpio;
try {
    // Tenta carregar a biblioteca onoff (apenas funciona no Raspberry Pi)
    Gpio = require('onoff').Gpio;
    console.log('✅ Biblioteca onoff carregada para Inputs');
} catch (err) {
    console.log('⚠️  Biblioteca onoff NÃO encontrada. Rodando modo SIMULAÇÃO para Inputs.');
    Gpio = null;
}

const inputs = new Map();
let onInputChange = null;

/**
 * Inicializa um sensor no pino GPIO especificado
 */
function initInput(inputConfig) {
    const { id, name, gpioPin, activeLow } = inputConfig;

    try {
        if (Gpio) {
            // No modo real, configuramos o pino como entrada
            // 'both' dispara o evento tanto na subida quanto na descida
            const sensor = new Gpio(gpioPin, 'in', 'both', {
                debounceTimeout: 100, // Debounce de 100ms para evitar ruído
                activeLow: activeLow,
            });

            // Escutar mudanças de estado
            sensor.watch((err, value) => {
                if (err) {
                    console.error(`❌ Erro no sensor ${name}:`, err);
                    return;
                }

                // value = 1 (ativo se activeLow: false, ou inativo se activeLow: true?)
                // A biblioteca onoff inverte o valor automaticamente se activeLow estiver setado
                const state = value === 1 ? 'active' : 'inactive';
                console.log(`🔌 Sensor [${name}] mudou para: ${state}`);

                if (onInputChange) {
                    onInputChange(id, state);
                }
            });

            inputs.set(id, sensor);
        } else {
            console.log(`📡 [SIMULAÇÃO] Sensor ${name} iniciado no GPIO ${gpioPin}`);

            // Simular mudança aleatória para teste (apenas exemplo)
            /*
            setInterval(() => {
                const state = Math.random() > 0.5 ? 'active' : 'inactive';
                if (onInputChange) onInputChange(id, state);
            }, 30000);
            */
        }
    } catch (err) {
        console.error(`❌ Falha ao inicializar sensor ${name} no GPIO ${gpioPin}:`, err.message);
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

    console.log(`🔧 Inicializando ${configs.length} sensores...`);
    configs.forEach(initInput);
}

/**
 * Libera os pinos GPIO
 */
function cleanup() {
    inputs.forEach((sensor) => {
        if (sensor.unexport) sensor.unexport();
    });
    inputs.clear();
}

/**
 * Simula uma mudança de estado no modo simulação
 */
function simulateTrigger(id, state) {
    if (!Gpio && onInputChange) {
        console.log(`🧪 [SIMULAÇÃO] Disparando sensor ${id} -> ${state}`);
        onInputChange(id, state);
    }
}

module.exports = {
    initAll,
    setCallback,
    cleanup,
    simulateTrigger,
};

const crypto = require('crypto');

/**
 * Gera um serial number único para dispositivos
 */
const generateSerialNumber = (prefix = 'RPi4') => {
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}-${random}`;
};

/**
 * Sanitiza um objeto removendo campos undefined
 */
const sanitizeObject = (obj) => {
    return Object.fromEntries(
        Object.entries(obj).filter(([_, v]) => v !== undefined)
    );
};

/**
 * Formata resposta padrão da API
 */
const apiResponse = (res, statusCode, data, message = '') => {
    return res.status(statusCode).json({
        success: statusCode >= 200 && statusCode < 300,
        message,
        data,
        timestamp: new Date().toISOString(),
    });
};

module.exports = {
    generateSerialNumber,
    sanitizeObject,
    apiResponse,
};

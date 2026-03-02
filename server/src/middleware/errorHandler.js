const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    logger.error(err.stack || err.message);

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map((e) => e.message);
        return res.status(400).json({
            success: false,
            message: 'Erro de validação',
            errors: messages,
            timestamp: new Date().toISOString(),
        });
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(409).json({
            success: false,
            message: `Valor duplicado para o campo: ${field}`,
            timestamp: new Date().toISOString(),
        });
    }

    // Mongoose cast error (invalid ObjectId)
    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: 'ID inválido fornecido',
            timestamp: new Date().toISOString(),
        });
    }

    // Default error
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Erro interno do servidor',
        timestamp: new Date().toISOString(),
    });
};

module.exports = errorHandler;

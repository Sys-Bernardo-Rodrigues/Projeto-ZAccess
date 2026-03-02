const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/env');
const { apiResponse } = require('../utils/helpers');

const authMiddleware = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return apiResponse(res, 401, null, 'Acesso não autorizado. Token não fornecido.');
        }

        const decoded = jwt.verify(token, config.jwt.secret);
        const user = await User.findById(decoded.id);

        if (!user || !user.active) {
            return apiResponse(res, 401, null, 'Usuário não encontrado ou desativado.');
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return apiResponse(res, 401, null, 'Token inválido.');
        }
        if (error.name === 'TokenExpiredError') {
            return apiResponse(res, 401, null, 'Token expirado.');
        }
        return apiResponse(res, 500, null, 'Erro de autenticação.');
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return apiResponse(res, 403, null, 'Sem permissão para esta ação.');
        }
        next();
    };
};

module.exports = { authMiddleware, authorize };

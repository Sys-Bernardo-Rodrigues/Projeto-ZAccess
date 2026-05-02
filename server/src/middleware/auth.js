const jwt = require('jsonwebtoken');
const User = require('../models/User');
const LocationUser = require('../models/LocationUser');
const config = require('../config/env');
const { apiResponse } = require('../utils/helpers');

/** Middleware para rotas do app: aceita apenas token de LocationUser (morador/síndico) */
const locationUserAuthMiddleware = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            return apiResponse(res, 401, null, 'Token não fornecido.');
        }
        const decoded = jwt.verify(token, config.jwt.secret);
        if (decoded.type !== 'location_user') {
            return apiResponse(res, 401, null, 'Token inválido para o app.');
        }
        const locationUser = await LocationUser.findById(decoded.id);
        if (!locationUser || !locationUser.active) {
            return apiResponse(res, 401, null, 'Usuário do local não encontrado ou desativado.');
        }
        req.locationUser = locationUser;
        req.locationId = locationUser.locationId;
        req.locationUserRole = locationUser.role;
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

/** Exige que o usuário do local seja síndico */
const requireSindico = (req, res, next) => {
    if (req.locationUserRole !== 'sindico') {
        return apiResponse(res, 403, null, 'Acesso restrito a síndicos.');
    }
    next();
};

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
        req.allowedLocationId = (user.role === 'admin' ? null : (user.locationId || null));
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

/** Bloqueia gestor de convites: só pode usar locais, convites, relatórios e leitura de relés (convites). */
const rejectInviteManager = (req, res, next) => {
    if (req.user?.role === 'invite_manager') {
        return apiResponse(res, 403, null, 'Seu perfil só acessa o local, convites e relatórios.');
    }
    next();
};

module.exports = {
    authMiddleware,
    authorize,
    locationUserAuthMiddleware,
    requireSindico,
    rejectInviteManager,
};

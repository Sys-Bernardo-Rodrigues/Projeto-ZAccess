const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'zaccess_' });

const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duracao das requisicoes HTTP em segundos',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

const httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total de requisicoes HTTP processadas',
    labelNames: ['method', 'route', 'status'],
});

const businessEventsTotal = new client.Counter({
    name: 'zaccess_business_events_total',
    help: 'Eventos de negocio capturados por tipo e resultado',
    labelNames: ['event_type', 'outcome'],
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(businessEventsTotal);

const normalizeRoute = (routePath = '') => {
    if (!routePath || routePath === '/') return '/';
    return routePath.replace(/\/+$/, '') || '/';
};

const inferEventType = (path = '') => {
    if (path.includes('/auth')) return 'auth';
    if (path.includes('/relays')) return 'relay';
    if (path.includes('/devices')) return 'device';
    if (path.includes('/automations')) return 'automation';
    if (path.includes('/invitations')) return 'invitation';
    if (path.includes('/logs')) return 'log';
    return 'other';
};

const metricsMiddleware = (req, res, next) => {
    const start = process.hrtime.bigint();

    res.on('finish', () => {
        if (req.path === '/metrics') return;

        const duration = Number(process.hrtime.bigint() - start) / 1e9;
        const route = normalizeRoute(req.baseUrl + (req.route ? req.route.path : req.path));
        const status = String(res.statusCode);

        httpRequestDuration.labels(req.method, route, status).observe(duration);
        httpRequestsTotal.labels(req.method, route, status).inc();

        const eventType = inferEventType(route);
        const outcome = res.statusCode >= 500 ? 'error' : 'success';
        businessEventsTotal.labels(eventType, outcome).inc();
    });

    next();
};

module.exports = {
    register,
    metricsMiddleware,
};

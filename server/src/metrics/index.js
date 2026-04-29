const client = require('prom-client');
const Device = require('../models/Device');
const Location = require('../models/Location');
const ActivityLog = require('../models/ActivityLog');

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

const mongoDevicesTotal = new client.Gauge({
    name: 'zaccess_mongo_devices_total',
    help: 'Total de devices cadastrados no MongoDB',
    async collect() {
        try {
            this.set(await Device.countDocuments({}));
        } catch {
            this.set(0);
        }
    },
});

const mongoDevicesActiveTotal = new client.Gauge({
    name: 'zaccess_mongo_devices_active_total',
    help: 'Total de devices ativos no MongoDB',
    async collect() {
        try {
            this.set(await Device.countDocuments({ active: true }));
        } catch {
            this.set(0);
        }
    },
});

const mongoLocationsTotal = new client.Gauge({
    name: 'zaccess_mongo_locations_total',
    help: 'Total de locations cadastradas no MongoDB',
    async collect() {
        try {
            this.set(await Location.countDocuments({}));
        } catch {
            this.set(0);
        }
    },
});

const mongoActivityLogsTotal = new client.Gauge({
    name: 'zaccess_mongo_activity_logs_total',
    help: 'Total de registros de activity log no MongoDB',
    async collect() {
        try {
            this.set(await ActivityLog.countDocuments({}));
        } catch {
            this.set(0);
        }
    },
});

const mongoReportsAccessEvents24h = new client.Gauge({
    name: 'zaccess_mongo_reports_access_events_24h_total',
    help: 'Eventos de acesso usados no relatorio de access nas ultimas 24h',
    async collect() {
        try {
            const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
            this.set(await ActivityLog.countDocuments({
                action: { $in: ['relay_activated', 'automation_executed', 'schedule_executed'] },
                createdAt: { $gte: since },
            }));
        } catch {
            this.set(0);
        }
    },
});

const mongoActivityLogs24h = new client.Gauge({
    name: 'zaccess_mongo_activity_logs_24h_total',
    help: 'Total de logs de atividade nas ultimas 24h',
    async collect() {
        try {
            const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
            this.set(await ActivityLog.countDocuments({ createdAt: { $gte: since } }));
        } catch {
            this.set(0);
        }
    },
});

const mongoActivityLogRecent = new client.Gauge({
    name: 'zaccess_mongo_activity_log_recent',
    help: 'Ultimos logs do MongoDB para tabela operacional',
    labelNames: ['status_evento', 'descricao_log', 'dispositivo_origem', 'operador', 'data_hora'],
    async collect() {
        try {
            this.reset();
            const rows = await ActivityLog.find({})
                .populate('deviceId', 'name serialNumber')
                .populate('userId', 'name email')
                .sort({ createdAt: -1 })
                .limit(50);

            rows.forEach((log, idx) => {
                const statusEvento = `${log.severity || 'info'} / ${log.action || 'evento'}`;
                const descricaoRaw = log.description || '-';
                const descricao = String(descricaoRaw).slice(0, 180);
                const dispositivo = log.deviceId?.name || 'Sistêmica';
                const operador = log.userId?.name || 'Sistema';
                const dataHora = log.createdAt ? new Date(log.createdAt).toISOString() : '-';
                // Value only preserves ordering in table sorting.
                this.labels(statusEvento, descricao, dispositivo, operador, dataHora).set(50 - idx);
            });
        } catch {
            this.reset();
        }
    },
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(businessEventsTotal);
register.registerMetric(mongoDevicesTotal);
register.registerMetric(mongoDevicesActiveTotal);
register.registerMetric(mongoLocationsTotal);
register.registerMetric(mongoActivityLogsTotal);
register.registerMetric(mongoReportsAccessEvents24h);
register.registerMetric(mongoActivityLogs24h);
register.registerMetric(mongoActivityLogRecent);

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

import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';
import {
    Cpu,
    MapPin,
    ToggleLeft,
    Activity,
    Wifi,
    WifiOff,
    Zap,
    TrendingUp,
    Bell,
    ArrowRight,
    Power,
    ShieldCheck,
    Lock,
    Unlock,
} from 'lucide-react';
import toast from 'react-hot-toast';

const StatSkeleton = () => (
    <div className="stat-card">
        <div className="stat-icon skeleton" style={{ background: 'transparent' }} />
        <div className="stat-info" style={{ flex: 1 }}>
            <div className="skeleton skeleton-text" style={{ width: '60%', height: 10 }} />
            <div className="skeleton skeleton-text" style={{ width: '40%', height: 24, marginTop: 8 }} />
        </div>
    </div>
);

const CardSkeleton = () => (
    <div className="card">
        <div className="card-title-row">
            <div className="skeleton skeleton-text" style={{ width: '40%', height: 16 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
            {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div className="skeleton" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                    <div style={{ flex: 1 }}>
                        <div className="skeleton skeleton-text" style={{ width: '80%', height: 10 }} />
                        <div className="skeleton skeleton-text" style={{ width: '30%', height: 8 }} />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export default function DashboardPage() {
    const { connected, deviceEvents } = useSocket();
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalDevices: 0,
        onlineDevices: 0,
        offlineDevices: 0,
        totalLocations: 0,
        totalRelays: 0,
        activeRelays: 0,
        totalInputs: 0,
        activeInputs: 0,
    });
    const [recentLogs, setRecentLogs] = useState([]);
    const [criticalAlerts, setCriticalAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboard();

        const handleStatusChange = () => loadDashboard();
        window.addEventListener('device-status-change', handleStatusChange);
        window.addEventListener('input-state-change', handleStatusChange);

        const handleAlert = (e) => {
            setCriticalAlerts(prev => [e.detail, ...prev].slice(0, 3));
        };
        window.addEventListener('notification-alert', handleAlert);

        return () => {
            window.removeEventListener('device-status-change', handleStatusChange);
            window.removeEventListener('input-state-change', handleStatusChange);
            window.removeEventListener('notification-alert', handleAlert);
        };
    }, []);

    const loadDashboard = async () => {
        try {
            const [devicesRes, locationsRes, relaysRes, inputsRes, logsRes] = await Promise.all([
                api.get('/devices'),
                api.get('/locations'),
                api.get('/relays'),
                api.get('/inputs'),
                api.get('/logs?limit=10'),
            ]);

            const devices = devicesRes.data.data.devices;
            const relays = relaysRes.data.data.relays;
            const inputs = inputsRes.data.data.inputs;

            setStats({
                totalDevices: devices.length,
                onlineDevices: devices.filter((d) => d.status === 'online').length,
                offlineDevices: devices.filter((d) => d.status === 'offline').length,
                totalLocations: locationsRes.data.data.count,
                totalRelays: relays.length,
                activeRelays: relays.filter((r) => r.state === 'open').length,
                totalInputs: inputs.length,
                activeInputs: inputs.filter((i) => i.state === 'active').length,
            });

            setRecentLogs(logsRes.data.data.logs);
        } catch (err) {
            console.error('Error loading dashboard:', err);
        } finally {
            // Pequeno delay para garantir que o skeleton apareça
            setTimeout(() => setLoading(false), 500);
        }
    };

    const handleQuickAction = (action) => {
        toast.promise(
            new Promise(resolve => setTimeout(resolve, 1000)),
            {
                loading: 'Processando comando...',
                success: `Ação "${action}" executada com sucesso!`,
                error: 'Falha ao executar ação.',
            }
        );
    };

    const getActivityDotClass = (action) => {
        if (action.includes('connected')) return 'connected';
        if (action.includes('disconnected')) return 'disconnected';
        if (action.includes('activated') || action.includes('relay')) return 'activated';
        if (action.includes('command')) return 'command';
        return 'default';
    };

    const formatTime = (date) => {
        const d = new Date(date);
        const now = new Date();
        const diff = (now - d) / 1000;
        if (diff < 60) return 'agora';
        if (diff < 3600) return `${Math.floor(diff / 60)}m atrás`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
        return d.toLocaleDateString('pt-BR');
    };

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

    return (
        <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
            {/* Welcome Banner */}
            <div className="welcome-banner">
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <h1>{greeting}, {user?.name.split(' ')[0]}!</h1>
                    {loading ? (
                        <div className="skeleton skeleton-text" style={{ width: '300px', height: 16, background: 'rgba(255,255,255,0.1)' }} />
                    ) : (
                        <p>O sistema ZAcesss está operando normalmente. {stats.onlineDevices} de {stats.totalDevices} dispositivos estão online agora.</p>
                    )}
                    <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: 20, fontSize: '0.85rem', color: '#fff' }}>
                            <ShieldCheck size={16} />
                            Sistema Seguro
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: 20, fontSize: '0.85rem', color: '#fff' }}>
                            <Wifi size={16} />
                            Link Estável
                        </div>
                    </div>
                </div>
                <Zap size={200} style={{ position: 'absolute', right: -40, bottom: -40, opacity: 0.1, color: '#fff', transform: 'rotate(-15deg)' }} />
            </div>

            {/* Critical Alerts */}
            {criticalAlerts.length > 0 && criticalAlerts.map((alert, i) => (
                <div key={i} className="alert-strip">
                    <Bell size={20} className="text-danger" />
                    <div style={{ flex: 1 }}>
                        <strong style={{ display: 'block', fontSize: '0.9rem' }}>{alert.title}</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{alert.message}</span>
                    </div>
                    <button className="btn btn-sm btn-danger" style={{ padding: '4px 12px' }}>Ver Detalhes</button>
                </div>
            ))}

            {/* Stats Grid */}
            <div className="stats-grid">
                {loading ? (
                    <>
                        <StatSkeleton />
                        <StatSkeleton />
                        <StatSkeleton />
                        <StatSkeleton />
                    </>
                ) : (
                    <>
                        <div className="stat-card">
                            <div className="stat-icon primary"><Cpu size={24} /></div>
                            <div className="stat-info">
                                <h3>Gateways</h3>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                                    <span className="stat-value">{stats.totalDevices}</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>total</span>
                                </div>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon success"><Wifi size={24} /></div>
                            <div className="stat-info">
                                <h3>Online</h3>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                                    <span className="stat-value" style={{ color: 'var(--accent-success)' }}>{stats.onlineDevices}</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>conectados</span>
                                </div>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon info"><Activity size={24} /></div>
                            <div className="stat-info">
                                <h3>Sensores</h3>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                                    <span className="stat-value">{stats.totalInputs}</span>
                                    <span style={{ fontSize: '0.8rem', color: stats.activeInputs > 0 ? 'var(--accent-warning)' : 'var(--text-muted)' }}>
                                        {stats.activeInputs} ativos
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon warning"><ToggleLeft size={24} /></div>
                            <div className="stat-info">
                                <h3>Relés</h3>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                                    <span className="stat-value">{stats.totalRelays}</span>
                                    <span style={{ fontSize: '0.8rem', color: stats.activeRelays > 0 ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                                        {stats.activeRelays} ligados
                                    </span>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>



            {/* Secondary Content */}
            <div className="grid-2">
                {/* Real-time Monitor */}
                {loading ? (
                    <CardSkeleton />
                ) : (
                    <div className="card">
                        <div className="card-title-row">
                            <h3><Activity size={18} className="text-primary" /> Live Streaming</h3>
                            <span className="status-badge online" style={{ fontSize: '0.65rem' }}>Conectado</span>
                        </div>

                        {deviceEvents.length === 0 ? (
                            <div className="empty-state">
                                <Wifi size={32} />
                                <p>Aguardando atividade dos dispositivos...</p>
                            </div>
                        ) : (
                            <div className="activity-list">
                                {deviceEvents.slice(0, 6).map((event, idx) => (
                                    <div key={idx} className="activity-item">
                                        <div className={`activity-dot ${event.status === 'online' ? 'connected' : 'disconnected'}`} />
                                        <div className="activity-description">
                                            <strong>{event.name}</strong> mudou para <span style={{ color: event.status === 'online' ? 'var(--accent-success)' : 'var(--accent-danger)' }}>{event.status}</span>
                                        </div>
                                        <div className="activity-time">{formatTime(event.timestamp)}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: 20 }}>
                            Ver Monitor Completo <ArrowRight size={14} />
                        </button>
                    </div>
                )}

                {/* Recent Activity */}
                {loading ? (
                    <CardSkeleton />
                ) : (
                    <div className="card">
                        <div className="card-title-row">
                            <h3><TrendingUp size={18} className="text-success" /> Histórico Recente</h3>
                            <div className="mini-chart">
                                {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                                    <div key={i} className="mini-chart-bar" style={{ height: `${h}%` }} />
                                ))}
                            </div>
                        </div>

                        <div className="activity-list">
                            {recentLogs.slice(0, 6).map((log) => (
                                <div key={log._id} className="activity-item">
                                    <div className={`activity-dot ${getActivityDotClass(log.action)}`} />
                                    <div className="activity-description">
                                        {(log.description || log.action || '').replace('Usuário', '').replace(user?.name || '', 'Você')}
                                    </div>
                                    <div className="activity-time">{formatTime(log.createdAt)}</div>
                                </div>
                            ))}
                        </div>

                        <button className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: 20 }}>
                            Ver Logs de Auditoria <ArrowRight size={14} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

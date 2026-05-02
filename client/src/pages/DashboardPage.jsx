import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';
import brandLogo from '../../svg/ZAccess.svg';
import {
    Cpu,
    MapPin,
    ToggleLeft,
    Activity,
    Wifi,
    Zap,
    TrendingUp,
    Bell,
    ArrowRight,
    ShieldCheck,
    Circle,
    CircleDot,
} from 'lucide-react';

const StatSkeleton = () => (
    <div className="dashboard-stat">
        <div className="dashboard-stat-icon skeleton" />
        <div style={{ flex: 1 }}>
            <div className="skeleton skeleton-text" style={{ width: '70%', height: 14, marginBottom: 8 }} />
            <div className="skeleton skeleton-text" style={{ width: '50%', height: 28 }} />
        </div>
    </div>
);

export default function DashboardPage() {
    const { connected, deviceEvents } = useSocket();
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalDevices: 0,
        onlineDevices: 0,
        totalLocations: 0,
        totalRelays: 0,
    });
    const [recentLogs, setRecentLogs] = useState([]);
    const [criticalAlerts, setCriticalAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
        const handleStatusChange = () => loadDashboard();
        window.addEventListener('device-status-change', handleStatusChange);
        const handleAlert = (e) => {
            setCriticalAlerts((prev) => [e.detail, ...prev].slice(0, 3));
        };
        window.addEventListener('notification-alert', handleAlert);
        return () => {
            window.removeEventListener('device-status-change', handleStatusChange);
            window.removeEventListener('notification-alert', handleAlert);
        };
    }, []);

    const loadDashboard = async () => {
        try {
            const [devicesRes, locationsRes, relaysRes, logsRes] = await Promise.all([
                api.get('/devices'),
                api.get('/locations'),
                api.get('/relays'),
                api.get('/logs?limit=8'),
            ]);
            const devices = devicesRes.data?.data?.devices ?? [];
            setStats({
                totalDevices: devices.length,
                onlineDevices: devices.filter((d) => d.status === 'online').length,
                totalLocations: locationsRes.data?.data?.count ?? 0,
                totalRelays: (relaysRes.data?.data?.relays ?? []).length,
            });
            setRecentLogs(logsRes.data?.data?.logs ?? []);
        } catch (err) {
            console.error('Error loading dashboard:', err);
        } finally {
            setTimeout(() => setLoading(false), 400);
        }
    };

    const formatTime = (date) => {
        const d = new Date(date);
        const now = new Date();
        const diff = (now - d) / 1000;
        if (diff < 60) return 'Agora';
        if (diff < 3600) return `${Math.floor(diff / 60)} min`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    };

    const getActivityColor = (action) => {
        if (!action) return 'var(--text-muted)';
        if (action.includes('connected')) return 'var(--accent-success)';
        if (action.includes('disconnected')) return 'var(--accent-danger)';
        if (action.includes('activated') || action.includes('relay')) return 'var(--accent-primary)';
        return 'var(--accent-info)';
    };

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    const firstName = user?.name?.split(' ')[0] || '';

    return (
        <div className="dashboard-page">
            {/* Alerts */}
            {criticalAlerts.length > 0 && (
                <div className="dashboard-alerts">
                    {criticalAlerts.map((alert, i) => (
                        <div key={i} className="dashboard-alert">
                            <Bell size={20} />
                            <div>
                                <strong>{alert.title}</strong>
                                <span>{alert.message}</span>
                            </div>
                            <Link to="/logs" className="btn btn-sm btn-danger">Ver</Link>
                        </div>
                    ))}
                </div>
            )}

            {/* Hero */}
            <section className="dashboard-hero">
                <div className="dashboard-hero-content">
                    <h1 className="dashboard-hero-title">
                        {greeting}, {firstName}
                    </h1>
                    <p className="dashboard-hero-subtitle">
                        {loading ? (
                            <span style={{ opacity: 0.7 }}>Carregando...</span>
                        ) : (
                            <>
                                {stats.totalDevices === 0 ? (
                                    'Nenhum dispositivo cadastrado. Comece adicionando um gateway.'
                                ) : (
                                    <>
                                        <span className="dashboard-hero-highlight">{stats.onlineDevices}</span> de{' '}
                                        <span className="dashboard-hero-highlight">{stats.totalDevices}</span> dispositivos
                                        online
                                    </>
                                )}
                            </>
                        )}
                    </p>
                    <div className="dashboard-hero-badges">
                        <span className="dashboard-badge">
                            <ShieldCheck size={14} />
                            Sistema seguro
                        </span>
                        <span className={`dashboard-badge ${connected ? 'connected' : ''}`}>
                            {connected ? <CircleDot size={14} /> : <Circle size={14} />}
                            {connected ? 'Conectado' : 'Offline'}
                        </span>
                    </div>
                </div>
                <div className="dashboard-hero-decoration" aria-hidden>
                    <img className="dashboard-hero-logo" src={brandLogo} alt="" />
                </div>
            </section>

            {/* Stats */}
            <section className="dashboard-stats">
                {loading ? (
                    <>
                        <StatSkeleton />
                        <StatSkeleton />
                        <StatSkeleton />
                        <StatSkeleton />
                    </>
                ) : (
                    <>
                        <Link to="/devices" className="dashboard-stat">
                            <div className="dashboard-stat-icon devices">
                                <Cpu size={22} />
                            </div>
                            <div className="dashboard-stat-body">
                                <span className="dashboard-stat-label">Dispositivos</span>
                                <span className="dashboard-stat-value">{stats.totalDevices}</span>
                                <span className="dashboard-stat-meta">
                                    {stats.onlineDevices} online
                                </span>
                            </div>
                            <ArrowRight size={16} className="dashboard-stat-arrow" />
                        </Link>
                        <Link to="/locations" className="dashboard-stat">
                            <div className="dashboard-stat-icon locations">
                                <MapPin size={22} />
                            </div>
                            <div className="dashboard-stat-body">
                                <span className="dashboard-stat-label">Locais</span>
                                <span className="dashboard-stat-value">{stats.totalLocations}</span>
                                <span className="dashboard-stat-meta">zonas</span>
                            </div>
                            <ArrowRight size={16} className="dashboard-stat-arrow" />
                        </Link>
                        <Link to="/relays" className="dashboard-stat">
                            <div className="dashboard-stat-icon relays">
                                <ToggleLeft size={22} />
                            </div>
                            <div className="dashboard-stat-body">
                                <span className="dashboard-stat-label">Relés</span>
                                <span className="dashboard-stat-value">{stats.totalRelays}</span>
                                <span className="dashboard-stat-meta">portas e luzes</span>
                            </div>
                            <ArrowRight size={16} className="dashboard-stat-arrow" />
                        </Link>
                        <Link to="/invites" className="dashboard-stat">
                            <div className="dashboard-stat-icon invites">
                                <Zap size={22} />
                            </div>
                            <div className="dashboard-stat-body">
                                <span className="dashboard-stat-label">Convites</span>
                                <span className="dashboard-stat-value">—</span>
                                <span className="dashboard-stat-meta">acessos temporários</span>
                            </div>
                            <ArrowRight size={16} className="dashboard-stat-arrow" />
                        </Link>
                    </>
                )}
            </section>

            {/* Two columns */}
            <div className="dashboard-grid">
                {/* Live events */}
                <section className="dashboard-card">
                    <div className="dashboard-card-header">
                        <h2>
                            <Activity size={18} />
                            Atividade em tempo real
                        </h2>
                        {connected && (
                            <span className="dashboard-card-badge online">Ao vivo</span>
                        )}
                    </div>
                    <div className="dashboard-card-body">
                        {deviceEvents.length === 0 ? (
                            <div className="dashboard-empty">
                                <Wifi size={32} />
                                <p>Nenhum evento recente</p>
                                <span>As mudanças de status dos dispositivos aparecem aqui</span>
                            </div>
                        ) : (
                            <ul className="dashboard-activity-list">
                                {deviceEvents.slice(0, 5).map((event, idx) => (
                                    <li key={idx} className="dashboard-activity-item">
                                        <span
                                            className="dashboard-activity-dot"
                                            style={{
                                                background: event.status === 'online'
                                                    ? 'var(--accent-success)'
                                                    : 'var(--accent-danger)',
                                            }}
                                        />
                                        <span className="dashboard-activity-text">
                                            <strong>{event.name}</strong>{' '}
                                            <span style={{ color: 'var(--text-muted)' }}>
                                                → {event.status === 'online' ? 'online' : 'offline'}
                                            </span>
                                        </span>
                                        <span className="dashboard-activity-time">
                                            {event.timestamp ? formatTime(event.timestamp) : '—'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <Link to="/logs" className="dashboard-card-footer">
                        Ver atividades <ArrowRight size={14} />
                    </Link>
                </section>

                {/* Recent logs */}
                <section className="dashboard-card">
                    <div className="dashboard-card-header">
                        <h2>
                            <TrendingUp size={18} />
                            Histórico recente
                        </h2>
                    </div>
                    <div className="dashboard-card-body">
                        {recentLogs.length === 0 ? (
                            <div className="dashboard-empty">
                                <TrendingUp size={32} />
                                <p>Nenhum registro ainda</p>
                                <span>As ações do sistema aparecem aqui</span>
                            </div>
                        ) : (
                            <ul className="dashboard-activity-list">
                                {recentLogs.slice(0, 6).map((log) => (
                                    <li key={log._id} className="dashboard-activity-item">
                                        <span
                                            className="dashboard-activity-dot"
                                            style={{ background: getActivityColor(log.action) }}
                                        />
                                        <span className="dashboard-activity-text">
                                            {log.description || log.action || '—'}
                                        </span>
                                        <span className="dashboard-activity-time">
                                            {formatTime(log.createdAt)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <Link to="/logs" className="dashboard-card-footer">
                        Ver todos os logs <ArrowRight size={14} />
                    </Link>
                </section>
            </div>

            <style>{`
                .dashboard-page { animation: fadeIn 0.4s ease-out; }
                .dashboard-alerts { display: flex; flex-direction: column; gap: 10px; margin-bottom: var(--space-lg); }
                .dashboard-alert {
                    display: flex; align-items: center; gap: 14px; padding: 14px 18px;
                    background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2);
                    border-left: 4px solid var(--accent-danger); border-radius: 12px;
                    color: var(--text-primary);
                }
                .dashboard-alert strong { display: block; font-size: 0.9rem; margin-bottom: 2px; }
                .dashboard-alert span { font-size: 0.8rem; color: var(--text-muted); }
                .dashboard-hero {
                    position: relative; overflow: hidden; border-radius: 20px; margin-bottom: var(--space-xl);
                    background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
                    padding: var(--space-xl) var(--space-2xl); color: #fff;
                    box-shadow: 0 10px 40px -10px rgba(99, 102, 241, 0.4);
                }
                .dashboard-hero::before {
                    content: ''; position: absolute; top: -80px; right: -80px; width: 280px; height: 280px;
                    background: rgba(255,255,255,0.12); border-radius: 50%; filter: blur(60px);
                }
                .dashboard-hero-content { position: relative; z-index: 1; }
                .dashboard-hero-title { font-size: 1.75rem; font-weight: 800; margin: 0 0 8px 0; letter-spacing: -0.5px; }
                .dashboard-hero-subtitle { margin: 0; font-size: 1rem; opacity: 0.95; line-height: 1.5; }
                .dashboard-hero-highlight { font-weight: 700; text-decoration: underline; text-underline-offset: 3px; }
                .dashboard-hero-badges { display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap; }
                .dashboard-badge {
                    display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px;
                    background: rgba(255,255,255,0.2); border-radius: 20px; font-size: 0.8rem; font-weight: 600;
                }
                .dashboard-badge.connected { background: rgba(255,255,255,0.3); }
                .dashboard-hero-decoration {
                    position: absolute; right: 12px; bottom: 4px; opacity: 1; pointer-events: none;
                }
                .dashboard-hero-logo {
                    width: min(220px, 38vw);
                    height: auto;
                    max-height: 88px;
                    object-fit: contain;
                    display: block;
                    opacity: 0.22;
                    filter: brightness(0) invert(1);
                }
                .dashboard-stats {
                    display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px;
                    margin-bottom: var(--space-xl);
                }
                .dashboard-stat {
                    display: flex; align-items: center; gap: 14px; padding: 18px; border-radius: 14px;
                    background: var(--bg-card); border: 1px solid var(--border-color);
                    text-decoration: none; color: inherit; transition: all 0.2s ease;
                }
                .dashboard-stat:hover {
                    border-color: var(--accent-primary); box-shadow: 0 4px 20px -4px rgba(99, 102, 241, 0.2);
                    transform: translateY(-1px);
                }
                .dashboard-stat:hover .dashboard-stat-arrow { opacity: 1; transform: translateX(0); }
                .dashboard-stat-icon {
                    width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0;
                }
                .dashboard-stat-icon.devices { background: rgba(99, 102, 241, 0.12); color: var(--accent-primary); }
                .dashboard-stat-icon.locations { background: rgba(16, 185, 129, 0.12); color: var(--accent-success); }
                .dashboard-stat-icon.relays { background: rgba(245, 158, 11, 0.12); color: var(--accent-warning); }
                .dashboard-stat-icon.invites { background: rgba(139, 92, 246, 0.12); color: var(--accent-secondary); }
                .dashboard-stat-body { flex: 1; min-width: 0; }
                .dashboard-stat-label { display: block; font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
                .dashboard-stat-value { font-size: 1.5rem; font-weight: 800; color: var(--text-primary); line-height: 1.2; }
                .dashboard-stat-meta { display: block; font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
                .dashboard-stat-arrow { color: var(--accent-primary); opacity: 0; transform: translateX(-4px); transition: all 0.2s; }
                .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: var(--space-lg); }
                .dashboard-card {
                    background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px;
                    overflow: hidden; display: flex; flex-direction: column;
                }
                .dashboard-card-header {
                    display: flex; align-items: center; justify-content: space-between; padding: 18px 20px;
                    border-bottom: 1px solid var(--border-color);
                }
                .dashboard-card-header h2 {
                    margin: 0; font-size: 1rem; font-weight: 700; display: flex; align-items: center; gap: 8px;
                    color: var(--text-primary);
                }
                .dashboard-card-header h2 svg { color: var(--accent-primary); flex-shrink: 0; }
                .dashboard-card-badge { font-size: 0.65rem; font-weight: 700; padding: 4px 8px; border-radius: 6px; text-transform: uppercase; }
                .dashboard-card-badge.online { background: rgba(16, 185, 129, 0.15); color: var(--accent-success); }
                .dashboard-card-body { padding: 12px; flex: 1; min-height: 180px; }
                .dashboard-activity-list { list-style: none; margin: 0; padding: 0; }
                .dashboard-activity-item {
                    display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px;
                    transition: background 0.15s;
                }
                .dashboard-activity-item:hover { background: var(--bg-input); }
                .dashboard-activity-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
                .dashboard-activity-text { flex: 1; font-size: 0.85rem; color: var(--text-secondary); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .dashboard-activity-time { font-size: 0.75rem; color: var(--text-muted); flex-shrink: 0; }
                .dashboard-empty {
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    padding: 32px 20px; text-align: center; color: var(--text-muted);
                }
                .dashboard-empty svg { opacity: 0.4; margin-bottom: 12px; }
                .dashboard-empty p { margin: 0 0 4px 0; font-weight: 600; color: var(--text-secondary); font-size: 0.9rem; }
                .dashboard-empty span { font-size: 0.8rem; }
                .dashboard-card-footer {
                    display: flex; align-items: center; justify-content: center; gap: 6px; padding: 12px 20px;
                    border-top: 1px solid var(--border-color); font-size: 0.85rem; font-weight: 600;
                    color: var(--accent-primary); text-decoration: none; transition: background 0.15s;
                }
                .dashboard-card-footer:hover { background: var(--bg-input); }
            `}</style>
        </div>
    );
}

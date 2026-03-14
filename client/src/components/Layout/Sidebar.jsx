import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import {
    LayoutDashboard,
    Cpu,
    MapPin,
    ToggleLeft,
    ScrollText,
    LogOut,
    Wifi,
    WifiOff,
    Activity,
    Calendar,
    Zap,
    Users,
    HeartPulse,
    FileText,
    Shield,
    Settings,
    UserPlus,
} from 'lucide-react';

const mainNavItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/devices', label: 'Dispositivos', icon: Cpu },
    { path: '/locations', label: 'Locais', icon: MapPin },
    { path: '/invites', label: 'Convites', icon: UserPlus },
];

const hardwareNavItems = [
    { path: '/relays', label: 'Relés', icon: ToggleLeft },
    { path: '/inputs', label: 'Sensores', icon: Activity },
];

const adminNavItems = [
    { path: '/users', label: 'Usuários', icon: Users },
    { path: '/monitoring', label: 'Health Check', icon: HeartPulse },
    { path: '/reports', label: 'Relatórios', icon: FileText },
    { path: '/logs', label: 'Atividades', icon: ScrollText },
];

export default function Sidebar() {
    const { user, logout } = useAuth();
    const { connected } = useSocket();
    const location = useLocation();

    const initials = user?.name
        ? user.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
        : '??';

    const renderLink = (item) => (
        <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
            }
            end={item.path === '/'}
        >
            <item.icon size={20} />
            {item.label}
        </NavLink>
    );

    return (
        <aside className="sidebar">
            <div className="sidebar-logo" style={{ gap: 16 }}>
                <div style={{
                    width: 44,
                    height: 44,
                    background: 'var(--gradient-primary)',
                    borderRadius: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 16px -4px rgba(99, 102, 241, 0.5), inset 0 0 10px rgba(255,255,255,0.2)',
                    position: 'relative',
                    overflow: 'hidden',
                    flexShrink: 0
                }}>
                    <Zap size={24} color="white" strokeWidth={2.5} fill="white" />
                    <div style={{ position: 'absolute', top: -10, left: -10, width: 30, height: 30, background: 'rgba(255,255,255,0.2)', filter: 'blur(10px)', borderRadius: '50%' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <h1 style={{
                        fontSize: '1.45rem',
                        fontWeight: 900,
                        letterSpacing: -1.2,
                        color: '#fff',
                        lineHeight: 1.1,
                        textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                    }}>
                        ZAccess<span style={{ color: 'var(--accent-primary-light)' }}>.</span>
                    </h1>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        background: 'rgba(255,255,255,0.05)',
                        padding: '2px 8px',
                        borderRadius: 20,
                        width: 'fit-content'
                    }}>
                        <div className={`status-dot-pulse ${connected ? 'online' : 'offline'}`} />
                        <span style={{
                            fontSize: '0.6rem',
                            fontWeight: 800,
                            letterSpacing: 0.5,
                            color: connected ? 'var(--accent-success)' : 'var(--accent-danger)',
                            textTransform: 'uppercase'
                        }}>
                            {connected ? 'Cloud Active' : 'Offline'}
                        </span>
                    </div>
                </div>
            </div>

            <nav className="sidebar-nav">
                <div className="sidebar-section">
                    <span className="sidebar-section-title">Home</span>
                    {mainNavItems.map(renderLink)}
                </div>

                <div className="sidebar-section">
                    <span className="sidebar-section-title">Hardware</span>
                    {hardwareNavItems.map(renderLink)}
                    <NavLink to="/automations" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                        <Zap size={20} /> Automações
                    </NavLink>
                    <NavLink to="/schedules" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                        <Calendar size={20} /> Agendamentos
                    </NavLink>
                </div>

                {user?.role === 'admin' && (
                    <div className="sidebar-section">
                        <span className="sidebar-section-title">Administração</span>
                        {adminNavItems.map(renderLink)}
                    </div>
                )}
            </nav>

            <div className="sidebar-footer" style={{ padding: '12px 10px', borderTop: '1px solid var(--border-color)' }}>
                <button
                    className="btn-logout"
                    onClick={logout}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        borderRadius: '10px',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.1)',
                        color: 'var(--accent-danger)',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        transition: 'all 0.2s',
                        cursor: 'pointer'
                    }}
                >
                    <LogOut size={18} />
                    SAIR DO SISTEMA
                </button>
            </div>

            <style>{`
                .sidebar-section {
                    margin-bottom: 24px;
                }
                .sidebar-section-title {
                    font-size: 0.7rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    color: var(--text-muted);
                    padding: 0 12px;
                    margin-bottom: 12px;
                    display: block;
                    opacity: 0.6;
                }
                .btn-logout {
                    background: transparent;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 8px;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .btn-logout:hover {
                    background: rgba(239, 68, 68, 0.1);
                    color: var(--accent-danger);
                }
                .sidebar-user-name {
                    max-width: 100px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .status-dot-pulse {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    position: relative;
                }
                .status-dot-pulse.online {
                    background: var(--accent-success);
                    box-shadow: 0 0 8px var(--accent-success);
                }
                .status-dot-pulse.offline {
                    background: var(--accent-danger);
                }
                .status-dot-pulse.online::after {
                    content: '';
                    position: absolute;
                    inset: -2px;
                    border-radius: 50%;
                    border: 1px solid var(--accent-success);
                    animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    100% { transform: scale(2.5); opacity: 0; }
                }
            `}</style>
        </aside>
    );
}

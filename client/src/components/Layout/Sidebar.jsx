import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import brandLogo from '../../../svg/ZAccess..svg';
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

const getMainNavItems = (hasAssignedLocation) => [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/devices', label: 'Dispositivos', icon: Cpu },
    { path: '/locations', label: hasAssignedLocation ? 'Meu local' : 'Locais', icon: MapPin },
    { path: '/invites', label: 'Convites', icon: UserPlus },
];

const historyNavItems = [
    { path: '/logs', label: 'Atividades', icon: ScrollText },
];

const hardwareNavItems = [
    { path: '/relays', label: 'Relés', icon: ToggleLeft },
    { path: '/inputs', label: 'Sensores', icon: Activity },
    { path: '/automations', label: 'Automações', icon: Zap },
    { path: '/eventos', label: 'Eventos', icon: Activity },
];

const adminNavItems = [
    { path: '/users', label: 'Usuários', icon: Users },
    { path: '/reports', label: 'Relatórios', icon: FileText },
];

const adminDisabledItems = [
    { label: 'Health Check', icon: HeartPulse },
];

export default function Sidebar() {
    const { user, logout } = useAuth();
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

    const renderDisabledItem = (item) => (
        <span key={item.label} className="sidebar-link sidebar-link--disabled" aria-disabled>
            <item.icon size={20} />
            <span className="sidebar-link-label">{item.label}</span>
            <span className="sidebar-link-badge">OFF</span>
        </span>
    );

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <img
                    className="sidebar-logo__img"
                    src={brandLogo}
                    alt="ZAccess"
                    width={280}
                    height={72}
                    decoding="async"
                />
            </div>

            <nav className="sidebar-nav">
                <div className="sidebar-section">
                    <span className="sidebar-section-title">Home</span>
                    {getMainNavItems(!!user?.locationId).map(renderLink)}
                </div>

                {(user?.role === 'admin' || user?.role === 'operator') && (
                    <div className="sidebar-section">
                        <span className="sidebar-section-title">Histórico</span>
                        {historyNavItems.map(renderLink)}
                    </div>
                )}

                <div className="sidebar-section">
                    <span className="sidebar-section-title">Hardware</span>
                    {hardwareNavItems.map(renderLink)}
                    <NavLink to="/schedules" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                        <Calendar size={20} /> Agendamentos
                    </NavLink>
                </div>

                {user?.role === 'admin' && !user?.locationId && (
                    <div className="sidebar-section">
                        <span className="sidebar-section-title">Administração</span>
                        {adminNavItems.map(renderLink)}
                        {adminDisabledItems.map(renderDisabledItem)}
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
                .sidebar-link--disabled {
                    cursor: default;
                    pointer-events: none;
                    opacity: 0.9;
                }
                .sidebar-link--disabled:hover {
                    background: transparent;
                    color: var(--text-secondary);
                }
                .sidebar-link--disabled .sidebar-link-label {
                    flex: 1;
                }
                .sidebar-link--disabled .sidebar-link-badge {
                    font-size: 0.55rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    padding: 2px 6px;
                    border-radius: 4px;
                    background: rgba(255, 255, 255, 0.08);
                    color: var(--text-muted);
                    border: 1px solid var(--border-color);
                }
            `}</style>
        </aside>
    );
}

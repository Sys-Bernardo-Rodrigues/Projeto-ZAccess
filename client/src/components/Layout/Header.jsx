import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Search, Settings } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuth';

const pageTitles = {
    '/': { title: 'Dashboard', subtitle: 'Visão geral do sistema' },
    '/devices': { title: 'Dispositivos', subtitle: 'Controle seus Gateways IOT' },
    '/locations': { title: 'Locais', subtitle: 'Zonas de acesso configuradas' },
    '/relays': { title: 'Relés', subtitle: 'Dispositivos de controle final' },
    '/inputs': { title: 'Sensores', subtitle: 'Monitoramento de entradas' },
    '/schedules': { title: 'Agendamentos', subtitle: 'Eventos programados por horário' },
    '/automations': { title: 'Automações', subtitle: 'Regras automáticas disparadas por sensores' },
    '/eventos': { title: 'Eventos', subtitle: 'Regras por tempo de sensor' },
    '/invites': { title: 'Convites & Acessos', subtitle: 'Links temporários para visitantes' },
    '/users': { title: 'Usuários', subtitle: 'Gestão de permissões e acessos' },
    '/monitoring': { title: 'Health Check', subtitle: 'Status de hardware em tempo real' },
    '/reports': { title: 'Relatórios', subtitle: 'Histórico de eventos e auditoria' },
    '/logs': { title: 'Atividades', subtitle: 'Log completo de interações' },
};

export default function Header() {
    const location = useLocation();
    const navigate = useNavigate();
    const { deviceEvents, connected } = useSocket();
    const { user } = useAuth();
    const pageInfo = pageTitles[location.pathname] || { title: 'ZAccess', subtitle: 'Controle de acessos IoT' };

    return (
        <header className="header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <h2 className="header-title" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.5 }}>{pageInfo.title}</h2>
                    <p className="header-subtitle" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>{pageInfo.subtitle}</p>
                </div>

                <div className="search-bar" style={{ display: 'none', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '8px 16px', alignItems: 'center', gap: 12, width: '100%', maxWidth: 400 }}>
                    <Search size={18} color="var(--text-muted)" />
                    <input type="text" placeholder="Buscar relatórios, dispositivos..." style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', width: '100%', outline: 'none', fontSize: '0.9rem' }} />
                </div>
            </div>

            <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-input)', padding: '6px 12px', borderRadius: 20, border: '1px solid var(--border-color)', fontSize: '0.75rem', fontWeight: 700, color: connected ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? 'var(--accent-success)' : 'var(--accent-danger)', boxShadow: connected ? '0 0 10px var(--accent-success)' : 'none' }} />
                    {connected ? 'CONNECTED' : 'DISCONNECTED'}
                </div>

                <div style={{ width: 1, height: 24, background: 'var(--border-color)', margin: '0 8px' }} />

                <button className="btn btn-icon btn-secondary" style={{ position: 'relative', width: 44, height: 44, borderRadius: 12 }}>
                    <Bell size={20} />
                    {deviceEvents.length > 0 && (
                        <span
                            style={{
                                position: 'absolute',
                                top: 10,
                                right: 10,
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: 'var(--accent-danger)',
                                border: '2px solid var(--bg-primary)',
                                boxShadow: '0 0 5px var(--accent-danger)',
                            }}
                        />
                    )}
                </button>

                <button
                    className="btn btn-icon btn-secondary"
                    style={{ width: 40, height: 40, borderRadius: 10, fontSize: '0.8rem' }}
                    onClick={() => navigate('/settings')}
                    title="Configurações do painel"
                >
                    <Settings size={20} />
                </button>
            </div>
        </header>
    );
}

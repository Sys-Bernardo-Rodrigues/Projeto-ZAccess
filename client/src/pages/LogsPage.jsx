import { useState, useEffect } from 'react';
import api from '../api/axios';
import { ScrollText, Filter, ChevronLeft, ChevronRight, CalendarRange } from 'lucide-react';

const actionLabels = {
    device_connected: 'Conexão Estabelecida',
    device_disconnected: 'Conexão Perdida',
    relay_activated: 'Relé Ativado',
    relay_deactivated: 'Relé Desativado',
    device_registered: 'Novo Dispositivo',
    device_updated: 'Atualização Hardware',
    device_removed: 'Remoção Hardware',
    relay_created: 'Config. Relé',
    relay_updated: 'Alt. Relé',
    location_created: 'Novo Local',
    user_login: 'Sessão Iniciada',
    command_sent: 'Comando Enviado',
    command_response: 'Resposta Gateway',
    heartbeat_timeout: 'Timeout de Link',
    public_access_invitation: 'Acesso via convite',
};

/** Limites do dia no fuso local do navegador → ISO para a API */
function localDayToIsoRange(dateStr, endOfDay) {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return null;
    const dt = endOfDay
        ? new Date(y, m - 1, d, 23, 59, 59, 999)
        : new Date(y, m - 1, d, 0, 0, 0, 0);
    return dt.toISOString();
}

function getVisiblePageNumbers(current, total, maxVisible = 5) {
    if (total <= 1) return [1];
    if (total <= maxVisible) return Array.from({ length: total }, (_, i) => i + 1);
    let start = Math.max(1, current - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;
    if (end > total) {
        end = total;
        start = Math.max(1, end - maxVisible + 1);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function guestNameFromLegacyDescription(description, action) {
    if (!description || action !== 'public_access_invitation') return null;
    const m = description.match(/via convite:\s*"([^"]+)"/i);
    return m ? m[1] : null;
}

function renderOperatorCell(log) {
    const u = log.userId;
    if (u && (u.name || u.email)) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontWeight: 600 }}>{u.name || u.email}</span>
                {u.name && u.email && String(u.name).trim() !== String(u.email).trim() ? (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{u.email}</span>
                ) : null}
            </div>
        );
    }
    const meta = log.metadata || {};
    let guest =
        meta.guestName ||
        meta.invitationGuestName ||
        guestNameFromLegacyDescription(log.description, log.action);
    if (guest) {
        let sub = 'Convite';
        if (log.action === 'public_access_invitation') sub = 'Convite (link)';
        else if (meta.viaInviteQr) sub = 'Convite (QR da porta)';
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontWeight: 600 }}>{guest}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{sub}</span>
            </div>
        );
    }
    return <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Automático</span>;
}

const TableSkeleton = () => (
    <div className="table-container card">
        <table className="table">
            <thead>
                <tr>
                    {['Evento', 'Descrição', 'Origem', 'Operador', 'Horário'].map(h => (
                        <th key={h}>{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <tr key={i}>
                        {[1, 2, 3, 4, 5].map(j => (
                            <td key={j}>
                                <div className="skeleton skeleton-text" style={{ width: j === 2 ? '200px' : '80px', height: 14 }} />
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

export default function LogsPage() {
    const [logs, setLogs] = useState([]);
    const [pagination, setPagination] = useState({});
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);

    useEffect(() => {
        loadLogs();
    }, [page, filter, dateFrom, dateTo]);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const params = { page, limit: 15 };
            if (filter) params.action = filter;
            const fromIso = localDayToIsoRange(dateFrom, false);
            const toIso = localDayToIsoRange(dateTo, true);
            if (fromIso) params.createdFrom = fromIso;
            if (toIso) params.createdTo = toIso;
            const res = await api.get('/logs', { params });
            setLogs(res.data.data.logs);
            setPagination(res.data.data.pagination);
        } catch (err) {
            console.error('Error loading logs:', err);
        } finally {
            setTimeout(() => setLoading(false), 400);
        }
    };

    const formatDate = (date) => {
        const d = new Date(date);
        return (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {d.toLocaleDateString('pt-BR')}
                </span>
            </div>
        );
    };

    const getActionBadge = (action) => {
        const isSuccess = action.includes('connected') || action.includes('activated') || action.includes('login') || action.includes('created');
        const isDanger = action.includes('disconnected') || action.includes('timeout') || action.includes('removed');

        let color = 'var(--text-muted)';
        let bg = 'rgba(100, 116, 139, 0.1)';

        if (isSuccess) {
            color = 'var(--accent-success)';
            bg = 'rgba(34, 197, 94, 0.1)';
        } else if (isDanger) {
            color = 'var(--accent-danger)';
            bg = 'rgba(239, 68, 68, 0.1)';
        } else if (action.includes('command') || action.includes('updated')) {
            color = 'var(--accent-primary)';
            bg = 'rgba(99, 102, 241, 0.1)';
        }

        return (
            <span style={{
                padding: '4px 10px',
                borderRadius: 20,
                fontSize: '0.7rem',
                fontWeight: 700,
                color,
                background: bg,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                textTransform: 'uppercase',
                letterSpacing: 0.5
            }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                {actionLabels[action] || action}
            </span>
        );
    };

    return (
        <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Logs do Sistema</h1>
                    <p className="page-subtitle">
                        {pagination.total || 0} eventos registrados no histórico
                    </p>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <CalendarRange size={16} style={{ position: 'absolute', left: 10, color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 1 }} />
                        <input
                            type="date"
                            className="form-input"
                            aria-label="Data inicial"
                            value={dateFrom}
                            onChange={(e) => {
                                setDateFrom(e.target.value);
                                setPage(1);
                            }}
                            style={{ paddingLeft: 36, height: 44, minWidth: 150 }}
                        />
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>até</span>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <CalendarRange size={16} style={{ position: 'absolute', left: 10, color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 1 }} />
                        <input
                            type="date"
                            className="form-input"
                            aria-label="Data final"
                            value={dateTo}
                            onChange={(e) => {
                                setDateTo(e.target.value);
                                setPage(1);
                            }}
                            style={{ paddingLeft: 36, height: 44, minWidth: 150 }}
                        />
                    </div>
                    {(dateFrom || dateTo) && (
                        <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => {
                                setDateFrom('');
                                setDateTo('');
                                setPage(1);
                            }}
                        >
                            Limpar datas
                        </button>
                    )}
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Filter size={16} style={{ position: 'absolute', left: 12, color: 'var(--text-muted)' }} />
                        <select
                            className="form-select"
                            style={{ width: 220, paddingLeft: 36, height: 44 }}
                            value={filter}
                            onChange={(e) => {
                                setFilter(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">Filtrar: Todos os eventos</option>
                            {Object.entries(actionLabels).map(([key, label]) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <TableSkeleton />
            ) : (
                <>
                    <div className="table-container card">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Status / Evento</th>
                                    <th>Descrição do Log</th>
                                    <th>Dispositivo Origem</th>
                                    <th>Operador</th>
                                    <th>Data & Hora</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5}>
                                            <div className="empty-state">
                                                <ScrollText size={48} />
                                                <h3>Sem registros</h3>
                                                <p>Não encontramos eventos com os filtros aplicados.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => (
                                        <tr key={log._id}>
                                            <td>{getActionBadge(log.action)}</td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: 400, whiteSpace: 'normal' }}>
                                                {log.description || '—'}
                                            </td>
                                            <td>
                                                {log.deviceId ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div style={{ padding: 6, background: 'var(--bg-input)', borderRadius: 8 }}>
                                                            <ScrollText size={14} color="var(--text-muted)" />
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{log.deviceId.name}</span>
                                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{log.deviceId.serialNumber}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sistema</span>
                                                )}
                                            </td>
                                            <td style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                                                {renderOperatorCell(log)}
                                            </td>
                                            <td>{formatDate(log.createdAt)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 32 }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Página {pagination.page} de {pagination.pages}
                                {pagination.total != null && (
                                    <span style={{ marginLeft: 8 }}>
                                        · {pagination.total} registro{pagination.total !== 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
                                <button
                                    type="button"
                                    className="btn btn-icon btn-secondary"
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => p - 1)}
                                    style={{ width: 44, height: 44, borderRadius: 12 }}
                                >
                                    <ChevronLeft size={20} />
                                </button>

                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                                    {getVisiblePageNumbers(page, pagination.pages, 5).map((pageNum) => (
                                        <button
                                            type="button"
                                            key={pageNum}
                                            onClick={() => setPage(pageNum)}
                                            className={`btn btn-sm ${page === pageNum ? 'btn-primary' : 'btn-secondary'}`}
                                            style={{ minWidth: 40, height: 40, borderRadius: 10 }}
                                        >
                                            {pageNum}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    className="btn btn-icon btn-secondary"
                                    disabled={page >= pagination.pages}
                                    onClick={() => setPage((p) => p + 1)}
                                    style={{ width: 44, height: 44, borderRadius: 12 }}
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import {
    FileText,
    Download,
    Filter,
    User,
    DoorClosed,
    RefreshCw,
    UserPlus,
    QrCode,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

/** Itens por página — mantém o mesmo valor do default em GET /api/reports/access (limit). */
const PAGE_SIZE = 15;

/** API antiga ou sem paginação: vem o array inteiro de uma vez. */
function shouldClientPaginate(raw, pag) {
    if (!raw.length) return false;
    if (raw.length <= PAGE_SIZE) return false;
    if (!pag || typeof pag.total !== 'number' || typeof pag.pages !== 'number') return true;
    if (pag.pages === 1 && raw.length > (pag.limit || PAGE_SIZE)) return true;
    return false;
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

function methodBadgeClass(method) {
    if (!method || method === '—') return 'badge-secondary';
    if (method.includes('Convite (link)')) return 'badge-danger';
    if (method.includes('QR Code (convite)')) return 'badge-primary';
    if (method.includes('QR Code')) return 'badge-primary';
    if (method.includes('Painel')) return 'badge-primary';
    if (method.includes('App')) return 'badge-success';
    if (method.includes('Automação') || method.includes('Agendamento')) return 'badge-secondary';
    return 'badge-secondary';
}

export default function ReportsPage() {
    const { user } = useAuth();
    const isInviteManager = user?.role === 'invite_manager';
    const [reportData, setReportData] = useState([]);
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: PAGE_SIZE, pages: 1 });
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        deviceId: '',
    });
    const [devices, setDevices] = useState([]);
    /** Quando a API devolve tudo num único array, paginamos no cliente sem novo fetch. */
    const clientPagedFullReportRef = useRef(null);

    const buildReportParams = (pageNum, limitVal = PAGE_SIZE) => {
        const params = { page: pageNum, limit: limitVal };
        if (filters.startDate) params.startDate = filters.startDate;
        if (filters.endDate) params.endDate = filters.endDate;
        if (filters.deviceId) params.deviceId = filters.deviceId;
        return params;
    };

    const applyClientPageSlice = (pageNum, fullRows) => {
        const total = fullRows.length;
        const pages = Math.ceil(total / PAGE_SIZE) || 1;
        const p = Math.min(Math.max(1, pageNum), pages);
        const start = (p - 1) * PAGE_SIZE;
        setReportData(fullRows.slice(start, start + PAGE_SIZE));
        setPagination({ total, page: p, limit: PAGE_SIZE, pages });
        setPage(p);
    };

    const loadReport = async (pageNum) => {
        if (clientPagedFullReportRef.current) {
            applyClientPageSlice(pageNum, clientPagedFullReportRef.current);
            return;
        }
        setLoading(true);
        try {
            const res = await api.get('/reports/access', { params: buildReportParams(pageNum) });
            const raw = res.data?.data?.report ?? [];
            const pag = res.data?.data?.pagination;

            if (shouldClientPaginate(raw, pag)) {
                clientPagedFullReportRef.current = raw;
                applyClientPageSlice(pageNum, raw);
                return;
            }

            clientPagedFullReportRef.current = null;
            const lim = pag?.limit || PAGE_SIZE;
            const displayRows = pag && raw.length > lim ? raw.slice(0, lim) : raw;
            setReportData(displayRows);
            if (pag) {
                setPagination(pag);
                setPage(pag.page ?? pageNum);
            } else {
                const total = displayRows.length;
                setPagination({
                    total,
                    page: 1,
                    limit: PAGE_SIZE,
                    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
                });
                setPage(1);
            }
        } catch (err) {
            toast.error('Erro ao gerar relatório');
        } finally {
            setLoading(false);
        }
    };

    const refetchReportKeepingPage = async () => {
        clientPagedFullReportRef.current = null;
        setLoading(true);
        try {
            const res = await api.get('/reports/access', { params: buildReportParams(page) });
            const raw = res.data?.data?.report ?? [];
            const pag = res.data?.data?.pagination;

            if (shouldClientPaginate(raw, pag)) {
                clientPagedFullReportRef.current = raw;
                applyClientPageSlice(page, raw);
                return;
            }

            clientPagedFullReportRef.current = null;
            const lim = pag?.limit || PAGE_SIZE;
            const displayRows = pag && raw.length > lim ? raw.slice(0, lim) : raw;
            setReportData(displayRows);
            if (pag) {
                setPagination(pag);
                setPage(Math.min(page, pag.pages || 1));
            } else {
                const total = displayRows.length;
                setPagination({
                    total,
                    page: 1,
                    limit: PAGE_SIZE,
                    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
                });
                setPage(1);
            }
        } catch (err) {
            toast.error('Erro ao gerar relatório');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateReport = async (e) => {
        if (e) e.preventDefault();
        clientPagedFullReportRef.current = null;
        await loadReport(1);
    };

    useEffect(() => {
        if (!user) return;
        (async () => {
            if (user.role === 'invite_manager') {
                setDevices([]);
            } else {
                try {
                    const res = await api.get('/devices');
                    setDevices(res.data.data.devices);
                } catch {
                    setDevices([]);
                }
            }
        })();
        clientPagedFullReportRef.current = null;
        loadReport(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- só troca de usuário; filtros aplicam em Filtrar
    }, [user?._id, user?.role]);

    const downloadCSV = async () => {
        const cached = clientPagedFullReportRef.current;
        const totalKnown = pagination.total || 0;
        if (totalKnown === 0 && reportData.length === 0 && !cached?.length) return;

        if (cached && cached.length) {
            const rows = cached;
            const headers = ['Data/Hora', 'Porta', 'Operador', 'Nome do convite', 'Método', 'Dispositivo'];
            const csvContent = [
                headers.join(','),
                ...rows.map((r) =>
                    [
                        new Date(r.timestamp).toLocaleString('pt-BR'),
                        `"${String(r.door || '').replace(/"/g, '""')}"`,
                        `"${String(r.operator || '').replace(/"/g, '""')}"`,
                        `"${String(r.inviteName || '—').replace(/"/g, '""')}"`,
                        `"${String(r.method || '').replace(/"/g, '""')}"`,
                        `"${String(r.device || '').replace(/"/g, '""')}"`,
                    ].join(',')
                ),
            ].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `relatorio_acessos_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return;
        }

        const exportLimit = Math.min(Math.max(totalKnown || reportData.length, 1), 10000);
        try {
            const res = await api.get('/reports/access', { params: { ...buildReportParams(1), limit: exportLimit } });
            const rows = res.data.data.report || [];
            if (rows.length === 0) {
                toast.error('Nada para exportar');
                return;
            }
            const headers = ['Data/Hora', 'Porta', 'Operador', 'Nome do convite', 'Método', 'Dispositivo'];
            const csvContent = [
                headers.join(','),
                ...rows.map((r) =>
                    [
                        new Date(r.timestamp).toLocaleString('pt-BR'),
                        `"${String(r.door || '').replace(/"/g, '""')}"`,
                        `"${String(r.operator || '').replace(/"/g, '""')}"`,
                        `"${String(r.inviteName || '—').replace(/"/g, '""')}"`,
                        `"${String(r.method || '').replace(/"/g, '""')}"`,
                        `"${String(r.device || '').replace(/"/g, '""')}"`,
                    ].join(',')
                ),
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `relatorio_acessos_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            if (totalKnown > rows.length) {
                toast(`Exportados ${rows.length} de ${totalKnown} registros (limite por exportação).`, { icon: 'ℹ️' });
            }
        } catch {
            toast.error('Erro ao exportar CSV');
        }
    };

    const pageLimit = pagination.limit ?? PAGE_SIZE;
    const rangeFrom = (pagination.total || 0) > 0 ? (page - 1) * pageLimit + 1 : 0;
    const rangeTo = (pagination.total || 0) > 0 ? Math.min(page * pageLimit, pagination.total) : 0;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Relatórios de Acesso</h1>
                    <p className="page-subtitle">Histórico auditável de aberturas e ativações</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        className="btn btn-secondary"
                        onClick={downloadCSV}
                        disabled={
                            (pagination.total || 0) === 0 &&
                            reportData.length === 0 &&
                            !(clientPagedFullReportRef.current?.length > 0)
                        }
                    >
                        <Download size={18} />
                        Exportar CSV
                    </button>
                    <button type="button" className="btn btn-primary" onClick={() => refetchReportKeepingPage()} disabled={loading}>
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        Atualizar
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                <form
                    onSubmit={handleGenerateReport}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: isInviteManager ? '1fr 1fr auto' : '1fr 1fr 1fr auto',
                        gap: 16,
                        alignItems: 'flex-end',
                    }}
                >
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>De (Início)</label>
                        <input
                            type="date"
                            className="form-input"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Até (Fim)</label>
                        <input
                            type="date"
                            className="form-input"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        />
                    </div>
                    {!isInviteManager && (
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Dispositivo</label>
                            <select
                                className="form-select"
                                value={filters.deviceId}
                                onChange={(e) => setFilters({ ...filters, deviceId: e.target.value })}
                            >
                                <option value="">Todos os Dispositivos</option>
                                {devices.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                            </select>
                        </div>
                    )}
                    <button type="submit" className="btn btn-primary">
                        <Filter size={18} />
                        Filtrar
                    </button>
                </form>
            </div>

            <div className="table-container card">
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center' }}>
                        <RefreshCw className="animate-spin" size={32} />
                        <p>Gerando relatório...</p>
                    </div>
                ) : (pagination.total || 0) === 0 && reportData.length === 0 ? (
                    <div className="empty-state">
                        <FileText size={48} />
                        <h3>Nenhum registro encontrado</h3>
                        <p>Tente ajustar os filtros de data ou dispositivo.</p>
                    </div>
                ) : (
                    <div
                        style={{
                            overflowX: 'auto',
                            overflowY: 'auto',
                            maxHeight: 'min(70vh, 720px)',
                            WebkitOverflowScrolling: 'touch',
                        }}
                    >
                        <table className="table" style={{ minWidth: 720 }}>
                            <thead>
                                <tr>
                                    <th>Data / Hora</th>
                                    <th>Porta</th>
                                    <th>Operador</th>
                                    <th>Nome do convite</th>
                                    <th>Método</th>
                                    <th>Dispositivo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.map((row) => {
                                    const showInvite = row.inviteName && row.inviteName !== '—';
                                    const isQrConvite = row.method?.includes('QR Code (convite)');
                                    return (
                                        <tr key={row.id}>
                                            <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                {new Date(row.timestamp).toLocaleString('pt-BR')}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <DoorClosed size={14} color="var(--text-muted)" />
                                                    <span style={{ fontWeight: 600 }}>{row.door}</span>
                                                </div>
                                            </td>
                                            <td style={{ maxWidth: 200 }}>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'flex-start',
                                                        gap: 8,
                                                        fontSize: '0.875rem',
                                                    }}
                                                >
                                                    {isQrConvite || showInvite ? (
                                                        <QrCode size={14} style={{ flexShrink: 0, marginTop: 2 }} color="var(--accent-primary)" />
                                                    ) : (
                                                        <User size={14} style={{ flexShrink: 0, marginTop: 2 }} color="var(--accent-primary)" />
                                                    )}
                                                    <span>{row.operator || '—'}</span>
                                                </div>
                                            </td>
                                            <td style={{ maxWidth: 200, fontSize: '0.875rem' }}>
                                                {showInvite ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <UserPlus size={14} color="var(--accent-secondary)" />
                                                        <span style={{ fontWeight: 600 }}>{row.inviteName}</span>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                                                )}
                                            </td>
                                            <td style={{ whiteSpace: 'nowrap' }}>
                                                <span className={`badge ${methodBadgeClass(row.method)}`}>{row.method}</span>
                                            </td>
                                            <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: 160 }}>
                                                {row.device}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && reportData.length > 0 && pagination.pages > 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 24, paddingBottom: 8 }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                            Página {pagination.page} de {pagination.pages}
                            {pagination.total != null && (
                                <span style={{ marginLeft: 8 }}>
                                    · mostrando {rangeFrom}–{rangeTo} de {pagination.total} registro
                                    {pagination.total !== 1 ? 's' : ''}
                                </span>
                            )}
                            <span style={{ marginLeft: 8 }}>· {pageLimit} por página</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
                            <button
                                type="button"
                                className="btn btn-icon btn-secondary"
                                disabled={page <= 1 || loading}
                                onClick={() => loadReport(page - 1)}
                                style={{ width: 44, height: 44, borderRadius: 12 }}
                            >
                                <ChevronLeft size={20} />
                            </button>

                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                                {getVisiblePageNumbers(page, pagination.pages, 5).map((pageNum) => (
                                    <button
                                        type="button"
                                        key={pageNum}
                                        onClick={() => loadReport(pageNum)}
                                        disabled={loading}
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
                                disabled={page >= pagination.pages || loading}
                                onClick={() => loadReport(page + 1)}
                                style={{ width: 44, height: 44, borderRadius: 12 }}
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                )}

                {!loading && reportData.length > 0 && pagination.pages <= 1 && pagination.total > 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 16, paddingBottom: 8, textAlign: 'center' }}>
                        {pagination.total} registro{pagination.total !== 1 ? 's' : ''}
                        <span style={{ marginLeft: 8 }}>· até {pageLimit} por página</span>
                    </div>
                )}
            </div>
        </div>
    );
}

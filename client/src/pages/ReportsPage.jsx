import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
    FileText,
    Download,
    Filter,
    Calendar,
    Search,
    User,
    DoorClosed,
    Activity,
    RefreshCw,
} from 'lucide-react';

export default function ReportsPage() {
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        deviceId: '',
    });
    const [devices, setDevices] = useState([]);

    useEffect(() => {
        const fetchInitial = async () => {
            const res = await api.get('/devices');
            setDevices(res.data.data.devices);
        };
        fetchInitial();
        handleGenerateReport(); // Load everything on first visit
    }, []);

    const handleGenerateReport = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.deviceId) params.append('deviceId', filters.deviceId);

            const res = await api.get(`/reports/access?${params.toString()}`);
            setReportData(res.data.data.report);
        } catch (err) {
            toast.error('Erro ao gerar relatório');
        } finally {
            setLoading(false);
        }
    };

    const downloadCSV = () => {
        const headers = ['Data/Hora', 'Porta', 'Operador', 'Ação', 'Dispositivo'];
        const csvContent = [
            headers.join(','),
            ...reportData.map(r => [
                new Date(r.timestamp).toLocaleString(),
                r.door,
                r.operator,
                r.action,
                r.device
            ].join(','))
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
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Relatórios de Acesso</h1>
                    <p className="page-subtitle">Histórico auditável de aberturas e ativações</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn-secondary" onClick={downloadCSV} disabled={reportData.length === 0}>
                        <Download size={18} />
                        Exportar CSV
                    </button>
                    <button className="btn btn-primary" onClick={handleGenerateReport}>
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        Atualizar
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                <form onSubmit={handleGenerateReport} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 16, alignItems: 'flex-end' }}>
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
                ) : reportData.length === 0 ? (
                    <div className="empty-state">
                        <FileText size={48} />
                        <h3>Nenhum registro encontrado</h3>
                        <p>Tente ajustar os filtros de data ou dispositivo.</p>
                    </div>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Data / Hora</th>
                                <th>Sensor / Porta</th>
                                <th>Operador</th>
                                <th>Método</th>
                                <th>Dispositivo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.map((row) => (
                                <tr key={row.id}>
                                    <td style={{ fontWeight: 600 }}>
                                        {new Date(row.timestamp).toLocaleString('pt-BR')}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <DoorClosed size={14} className="text-secondary" />
                                            {row.door}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <User size={14} className="text-primary" />
                                            {row.operator}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge ${row.action === 'Abertura Manual' ? 'badge-primary' : 'badge-secondary'}`}>
                                            {row.action}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        {row.device}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

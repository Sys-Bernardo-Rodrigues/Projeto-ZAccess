import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
    Plus,
    Cpu,
    MapPin,
    Wifi,
    WifiOff,
    Wrench,
    Trash2,
    Edit,
    ToggleLeft,
    X,
    Send,
    RefreshCw,
    Copy,
    Key,
} from 'lucide-react';

const TableSkeleton = () => (
    <div className="table-container card">
        <table className="table">
            <thead>
                <tr>
                    {['Dispositivo', 'Serial', 'Status', 'Local', 'IP', 'Relés', 'Ações'].map(h => (
                        <th key={h}>{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {[1, 2, 3, 4, 5].map(i => (
                    <tr key={i}>
                        {[1, 2, 3, 4, 5, 6, 7].map(j => (
                            <td key={j}>
                                <div className="skeleton skeleton-text" style={{ width: j === 1 ? '120px' : '60px', height: 14 }} />
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

export default function DevicesPage() {
    const [devices, setDevices] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingDevice, setEditingDevice] = useState(null);
    const [form, setForm] = useState({
        name: '',
        serialNumber: '',
        locationId: '',
        ipAddress: '',
    });
    const [createdToken, setCreatedToken] = useState(null);

    const loadDevices = useCallback(async () => {
        try {
            const [devRes, locRes] = await Promise.all([
                api.get('/devices'),
                api.get('/locations'),
            ]);
            setDevices(devRes.data.data.devices);
            setLocations(locRes.data.data.locations);
        } catch (err) {
            toast.error('Erro ao carregar dispositivos');
        } finally {
            // Delay suave
            setTimeout(() => setLoading(false), 500);
        }
    }, []);

    useEffect(() => {
        loadDevices();

        const handler = (e) => {
            const { deviceId, status } = e.detail;
            setDevices((prev) =>
                prev.map((d) => (d._id === deviceId ? { ...d, status } : d))
            );
        };
        window.addEventListener('device-status-change', handler);
        return () => window.removeEventListener('device-status-change', handler);
    }, [loadDevices]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const openCreateModal = () => {
        setEditingDevice(null);
        setCreatedToken(null);
        setForm({ name: '', serialNumber: '', locationId: '', ipAddress: '' });
        setShowModal(true);
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Token copiado! Cole na configuração do dispositivo.');
    };

    const copyDeviceToken = async (deviceId) => {
        try {
            const res = await api.get(`/devices/${deviceId}`);
            const token = res.data?.data?.device?.authToken;
            if (token) copyToClipboard(token);
            else toast.error('Token não disponível.');
        } catch (err) {
            toast.error('Erro ao obter token');
        }
    };

    const regenerateToken = async (deviceId) => {
        try {
            const res = await api.post(`/devices/${deviceId}/regenerate-token`);
            const token = res.data?.data?.authToken;
            if (token) {
                copyToClipboard(token);
                toast.success('Token regenerado e copiado. Atualize a configuração do dispositivo.');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Erro ao regenerar token');
        }
    };

    const openEditModal = (device) => {
        setEditingDevice(device);
        setForm({
            name: device.name,
            serialNumber: device.serialNumber,
            locationId: device.locationId?._id || '',
            ipAddress: device.ipAddress || '',
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingDevice) {
                await api.put(`/devices/${editingDevice._id}`, form);
                toast.success('Dispositivo atualizado!');
                setShowModal(false);
            } else {
                const res = await api.post('/devices', form);
                const token = res.data?.data?.authToken;
                if (token) setCreatedToken(token);
                else {
                    toast.success('Dispositivo registrado!');
                    setShowModal(false);
                }
            }
            loadDevices();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Erro ao salvar dispositivo');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Tem certeza que deseja remover este dispositivo?')) return;
        try {
            await api.delete(`/devices/${id}`);
            toast.success('Dispositivo removido!');
            loadDevices();
        } catch (err) {
            toast.error('Erro ao remover dispositivo');
        }
    };

    const handleReboot = async (device) => {
        if (device.status !== 'online') {
            return toast.error('Dispositivo offline!');
        }
        if (!confirm(`Deseja realmente reiniciar o dispositivo ${device.name}?`)) return;

        try {
            await api.post(`/devices/${device._id}/command`, {
                command: 'reboot',
            });
            toast.success('Comando de reinicialização enviado!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Erro ao enviar comando');
        }
    };

    if (loading) {
        return (
            <div>
                <div className="page-header">
                    <div className="skeleton skeleton-text" style={{ width: 200, height: 32 }} />
                    <div className="skeleton" style={{ width: 150, height: 44, borderRadius: 12 }} />
                </div>
                <TableSkeleton />
            </div>
        );
    }

    return (
        <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dispositivos</h1>
                    <p className="page-subtitle">{devices.length} dispositivos registrados</p>
                </div>
                <button className="btn btn-primary" onClick={openCreateModal}>
                    <Plus size={18} />
                    Novo Dispositivo
                </button>
            </div>

            {devices.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <Cpu />
                        <h3>Nenhum dispositivo registrado</h3>
                        <p>Registre seu primeiro dispositivo para começar</p>
                        <button
                            className="btn btn-primary"
                            style={{ marginTop: 16 }}
                            onClick={openCreateModal}
                        >
                            <Plus size={18} />
                            Registrar Dispositivo
                        </button>
                    </div>
                </div>
            ) : (
                <div className="table-container card">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Dispositivo</th>
                                <th>Serial</th>
                                <th>Status</th>
                                <th>Local</th>
                                <th>IP Address</th>
                                <th>Relés</th>
                                <th style={{ textAlign: 'right' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {devices.map((device) => (
                                <tr key={device._id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div className="relay-icon" style={{ width: 32, height: 32, background: 'rgba(99, 102, 241, 0.1)' }}>
                                                <Cpu size={16} />
                                            </div>
                                            <span style={{ fontWeight: 600 }}>{device.name}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {device.serialNumber}
                                        </code>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${device.status}`}>
                                            <span className="status-dot" />
                                            {device.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                                            <MapPin size={12} />
                                            {device.locationId?.name || 'Sem local'}
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            {device.ipAddress || '-'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="status-badge online" style={{ fontSize: '0.7rem' }}>
                                            <ToggleLeft size={12} />
                                            {device.relays?.length || 0}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                            <button
                                                className={`btn btn-icon btn-secondary btn-sm ${device.status !== 'online' ? 'disabled' : ''}`}
                                                onClick={() => handleReboot(device)}
                                                title="Reiniciar Dispositivo"
                                            >
                                                <RefreshCw size={14} />
                                            </button>
                                            <button
                                                className="btn btn-icon btn-secondary btn-sm"
                                                onClick={() => openEditModal(device)}
                                                title="Editar"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                className="btn btn-icon btn-danger btn-sm"
                                                onClick={() => handleDelete(device._id)}
                                                title="Remover"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingDevice ? 'Editar Dispositivo' : 'Novo Dispositivo'}</h2>
                            <button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Nome do Dispositivo</label>
                                    <input
                                        type="text"
                                        name="name"
                                        className="form-input"
                                        placeholder="Ex: RPI-Escritório-01"
                                        value={form.name}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Número Serial</label>
                                    <input
                                        type="text"
                                        name="serialNumber"
                                        className="form-input"
                                        placeholder="Deixe vazio para gerar automaticamente"
                                        value={form.serialNumber}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Local</label>
                                    <select
                                        name="locationId"
                                        className="form-select"
                                        value={form.locationId}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">Selecione um local</option>
                                        {locations.map((loc) => (
                                            <option key={loc._id} value={loc._id}>
                                                {loc.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">IP Address (opcional)</label>
                                    <input
                                        type="text"
                                        name="ipAddress"
                                        className="form-input"
                                        placeholder="Ex: 192.168.1.100"
                                        value={form.ipAddress}
                                        onChange={handleChange}
                                    />
                                </div>

                                {createdToken && (
                                    <div className="form-group" style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 8, marginTop: 8 }}>
                                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Key size={16} />
                                            Token do dispositivo (copie agora)
                                        </label>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                            <code style={{ fontSize: 11, wordBreak: 'break-all', flex: 1, minWidth: 0 }}>{createdToken}</code>
                                            <button type="button" className="btn btn-primary btn-sm" onClick={() => copyToClipboard(createdToken)}>
                                                <Copy size={14} />
                                                Copiar
                                            </button>
                                        </div>
                                        <p style={{ fontSize: 11, opacity: 0.8, marginTop: 6 }}>ZACESS_AUTH_TOKEN=cole_aqui_no_.env</p>
                                    </div>
                                )}

                                {editingDevice && (
                                    <div className="form-group" style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 8, marginTop: 8 }}>
                                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Key size={16} />
                                            Token do dispositivo
                                        </label>
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => copyDeviceToken(editingDevice._id)}>
                                                <Copy size={14} />
                                                Copiar token
                                            </button>
                                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => regenerateToken(editingDevice._id)}>
                                                <RefreshCw size={14} />
                                                Regenerar token
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => { setShowModal(false); setCreatedToken(null); }}
                                >
                                    {createdToken ? 'Fechar' : 'Cancelar'}
                                </button>
                                {!createdToken && (
                                    <button type="submit" className="btn btn-primary">
                                        <Send size={16} />
                                        {editingDevice ? 'Atualizar' : 'Registrar'}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

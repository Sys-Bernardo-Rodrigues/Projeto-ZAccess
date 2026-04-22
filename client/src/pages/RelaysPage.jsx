import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
import {
    Plus,
    ToggleLeft,
    DoorOpen,
    Zap,
    Lightbulb,
    Lock,
    Settings,
    Trash2,
    Edit,
    X,
    Send,
    Power,
    QrCode,
    Copy,
} from 'lucide-react';

const typeIcons = {
    door: DoorOpen,
    gate: DoorOpen,
    light: Lightbulb,
    lock: Lock,
    automation: Zap,
    other: Settings,
};

const typeLabels = {
    door: 'Porta',
    gate: 'Portão',
    light: 'Luz',
    lock: 'Fechadura',
    automation: 'Automação',
    other: 'Outro',
};

export default function RelaysPage() {
    const [relays, setRelays] = useState([]);
    const [locations, setLocations] = useState([]);
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingRelay, setEditingRelay] = useState(null);
    const [showQrModal, setShowQrModal] = useState(false);
    const [qrImage, setQrImage] = useState('');
    const [qrLink, setQrLink] = useState('');
    const [qrRelayName, setQrRelayName] = useState('');
    const [qrLoadingId, setQrLoadingId] = useState(null);
    const [form, setForm] = useState({
        name: '',
        type: 'automation',
        gpioPin: '',
        channel: '',
        mode: 'pulse',
        pulseDuration: 1000,
        locationId: '',
        deviceId: '',
        allowResidentInvitation: false,
    });

    const devicesForLocation = form.locationId
        ? devices.filter((d) => String(d.locationId?._id || d.locationId) === String(form.locationId))
        : devices;

    const loadRelays = useCallback(async () => {
        try {
            const [relaysRes, devicesRes, locationsRes] = await Promise.all([
                api.get('/relays'),
                api.get('/devices'),
                api.get('/locations'),
            ]);
            setRelays(relaysRes.data?.data?.relays ?? relaysRes.data?.relays ?? []);
            setDevices(devicesRes.data?.data?.devices ?? devicesRes.data?.devices ?? []);
            setLocations(locationsRes.data?.data?.locations ?? locationsRes.data?.locations ?? []);
        } catch (err) {
            toast.error('Erro ao carregar relés');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRelays();

        const handler = (e) => {
            const { relayId, state } = e.detail;
            setRelays((prev) =>
                prev.map((r) => (r._id === relayId ? { ...r, state } : r))
            );
        };
        window.addEventListener('relay-state-change', handler);
        return () => window.removeEventListener('relay-state-change', handler);
    }, [loadRelays]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (name === 'locationId') {
            setForm((prev) => ({
                ...prev,
                locationId: value,
                deviceId: '',
            }));
            return;
        }

        setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleToggle = async (relay) => {
        if (relay.deviceId?.status !== 'online') {
            toast.error('Dispositivo está offline');
            return;
        }
        setToggling(relay._id);
        try {
            const res = await api.post(`/relays/${relay._id}/toggle`);
            toast.success(res.data.message);
            setRelays((prev) =>
                prev.map((r) =>
                    r._id === relay._id
                        ? { ...r, state: res.data.data.newState }
                        : r
                )
            );
        } catch (err) {
            toast.error(err.response?.data?.message || 'Erro ao acionar relé');
        } finally {
            setToggling(null);
        }
    };

    const openCreateModal = () => {
        setEditingRelay(null);
        setForm({
            name: '',
            type: 'automation',
            gpioPin: '',
            channel: '',
            mode: 'pulse',
            pulseDuration: 1000,
            locationId: '',
            deviceId: '',
            allowResidentInvitation: false,
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...form,
                gpioPin: parseInt(form.gpioPin),
                channel: parseInt(form.channel),
                pulseDuration: parseInt(form.pulseDuration),
            };

            if (editingRelay) {
                await api.put(`/relays/${editingRelay._id}`, payload);
                toast.success('Relé atualizado!');
            } else {
                await api.post('/relays', payload);
                toast.success('Relé criado!');
            }
            setShowModal(false);
            loadRelays();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Erro ao salvar relé');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Tem certeza que deseja remover este relé?')) return;
        try {
            await api.delete(`/relays/${id}`);
            toast.success('Relé removido!');
            loadRelays();
        } catch (err) {
            toast.error('Erro ao remover relé');
        }
    };

    const handleGenerateQr = async (relay) => {
        setQrLoadingId(relay._id);
        try {
            const res = await api.get(`/relays/${relay._id}/access-qr`);
            const publicPath = res.data?.data?.publicPath;
            if (!publicPath) {
                toast.error('Não foi possível gerar o QR Code.');
                return;
            }

            const relayQrLink = `${window.location.origin}${publicPath}`;
            const image = await QRCode.toDataURL(relayQrLink, {
                width: 320,
                margin: 2,
            });

            setQrLink(relayQrLink);
            setQrImage(image);
            setQrRelayName(relay.name);
            setShowQrModal(true);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Erro ao gerar QR Code');
        } finally {
            setQrLoadingId(null);
        }
    };

    const copyQrLink = async () => {
        try {
            await navigator.clipboard.writeText(qrLink);
            toast.success('Link do QR copiado!');
        } catch (error) {
            toast.error('Não foi possível copiar o link.');
        }
    };

    if (loading) {
        return (
            <div className="loading-spinner">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Relés & Automações</h1>
                    <p className="page-subtitle">{relays.length} relés configurados</p>
                </div>
                <button className="btn btn-primary" onClick={openCreateModal}>
                    <Plus size={18} />
                    Novo Relé
                </button>
            </div>

            {relays.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <ToggleLeft />
                        <h3>Nenhum relé configurado</h3>
                        <p>Configure relés para controlar portas e automações</p>
                        <button
                            className="btn btn-primary"
                            style={{ marginTop: 16 }}
                            onClick={openCreateModal}
                        >
                            <Plus size={18} />
                            Configurar Relé
                        </button>
                    </div>
                </div>
            ) : (
                <div className="table-container card">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Relé / Automação</th>
                                <th>Tipo</th>
                                <th>Canal/GPIO</th>
                                <th>Status</th>
                                <th>Dispositivo</th>
                                <th>Configuração</th>
                                <th style={{ textAlign: 'right' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {relays.map((relay) => {
                                const TypeIcon = typeIcons[relay.type] || Settings;
                                const isOnline = relay.deviceId?.status === 'online';
                                const isOpen = relay.state === 'open';

                                return (
                                    <tr key={relay._id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div
                                                    className="relay-icon"
                                                    style={{
                                                        width: 32,
                                                        height: 32,
                                                        background: isOpen ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.1)',
                                                        color: isOpen ? 'var(--accent-success)' : 'var(--accent-primary-light)'
                                                    }}
                                                >
                                                    <TypeIcon size={16} />
                                                </div>
                                                <span style={{ fontWeight: 600 }}>{relay.name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                {typeLabels[relay.type]}
                                            </span>
                                        </td>
                                        <td>
                                            <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                CH{relay.channel} · GPIO{relay.gpioPin}
                                            </code>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${isOpen ? 'online' : 'offline'}`} style={{ minWidth: 60, justifyContent: 'center' }}>
                                                {isOpen ? 'ON' : 'OFF'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '0.85rem' }}>
                                                <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                                                    {relay.deviceId?.name || 'Sem dispositivo'}
                                                </div>
                                                <div style={{
                                                    fontSize: '0.7rem',
                                                    color: isOnline ? 'var(--accent-success)' : 'var(--accent-danger)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 4
                                                }}>
                                                    <span className="status-dot" style={{ width: 6, height: 6, animation: isOnline ? undefined : 'none' }} />
                                                    {isOnline ? 'Online' : 'Offline'}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {relay.mode} ({relay.pulseDuration}ms)
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                <button
                                                    className={`btn btn-sm ${isOpen ? 'btn-danger' : 'btn-success'}`}
                                                    onClick={() => handleToggle(relay)}
                                                    disabled={!isOnline || toggling === relay._id}
                                                    style={{ padding: '6px 12px' }}
                                                >
                                                    {toggling === relay._id ? (
                                                        <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                                                    ) : (
                                                        <>
                                                            <Power size={14} />
                                                            {isOpen ? 'Desligar' : 'Ligar'}
                                                        </>
                                                    )}
                                                </button>
                                                <button
                                                    className="btn btn-icon btn-secondary btn-sm"
                                                    onClick={() => {
                                                        const deviceId = relay.deviceId?._id || relay.deviceId;
                                                        const locationId = relay.deviceId?.locationId?._id || relay.deviceId?.locationId || '';
                                                        setEditingRelay(relay);
                                                        setForm({
                                                            name: relay.name,
                                                            type: relay.type,
                                                            gpioPin: relay.gpioPin.toString(),
                                                            channel: relay.channel.toString(),
                                                            mode: relay.mode,
                                                            pulseDuration: relay.pulseDuration,
                                                            locationId: locationId || '',
                                                            deviceId: deviceId || '',
                                                            allowResidentInvitation: Boolean(relay.allowResidentInvitation),
                                                        });
                                                        setShowModal(true);
                                                    }}
                                                >
                                                    <Edit size={14} />
                                                </button>
                                                <button
                                                    className="btn btn-icon btn-secondary btn-sm"
                                                    onClick={() => handleGenerateQr(relay)}
                                                    title="Gerar QR de acesso"
                                                >
                                                    {qrLoadingId === relay._id ? (
                                                        <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                                                    ) : (
                                                        <QrCode size={14} />
                                                    )}
                                                </button>
                                                <button
                                                    className="btn btn-icon btn-danger btn-sm"
                                                    onClick={() => handleDelete(relay._id)}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingRelay ? 'Editar Relé' : 'Novo Relé'}</h2>
                            <button
                                className="btn btn-icon btn-secondary"
                                onClick={() => setShowModal(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Nome</label>
                                    <input
                                        type="text"
                                        name="name"
                                        className="form-input"
                                        placeholder="Ex: Porta Principal"
                                        value={form.name}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div className="form-group">
                                        <label className="form-label">Tipo</label>
                                        <select
                                            name="type"
                                            className="form-select"
                                            value={form.type}
                                            onChange={handleChange}
                                        >
                                            {Object.entries(typeLabels).map(([key, label]) => (
                                                <option key={key} value={key}>
                                                    {label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Modo</label>
                                        <select
                                            name="mode"
                                            className="form-select"
                                            value={form.mode}
                                            onChange={handleChange}
                                        >
                                            <option value="pulse">Pulso</option>
                                            <option value="toggle">Toggle</option>
                                            <option value="hold">Segurar</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div className="form-group">
                                        <label className="form-label">Pino GPIO (BCM)</label>
                                        <input
                                            type="number"
                                            name="gpioPin"
                                            className="form-input"
                                            placeholder="Ex: 5, 6, 13 ou 19"
                                            value={form.gpioPin}
                                            onChange={handleChange}
                                            required
                                            min="0"
                                            max="40"
                                        />
                                        <small className="form-hint">Ex.: BCM 5, 6, 13, 19 para módulo 4 canais</small>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Canal (1–4, módulo 4 canais)</label>
                                        <input
                                            type="number"
                                            name="channel"
                                            className="form-input"
                                            placeholder="1 a 4"
                                            value={form.channel}
                                            onChange={handleChange}
                                            required
                                            min="1"
                                            max="4"
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Duração do Pulso (ms)</label>
                                    <input
                                        type="number"
                                        name="pulseDuration"
                                        className="form-input"
                                        value={form.pulseDuration}
                                        onChange={handleChange}
                                        min="100"
                                        max="30000"
                                    />
                                </div>

                                <div className="form-group">
                                    <label
                                        className="form-label"
                                        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                                    >
                                        <input
                                            type="checkbox"
                                            name="allowResidentInvitation"
                                            checked={form.allowResidentInvitation}
                                            onChange={handleChange}
                                        />
                                        Permitir morador fazer convite
                                    </label>
                                    <small className="form-hint">
                                        Quando ativo, moradores poderão criar convites deste relé no app.
                                    </small>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div className="form-group">
                                        <label className="form-label">Local</label>
                                        <select
                                            name="locationId"
                                            className="form-select"
                                            value={form.locationId}
                                            onChange={handleChange}
                                        >
                                            <option value="">Meu local</option>
                                            {locations.map((loc) => (
                                                <option key={loc._id} value={loc._id}>
                                                    {loc.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Dispositivo</label>
                                        <select
                                            name="deviceId"
                                            className="form-select"
                                            value={form.deviceId}
                                            onChange={handleChange}
                                            required
                                        >
                                            <option value="">Selecione um dispositivo</option>
                                            {devicesForLocation.map((dev) => (
                                                <option key={dev._id} value={dev._id}>
                                                    {dev.name} ({dev.serialNumber})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    <Send size={16} />
                                    {editingRelay ? 'Atualizar' : 'Criar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showQrModal && (
                <div className="modal-overlay" onClick={() => setShowQrModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
                        <div className="modal-header">
                            <h2>QR de acesso - {qrRelayName}</h2>
                            <button
                                className="btn btn-icon btn-secondary"
                                onClick={() => setShowQrModal(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="modal-body" style={{ textAlign: 'center' }}>
                            {qrImage ? (
                                <img
                                    src={qrImage}
                                    alt={`QR de acesso do relé ${qrRelayName}`}
                                    style={{ width: 280, maxWidth: '100%', borderRadius: 12, border: '1px solid var(--border-color)' }}
                                />
                            ) : null}
                            <p style={{ marginTop: 16, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Este QR abre um link público em <strong>/relay-qr/:token</strong> e aciona a porta diretamente.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowQrModal(false)}>
                                Fechar
                            </button>
                            <button type="button" className="btn btn-primary" onClick={copyQrLink}>
                                <Copy size={16} />
                                Copiar Link
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

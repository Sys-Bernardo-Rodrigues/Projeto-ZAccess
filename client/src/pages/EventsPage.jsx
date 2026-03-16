import { useEffect, useState } from 'react';
import api from '../api/axios';
import { Clock, Activity, AlertTriangle, Plus, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EventsPage() {
    const [events, setEvents] = useState([]);
    const [locations, setLocations] = useState([]);
    const [devices, setDevices] = useState([]);
    const [inputs, setInputs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [form, setForm] = useState({
        name: '',
        locationId: '',
        deviceId: '',
        inputId: '',
        type: 'door_open_duration',
        thresholdSeconds: 60,
        enabled: true,
    });

    const devicesForLocation = form.locationId
        ? devices.filter((d) => String(d.locationId?._id || d.locationId) === String(form.locationId))
        : [];

    const inputsForDevice = form.deviceId
        ? inputs.filter((i) => String(i.deviceId?._id || i.deviceId) === String(form.deviceId))
        : [];

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [locationsRes, devicesRes, inputsRes] = await Promise.all([
                api.get('/locations'),
                api.get('/devices'),
                api.get('/inputs'),
                // placeholder: futura API /events
            ]);
            setLocations(locationsRes.data?.data?.locations ?? locationsRes.data?.locations ?? []);
            setDevices(devicesRes.data?.data?.devices ?? devicesRes.data?.devices ?? []);
            setInputs(inputsRes.data?.data?.inputs ?? []);
            setEvents([]); // até existir backend de eventos
        } catch (err) {
            toast.error('Erro ao carregar dados de eventos');
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingEvent(null);
        setForm({
            name: '',
            locationId: '',
            deviceId: '',
            inputId: '',
            type: 'door_open_duration',
            thresholdSeconds: 60,
            enabled: true,
        });
        setShowModal(true);
    };

    const openEditModal = (eventRule) => {
        setEditingEvent(eventRule);
        const input = eventRule.inputId;
        const deviceId = input?.deviceId?._id || input?.deviceId || '';
        const locationId = input?.deviceId?.locationId?._id || input?.deviceId?.locationId || '';
        setForm({
            name: eventRule.name,
            locationId,
            deviceId,
            inputId: eventRule.inputId?._id || eventRule.inputId,
            type: eventRule.type,
            thresholdSeconds: eventRule.thresholdSeconds,
            enabled: eventRule.enabled,
        });
        setShowModal(true);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm({
            ...form,
            [name]: type === 'checkbox' ? checked : value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        toast.success('Configuração de evento salva (mock). Backend ainda não implementado.');
        setShowModal(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Remover esta configuração de evento?')) return;
        toast.success('Evento removido (mock). Backend ainda não implementado.');
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
                    <h1 className="page-title">Eventos de Sensores</h1>
                    <p className="page-subtitle">
                        Crie regras como &quot;se a porta ficar aberta por 60s, gerar alerta&quot;.
                    </p>
                </div>
                <button className="btn btn-primary" onClick={openCreateModal}>
                    <Plus size={18} />
                    Novo Evento
                </button>
            </div>

            {events.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <AlertTriangle />
                        <h3>Nenhum evento configurado</h3>
                        <p>
                            Exemplo: &quot;Se o sensor da porta principal ficar ABERTO por 60 segundos, mostrar alerta de
                            porta aberta&quot;.
                        </p>
                        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openCreateModal}>
                            <Plus size={18} />
                            Criar primeiro evento
                        </button>
                    </div>
                </div>
            ) : (
                <div className="table-container card">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Sensor</th>
                                <th>Condição</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.map((ev) => (
                                <tr key={ev._id}>
                                    <td>{ev.name}</td>
                                    <td>{ev.inputId?.name || '---'}</td>
                                    <td>
                                        <span className="badge">
                                            <Clock size={14} style={{ marginRight: 6 }} />
                                            Aberto por {ev.thresholdSeconds}s
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${ev.enabled ? 'online' : 'offline'}`}>
                                            {ev.enabled ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                            <button
                                                className="btn btn-icon btn-secondary btn-sm"
                                                onClick={() => openEditModal(ev)}
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                className="btn btn-icon btn-danger btn-sm"
                                                onClick={() => handleDelete(ev._id)}
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

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingEvent ? 'Editar evento' : 'Novo evento'}</h2>
                            <button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}>
                                <Activity size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Nome do evento</label>
                                    <input
                                        type="text"
                                        name="name"
                                        className="form-input"
                                        placeholder="Ex: Porta principal aberta mais de 60s"
                                        value={form.name}
                                        onChange={handleChange}
                                        required
                                    />
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
                                        >
                                            <option value="">Selecione</option>
                                            {devicesForLocation.map((dev) => (
                                                <option key={dev._id} value={dev._id}>
                                                    {dev.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Sensor</label>
                                    <select
                                        name="inputId"
                                        className="form-select"
                                        value={form.inputId}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">Selecione um sensor</option>
                                        {inputsForDevice.map((inp) => (
                                            <option key={inp._id} value={inp._id}>
                                                {inp.name} ({inp.type})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Tipo de evento</label>
                                    <select
                                        name="type"
                                        className="form-select"
                                        value={form.type}
                                        onChange={handleChange}
                                    >
                                        <option value="door_open_duration">
                                            Porta aberta por mais de X segundos
                                        </option>
                                        {/* Futuramente: outros tipos */}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Tempo (segundos)</label>
                                    <input
                                        type="number"
                                        name="thresholdSeconds"
                                        className="form-input"
                                        min="5"
                                        max="3600"
                                        value={form.thresholdSeconds}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <input
                                        type="checkbox"
                                        id="enabled"
                                        name="enabled"
                                        checked={form.enabled}
                                        onChange={handleChange}
                                    />
                                    <label htmlFor="enabled" className="form-label" style={{ marginBottom: 0 }}>
                                        Evento ativo
                                    </label>
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
                                    <Plus size={16} />
                                    Salvar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}


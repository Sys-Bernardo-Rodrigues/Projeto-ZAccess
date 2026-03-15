import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
    Plus,
    Calendar,
    Clock,
    Trash2,
    Edit,
    X,
    Send,
    ToggleLeft,
    Power,
    CheckCircle2,
    Circle,
} from 'lucide-react';

const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const actionLabels = {
    open: 'Ligar',
    close: 'Desligar',
    pulse: 'Pulsar (Abre/Fecha)',
};

export default function SchedulesPage() {
    const [schedules, setSchedules] = useState([]);
    const [locations, setLocations] = useState([]);
    const [devices, setDevices] = useState([]);
    const [relays, setRelays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [form, setForm] = useState({
        name: '',
        locationId: '',
        deviceId: '',
        relayIds: [],
        action: 'pulse',
        time: '',
        daysOfWeek: [1, 2, 3, 4, 5],
        enabled: true,
    });

    // Dispositivos filtrados pelo local selecionado
    const devicesForLocation = form.locationId
        ? devices.filter((d) => String(d.locationId?._id || d.locationId) === String(form.locationId))
        : [];

    // Relés filtrados pelo dispositivo selecionado
    const relaysForDevice = form.deviceId
        ? relays.filter((r) => String(r.deviceId?._id || r.deviceId) === String(form.deviceId))
        : [];

    const loadData = useCallback(async () => {
        try {
            const [schedulesRes, locationsRes, devicesRes, relaysRes] = await Promise.all([
                api.get('/schedules'),
                api.get('/locations'),
                api.get('/devices'),
                api.get('/relays'),
            ]);
            setSchedules(schedulesRes.data.data.schedules);
            setLocations(locationsRes.data?.data?.locations ?? locationsRes.data?.locations ?? []);
            setDevices(devicesRes.data?.data?.devices ?? devicesRes.data?.devices ?? []);
            setRelays(relaysRes.data.data.relays);
        } catch (err) {
            toast.error('Erro ao carregar agendamentos');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm({
            ...form,
            [name]: type === 'checkbox' ? checked : value,
        });
    };

    const toggleDay = (day) => {
        const newDays = form.daysOfWeek.includes(day)
            ? form.daysOfWeek.filter((d) => d !== day)
            : [...form.daysOfWeek, day];
        setForm({ ...form, daysOfWeek: newDays });
    };

    const openCreateModal = () => {
        setEditingSchedule(null);
        setForm({
            name: '',
            locationId: '',
            deviceId: '',
            relayIds: [],
            action: 'pulse',
            time: '',
            daysOfWeek: [1, 2, 3, 4, 5],
            enabled: true,
        });
        setShowModal(true);
    };

    const openEditModal = (schedule) => {
        setEditingSchedule(schedule);
        const ids = (schedule.relayIds && schedule.relayIds.length)
            ? schedule.relayIds.map((r) => r._id || r)
            : (schedule.relayId ? [schedule.relayId._id || schedule.relayId] : []);
        const firstRelay = schedule.relayIds?.[0] || schedule.relayId;
        const did = firstRelay?.deviceId?._id || firstRelay?.deviceId;
        const locId = firstRelay?.deviceId?.locationId?._id || firstRelay?.deviceId?.locationId;
        setForm({
            name: schedule.name,
            locationId: locId || '',
            deviceId: did || '',
            relayIds: ids,
            action: schedule.action,
            time: schedule.time,
            daysOfWeek: schedule.daysOfWeek,
            enabled: schedule.enabled,
        });
        setShowModal(true);
    };

    const handleLocationChange = (e) => {
        const locationId = e.target.value;
        setForm((prev) => ({
            ...prev,
            locationId,
            deviceId: '',
            relayIds: [],
        }));
    };

    const handleDeviceChange = (e) => {
        const deviceId = e.target.value;
        setForm((prev) => ({
            ...prev,
            deviceId,
            relayIds: [],
        }));
    };

    const toggleRelayCheck = (relayId) => {
        setForm((prev) => {
            const id = String(relayId);
            const current = prev.relayIds.map(String);
            const next = current.includes(id)
                ? current.filter((r) => r !== id)
                : [...current, id];
            return { ...prev, relayIds: next };
        });
    };

    const toggleAllRelays = (checked) => {
        setForm((prev) => ({
            ...prev,
            relayIds: checked ? relaysForDevice.map((r) => r._id) : [],
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { locationId, deviceId, ...payload } = form;
        if (!payload.relayIds || payload.relayIds.length === 0) {
            toast.error('Selecione ao menos um relé.');
            return;
        }
        try {
            if (editingSchedule) {
                await api.put(`/schedules/${editingSchedule._id}`, payload);
                toast.success('Agendamento atualizado!');
            } else {
                await api.post('/schedules', payload);
                toast.success('Agendamento criado!');
            }
            setShowModal(false);
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Erro ao salvar agendamento');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Deseja remover este agendamento?')) return;
        try {
            await api.delete(`/schedules/${id}`);
            toast.success('Agendamento removido!');
            loadData();
        } catch (err) {
            toast.error('Erro ao remover agendamento');
        }
    };

    const toggleEnabled = async (schedule) => {
        try {
            await api.put(`/schedules/${schedule._id}`, { enabled: !schedule.enabled });
            loadData();
            toast.success(schedule.enabled ? 'Agendamento desativado' : 'Agendamento ativado');
        } catch (err) {
            toast.error('Erro ao alterar status');
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
                    <h1 className="page-title">Agendamentos</h1>
                    <p className="page-subtitle">{schedules.length} tarefas automáticas configuradas</p>
                </div>
                <button className="btn btn-primary" onClick={openCreateModal}>
                    <Plus size={18} />
                    Novo Agendamento
                </button>
            </div>

            {schedules.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <Calendar size={48} />
                        <h3>Nenhum agendamento ativo</h3>
                        <p>Crie regras para acionar portas e luzes automaticamente em horários específicos.</p>
                        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openCreateModal}>
                            <Plus size={18} />
                            Criar Primeiro Agendamento
                        </button>
                    </div>
                </div>
            ) : (
                <div className="table-container card">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Nome / Tarefa</th>
                                <th>Horário</th>
                                <th>Dias</th>
                                <th>Relé / Local</th>
                                <th>Ação</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {schedules.map((s) => (
                                <tr key={s._id} style={{ opacity: s.enabled ? 1 : 0.6 }}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div className="relay-icon" style={{ width: 32, height: 32 }}>
                                                <Clock size={16} />
                                            </div>
                                            <span style={{ fontWeight: 600 }}>{s.name}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="status-badge online" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary-light)' }}>
                                            {s.time}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            {dayNames.map((day, idx) => (
                                                <span
                                                    key={idx}
                                                    style={{
                                                        fontSize: '0.65rem',
                                                        padding: '2px 4px',
                                                        borderRadius: 4,
                                                        background: s.daysOfWeek.includes(idx) ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                                                        color: s.daysOfWeek.includes(idx) ? 'white' : 'var(--text-muted)'
                                                    }}
                                                >
                                                    {day}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '0.85rem' }}>
                                            {(s.relayIds && s.relayIds.length ? s.relayIds : (s.relayId ? [s.relayId] : [])).map((r, i) => (
                                                <div key={r._id || i} style={{ marginBottom: i > 0 ? 4 : 0 }}>
                                                    <span style={{ fontWeight: 500 }}>{r.name}</span>
                                                    {r.channel != null && <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>— Canal {r.channel}</span>}
                                                </div>
                                            ))}
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                {((s.relayIds && s.relayIds[0]) || s.relayId)?.deviceId?.name || '---'}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ fontSize: '0.85rem' }}>{actionLabels[s.action]}</span>
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => toggleEnabled(s)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: s.enabled ? 'var(--accent-success)' : 'var(--text-muted)' }}
                                            title={s.enabled ? 'Desativar' : 'Ativar'}
                                        >
                                            {s.enabled ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                                        </button>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                            <button className="btn btn-icon btn-secondary btn-sm" onClick={() => openEditModal(s)}>
                                                <Edit size={14} />
                                            </button>
                                            <button className="btn btn-icon btn-danger btn-sm" onClick={() => handleDelete(s._id)}>
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
                            <h2>{editingSchedule ? 'Editar Agendamento' : 'Novo Agendamento'}</h2>
                            <button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Nome da Regra</label>
                                    <input
                                        type="text"
                                        name="name"
                                        className="form-input"
                                        placeholder="Ex: Abrir Recepção"
                                        value={form.name}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Local</label>
                                    <select
                                        name="locationId"
                                        className="form-select"
                                        value={form.locationId}
                                        onChange={handleLocationChange}
                                        required
                                    >
                                        <option value="">Selecione o local</option>
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
                                        onChange={handleDeviceChange}
                                        required
                                        disabled={!form.locationId}
                                    >
                                        <option value="">
                                            {form.locationId ? 'Selecione o dispositivo' : 'Selecione primeiro um local'}
                                        </option>
                                        {devicesForLocation.map((d) => (
                                            <option key={d._id} value={d._id}>
                                                {d.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Relés a acionar</label>
                                    {!form.deviceId ? (
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            Selecione o local e o dispositivo para listar os relés.
                                        </p>
                                    ) : (
                                        <div style={{ border: '1px solid var(--border-color)', borderRadius: 10, padding: 12, background: 'var(--bg-input)', maxHeight: 200, overflowY: 'auto' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'pointer', fontSize: '0.9rem' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={relaysForDevice.length > 0 && form.relayIds.length === relaysForDevice.length}
                                                    ref={(el) => {
                                                        if (el) el.indeterminate = form.relayIds.length > 0 && form.relayIds.length < relaysForDevice.length;
                                                    }}
                                                    onChange={(e) => toggleAllRelays(e.target.checked)}
                                                />
                                                <span>Marcar todos</span>
                                            </label>
                                            {relaysForDevice.map((r) => (
                                                <label key={r._id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer', fontSize: '0.9rem' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={form.relayIds.some((id) => String(id) === String(r._id))}
                                                        onChange={() => toggleRelayCheck(r._id)}
                                                    />
                                                    <span>{r.name} {r.channel != null ? `— Canal ${r.channel}` : ''}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div className="form-group">
                                        <label className="form-label">Horário (HH:mm)</label>
                                        <input
                                            type="time"
                                            name="time"
                                            className="form-input"
                                            value={form.time}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Ação</label>
                                        <select
                                            name="action"
                                            className="form-select"
                                            value={form.action}
                                            onChange={handleChange}
                                            required
                                        >
                                            {Object.entries(actionLabels).map(([key, label]) => (
                                                <option key={key} value={key}>{label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Dias da Semana</label>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        {dayNames.map((day, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                className={`btn btn-sm ${form.daysOfWeek.includes(idx) ? 'btn-primary' : 'btn-secondary'}`}
                                                style={{ minWidth: 45 }}
                                                onClick={() => toggleDay(idx)}
                                            >
                                                {day}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <input
                                        type="checkbox"
                                        id="enabled"
                                        name="enabled"
                                        checked={form.enabled}
                                        onChange={handleChange}
                                        style={{ width: 18, height: 18 }}
                                    />
                                    <label htmlFor="enabled" className="form-label" style={{ marginBottom: 0 }}>
                                        Agendamento Habilitado
                                    </label>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    <Send size={16} />
                                    {editingSchedule ? 'Atualizar' : 'Criar Tarefa'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

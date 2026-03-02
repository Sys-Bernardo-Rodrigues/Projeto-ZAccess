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
    const [relays, setRelays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [form, setForm] = useState({
        name: '',
        relayId: '',
        action: 'pulse',
        time: '',
        daysOfWeek: [1, 2, 3, 4, 5],
        enabled: true,
    });

    const loadData = useCallback(async () => {
        try {
            const [schedulesRes, relaysRes] = await Promise.all([
                api.get('/schedules'),
                api.get('/relays'),
            ]);
            setSchedules(schedulesRes.data.data.schedules);
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
            relayId: '',
            action: 'pulse',
            time: '',
            daysOfWeek: [1, 2, 3, 4, 5],
            enabled: true,
        });
        setShowModal(true);
    };

    const openEditModal = (schedule) => {
        setEditingSchedule(schedule);
        setForm({
            name: schedule.name,
            relayId: schedule.relayId?._id || '',
            action: schedule.action,
            time: schedule.time,
            daysOfWeek: schedule.daysOfWeek,
            enabled: schedule.enabled,
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingSchedule) {
                await api.put(`/schedules/${editingSchedule._id}`, form);
                toast.success('Agendamento atualizado!');
            } else {
                await api.post('/schedules', form);
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
                                            <div style={{ fontWeight: 500 }}>{s.relayId?.name || '---'}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                {s.relayId?.deviceId?.name || '---'}
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
                                    <label className="form-label">Relé Alvo</label>
                                    <select
                                        name="relayId"
                                        className="form-select"
                                        value={form.relayId}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">Selecione um relé</option>
                                        {relays.map((r) => (
                                            <option key={r._id} value={r._id}>
                                                {r.name} ({r.deviceId?.name})
                                            </option>
                                        ))}
                                    </select>
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

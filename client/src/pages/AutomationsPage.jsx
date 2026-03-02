import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
    Plus,
    Zap,
    Trash2,
    Edit,
    X,
    Send,
    Activity,
    ToggleLeft,
    Power,
    Timer,
} from 'lucide-react';

export default function AutomationsPage() {
    const [automations, setAutomations] = useState([]);
    const [inputs, setInputs] = useState([]);
    const [relays, setRelays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingAuto, setEditingAuto] = useState(null);
    const [form, setForm] = useState({
        name: '',
        enabled: true,
        trigger: {
            inputId: '',
            condition: 'active',
        },
        action: {
            relayId: '',
            command: 'pulse',
            duration: 1000,
        },
    });

    const loadData = useCallback(async () => {
        try {
            const [autoRes, inputsRes, relaysRes] = await Promise.all([
                api.get('/automations'),
                api.get('/inputs'),
                api.get('/relays'),
            ]);
            setAutomations(autoRes.data.data.automations);
            setInputs(inputsRes.data.data.inputs);
            setRelays(relaysRes.data.data.relays);
        } catch (err) {
            toast.error('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const openCreateModal = () => {
        setEditingAuto(null);
        setForm({
            name: '',
            enabled: true,
            trigger: {
                inputId: '',
                condition: 'active',
            },
            action: {
                relayId: '',
                command: 'pulse',
                duration: 1000,
            },
        });
        setShowModal(true);
    };

    const openEditModal = (auto) => {
        setEditingAuto(auto);
        setForm({
            name: auto.name,
            enabled: auto.enabled,
            trigger: {
                inputId: auto.trigger.inputId?._id || auto.trigger.inputId,
                condition: auto.trigger.condition,
            },
            action: {
                relayId: auto.action.relayId?._id || auto.action.relayId,
                command: auto.action.command,
                duration: auto.action.duration,
            },
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingAuto) {
                await api.put(`/automations/${editingAuto._id}`, form);
                toast.success('Automação atualizada!');
            } else {
                await api.post('/automations', form);
                toast.success('Automação criada!');
            }
            setShowModal(false);
            loadData();
        } catch (err) {
            toast.error('Erro ao salvar automação');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Excluir esta regra de automação?')) return;
        try {
            await api.delete(`/automations/${id}`);
            toast.success('Automação excluída');
            loadData();
        } catch (err) {
            toast.error('Erro ao excluir');
        }
    };

    const toggleEnabled = async (auto) => {
        try {
            await api.put(`/automations/${auto._id}`, { enabled: !auto.enabled });
            loadData();
        } catch (err) {
            toast.error('Erro ao alterar status');
        }
    };

    if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Regras de Automação</h1>
                    <p className="page-subtitle">Crie comportamentos inteligentes entre sensores e relés</p>
                </div>
                <button className="btn btn-primary" onClick={openCreateModal}>
                    <Plus size={18} />
                    Nova Regra
                </button>
            </div>

            {automations.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <Zap size={48} />
                        <h3>Nenhuma automação configurada</h3>
                        <p>Ex: "Quando o sensor de presença ativar, ligar a luz do corredor"</p>
                        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openCreateModal}>
                            Criar Primeira Regra
                        </button>
                    </div>
                </div>
            ) : (
                <div className="table-container card">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Nome da Regra</th>
                                <th>Gatilho (Trigger)</th>
                                <th>Ação (Action)</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {automations.map((auto) => (
                                <tr key={auto._id}>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{auto.name}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                            {auto.lastRun ? `Última execução: ${new Date(auto.lastRun).toLocaleString()}` : 'Nunca executada'}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                                            <Activity size={14} className="text-primary" />
                                            <span>{auto.trigger.inputId?.name || '---'}</span>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                background: auto.trigger.condition === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                                                color: auto.trigger.condition === 'active' ? 'var(--accent-success)' : 'var(--text-muted)',
                                                padding: '2px 6px',
                                                borderRadius: '4px'
                                            }}>
                                                {auto.trigger.condition === 'active' ? 'ACIONADO' : 'DESLIGADO'}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                                            <Power size={14} className="text-secondary" />
                                            <span>{auto.action.relayId?.name || '---'}</span>
                                            <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                                                ({auto.action.command === 'pulse' ? `PULSO ${auto.action.duration}ms` : auto.action.command.toUpperCase()})
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => toggleEnabled(auto)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: auto.enabled ? 'var(--accent-success)' : 'var(--text-muted)'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {auto.enabled ? <ToggleLeft style={{ transform: 'rotate(180deg)' }} /> : <ToggleLeft />}
                                                <span style={{ fontSize: '0.85rem' }}>{auto.enabled ? 'Ativa' : 'Inativa'}</span>
                                            </div>
                                        </button>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                            <button className="btn btn-icon btn-secondary btn-sm" onClick={() => openEditModal(auto)}>
                                                <Edit size={14} />
                                            </button>
                                            <button className="btn btn-icon btn-danger btn-sm" onClick={() => handleDelete(auto._id)}>
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
                            <h2>{editingAuto ? 'Editar Automação' : 'Nova Automação'}</h2>
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
                                        className="form-input"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        placeholder="Ex: Abrir Portão por Sensor"
                                        required
                                    />
                                </div>

                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                                    <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: '0.9rem' }}>
                                        <Activity size={16} color="var(--accent-primary)" /> GATILHO (QUANDO)
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                        <div className="form-group">
                                            <label className="form-label">Sensor</label>
                                            <select
                                                className="form-select"
                                                value={form.trigger.inputId}
                                                onChange={(e) => setForm({ ...form, trigger: { ...form.trigger, inputId: e.target.value } })}
                                                required
                                            >
                                                <option value="">Selecione...</option>
                                                {inputs.map(i => <option key={i._id} value={i._id}>{i.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Estiver</label>
                                            <select
                                                className="form-select"
                                                value={form.trigger.condition}
                                                onChange={(e) => setForm({ ...form, trigger: { ...form.trigger, condition: e.target.value } })}
                                            >
                                                <option value="active">Acionado (ON)</option>
                                                <option value="inactive">Desligado (OFF)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                                    <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: '0.9rem' }}>
                                        <Power size={16} color="var(--accent-secondary)" /> AÇÃO (ENTÃO)
                                    </h4>
                                    <div className="form-group">
                                        <label className="form-label">Controlar Relé</label>
                                        <select
                                            className="form-select"
                                            value={form.action.relayId}
                                            onChange={(e) => setForm({ ...form, action: { ...form.action, relayId: e.target.value } })}
                                            required
                                        >
                                            <option value="">Selecione...</option>
                                            {relays.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                        <div className="form-group">
                                            <label className="form-label">Ação</label>
                                            <select
                                                className="form-select"
                                                value={form.action.command}
                                                onChange={(e) => setForm({ ...form, action: { ...form.action, command: e.target.value } })}
                                            >
                                                <option value="pulse">Dar Pulso</option>
                                                <option value="on">Ligar</option>
                                                <option value="off">Desligar</option>
                                            </select>
                                        </div>
                                        {form.action.command === 'pulse' && (
                                            <div className="form-group">
                                                <label className="form-label">Duração (ms)</label>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    value={form.action.duration}
                                                    onChange={(e) => setForm({ ...form, action: { ...form.action, duration: parseInt(e.target.value) } })}
                                                    min="100"
                                                    max="5000"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">
                                    <Send size={16} />
                                    {editingAuto ? 'Atualizar Regra' : 'Ativar Regra'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

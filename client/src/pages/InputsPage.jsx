import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
    Plus,
    Activity,
    DoorClosed,
    DoorOpen,
    ShieldAlert,
    Trash2,
    Edit,
    X,
    Send,
    Settings,
    Cpu,
} from 'lucide-react';

const typeIcons = {
    door_sensor: DoorClosed,
    motion: Activity,
    button: Activity,
    emergency: ShieldAlert,
    other: Settings,
};

const typeLabels = {
    door_sensor: 'Sensor de Porta',
    motion: 'Presença/Movimento',
    button: 'Botão/Pulsador',
    emergency: 'Emergência/Pânico',
    other: 'Outro',
};

const stateLabels = {
    active: 'Ativado',
    inactive: 'Inativo',
};

export default function InputsPage() {
    const [inputs, setInputs] = useState([]);
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingInput, setEditingInput] = useState(null);
    const [form, setForm] = useState({
        name: '',
        type: 'door_sensor',
        gpioPin: '',
        activeLow: true,
        deviceId: '',
    });

    const loadData = useCallback(async () => {
        try {
            const [inputsRes, devicesRes] = await Promise.all([
                api.get('/inputs'),
                api.get('/devices'),
            ]);
            setInputs(inputsRes.data.data.inputs);
            setDevices(devicesRes.data.data.devices);
        } catch (err) {
            toast.error('Erro ao carregar sensores');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();

        const handler = (e) => {
            const { inputId, state } = e.detail;
            setInputs((prev) =>
                prev.map((i) => (i._id === inputId ? { ...i, state } : i))
            );
        };
        window.addEventListener('input-state-change', handler);
        return () => window.removeEventListener('input-state-change', handler);
    }, [loadData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm({
            ...form,
            [name]: type === 'checkbox' ? checked : value,
        });
    };

    const openCreateModal = () => {
        setEditingInput(null);
        setForm({
            name: '',
            type: 'door_sensor',
            gpioPin: '',
            activeLow: true,
            deviceId: '',
        });
        setShowModal(true);
    };

    const openEditModal = (input) => {
        setEditingInput(input);
        setForm({
            name: input.name,
            type: input.type,
            gpioPin: input.gpioPin.toString(),
            activeLow: input.activeLow,
            deviceId: input.deviceId?._id || '',
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...form,
                gpioPin: parseInt(form.gpioPin),
            };

            if (editingInput) {
                await api.put(`/inputs/${editingInput._id}`, payload);
                toast.success('Sensor atualizado!');
            } else {
                await api.post('/inputs', payload);
                toast.success('Sensor criado!');
            }
            setShowModal(false);
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Erro ao salvar sensor');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Tem certeza que deseja remover este sensor?')) return;
        try {
            await api.delete(`/inputs/${id}`);
            toast.success('Sensor removido!');
            loadData();
        } catch (err) {
            toast.error('Erro ao remover sensor');
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
                    <h1 className="page-title">Sensores de Entrada</h1>
                    <p className="page-subtitle">{inputs.length} sensores configurados</p>
                </div>
                <button className="btn btn-primary" onClick={openCreateModal}>
                    <Plus size={18} />
                    Novo Sensor
                </button>
            </div>

            {inputs.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <Activity />
                        <h3>Nenhum sensor configurado</h3>
                        <p>Configure sensores para monitorar o estado das portas em tempo real</p>
                        <button
                            className="btn btn-primary"
                            style={{ marginTop: 16 }}
                            onClick={openCreateModal}
                        >
                            <Plus size={18} />
                            Configurar Sensor
                        </button>
                    </div>
                </div>
            ) : (
                <div className="table-container card">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Sensor</th>
                                <th>Tipo</th>
                                <th>GPIO</th>
                                <th>Estado Atual</th>
                                <th>Dispositivo</th>
                                <th style={{ textAlign: 'right' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inputs.map((input) => {
                                const TypeIcon = (input.state === 'active' && input.type === 'door_sensor') ? DoorOpen : (typeIcons[input.type] || Settings);
                                const isOnline = input.deviceId?.status === 'online';
                                const isActive = input.state === 'active';

                                return (
                                    <tr key={input._id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div
                                                    className="relay-icon"
                                                    style={{
                                                        width: 32,
                                                        height: 32,
                                                        background: isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.1)',
                                                        color: isActive ? 'var(--accent-success)' : 'var(--accent-primary-light)'
                                                    }}
                                                >
                                                    <TypeIcon size={16} />
                                                </div>
                                                <span style={{ fontWeight: 600 }}>{input.name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                {typeLabels[input.type]}
                                            </span>
                                        </td>
                                        <td>
                                            <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                GPIO {input.gpioPin}
                                            </code>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${isActive ? 'online' : 'offline'}`} style={{ minWidth: 80, justifyContent: 'center' }}>
                                                {isActive ? (
                                                    input.type === 'door_sensor' ? 'ABERTA' : 'ATIVO'
                                                ) : (
                                                    input.type === 'door_sensor' ? 'FECHADA' : 'INATIVO'
                                                )}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '0.85rem' }}>
                                                <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                                                    {input.deviceId?.name || '---'}
                                                </div>
                                                <div style={{
                                                    fontSize: '0.7rem',
                                                    color: isOnline ? 'var(--accent-success)' : 'var(--accent-danger)'
                                                }}>
                                                    {isOnline ? 'Dispositivo Online' : 'Dispositivo Offline'}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                {input.type === 'emergency' && (
                                                    <button
                                                        className="btn btn-icon btn-secondary btn-sm"
                                                        style={{ color: 'var(--accent-danger)' }}
                                                        title="Simular Emergência"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            console.log('Simulando emergência...');
                                                            window.dispatchEvent(new CustomEvent('notification-alert', {
                                                                detail: {
                                                                    type: 'emergency',
                                                                    title: 'SIMULAÇÃO DE EMERGÊNCIA',
                                                                    message: `Teste de pânico do sensor ${input.name}!`,
                                                                    deviceName: input.deviceId?.name || 'Local',
                                                                    timestamp: new Date()
                                                                }
                                                            }));
                                                            toast.success('Simulação disparada!');
                                                        }}
                                                    >
                                                        <ShieldAlert size={14} />
                                                    </button>
                                                )}
                                                <button
                                                    className="btn btn-icon btn-secondary btn-sm"
                                                    onClick={() => openEditModal(input)}
                                                >
                                                    <Edit size={14} />
                                                </button>
                                                <button
                                                    className="btn btn-icon btn-danger btn-sm"
                                                    onClick={() => handleDelete(input._id)}
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
                            <h2>{editingInput ? 'Editar Sensor' : 'Novo Sensor'}</h2>
                            <button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}>
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
                                        placeholder="Ex: Sensor Portão Garagem"
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
                                        <label className="form-label">Pino GPIO</label>
                                        <input
                                            type="number"
                                            name="gpioPin"
                                            className="form-input"
                                            placeholder="Ex: 27"
                                            value={form.gpioPin}
                                            onChange={handleChange}
                                            required
                                            min="0"
                                            max="40"
                                        />
                                    </div>
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
                                        {devices.map((dev) => (
                                            <option key={dev._id} value={dev._id}>
                                                {dev.name} ({dev.serialNumber})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <input
                                        type="checkbox"
                                        id="activeLow"
                                        name="activeLow"
                                        checked={form.activeLow}
                                        onChange={handleChange}
                                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                                    />
                                    <label htmlFor="activeLow" className="form-label" style={{ marginBottom: 0, cursor: 'pointer' }}>
                                        Lógica Inversa (Active Low / Pull-up)
                                    </label>
                                </div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    * Ative se o sensor fechar contato com o GND quando acionado.
                                </p>
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
                                    {editingInput ? 'Atualizar' : 'Criar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

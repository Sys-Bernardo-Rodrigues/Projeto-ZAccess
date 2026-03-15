import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
    Plus,
    Users,
    Trash2,
    Edit,
    X,
    Send,
    UserCheck,
    UserX,
    Shield,
    UserCircle,
    Eye,
} from 'lucide-react';

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        role: 'operator',
        locationId: '',
        active: true,
    });

    const loadUsers = useCallback(async () => {
        try {
            const [usersRes, locationsRes] = await Promise.all([
                api.get('/users'),
                api.get('/locations'),
            ]);
            setUsers(usersRes.data.data.users);
            setLocations(locationsRes.data?.data?.locations ?? []);
        } catch (err) {
            toast.error('Erro ao carregar usuários');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const openCreateModal = () => {
        setEditingUser(null);
        setForm({
            name: '',
            email: '',
            password: '',
            role: 'operator',
            locationId: '',
            active: true,
        });
        setShowModal(true);
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        setForm({
            name: user.name,
            email: user.email,
            password: '',
            role: user.role,
            locationId: user.locationId?._id || user.locationId || '',
            active: user.active,
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...form };
            if (!payload.locationId) payload.locationId = null;
            if (editingUser) {
                if (!payload.password) delete payload.password;
                await api.put(`/users/${editingUser._id}`, payload);
                toast.success('Usuário atualizado!');
            } else {
                await api.post('/users', payload);
                toast.success('Usuário criado!');
            }
            setShowModal(false);
            loadUsers();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Erro ao salvar usuário');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Deseja realmente excluir este usuário?')) return;
        try {
            await api.delete(`/users/${id}`);
            toast.success('Usuário excluído');
            loadUsers();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Erro ao excluir');
        }
    };

    const getRoleBadge = (role) => {
        switch (role) {
            case 'admin':
                return <span className="badge badge-danger"><Shield size={12} /> Admin</span>;
            case 'operator':
                return <span className="badge badge-primary"><UserCircle size={12} /> Operador</span>;
            case 'viewer':
                return <span className="badge badge-secondary"><Eye size={12} /> Visualizador</span>;
            default:
                return role;
        }
    };

    if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Gestão de Usuários</h1>
                    <p className="page-subtitle">Controle quem pode acessar e operar o sistema ZAccess</p>
                </div>
                <button className="btn btn-primary" onClick={openCreateModal}>
                    <Plus size={18} />
                    Novo Usuário
                </button>
            </div>

            <div className="table-container card">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Usuário</th>
                            <th>Role</th>
                            <th>Local designado</th>
                            <th>Status</th>
                            <th>Criado em</th>
                            <th style={{ textAlign: 'right' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user._id}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div className="device-avatar" style={{
                                            background: 'var(--accent-primary-dim)',
                                            color: 'var(--accent-primary)',
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 700
                                        }}>
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{user.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>{getRoleBadge(user.role)}</td>
                                <td style={{ fontSize: '0.85rem' }}>
                                    {user.locationId?.name || (user.locationId ? '—' : 'Todos os locais')}
                                </td>
                                <td>
                                    {user.active ? (
                                        <span className="status-badge online">
                                            <UserCheck size={12} /> Ativo
                                        </span>
                                    ) : (
                                        <span className="status-badge offline">
                                            <UserX size={12} /> Inativo
                                        </span>
                                    )}
                                </td>
                                <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                        <button className="btn btn-icon btn-secondary btn-sm" onClick={() => openEditModal(user)}>
                                            <Edit size={14} />
                                        </button>
                                        <button className="btn btn-icon btn-danger btn-sm" onClick={() => handleDelete(user._id)}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h2>
                            <button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Nome Completo</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        placeholder="Nome do usuário"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        placeholder="email@exemplo.com"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">
                                        Senha {editingUser && '(Deixe em branco para não alterar)'}
                                    </label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        placeholder="******"
                                        required={!editingUser}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div className="form-group">
                                        <label className="form-label">Nível de Acesso</label>
                                        <select
                                            className="form-select"
                                            value={form.role}
                                            onChange={(e) => setForm({ ...form, role: e.target.value })}
                                        >
                                            <option value="admin">Administrador (Total)</option>
                                            <option value="operator">Operador (Executa comandos)</option>
                                            <option value="viewer">Visualizador (Apenas vê)</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Status da Conta</label>
                                        <select
                                            className="form-select"
                                            value={form.active}
                                            onChange={(e) => setForm({ ...form, active: e.target.value === 'true' })}
                                        >
                                            <option value="true">Ativo</option>
                                            <option value="false">Inativo (Bloqueado)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Local designado (gestor)</label>
                                    <select
                                        className="form-select"
                                        value={form.locationId}
                                        onChange={(e) => setForm({ ...form, locationId: e.target.value })}
                                    >
                                        <option value="">Todos os locais (acesso completo)</option>
                                        {locations.map((loc) => (
                                            <option key={loc._id} value={loc._id}>{loc.name}</option>
                                        ))}
                                    </select>
                                    <p style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        Se preenchido, o usuário terá acesso apenas a este local e poderá cadastrar moradores e criar convites somente para ele.
                                    </p>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">
                                    <Send size={16} />
                                    {editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

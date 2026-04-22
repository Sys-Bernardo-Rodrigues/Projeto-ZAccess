import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Plus, Link, Trash2, X, Send, User, Key, ExternalLink } from 'lucide-react';

export default function InvitationsPage() {
    const [invitations, setInvitations] = useState([]);
    const [relays, setRelays] = useState([]);
    const [locations, setLocations] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({
        name: '',
        relayIds: [],
        validFrom: '',
        validUntil: '',
    });

    const loadData = useCallback(async () => {
        try {
            const [invRes, relayRes, locRes] = await Promise.all([
                api.get('/invitations'),
                api.get('/relays'),
                api.get('/locations')
            ]);
            setInvitations(invRes.data.data.invitations);
            setRelays(relayRes.data.data.relays);
            setLocations(locRes.data.data.locations);
        } catch (err) {
            toast.error('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleLocationChange = (e) => {
        const locId = e.target.value;
        setSelectedLocation(locId);
        // Clear selected relayIds when location changes to avoid mixing
        setForm(prev => ({ ...prev, relayIds: [] }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/invitations', form);
            toast.success('Convite gerado com sucesso!');
            setShowModal(false);
            setForm({ name: '', relayIds: [], validFrom: '', validUntil: '' });
            setSelectedLocation('');
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Erro ao criar convite');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Deseja desativar este link de convite?')) return;
        try {
            await api.delete(`/invitations/${id}`);
            toast.success('Convite desativado!');
            loadData();
        } catch (err) {
            toast.error('Erro ao remover');
        }
    };

    const copyToClipboard = (token) => {
        const url = `${window.location.origin}/invite/${token}`;
        navigator.clipboard.writeText(url);
        toast.success('Link copiado!');
    };

    const openInviteLink = (token) => {
        window.open(`/invite/${token}`, '_blank');
    };

    if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

    return (
        <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Convites & Acessos</h1>
                    <p className="page-subtitle">Gerencie links temporários para visitantes</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={18} />
                    Gerar Novo Link
                </button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th style={{ width: '50px' }}>#</th>
                                <th>Convidado</th>
                                <th>Porta de Acesso</th>
                                <th>Validade</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invitations.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '60px', opacity: 0.5 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                                            <Link size={40} />
                                            <p>Nenhum convite ativo encontrado.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                invitations.map((inv, index) => {
                                    const isExpired = new Date() > new Date(inv.validUntil);
                                    const isNotStarted = new Date() < new Date(inv.validFrom);

                                    let statusLabel = 'Ativo';
                                    let statusClass = 'online';
                                    let dotColor = 'var(--accent-success)';

                                    if (isExpired) {
                                        statusLabel = 'Expirado';
                                        statusClass = 'offline';
                                        dotColor = 'var(--accent-danger)';
                                    } else if (isNotStarted) {
                                        statusLabel = 'Agendado';
                                        statusClass = 'maintenance';
                                        dotColor = 'var(--accent-warning)';
                                    }

                                    return (
                                        <tr key={inv._id} className="invitation-row">
                                            <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{index + 1}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <div style={{
                                                        width: 36, height: 36, borderRadius: 10,
                                                        background: `${dotColor}15`, color: dotColor,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        border: `1px solid ${dotColor}33`
                                                    }}>
                                                        <User size={18} />
                                                    </div>
                                                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{inv.name}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                    {inv.relayIds?.map(r => (
                                                        <div key={r._id} style={{
                                                            display: 'flex', alignItems: 'center', gap: 4,
                                                            fontSize: '0.75rem', background: 'var(--bg-input)',
                                                            padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.05)'
                                                        }}>
                                                            <Key size={10} style={{ color: 'var(--accent-primary)' }} />
                                                            <span>{r.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{new Date(inv.validFrom).toLocaleDateString()} {new Date(inv.validFrom).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>até {new Date(inv.validUntil).toLocaleDateString()} {new Date(inv.validUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`status-badge ${statusClass}`} style={{ background: `${dotColor}15`, color: dotColor, border: `1px solid ${dotColor}33` }}>
                                                    <span className="status-dot" style={{ background: dotColor }} />
                                                    {statusLabel}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                    <button className="btn btn-primary btn-sm" onClick={() => copyToClipboard(inv.token)} style={{ padding: '6px 12px' }}>
                                                        <Link size={14} /> Copiar
                                                    </button>
                                                    <button className="btn btn-icon btn-secondary btn-sm" onClick={() => openInviteLink(inv.token)} title="Visualizar Link">
                                                        <ExternalLink size={14} />
                                                    </button>
                                                    <button className="btn btn-icon btn-danger btn-sm" onClick={() => handleDelete(inv._id)} title="Excluir">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Criação */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Gerar Convite Digital</h2>
                            <button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Nome do Convidado</label>
                                    <input type="text" name="name" className="form-input" placeholder="Ex: Técnico Manutenção" value={form.name} onChange={handleChange} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Localização (Filtro)</label>
                                    <select
                                        className="form-input"
                                        value={selectedLocation}
                                        onChange={handleLocationChange}
                                        required
                                    >
                                        <option value="">Selecione o Local...</option>
                                        {locations.map(loc => (
                                            <option key={loc._id} value={loc._id}>{loc.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {selectedLocation && (
                                    <div className="form-group" style={{ animation: 'slideDown 0.3s ease-out' }}>
                                        <label className="form-label">Selecionar Portas do Local (Múltiplas)</label>
                                        <div style={{
                                            maxHeight: '200px', overflowY: 'auto', background: 'var(--bg-input)',
                                            borderRadius: '8px', padding: '12px', border: '1px solid var(--border-color)',
                                            display: 'flex', flexDirection: 'column', gap: 8
                                        }}>
                                            {relays
                                                .filter(r => {
                                                    const relLocId = r.deviceId?.locationId?._id || r.deviceId?.locationId;
                                                    return String(relLocId) === String(selectedLocation);
                                                })
                                                .map(r => (
                                                    <label key={r._id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.9rem' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={form.relayIds.includes(r._id)}
                                                            onChange={(e) => {
                                                                const newIds = e.target.checked
                                                                    ? [...form.relayIds, r._id]
                                                                    : form.relayIds.filter(id => id !== r._id);
                                                                setForm({ ...form, relayIds: newIds });
                                                            }}
                                                        />
                                                        <span style={{ color: form.relayIds.includes(r._id) ? 'var(--accent-primary)' : 'inherit' }}>
                                                            {r.deviceId?.name} - <strong>{r.name}</strong>
                                                        </span>
                                                    </label>
                                                ))}
                                            {relays.filter(r => r.deviceId?.locationId === selectedLocation).length === 0 && (
                                                <p style={{ fontSize: '0.85rem', opacity: 0.5, textAlign: 'center', padding: '10px' }}>
                                                    Nenhuma porta cadastrada para este local.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div className="form-group">
                                        <label className="form-label">Início</label>
                                        <input type="datetime-local" name="validFrom" className="form-input" value={form.validFrom} onChange={handleChange} required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Expiração</label>
                                        <input type="datetime-local" name="validUntil" className="form-input" value={form.validUntil} onChange={handleChange} required />
                                    </div>
                                </div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 16 }}>
                                    * O convidado poderá abrir as portas selecionadas via link exclusivo.
                                </p>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setSelectedLocation(''); }}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={form.relayIds.length === 0}><Send size={16} /> Gerar Link</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}

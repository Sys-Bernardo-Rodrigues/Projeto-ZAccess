import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { Plus, MapPin, Trash2, Edit, X, Send, Cpu, LayoutList, LocateFixed, Navigation, Users, UserPlus } from 'lucide-react';

// Corrigindo o problema dos ícones do Leaflet no Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Ícone personalizado Neon para o Mapa
const neonIcon = new L.DivIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: var(--accent-primary); width: 12px; height: 12px; border-radius: 50%; box-shadow: 0 0 15px var(--accent-primary); border: 2px solid white;"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -10]
});

// Componente para atualizar o centro do mapa programmaticamente
function MapController({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
}

// Seletor de coordenadas no mapa
function LocationPicker({ onSelect, position }) {
    useMapEvents({
        click(e) {
            onSelect(e.latlng);
        },
    });

    return position ? <Marker position={position} icon={neonIcon} /> : null;
}

const TILE_URL_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_URL_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export default function LocationsPage() {
    const { user } = useAuth();
    const isGestor = !!user?.locationId;
    const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
    const mapTileUrl = isDarkTheme ? TILE_URL_DARK : TILE_URL_LIGHT;
    const mapBg = isDarkTheme ? '#0a0e1a' : 'var(--bg-primary)';
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showListModal, setShowListModal] = useState(false);
    const [editingLocation, setEditingLocation] = useState(null);
    const [mapCenter, setMapCenter] = useState([-23.5505, -46.6333]); // São Paulo default

    const [form, setForm] = useState({
        name: '',
        address: '',
        description: '',
        coordinates: { lat: 0, lng: 0 }
    });

    // Usuários do local (moradores/síndicos)
    const [showUsersModal, setShowUsersModal] = useState(false);
    const [selectedLocationForUsers, setSelectedLocationForUsers] = useState(null);
    const [locationUsers, setLocationUsers] = useState([]);
    const [loadingLocationUsers, setLoadingLocationUsers] = useState(false);
    const [showLocationUserForm, setShowLocationUserForm] = useState(false);
    const [editingLocationUser, setEditingLocationUser] = useState(null);
    const [locationUserForm, setLocationUserForm] = useState({
        name: '', email: '', password: '', role: 'morador', phone: '', unit: ''
    });
    const [savingLocationUser, setSavingLocationUser] = useState(false);

    const loadLocations = useCallback(async () => {
        try {
            const res = await api.get('/locations');
            const fetchedLocations = res.data.data.locations;
            setLocations(fetchedLocations);

            // Se houver locais, foca no primeiro por padrão
            if (fetchedLocations.length > 0 && fetchedLocations[0].coordinates?.lat) {
                setMapCenter([fetchedLocations[0].coordinates.lat, fetchedLocations[0].coordinates.lng]);
            }
        } catch (err) {
            toast.error('Erro ao carregar locais');
        } finally {
            setTimeout(() => setLoading(false), 500);
        }
    }, []);

    useEffect(() => {
        loadLocations();
    }, [loadLocations]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'lat' || name === 'lng') {
            setForm(prev => ({
                ...prev,
                coordinates: {
                    ...prev.coordinates,
                    [name]: parseFloat(value) || 0
                }
            }));
        } else {
            setForm({ ...form, [name]: value });
        }
    };

    const handleMapClick = (latlng) => {
        setForm(prev => ({
            ...prev,
            coordinates: { lat: latlng.lat, lng: latlng.lng }
        }));
    };

    const openCreateModal = () => {
        setEditingLocation(null);
        setForm({
            name: '',
            address: '',
            description: '',
            coordinates: { lat: mapCenter[0], lng: mapCenter[1] }
        });
        setShowModal(true);
    };

    const openEditModal = (loc) => {
        setEditingLocation(loc);
        setForm({
            name: loc.name,
            address: loc.address || '',
            description: loc.description || '',
            coordinates: loc.coordinates || { lat: 0, lng: 0 }
        });
        setShowModal(true);
        setShowListModal(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingLocation) {
                await api.put(`/locations/${editingLocation._id}`, form);
                toast.success('Local atualizado!');
            } else {
                await api.post('/locations', form);
                toast.success('Local criado!');
            }
            setShowModal(false);
            loadLocations();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Erro ao salvar local');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Tem certeza que deseja remover este local?')) return;
        try {
            await api.delete(`/locations/${id}`);
            toast.success('Local removido!');
            loadLocations();
        } catch (err) {
            toast.error('Erro ao remover local');
        }
    };

    const loadLocationUsers = useCallback(async (locationId) => {
        setLoadingLocationUsers(true);
        try {
            const res = await api.get(`/locations/${locationId}/users`);
            setLocationUsers(res.data.data.users || []);
        } catch (err) {
            toast.error('Erro ao carregar usuários do local');
            setLocationUsers([]);
        } finally {
            setLoadingLocationUsers(false);
        }
    }, []);

    const openUsersModal = (loc) => {
        setSelectedLocationForUsers(loc);
        setShowUsersModal(true);
        setShowLocationUserForm(false);
        setEditingLocationUser(null);
        loadLocationUsers(loc._id);
    };

    const closeUsersModal = () => {
        setShowUsersModal(false);
        setSelectedLocationForUsers(null);
        setLocationUsers([]);
    };

    const openAddLocationUser = () => {
        setEditingLocationUser(null);
        setLocationUserForm({ name: '', email: '', password: '', role: 'morador', phone: '', unit: '' });
        setShowLocationUserForm(true);
    };

    const openEditLocationUser = (user) => {
        setEditingLocationUser(user);
        setLocationUserForm({
            name: user.name,
            email: user.email,
            password: '',
            role: user.role || 'morador',
            phone: user.phone || '',
            unit: user.unit || ''
        });
        setShowLocationUserForm(true);
    };

    const handleLocationUserFormChange = (e) => {
        const { name, value } = e.target;
        setLocationUserForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveLocationUser = async (e) => {
        e.preventDefault();
        if (!selectedLocationForUsers) return;
        setSavingLocationUser(true);
        try {
            if (editingLocationUser) {
                const payload = {
                    name: locationUserForm.name,
                    email: locationUserForm.email,
                    role: locationUserForm.role,
                    phone: locationUserForm.phone || undefined,
                    unit: locationUserForm.unit || undefined
                };
                if (locationUserForm.password && locationUserForm.password.length >= 6) {
                    payload.password = locationUserForm.password;
                }
                await api.put(`/locations/${selectedLocationForUsers._id}/users/${editingLocationUser._id}`, payload);
                toast.success('Usuário atualizado!');
            } else {
                await api.post(`/locations/${selectedLocationForUsers._id}/users`, {
                    name: locationUserForm.name,
                    email: locationUserForm.email,
                    password: locationUserForm.password,
                    role: locationUserForm.role,
                    phone: locationUserForm.phone || undefined,
                    unit: locationUserForm.unit || undefined
                });
                toast.success('Morador/síndico adicionado!');
            }
            setShowLocationUserForm(false);
            loadLocationUsers(selectedLocationForUsers._id);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Erro ao salvar');
        } finally {
            setSavingLocationUser(false);
        }
    };

    const handleDeleteLocationUser = async (userId) => {
        if (!selectedLocationForUsers || !confirm('Remover este usuário do local?')) return;
        try {
            await api.delete(`/locations/${selectedLocationForUsers._id}/users/${userId}`);
            toast.success('Usuário removido do local.');
            loadLocationUsers(selectedLocationForUsers._id);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Erro ao remover');
        }
    };

    if (loading) {
        return (
            <div className="skeleton-container" style={{ padding: 20 }}>
                <div className="skeleton" style={{ width: '100%', height: 'calc(100vh - 200px)', borderRadius: 24 }} />
            </div>
        );
    }

    return (
        <div style={{ animation: 'fadeIn 0.5s ease-out', height: '100%' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Locais & Mapas</h1>
                    <p className="page-subtitle">{locations.length} áreas monitoradas no mapa</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn-secondary" onClick={() => setShowListModal(true)}>
                        <LayoutList size={18} />
                        {isGestor ? 'Ver detalhes' : 'Gerenciar Locais'}
                    </button>
                    {!isGestor && (
                        <button className="btn btn-primary" onClick={openCreateModal}>
                            <Plus size={18} />
                            Novo Local
                        </button>
                    )}
                </div>
            </div>

            {/* Map Area */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', height: 'calc(100vh - 220px)', position: 'relative', border: '1px solid var(--border-color)', borderRadius: 24 }}>
                <MapContainer
                    center={mapCenter}
                    zoom={13}
                    style={{ height: '100%', width: '100%', background: mapBg }}
                >
                    <TileLayer
                        url={mapTileUrl}
                        attribution={MAP_ATTRIBUTION}
                    />
                    <MapController center={mapCenter} />

                    {locations.map((loc) => (
                        loc.coordinates?.lat && (
                            <Marker key={loc._id} position={[loc.coordinates.lat, loc.coordinates.lng]} icon={neonIcon}>
                                <Popup className="custom-popup">
                                    <div style={{ padding: 8, minWidth: 200 }}>
                                        <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: 'var(--accent-primary)' }}>{loc.name}</h3>
                                        <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', opacity: 0.7 }}>{loc.address || 'Sem endereço'}</p>

                                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>
                                            <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: 8, opacity: 0.5 }}>Dispositivos ({loc.devices?.length || 0})</h4>
                                            {loc.devices && loc.devices.length > 0 ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                    {loc.devices.map(dev => (
                                                        <div key={dev._id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
                                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: dev.status === 'online' ? 'var(--accent-success)' : 'var(--accent-danger)' }}></div>
                                                            <span>{dev.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p style={{ fontSize: '0.75rem', fontStyle: 'italic', opacity: 0.5 }}>Nenhum dispositivo</p>
                                            )}
                                        </div>

                                        {!isGestor && (
                                            <button
                                                className="btn btn-sm btn-outline-primary"
                                                style={{ width: '100%', marginTop: 16, fontSize: '0.7rem' }}
                                                onClick={() => openEditModal(loc)}
                                            >
                                                <Edit size={12} /> Editar Local
                                            </button>
                                        )}
                                    </div>
                                </Popup>
                            </Marker>
                        )
                    ))}
                </MapContainer>
            </div>

            {/* Modal: List of Locations (Popup) */}
            {showListModal && (
                <div className="modal-overlay" onClick={() => setShowListModal(false)}>
                    <div className="modal" style={{ maxWidth: 1200, width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Lista de Locais</h2>
                            <button className="btn btn-icon btn-secondary" onClick={() => setShowListModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="modal-body" style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <div className="table-container" style={{ maxHeight: '65vh', overflowY: 'auto', flex: 1 }}>
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Nome</th>
                                            <th>Endereço</th>
                                            <th>Dispositivos</th>
                                            <th>Moradores / Síndicos</th>
                                            <th style={{ textAlign: 'right' }}>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {locations.map(loc => (
                                            <tr key={loc._id}>
                                                <td><strong>{loc.name}</strong></td>
                                                <td>{loc.address || '-'}</td>
                                                <td>{loc.devices?.length || 0}</td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-secondary"
                                                        onClick={() => openUsersModal(loc)}
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                                    >
                                                        <Users size={14} />
                                                        Usuários do local
                                                    </button>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                        <button className="btn btn-icon btn-secondary btn-sm" onClick={() => {
                                                            if (loc.coordinates?.lat && loc.coordinates?.lng) {
                                                                setMapCenter([loc.coordinates.lat, loc.coordinates.lng]);
                                                                setShowListModal(false);
                                                            } else {
                                                                toast.error('Este local não possui coordenadas definidas.');
                                                            }
                                                        }}>
                                                            <LocateFixed size={14} />
                                                        </button>
                                                        {!isGestor && (
                                                            <>
                                                                <button className="btn btn-icon btn-secondary btn-sm" onClick={() => openEditModal(loc)}>
                                                                    <Edit size={14} />
                                                                </button>
                                                                <button className="btn btn-icon btn-danger btn-sm" onClick={() => handleDelete(loc._id)}>
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Usuários do local (moradores/síndicos) */}
            {showUsersModal && selectedLocationForUsers && (
                <div className="modal-overlay" onClick={() => !showLocationUserForm && closeUsersModal()}>
                    <div className="modal" style={{ maxWidth: 720, width: '95%' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Usuários do local: {selectedLocationForUsers.name}</h2>
                            <button className="btn btn-icon btn-secondary" onClick={closeUsersModal}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                                Moradores e síndicos vinculados a este local. Eles acessarão pelo app (não pelo painel admin).
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                                <button type="button" className="btn btn-primary btn-sm" onClick={openAddLocationUser}>
                                    <UserPlus size={16} /> Adicionar morador/síndico
                                </button>
                            </div>
                            {loadingLocationUsers ? (
                                <div className="skeleton" style={{ height: 120, borderRadius: 12 }} />
                            ) : (
                                <div className="table-container" style={{ maxHeight: 320, overflowY: 'auto' }}>
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Nome</th>
                                                <th>E-mail</th>
                                                <th>Tipo</th>
                                                <th>Unidade</th>
                                                <th>Telefone</th>
                                                <th style={{ textAlign: 'right' }}>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {locationUsers.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                                                        Nenhum usuário cadastrado. Clique em &quot;Adicionar morador/síndico&quot;.
                                                    </td>
                                                </tr>
                                            ) : (
                                                locationUsers.map((u) => (
                                                    <tr key={u._id}>
                                                        <td><strong>{u.name}</strong></td>
                                                        <td>{u.email}</td>
                                                        <td>
                                                            <span style={{
                                                                fontSize: '0.75rem',
                                                                padding: '4px 8px',
                                                                borderRadius: 8,
                                                                background: u.role === 'sindico' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                                                                color: u.role === 'sindico' ? 'var(--accent-primary-light)' : 'var(--text-muted)'
                                                            }}>
                                                                {u.role === 'sindico' ? 'Síndico' : 'Morador'}
                                                            </span>
                                                        </td>
                                                        <td>{u.unit || '-'}</td>
                                                        <td>{u.phone || '-'}</td>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                                                <button type="button" className="btn btn-icon btn-secondary btn-sm" onClick={() => openEditLocationUser(u)}>
                                                                    <Edit size={14} />
                                                                </button>
                                                                <button type="button" className="btn btn-icon btn-danger btn-sm" onClick={() => handleDeleteLocationUser(u._id)}>
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Formulário Adicionar/Editar usuário do local */}
            {showLocationUserForm && selectedLocationForUsers && (
                <div className="modal-overlay" onClick={() => setShowLocationUserForm(false)}>
                    <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingLocationUser ? 'Editar usuário do local' : 'Adicionar morador/síndico'}</h2>
                            <button className="btn btn-icon btn-secondary" onClick={() => setShowLocationUserForm(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveLocationUser}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Nome</label>
                                    <input type="text" name="name" className="form-input" placeholder="Nome completo" value={locationUserForm.name} onChange={handleLocationUserFormChange} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">E-mail</label>
                                    <input type="email" name="email" className="form-input" placeholder="email@exemplo.com" value={locationUserForm.email} onChange={handleLocationUserFormChange} required disabled={!!editingLocationUser} />
                                    {editingLocationUser && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>E-mail não pode ser alterado.</p>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Senha {editingLocationUser ? '(deixe em branco para não alterar)' : ''}</label>
                                    <input type="password" name="password" className="form-input" placeholder={editingLocationUser ? '••••••••' : 'Mín. 6 caracteres'} value={locationUserForm.password} onChange={handleLocationUserFormChange} minLength={editingLocationUser ? 0 : 6} required={!editingLocationUser} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tipo</label>
                                    <select name="role" className="form-input" value={locationUserForm.role} onChange={handleLocationUserFormChange}>
                                        <option value="morador">Morador</option>
                                        <option value="sindico">Síndico</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Unidade (opcional)</label>
                                    <input type="text" name="unit" className="form-input" placeholder="Ex: Apto 101, Bloco B" value={locationUserForm.unit} onChange={handleLocationUserFormChange} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Telefone (opcional)</label>
                                    <input type="text" name="phone" className="form-input" placeholder="(11) 99999-9999" value={locationUserForm.phone} onChange={handleLocationUserFormChange} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowLocationUserForm(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={savingLocationUser}>
                                    {savingLocationUser ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : (editingLocationUser ? 'Salvar' : 'Adicionar')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Create/Edit Location */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" style={{ maxWidth: 900, width: '95%' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingLocation ? 'Editar Local' : 'Novo Local'}</h2>
                            <button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                                <div>
                                    <div className="form-group">
                                        <label className="form-label">Nome do Local</label>
                                        <input
                                            type="text"
                                            name="name"
                                            className="form-input"
                                            placeholder="Ex: Escritório Central"
                                            value={form.name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Endereço</label>
                                        <input
                                            type="text"
                                            name="address"
                                            className="form-input"
                                            placeholder="Rua Exemplo, 123"
                                            value={form.address}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Descrição</label>
                                        <textarea
                                            name="description"
                                            className="form-input"
                                            style={{ height: 100 }}
                                            placeholder="Descrição breve..."
                                            value={form.description}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <div className="form-group">
                                            <label className="form-label">Latitude</label>
                                            <input type="number" step="any" name="lat" className="form-input" value={form.coordinates.lat} onChange={handleChange} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Longitude</label>
                                            <input type="number" step="any" name="lng" className="form-input" value={form.coordinates.lng} onChange={handleChange} />
                                        </div>
                                    </div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
                                        <Navigation size={12} style={{ marginRight: 4 }} /> Clique no mapa ao lado para capturar as coordenadas automagicamente.
                                    </p>
                                </div>
                                <div style={{ height: 400, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                    <MapContainer
                                        center={[form.coordinates.lat || -23.5, form.coordinates.lng || -46.6]}
                                        zoom={14}
                                        style={{ height: '100%', width: '100%', background: mapBg }}
                                    >
                                        <TileLayer url={mapTileUrl} attribution={MAP_ATTRIBUTION} />
                                        <LocationPicker onSelect={handleMapClick} position={[form.coordinates.lat, form.coordinates.lng]} />
                                        <MapController center={[form.coordinates.lat, form.coordinates.lng]} />
                                    </MapContainer>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary"><Send size={16} /> {editingLocation ? 'Salvar Alterações' : 'Criar Local'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .leaflet-container {
                    background: ${mapBg} !important;
                }
                .custom-popup .leaflet-popup-content-wrapper {
                    background: var(--bg-card);
                    color: var(--text-primary);
                    border-radius: 16px;
                    border: 1px solid var(--border-color);
                    box-shadow: var(--shadow-lg);
                }
                .custom-popup .leaflet-popup-tip {
                    background: var(--bg-card);
                }
                .btn-outline-primary {
                    background: transparent;
                    border: 1px solid var(--accent-primary);
                    color: var(--accent-primary);
                }
                .btn-outline-primary:hover {
                    background: var(--accent-primary);
                    color: white;
                }
            `}</style>
        </div>
    );
}

import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Plus, MapPin, Trash2, Edit, X, Send, Cpu, LayoutList, LocateFixed, Navigation } from 'lucide-react';

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

export default function LocationsPage() {
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
                        Gerenciar Locais
                    </button>
                    <button className="btn btn-primary" onClick={openCreateModal}>
                        <Plus size={18} />
                        Novo Local
                    </button>
                </div>
            </div>

            {/* Map Area */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', height: 'calc(100vh - 220px)', position: 'relative', border: '1px solid var(--border-color)', borderRadius: 24 }}>
                <MapContainer
                    center={mapCenter}
                    zoom={13}
                    style={{ height: '100%', width: '100%', background: '#0a0e1a' }}
                >
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
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

                                        <button
                                            className="btn btn-sm btn-outline-primary"
                                            style={{ width: '100%', marginTop: 16, fontSize: '0.7rem' }}
                                            onClick={() => openEditModal(loc)}
                                        >
                                            <Edit size={12} /> Editar Local
                                        </button>
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
                    <div className="modal" style={{ maxWidth: 800, width: '90%' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Lista de Locais</h2>
                            <button className="btn btn-icon btn-secondary" onClick={() => setShowListModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="table-container" style={{ maxHeight: 500, overflowY: 'auto' }}>
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Nome</th>
                                            <th>Endereço</th>
                                            <th>Dispositivos</th>
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
                                                        <button className="btn btn-icon btn-secondary btn-sm" onClick={() => openEditModal(loc)}>
                                                            <Edit size={14} />
                                                        </button>
                                                        <button className="btn btn-icon btn-danger btn-sm" onClick={() => handleDelete(loc._id)}>
                                                            <Trash2 size={14} />
                                                        </button>
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
                                        style={{ height: '100%', width: '100%' }}
                                    >
                                        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
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
                    background: #0a0e1a !important;
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

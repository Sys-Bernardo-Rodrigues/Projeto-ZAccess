import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useSocket } from '../hooks/useSocket';
import toast from 'react-hot-toast';
import {
    Activity,
    Thermometer,
    Cpu,
    HardDrive,
    Clock,
    RefreshCw,
    Signal,
    SignalLow,
} from 'lucide-react';

export default function MonitoringPage() {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const { socket } = useSocket();

    const loadDevices = useCallback(async () => {
        try {
            const res = await api.get('/devices');
            setDevices(res.data.data.devices);
        } catch (err) {
            toast.error('Erro ao carregar dispositivos');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDevices();
    }, [loadDevices]);

    useEffect(() => {
        if (!socket) return;

        const handleHealthChange = (data) => {
            setDevices(prev => prev.map(d =>
                d._id === data.deviceId ? { ...d, health: data.health } : d
            ));
        };

        const handleStatusChange = (data) => {
            setDevices(prev => prev.map(d =>
                d._id === data.deviceId ? { ...d, status: data.status } : d
            ));
        };

        socket.on('device:health-change', handleHealthChange);
        socket.on('device:status-change', handleStatusChange);

        return () => {
            socket.off('device:health-change', handleHealthChange);
            socket.off('device:status-change', handleStatusChange);
        };
    }, [socket]);

    const getTempColor = (temp) => {
        if (!temp) return 'var(--text-muted)';
        if (temp < 50) return 'var(--accent-success)';
        if (temp < 65) return 'var(--accent-warning)';
        return 'var(--accent-danger)';
    };

    if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Health Check & Monitoramento</h1>
                    <p className="page-subtitle">Status de hardware dos dispositivos em tempo real</p>
                </div>
                <button className="btn btn-secondary" onClick={loadDevices}>
                    <RefreshCw size={18} />
                    Atualizar
                </button>
            </div>

            <div className="grid-3">
                {devices.map((device) => (
                    <div key={device._id} className={`card device-card ${device.status === 'offline' ? 'dimmed' : ''}`}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div className={`status-indicator ${device.status}`} />
                                <h3 style={{ margin: 0 }}>{device.name}</h3>
                            </div>
                            <span className={`badge ${device.status === 'online' ? 'badge-success' : 'badge-secondary'}`}>
                                {device.status.toUpperCase()}
                            </span>
                        </div>

                        {device.status === 'online' && device.health ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {/* CPU Temp */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)' }}>
                                        <Thermometer size={18} />
                                        <span>Temperatura CPU</span>
                                    </div>
                                    <span style={{ fontWeight: 700, color: getTempColor(device.health.cpuTemp) }}>
                                        {device.health.cpuTemp?.toFixed(1)}°C
                                    </span>
                                </div>

                                {/* RAM Usage */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)' }}>
                                            <HardDrive size={18} />
                                            <span>Memória RAM</span>
                                        </div>
                                        <span style={{ fontSize: '0.85rem' }}>
                                            {device.health.memoryUsage?.percent}% ({device.health.memoryUsage?.used}MB)
                                        </span>
                                    </div>
                                    <div className="progress-bar-container">
                                        <div
                                            className="progress-bar"
                                            style={{
                                                width: `${device.health.memoryUsage?.percent}%`,
                                                background: device.health.memoryUsage?.percent > 80 ? 'var(--accent-danger)' : 'var(--accent-primary)'
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Uptime */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)' }}>
                                        <Clock size={18} />
                                        <span>Uptime</span>
                                    </div>
                                    <span style={{ fontSize: '0.85rem' }}>
                                        {device.health.uptime} horas
                                    </span>
                                </div>

                                {/* Network */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)' }}>
                                        <Signal size={18} />
                                        <span>Status Rede</span>
                                    </div>
                                    <span style={{ color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Signal size={14} /> Estável
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="empty-state" style={{ padding: '20px 0' }}>
                                <Activity size={32} />
                                <p style={{ fontSize: '0.85rem' }}>
                                    {device.status === 'offline' ? 'Dispositivo desconectado' : 'Aguardando telemetria...'}
                                </p>
                            </div>
                        )}

                        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-color)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            IP: {device.ipAddress || '---'} | Serial: {device.serialNumber}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

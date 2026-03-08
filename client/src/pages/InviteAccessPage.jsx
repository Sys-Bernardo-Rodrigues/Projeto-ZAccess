import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Shield, Lock, Unlock, Clock, MapPin, ChevronRight, Zap } from 'lucide-react';

export default function InviteAccessPage() {
    const { token } = useParams();
    const [info, setInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [unlocked, setUnlocked] = useState(false);
    const [unlocking, setUnlocking] = useState(false);

    // Slider state
    const [sliderPos, setSliderPos] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const sliderRef = useRef(null);
    const containerRef = useRef(null);

    const [selectedGate, setSelectedGate] = useState(null);

    useEffect(() => {
        const fetchInviteInfo = async () => {
            try {
                const res = await api.get(`/invitations/access/${token}`);
                const data = res.data.data;
                setInfo(data);
                if (data.gates && data.gates.length > 0) {
                    setSelectedGate(data.gates[0].id);
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Convite inválido ou expirado.');
            } finally {
                setLoading(false);
            }
        };
        fetchInviteInfo();
    }, [token]);

    const handleUnlock = async () => {
        if (!selectedGate) {
            toast.error('Selecione uma porta para abrir.');
            setSliderPos(0);
            return;
        }

        setUnlocking(true);
        try {
            await api.post(`/invitations/access/${token}/unlock`, { relayId: selectedGate });
            setUnlocked(true);
            toast.success('Acesso Liberado!', {
                icon: '🔓',
                style: {
                    borderRadius: '16px',
                    background: '#10b981',
                    color: '#fff',
                },
            });

            // Reset after 5 seconds
            setTimeout(() => {
                setUnlocked(false);
                setSliderPos(0);
                setUnlocking(false);
            }, 5000);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Falha ao abrir.');
            setSliderPos(0);
            setUnlocking(false);
        }
    };

    // Slider Logic (unchanged from here)
    const onStart = (e) => {
        if (unlocked || unlocking) return;
        setIsDragging(true);
    };

    const onMove = (e) => {
        if (!isDragging) return;

        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const maxDist = rect.width - 64; // button width
        let pos = clientX - rect.left - 32;

        if (pos < 0) pos = 0;
        if (pos > maxDist) pos = maxDist;

        setSliderPos(pos);

        // Threshold to trigger
        if (pos >= maxDist * 0.95) {
            setIsDragging(false);
            setSliderPos(maxDist);
            handleUnlock();
        }
    };

    const onEnd = () => {
        if (!isDragging) return;
        setIsDragging(false);
        if (sliderPos < (containerRef.current.offsetWidth - 64) * 0.95) {
            setSliderPos(0);
        }
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onEnd);
            window.addEventListener('touchmove', onMove);
            window.addEventListener('touchend', onEnd);
        }
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onEnd);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onEnd);
        };
    }, [isDragging]);

    if (loading) {
        return (
            <div className="invite-access-container">
                <style>{`
                    .spinner { width: 40px; height: 40px; border: 4px solid rgba(168, 85, 247, 0.2); border-top-color: #a855f7; border-radius: 50%; animation: spin 1s linear infinite; }
                    @keyframes spin { to { transform: rotate(360deg); } }
                    .invite-access-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0a0e1a; }
                `}</style>
                <div className="spinner" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="invite-access-container invite-access-container--error">
                <style>{`
                    .invite-access-container--error {
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: #0a0e1a;
                        padding: 20px;
                    }
                    .invite-access-container--error .error-card {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        text-align: center;
                        max-width: 400px;
                    }
                    .invite-access-container--error .error-card h1 {
                        margin: 20px 0 12px;
                        font-size: 1.75rem;
                        font-weight: 800;
                        color: #f1f5f9;
                    }
                    .invite-access-container--error .error-card p {
                        margin-bottom: 24px;
                        color: #94a3b8;
                        font-size: 1rem;
                    }
                `}</style>
                <div className="error-card">
                    <Shield size={64} color="var(--accent-danger)" />
                    <h1>Acesso Negado</h1>
                    <p>{error}</p>
                    <button className="btn btn-secondary" onClick={() => window.location.reload()}>Tentar Novamente</button>
                </div>
            </div>
        );
    }

    return (
        <div className="invite-access-container">
            {/* Background Orbs */}
            <div className="orb orb-1" />
            <div className="orb orb-2" />

            <div className="access-card">
                <div className="brand">
                    <div className="brand-icon">
                        <Zap size={32} fill="white" color="white" />
                    </div>
                    <h1>ZAcesss<span>.</span></h1>
                </div>

                <div className="guest-header">
                    <h2>Olá, {info.guestName}</h2>
                    <p>Você tem permissão para abrir as portas abaixo:</p>
                </div>

                <div className="location-info">
                    <div className="info-item">
                        <MapPin size={18} />
                        <div>
                            <span>Localização Principal</span>
                            <p>{info.gates?.[0]?.address || 'Endereço não informado'}</p>
                        </div>
                    </div>

                    <div className="gates-selection">
                        <span className="section-label">Selecione a Porta</span>
                        <div className="gates-grid">
                            {info.gates?.map(gate => (
                                <button
                                    key={gate.id}
                                    className={`gate-option ${selectedGate === gate.id ? 'active' : ''}`}
                                    onClick={() => !unlocking && !unlocked && setSelectedGate(gate.id)}
                                >
                                    <div className="gate-icon">
                                        <Lock size={16} />
                                    </div>
                                    <div className="gate-details">
                                        <span className="gate-name">{gate.name}</span>
                                        <span className="device-name">{gate.deviceName}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="info-item">
                        <Clock size={18} />
                        <div>
                            <span>Válido até</span>
                            <p>{new Date(info.validUntil).toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <div className="unlock-zone">
                    <div
                        className={`slider-container ${unlocked ? 'is-unlocked' : ''} ${unlocking ? 'is-unlocking' : ''}`}
                        ref={containerRef}
                    >
                        <div className="slider-track-text">
                            {unlocked ? 'PORTA ABERTA' : unlocking ? 'ABRINDO...' : 'ARRASTE PARA ABRIR'}
                        </div>

                        <div
                            className="slider-button"
                            ref={sliderRef}
                            style={{
                                transform: `translateX(${sliderPos}px)`,
                                transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
                            }}
                            onMouseDown={onStart}
                            onTouchStart={onStart}
                        >
                            {unlocked ? <Unlock size={24} /> : <ChevronRight size={24} />}
                        </div>
                    </div>
                </div>

                <div className="footer-note">
                    Uso ilimitado das portas selecionadas até a expiração.
                </div>
            </div>

            <style>{`
                .invite-access-container {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #0a0e1a;
                    padding: 20px;
                    color: #fff;
                    font-family: 'Inter', sans-serif;
                    position: relative;
                    overflow: hidden;
                }

                .orb {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(120px);
                    z-index: 0;
                    opacity: 0.15;
                }
                .orb-1 { width: 400px; height: 400px; background: #a855f7; top: -100px; left: -100px; }
                .orb-2 { width: 500px; height: 500px; background: #6366f1; bottom: -150px; right: -150px; }

                .access-card {
                    width: 100%;
                    max-width: 440px;
                    background: rgba(26, 31, 53, 0.85);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(168, 85, 247, 0.3);
                    border-radius: 32px;
                    padding: 40px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                    z-index: 1;
                    text-align: center;
                }

                .brand {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 32px;
                }
                .brand-icon {
                    width: 64px;
                    height: 64px;
                    background: linear-gradient(135deg, #a855f7, #6366f1);
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 10px 20px rgba(168, 85, 247, 0.4);
                }
                .brand h1 { font-size: 1.8rem; font-weight: 900; letter-spacing: -1px; }
                .brand h1 span { color: #a855f7; }

                .guest-header h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 8px; }
                .guest-header p { color: #94a3b8; font-size: 0.95rem; margin-bottom: 32px; }

                .location-info {
                    background: rgba(255, 255, 255, 0.03);
                    border-radius: 24px;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                    margin-bottom: 40px;
                    text-align: left;
                }
                .info-item { display: flex; gap: 16px; align-items: center; }
                .info-item div span { display: block; font-size: 0.7rem; color: #64748b; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; }
                .info-item div p { font-size: 0.9rem; font-weight: 600; color: #f1f5f9; }
                .info-item svg { color: #a855f7; }

                .gates-selection { display: flex; flex-direction: column; gap: 10px; }
                .section-label { font-size: 0.7rem; color: #64748b; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; }
                .gates-grid { display: grid; gap: 10px; }
                .gate-option {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 16px;
                    padding: 12px 16px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    text-align: left;
                    width: 100%;
                    border: 1px solid transparent;
                }
                .gate-option:hover { background: rgba(255,255,255,0.06); }
                .gate-option.active {
                    background: rgba(168, 85, 247, 0.15);
                    border-color: rgba(168, 85, 247, 0.5);
                    box-shadow: 0 0 15px rgba(168, 85, 247, 0.1);
                }
                .gate-icon { width: 32px; height: 32px; background: rgba(168, 85, 247, 0.1); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #a855f7; }
                .gate-option.active .gate-icon { background: #a855f7; color: white; }
                .gate-details { display: flex; flex-direction: column; }
                .gate-name { font-size: 0.9rem; font-weight: 700; color: #f1f5f9; }
                .device-name { font-size: 0.7rem; color: #94a3b8; }

                .unlock-zone { margin-bottom: 24px; }
                .slider-container {
                    height: 80px;
                    background: #111827;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 100px;
                    position: relative;
                    padding: 8px;
                    display: flex;
                    align-items: center;
                    overflow: hidden;
                }
                .slider-track-text {
                    position: absolute;
                    width: 100%;
                    text-align: center;
                    font-size: 0.85rem;
                    font-weight: 800;
                    letter-spacing: 2px;
                    color: rgba(255, 255, 255, 0.1);
                    pointer-events: none;
                }
                .slider-button {
                    width: 64px;
                    height: 64px;
                    background: #fff;
                    color: #a855f7;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: grab;
                    z-index: 2;
                }

                .is-unlocking .slider-button {
                    background: #a855f7;
                    color: white;
                }
                .is-unlocked .slider-button {
                    background: #10b981;
                    color: white;
                }

                .footer-note { font-size: 0.75rem; color: #64748b; font-weight: 500; }
                .error-card { text-align: center; max-width: 400px; }
            `}</style>
        </div>
    );
}

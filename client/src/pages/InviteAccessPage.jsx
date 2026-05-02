import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Html5Qrcode } from 'html5-qrcode';
import { Shield, Lock, Unlock, Clock, MapPin, ChevronRight, Camera, QrCode, X } from 'lucide-react';
import brandLogo from '../../svg/ZAccess..svg';

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
    const [showScannerModal, setShowScannerModal] = useState(false);
    const [scannerError, setScannerError] = useState('');
    const [scannerLoading, setScannerLoading] = useState(false);
    const scannerRef = useRef(null);

    const closeScannerModal = useCallback(() => {
        const s = scannerRef.current;
        if (s?.isScanning) {
            s.stop().catch(() => {});
        }
        setScannerError('');
        setScannerLoading(false);
        setShowScannerModal(false);
    }, []);
    const isProcessingScanRef = useRef(false);

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

    const extractInviteTokenFromQr = (value) => {
        if (!value) return '';
        const raw = String(value).trim();

        if (raw.startsWith('/invite/')) {
            return raw.split('/invite/')[1]?.split(/[?#]/)[0] || '';
        }

        try {
            const parsed = new URL(raw);
            const invitePathMatch = parsed.pathname.match(/^\/invite\/([^/]+)/);
            return invitePathMatch?.[1] || '';
        } catch {
            const directMatch = raw.match(/invite\/([^/?#]+)/);
            return directMatch?.[1] || '';
        }
    };

    const extractRelayQrToken = (value) => {
        if (!value) return '';
        const raw = String(value).trim();

        if (raw.startsWith('/relay-qr/')) {
            return raw.split('/relay-qr/')[1]?.split(/[?#]/)[0] || '';
        }

        try {
            const parsed = new URL(raw);
            const relayPathMatch = parsed.pathname.match(/^\/relay-qr\/([^/]+)/);
            return relayPathMatch?.[1] || '';
        } catch {
            const directMatch = raw.match(/relay-qr\/([^/?#]+)/);
            return directMatch?.[1] || '';
        }
    };

    const handleUnlockByScannedQr = async (decodedText) => {
        const relayQrToken = extractRelayQrToken(decodedText);
        if (relayQrToken && !isProcessingScanRef.current) {
            isProcessingScanRef.current = true;
            setUnlocking(true);
            try {
                await api.post('/relays/public/qr-trigger', {
                    token: relayQrToken,
                    inviteToken: token,
                });
                setUnlocked(true);
                toast.success('Acesso liberado via QR direto!', { icon: '🔓' });
                setTimeout(() => {
                    setUnlocked(false);
                    setSliderPos(0);
                    setUnlocking(false);
                }, 5000);
            } catch (err) {
                toast.error(err.response?.data?.message || 'Falha ao liberar acesso via QR.');
                setUnlocking(false);
            } finally {
                isProcessingScanRef.current = false;
            }
            return;
        }

        const scannedToken = extractInviteTokenFromQr(decodedText);
        if (!scannedToken || isProcessingScanRef.current) return;

        isProcessingScanRef.current = true;
        setUnlocking(true);
        try {
            const infoRes = await api.get(`/invitations/access/${scannedToken}`);
            const firstGate = infoRes.data?.data?.gates?.[0];

            if (!firstGate?.id) {
                throw new Error('Nenhuma porta encontrada nesse QR.');
            }

            await api.post(`/invitations/access/${scannedToken}/unlock`, { relayId: firstGate.id });
            setUnlocked(true);
            toast.success('Acesso liberado via QR!', { icon: '🔓' });

            setTimeout(() => {
                setUnlocked(false);
                setSliderPos(0);
                setUnlocking(false);
            }, 5000);
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || 'Falha ao liberar acesso via QR.');
            setUnlocking(false);
        } finally {
            isProcessingScanRef.current = false;
        }
    };

    useEffect(() => {
        if (!showScannerModal) return undefined;

        let mounted = true;
        scannerRef.current = null;
        setScannerError('');
        setScannerLoading(true);

        const formatScannerError = (error) => {
            const name = typeof error === 'object' && error ? error.name : '';
            const msg = typeof error === 'string' ? error : (error && error.message) ? error.message : '';
            if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
                return 'Permissão de câmera negada. Permita o acesso no navegador e tente novamente.';
            }
            if (name === 'NotFoundError') {
                return 'Nenhuma câmera foi encontrada neste aparelho.';
            }
            if (name === 'NotReadableError' || name === 'TrackStartError') {
                return 'A câmera pode estar em uso por outro aplicativo. Feche outros apps e tente de novo.';
            }
            if (msg && /not found|element with id/i.test(msg)) {
                return 'Área do leitor não está pronta. Feche o modal e abra «Ler QR Code» novamente.';
            }
            if (msg && /qrbox|dimension|minimum size/i.test(msg)) {
                return 'Ajuste da janela de leitura falhou. Tente em tela cheia ou outro navegador.';
            }
            if (msg) return `Não foi possível iniciar o leitor: ${msg}`;
            return 'Não foi possível acessar a câmera. Tente recarregar a página ou use outro navegador.';
        };

        const runScanner = async () => {
            try {
                const canUseMedia = typeof navigator !== 'undefined'
                    && navigator.mediaDevices
                    && typeof navigator.mediaDevices.getUserMedia === 'function';

                if (!canUseMedia) {
                    setScannerError('Seu navegador não suporta acesso à câmera neste contexto.');
                    return;
                }

                const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
                if (!window.isSecureContext && !isLocalhost) {
                    setScannerError('Para usar a câmera em celular, abra o painel com HTTPS ou em localhost.');
                    return;
                }

                await new Promise((r) => {
                    requestAnimationFrame(() => requestAnimationFrame(r));
                });
                if (!mounted) return;

                if (!document.getElementById('invite-qr-reader')) {
                    setScannerError('Área do leitor não encontrada. Feche e abra o modal novamente.');
                    return;
                }

                scannerRef.current = new Html5Qrcode('invite-qr-reader');

                const scanConfig = {
                    fps: 10,
                    qrbox: { width: 220, height: 220 },
                };

                const onDecoded = (decodedText) => {
                    if (isProcessingScanRef.current) return;
                    closeScannerModal();
                    handleUnlockByScannedQr(decodedText);
                };
                const onScanError = () => {};

                const pickRearCameraId = (cameras) => {
                    if (!cameras?.length) return null;
                    const back = cameras.find((c) =>
                        /back|rear|traseira|environment|ambiente|wide|world/i.test(c.label || '')
                    );
                    if (back?.id) return back.id;
                    if (cameras.length > 1) return cameras[cameras.length - 1].id;
                    return cameras[0].id;
                };

                let warmStream = null;
                try {
                    warmStream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: { ideal: 'environment' } },
                    });
                } catch {
                    try {
                        warmStream = await navigator.mediaDevices.getUserMedia({ video: true });
                    } catch (permErr) {
                        setScannerError(formatScannerError(permErr));
                        return;
                    }
                }
                warmStream.getTracks().forEach((t) => t.stop());

                if (!mounted) return;

                const cameras = await Html5Qrcode.getCameras();
                if (!mounted) return;
                if (!cameras?.length) {
                    setScannerError('Nenhuma câmera encontrada no dispositivo.');
                    return;
                }

                const cameraId = pickRearCameraId(cameras);
                if (!mounted || !scannerRef.current) return;
                await scannerRef.current.start(cameraId, scanConfig, onDecoded, onScanError);
            } catch (error) {
                setScannerError(formatScannerError(error));
            } finally {
                if (mounted) setScannerLoading(false);
            }
        };

        runScanner();

        return () => {
            mounted = false;
            const s = scannerRef.current;
            scannerRef.current = null;
            if (!s) {
                setScannerLoading(false);
                return;
            }
            if (s.isScanning) {
                s.stop().catch(() => {});
            }
            setScannerLoading(false);
        };
    }, [showScannerModal, closeScannerModal]);

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
                    <img
                        className="brand-logo-img"
                        src={brandLogo}
                        alt="ZAccess"
                        width={436}
                        height={144}
                        decoding="async"
                    />
                </div>

                <div className="guest-header">
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
                    <button
                        className="scan-qr-btn"
                        type="button"
                        onClick={() => setShowScannerModal(true)}
                        disabled={unlocking}
                    >
                        <Camera size={16} />
                        Ler QR Code para liberar
                    </button>

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

            {showScannerModal && (
                <div className="qr-modal-overlay" onClick={closeScannerModal}>
                    <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="qr-modal-header">
                            <h3>Ler QR Code</h3>
                            <button type="button" className="qr-close-btn" onClick={closeScannerModal}>
                                <X size={18} />
                            </button>
                        </div>
                        <p className="qr-modal-text">Aponte a câmera para o QR do convite para liberar o relé.</p>
                        <div id="invite-qr-reader" className="qr-reader-box" />
                        {scannerLoading ? <p className="qr-modal-text">Inicializando câmera...</p> : null}
                        {scannerError ? <p className="qr-modal-error">{scannerError}</p> : null}
                        <button
                            type="button"
                            className="scan-qr-btn"
                            style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
                            onClick={() => {
                                const value = prompt('Cole aqui o link /invite/:token lido do QR:');
                                if (!value) return;
                                closeScannerModal();
                                handleUnlockByScannedQr(value);
                            }}
                        >
                            <QrCode size={16} />
                            Colar link do QR
                        </button>
                    </div>
                </div>
            )}

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
                    justify-content: center;
                    margin-bottom: 32px;
                }
                .brand-logo-img {
                    width: 100%;
                    max-width: min(100%, 340px);
                    height: auto;
                    max-height: 96px;
                    object-fit: contain;
                    object-position: center;
                    display: block;
                }

                .guest-header p { color: #94a3b8; font-size: 0.95rem; margin: 0 0 32px 0; }

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
                .scan-qr-btn {
                    width: 100%;
                    margin-bottom: 12px;
                    height: 46px;
                    border-radius: 12px;
                    border: 1px solid rgba(168, 85, 247, 0.35);
                    background: rgba(168, 85, 247, 0.12);
                    color: #e9d5ff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .scan-qr-btn:hover { background: rgba(168, 85, 247, 0.2); }
                .scan-qr-btn:disabled { opacity: 0.6; cursor: not-allowed; }
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

                .qr-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(10, 14, 26, 0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 16px;
                }
                .qr-modal {
                    width: 100%;
                    max-width: 460px;
                    background: #111827;
                    border: 1px solid rgba(168, 85, 247, 0.3);
                    border-radius: 16px;
                    padding: 16px;
                }
                .qr-modal-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 8px;
                }
                .qr-close-btn {
                    border: none;
                    width: 34px;
                    height: 34px;
                    border-radius: 8px;
                    background: rgba(255, 255, 255, 0.08);
                    color: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                }
                .qr-reader-box {
                    width: 100%;
                    min-height: 300px;
                    border-radius: 12px;
                    overflow: hidden;
                    border: 1px solid rgba(255,255,255,0.1);
                    background: #0b1020;
                }
                .qr-modal-text {
                    font-size: 0.85rem;
                    color: #94a3b8;
                    margin-bottom: 10px;
                }
                .qr-modal-error {
                    margin-top: 10px;
                    font-size: 0.8rem;
                    color: #f87171;
                }
            `}</style>
        </div>
    );
}

import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { ShieldAlert, BellRing, X } from 'lucide-react';

export default function AlertListener() {
    useEffect(() => {
        const handleAlert = (e) => {
            const data = e.detail;

            // Mostrar notificação customizada e persistente para emergências
            toast.custom(
                (t) => (
                    <div
                        className={`${t.visible ? 'animate-enter' : 'animate-leave'
                            } max-w-md w-full bg-slate-900 shadow-2xl rounded-2xl pointer-events-auto flex ring-2 ring-red-500 ring-opacity-50`}
                        style={{
                            background: '#0f172a',
                            border: '1px solid rgba(239, 68, 68, 0.5)',
                            padding: '16px',
                            minWidth: '350px'
                        }}
                    >
                        <div className="flex-1 w-0">
                            <div className="flex items-start">
                                <div className="flex-shrink-0 pt-0.5">
                                    <div style={{
                                        background: 'rgba(239, 68, 68, 0.2)',
                                        borderRadius: '50%',
                                        padding: '10px',
                                        color: '#ef4444',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        animation: 'pulse 1s infinite'
                                    }}>
                                        <ShieldAlert size={28} />
                                    </div>
                                </div>
                                <div className="ml-4 flex-1">
                                    <p style={{ margin: 0, fontWeight: 800, color: '#ef4444', fontSize: '1rem' }}>
                                        {data.title}
                                    </p>
                                    <p style={{ margin: '4px 0 0 0', color: '#cbd5e1', fontSize: '0.875rem' }}>
                                        {data.message}
                                    </p>
                                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <span style={{
                                            fontSize: '0.7rem',
                                            background: 'rgba(255,255,255,0.05)',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            color: '#94a3b8'
                                        }}>
                                            {data.deviceName}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="ml-4 flex-shrink-0 flex">
                            <button
                                onClick={() => toast.dismiss(t.id)}
                                className="w-full border border-transparent rounded-none rounded-r-lg p-2 flex items-center justify-center text-sm font-medium text-slate-400 hover:text-slate-100 focus:outline-none"
                                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                ),
                {
                    duration: 10000, // 10 segundos
                    position: 'top-center'
                }
            );

            // Tocar um bipe sonoro de alerta se possível
            try {
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                audio.play();
            } catch (err) {
                console.warn('Não foi possível tocar o som de alerta:', err);
            }
        };

        window.addEventListener('notification-alert', handleAlert);
        return () => window.removeEventListener('notification-alert', handleAlert);
    }, []);

    return null; // Este componente não renderiza nada diretamente
}

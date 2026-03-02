import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LogIn, UserPlus, Eye, EyeOff, Shield, Zap, Cpu } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
    const { login, register } = useAuth();
    const [isRegister, setIsRegister] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isRegister) {
                await register(form.name, form.email, form.password);
                toast.success('Conta criada com sucesso!');
            } else {
                await login(form.email, form.password);
                toast.success('Bem-vindo de volta ao ZAcesss!');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Erro ao autenticar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            {/* Animated Background Orbs */}
            <div style={{ position: 'absolute', top: '10%', left: '10%', width: 250, height: 250, background: 'var(--accent-primary)', filter: 'blur(100px)', opacity: 0.1, borderRadius: '50%', animation: 'float 20s infinite alternate' }} />
            <div style={{ position: 'absolute', bottom: '15%', right: '15%', width: 300, height: 300, background: 'var(--accent-secondary)', filter: 'blur(120px)', opacity: 0.1, borderRadius: '50%', animation: 'float 25s infinite alternate-reverse' }} />

            <div className={`login-card ${mounted ? 'mounted' : ''}`} style={{ transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)', opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(20px)' }}>
                <div className="login-logo">
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 80,
                        height: 80,
                        background: 'var(--gradient-primary)',
                        borderRadius: 24,
                        marginBottom: 32,
                        boxShadow: 'var(--shadow-glow), inset 0 0 15px rgba(255,255,255,0.2)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <Zap color="white" size={40} strokeWidth={2.5} fill="white" />
                        <div style={{ position: 'absolute', top: -20, left: -20, width: 60, height: 60, background: 'rgba(255,255,255,0.2)', filter: 'blur(15px)', borderRadius: '50%' }} />
                    </div>
                    <h1 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: 8, letterSpacing: -2 }}>
                        ZAcesss<span style={{ color: 'var(--accent-primary-light)' }}>.</span>
                    </h1>
                    <p style={{ fontSize: '1rem', fontWeight: 500, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.7 }}>Controle de Acessos IOT</p>
                </div>

                <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: 12, padding: 4, marginBottom: 32, border: '1px solid var(--border-color)' }}>
                    <button
                        onClick={() => setIsRegister(false)}
                        style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: !isRegister ? 'var(--bg-card)' : 'transparent', color: !isRegister ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.3s', boxShadow: !isRegister ? 'var(--shadow-sm)' : 'none' }}
                    >
                        Login
                    </button>
                    <button
                        onClick={() => setIsRegister(true)}
                        style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: isRegister ? 'var(--bg-card)' : 'transparent', color: isRegister ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.3s', boxShadow: isRegister ? 'var(--shadow-sm)' : 'none' }}
                    >
                        Registro
                    </button>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    {isRegister && (
                        <div className="form-group">
                            <label className="form-label">Nome Completo</label>
                            <input
                                type="text"
                                name="name"
                                className="form-input"
                                placeholder="Seu nome"
                                value={form.name}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">E-mail</label>
                        <input
                            type="email"
                            name="email"
                            className="form-input"
                            placeholder="exemplo@email.com"
                            value={form.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Senha</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                className="form-input"
                                placeholder="Sua senha secreta"
                                value={form.password}
                                onChange={handleChange}
                                required
                                minLength={6}
                                style={{ paddingRight: 48 }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {!isRegister && (
                        <div style={{ textAlign: 'right', marginBottom: 20 }}>
                            <a href="#" style={{ fontSize: '0.8rem', color: 'var(--accent-primary-light)', fontWeight: 500 }}>Esqueceu a senha?</a>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                        style={{ height: 54 }}
                    >
                        {loading ? (
                            <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                        ) : isRegister ? (
                            <>
                                <UserPlus size={18} />
                                Criar Minha Conta
                            </>
                        ) : (
                            <>
                                <LogIn size={18} />
                                Iniciar Sessão
                            </>
                        )}
                    </button>
                </form>

                <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center', gap: 24 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <Cpu size={14} color="var(--text-muted)" />
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>IOT READY</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <Zap size={14} color="var(--text-muted)" />
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>FAST API</span>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes float {
                    0% { transform: translate(0, 0); }
                    100% { transform: translate(20px, 20px); }
                }
            `}</style>
        </div>
    );
}

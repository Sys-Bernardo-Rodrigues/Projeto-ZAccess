import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import brandLogo from '../../svg/ZAccess..svg';

export default function LoginPage() {
    const { login } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ email: '', password: '' });

    const handleChange = (e) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(form.email, form.password);
            toast.success('Bem-vindo ao Zaccess!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Erro ao entrar. Verifique e-mail e senha.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth">
            <div className="auth__brand">
                <div className="auth__brand-flow" aria-hidden>
                    <svg className="auth__brand-flow__svg" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                        <defs>
                            <pattern
                                id="loginVectorPattern"
                                width="208"
                                height="208"
                                patternUnits="userSpaceOnUse"
                            >
                                <path
                                    d="M 23 14 L 9 52 L 26 40 L 11 98"
                                    fill="none"
                                    stroke="rgba(139, 92, 246, 0.22)"
                                    strokeWidth="1.05"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    transform="rotate(-6 18 56)"
                                />
                                <path
                                    d="M 172 8 L 154 44 L 168 38 L 148 108"
                                    fill="none"
                                    stroke="rgba(167, 139, 250, 0.32)"
                                    strokeWidth="1.35"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    transform="rotate(14 160 58)"
                                />
                                <path
                                    d="M 96 22 L 78 62 L 94 54 L 72 118"
                                    fill="none"
                                    stroke="rgba(99, 102, 241, 0.18)"
                                    strokeWidth="0.9"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d="M 128 76 L 118 104 L 128 98 L 114 138"
                                    fill="none"
                                    stroke="rgba(139, 92, 246, 0.36)"
                                    strokeWidth="1.2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    transform="rotate(22 122 108)"
                                />
                                <path
                                    d="M 44 118 L 26 168 L 46 156 L 24 204"
                                    fill="none"
                                    stroke="rgba(129, 140, 248, 0.26)"
                                    strokeWidth="1.15"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    transform="rotate(-18 36 162)"
                                />
                                <path
                                    d="M 188 122 L 174 158 L 186 148 L 166 198"
                                    fill="none"
                                    stroke="rgba(139, 92, 246, 0.2)"
                                    strokeWidth="1"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d="M 62 38 L 52 72 L 62 64 L 48 108"
                                    fill="none"
                                    stroke="rgba(99, 102, 241, 0.28)"
                                    strokeWidth="1.25"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    transform="rotate(9 56 74)"
                                />
                                <path
                                    d="M 142 162 L 130 188 L 142 178 L 126 208"
                                    fill="none"
                                    stroke="rgba(167, 139, 250, 0.24)"
                                    strokeWidth="0.85"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d="M 18 74 L 8 112 L 20 102 L 6 156"
                                    fill="none"
                                    stroke="rgba(139, 92, 246, 0.16)"
                                    strokeWidth="0.95"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    transform="rotate(5 14 118)"
                                />
                                <path
                                    d="M 108 134 L 94 178 L 108 168 L 88 206"
                                    fill="none"
                                    stroke="rgba(124, 58, 237, 0.3)"
                                    strokeWidth="1.3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    transform="rotate(-11 98 172)"
                                />
                                <path
                                    d="M 198 68 L 182 108 L 194 100 L 174 156"
                                    fill="none"
                                    stroke="rgba(99, 102, 241, 0.17)"
                                    strokeWidth="1"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    transform="rotate(7 188 112)"
                                />
                                <path
                                    d="M 76 156 L 64 182 L 74 176 L 62 204"
                                    fill="none"
                                    stroke="rgba(139, 92, 246, 0.27)"
                                    strokeWidth="1.1"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d="M 30 176 L 18 198 L 26 194 L 14 206"
                                    fill="none"
                                    stroke="rgba(167, 139, 250, 0.19)"
                                    strokeWidth="0.75"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d="M 154 28 L 138 68 L 152 58 L 132 116"
                                    fill="none"
                                    stroke="rgba(139, 92, 246, 0.21)"
                                    strokeWidth="1.08"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    transform="rotate(-14 142 72)"
                                />
                            </pattern>
                        </defs>
                        <g className="auth__brand-flow__g">
                            <rect width="400%" height="400%" x="-150%" y="-150%" fill="url(#loginVectorPattern)" />
                        </g>
                    </svg>
                </div>
                <div className="auth__logo" aria-hidden>
                    <img
                        className="auth__logo-img"
                        src={brandLogo}
                        alt=""
                        width={280}
                        height={72}
                        decoding="async"
                    />
                </div>
                <p className="auth__tagline">Controle de acessos e dispositivos IoT</p>
            </div>

            <div className="auth__form-wrap">
                <div className="auth__card">
                    <h2 className="auth__card-title">Entrar</h2>
                    <p className="auth__card-desc">Use seu e-mail e senha para acessar o painel.</p>

                    <form className="auth__form" onSubmit={handleSubmit} noValidate>
                        <div className="form-group">
                            <label className="form-label" htmlFor="auth-email">E-mail</label>
                            <div className="auth__input-wrap">
                                <Mail className="auth__input-icon" size={20} aria-hidden />
                                <input
                                    id="auth-email"
                                    type="email"
                                    name="email"
                                    className="form-input auth__input"
                                    placeholder="seu@email.com"
                                    value={form.email}
                                    onChange={handleChange}
                                    required
                                    autoComplete="email"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="auth-password">Senha</label>
                            <div className="auth__input-wrap">
                                <Lock className="auth__input-icon" size={20} aria-hidden />
                                <input
                                    id="auth-password"
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    className="form-input auth__input"
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={handleChange}
                                    required
                                    minLength={6}
                                    autoComplete="current-password"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className="auth__toggle-pwd"
                                    onClick={() => setShowPassword((v) => !v)}
                                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <div className="auth__forgot">
                            <a href="#" className="auth__forgot-link">Esqueci a senha</a>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary auth__submit"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="spinner" style={{ width: 22, height: 22, borderWidth: 2 }} />
                            ) : (
                                'Entrar'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

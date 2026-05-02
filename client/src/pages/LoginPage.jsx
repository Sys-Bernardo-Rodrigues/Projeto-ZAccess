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

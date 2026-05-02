import { useState, useEffect } from 'react';
import { Moon, SunMedium, Trash2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import brandLogo from '../../svg/ZAccess.svg';

/** Limites do dia no fuso local → ISO para a API (igual à página de logs). */
function localDayToIsoRange(dateStr, endOfDay) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return null;
  const dt = endOfDay
    ? new Date(y, m - 1, d, 23, 59, 59, 999)
    : new Date(y, m - 1, d, 0, 0, 0, 0);
  return dt.toISOString();
}

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [theme, setTheme] = useState(() => localStorage.getItem('zacess_theme') || 'light');
  const [purgeStart, setPurgeStart] = useState('');
  const [purgeEnd, setPurgeEnd] = useState('');
  const [purging, setPurging] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('zacess_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handlePurgeLogs = async (e) => {
    e.preventDefault();
    if (!purgeStart || !purgeEnd) {
      toast.error('Preencha a data de início e a data de fim.');
      return;
    }
    const createdFrom = localDayToIsoRange(purgeStart, false);
    const createdTo = localDayToIsoRange(purgeEnd, true);
    if (!createdFrom || !createdTo) {
      toast.error('Datas inválidas.');
      return;
    }
    if (new Date(createdFrom) > new Date(createdTo)) {
      toast.error('A data inicial deve ser anterior ou igual à final.');
      return;
    }
    const ok = window.confirm(
      `Remover permanentemente do banco todos os logs de atividade entre ${purgeStart} e ${purgeEnd} (horário local)? Esta ação não pode ser desfeita.`
    );
    if (!ok) return;

    setPurging(true);
    try {
      const res = await api.post('/logs/purge', { createdFrom, createdTo });
      const n = res.data?.data?.deletedCount ?? 0;
      toast.success(`${n} registro(s) de log removido(s).`);
      setPurgeStart('');
      setPurgeEnd('');
    } catch (err) {
      const msg = err.response?.data?.message || 'Não foi possível limpar os logs.';
      toast.error(msg);
    } finally {
      setPurging(false);
    }
  };

  return (
    <div className="page">
      <div className="card" style={{ maxWidth: 720, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img
              src={brandLogo}
              alt="ZAccess"
              width={424}
              height={83}
              style={{
                width: 'auto',
                height: 40,
                maxWidth: 180,
                objectFit: 'contain',
                display: 'block',
              }}
            />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Configurações do sistema</h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Preferências do painel e ferramentas de administração.
              </p>
            </div>
          </div>
          {user && (
            <span
              style={{
                fontSize: '0.75rem',
                padding: '4px 10px',
                borderRadius: 999,
                border: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
              }}
            >
              Logado como <strong style={{ color: 'var(--text-primary)' }}>{user.email}</strong>
            </span>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          <section
            style={{
              padding: 16,
              borderRadius: 12,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem' }}>Tema do painel</h3>
                <p style={{ margin: 0, marginTop: 4, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Altere apenas para você. O backend continua o mesmo.
                </p>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 999,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                {theme === 'dark' ? <Moon size={16} /> : <SunMedium size={16} />}
                {theme === 'dark' ? 'Modo escuro' : 'Modo claro'}
              </button>
            </div>
          </section>

          {isAdmin && (
            <section
              style={{
                padding: 16,
                borderRadius: 12,
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
                <AlertTriangle size={20} color="var(--accent-warning)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.95rem' }}>Limpar logs de atividade</h3>
                  <p style={{ margin: 0, marginTop: 4, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Remove do banco de dados os registros da coleção de logs (acessos, dispositivos, convites, etc.)
                    no intervalo escolhido, para liberar espaço. Apenas administradores. Irreversível.
                  </p>
                </div>
              </div>
              <form
                onSubmit={handlePurgeLogs}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr auto',
                  gap: 12,
                  alignItems: 'flex-end',
                }}
              >
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>
                    Data início
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={purgeStart}
                    onChange={(e) => setPurgeStart(e.target.value)}
                    disabled={purging}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>
                    Data fim
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={purgeEnd}
                    onChange={(e) => setPurgeEnd(e.target.value)}
                    disabled={purging}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-secondary"
                  disabled={purging}
                  style={{
                    borderColor: 'var(--accent-danger)',
                    color: 'var(--accent-danger)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Trash2 size={18} />
                  {purging ? 'Removendo…' : 'Limpar período'}
                </button>
              </form>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}


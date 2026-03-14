import { useState, useEffect } from 'react';
import { Shield, Moon, SunMedium } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function SettingsPage() {
  const { user } = useAuth();
  const [theme, setTheme] = useState(() => localStorage.getItem('zacess_theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('zacess_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
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
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'rgba(129, 140, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Shield size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Configurações do sistema</h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Preferências locais do painel. Não alteram o backend.
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
        </div>
      </div>
    </div>
  );
}


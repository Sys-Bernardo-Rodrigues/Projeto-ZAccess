import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import { QrCode, Unlock, AlertTriangle } from 'lucide-react';

export default function RelayQrAccessPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('Processando QR...');

  const unlockByQr = async () => {
    setLoading(true);
    setSuccess(false);
    try {
      const res = await api.post('/relays/public/qr-trigger', { token });
      setMessage(res.data?.message || 'Porta acionada com sucesso.');
      setSuccess(true);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Não foi possível acionar a porta com este QR.');
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    unlockByQr();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0e1a',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          background: 'rgba(17,24,39,0.92)',
          border: '1px solid rgba(99,102,241,0.35)',
          borderRadius: 24,
          padding: 28,
          textAlign: 'center',
          color: '#f1f5f9',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            margin: '0 auto 14px',
            borderRadius: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: success ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)',
          }}
        >
          {success ? <Unlock size={30} /> : loading ? <QrCode size={30} /> : <AlertTriangle size={30} />}
        </div>

        <h1 style={{ marginBottom: 8, fontSize: '1.45rem', fontWeight: 800 }}>
          {loading ? 'Lendo QR...' : success ? 'Porta Acionada' : 'Falha no QR'}
        </h1>
        <p style={{ color: '#94a3b8', marginBottom: 18 }}>{message}</p>

        <button
          type="button"
          className="btn btn-primary"
          onClick={unlockByQr}
          disabled={loading}
          style={{ marginRight: 8 }}
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

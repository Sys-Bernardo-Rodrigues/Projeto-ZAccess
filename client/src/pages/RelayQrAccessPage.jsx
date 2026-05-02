import { QrCode, Info } from 'lucide-react';

/**
 * Abrir /relay-qr/:token na câmera ou no navegador não aciona a porta.
 * O mesmo token só é aceito em POST /relays/public/qr-trigger com inviteToken,
 * feito pelo leitor de QR da página /invite/:token.
 */
export default function RelayQrAccessPage() {
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
            background: 'rgba(99,102,241,0.2)',
          }}
        >
          <QrCode size={30} />
        </div>

        <h1 style={{ marginBottom: 8, fontSize: '1.45rem', fontWeight: 800 }}>
          QR da porta
        </h1>
        <p style={{ color: '#94a3b8', marginBottom: 16, lineHeight: 1.55 }}>
          Abrir este link no navegador <strong>não</strong> libera o acesso. Para a porta abrir, o convidado
          precisa abrir o <strong>link de convite</strong> que recebeu (<code style={{ color: '#c4b5fd' }}>/invite/…</code>)
          e usar o botão <strong>«Ler QR Code para liberar»</strong> apontando para este mesmo código.
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            textAlign: 'left',
            padding: 14,
            borderRadius: 14,
            background: 'rgba(99,102,241,0.12)',
            border: '1px solid rgba(99,102,241,0.25)',
            color: '#cbd5e1',
            fontSize: '0.88rem',
            lineHeight: 1.45,
          }}
        >
          <Info size={20} style={{ flexShrink: 0, marginTop: 2, color: '#a78bfa' }} />
          <span>
            Se você é o morador ou recebeu um convite por WhatsApp/e-mail, volte àquele link e escaneie
            o QR a partir da página do convite.
          </span>
        </div>
      </div>
    </div>
  );
}

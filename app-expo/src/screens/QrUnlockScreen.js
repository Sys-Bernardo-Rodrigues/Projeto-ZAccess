import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import BottomQuickMenu, { BOTTOM_MENU_SPACE } from '../components/BottomQuickMenu';
import { ApiService } from '../services/api';
import { useAppTheme } from '../styles';

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

export default function QrUnlockScreen({ navigation }) {
  const { commonStyles, colors } = useAppTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const lockRef = useRef(false);

  const canScan = useMemo(() => permission?.granted && !busy, [permission?.granted, busy]);

  const handleCodeScanned = async ({ data }) => {
    if (lockRef.current || !canScan) return;

    const token = extractInviteTokenFromQr(data);
    const relayToken = extractRelayQrToken(data);
    if (!token && !relayToken) {
      setError('QR inválido. Use um QR de convite (/invite/…) ou o QR da porta lido na página do convite.');
      return;
    }

    lockRef.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (relayToken && !token) {
        setError(
          'QR da porta: abra o link de convite no navegador (/invite/…) e use o leitor de QR lá. Este app não substitui esse fluxo.'
        );
        return;
      }
      if (token) {
        const info = await ApiService.getPublicInvitationByToken(token);
        const firstGate = info?.gates?.[0];
        if (!firstGate?.id) throw new Error('Nenhuma porta encontrada neste convite.');
        await ApiService.unlockByInvitationToken(token, firstGate.id);
        setNotice(`Acesso liberado em ${firstGate.name || 'porta'}!`);
      }
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Falha ao liberar acesso.');
    } finally {
      setBusy(false);
      setTimeout(() => {
        lockRef.current = false;
      }, 1200);
    }
  };

  return (
    <SafeAreaView style={commonStyles.screen}>
      <View style={{ flex: 1, paddingBottom: BOTTOM_MENU_SPACE }}>
        <View style={[commonStyles.container, { paddingBottom: 8 }]}>
          <View style={[commonStyles.card, { padding: 0, overflow: 'hidden' }]}>
            <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Leitor de QR</Text>
              <Text style={commonStyles.subtitle}>
                Aponte para o QR do convite (/invite/…). O QR físico da porta só funciona no leitor da página do convite no navegador.
              </Text>
            </View>

            <View style={{ padding: 14, gap: 10 }}>
              {!permission ? (
                <View style={[commonStyles.card, { alignItems: 'center' }]}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : null}

              {permission && !permission.granted ? (
                <View style={commonStyles.card}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>Permissão de câmera necessária</Text>
                  <Text style={commonStyles.subtitle}>Toque abaixo para permitir acesso à câmera no app.</Text>
                  <Pressable style={commonStyles.button} onPress={requestPermission}>
                    <Text style={commonStyles.buttonText}>Permitir câmera</Text>
                  </Pressable>
                </View>
              ) : null}

              {permission?.granted ? (
                <View style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
                  <CameraView
                    style={{ width: '100%', height: 380 }}
                    facing="back"
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    onBarcodeScanned={canScan ? handleCodeScanned : undefined}
                  />
                </View>
              ) : null}

              {busy ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={commonStyles.subtitle}>Processando QR...</Text>
                </View>
              ) : null}

              {notice ? (
                <View style={[commonStyles.card, { borderColor: 'rgba(16,185,129,0.45)', backgroundColor: 'rgba(16,185,129,0.1)' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={[commonStyles.subtitle, { color: colors.text }]}>{notice}</Text>
                  </View>
                </View>
              ) : null}

              {error ? (
                <View style={[commonStyles.card, { borderColor: 'rgba(239,68,68,0.45)', backgroundColor: 'rgba(239,68,68,0.1)' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="alert-circle" size={16} color={colors.danger} />
                    <Text style={[commonStyles.subtitle, { color: colors.text }]}>{error}</Text>
                  </View>
                </View>
              ) : null}

              <Pressable style={[commonStyles.buttonSecondary, { backgroundColor: '#1e293b' }]} onPress={() => navigation.navigate('Home')}>
                <Text style={commonStyles.buttonText}>Voltar ao início</Text>
              </Pressable>
            </View>
          </View>
        </View>
        <BottomQuickMenu navigation={navigation} currentRoute="QrUnlock" />
      </View>
    </SafeAreaView>
  );
}

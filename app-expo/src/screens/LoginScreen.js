import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AuthService } from '../services/auth';
import { useAppTheme } from '../styles';

export default function LoginScreen({ onLoggedIn }) {
  const { commonStyles, colors } = useAppTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberEmail, setRememberEmail] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometria');

  useEffect(() => {
    const load = async () => {
      const saved = await AuthService.getRememberedEmail();
      if (saved) setEmail(saved);
      const [canUse, hasCred, label] = await Promise.all([
        AuthService.canUseBiometric(),
        AuthService.hasBiometricCredentials(),
        AuthService.getBiometricLabel(),
      ]);
      setBiometricAvailable(canUse && hasCred);
      setBiometricLabel(label);
    };
    load();
  }, []);

  const submit = async () => {
    if (!email || !password) {
      setError('Informe e-mail e senha.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await AuthService.login(email, password);
      if (rememberEmail) await AuthService.setRememberedEmail(email);
      else await AuthService.clearRememberedEmail();
      onLoggedIn();
    } catch (err) {
      setError(err?.message || err?.response?.data?.message || 'Falha no login.');
    } finally {
      setLoading(false);
    }
  };

  const submitBiometric = async () => {
    setError('');
    setBiometricLoading(true);
    try {
      await AuthService.loginWithBiometric();
      onLoggedIn();
    } catch (err) {
      setError(err?.message || 'Falha na autenticação biométrica.');
    } finally {
      setBiometricLoading(false);
    }
  };

  return (
    <SafeAreaView style={commonStyles.screen}>
      <ScrollView contentContainerStyle={[commonStyles.container, { flexGrow: 1, justifyContent: 'center', paddingBottom: 34 }]}>
        <View style={{ alignItems: 'center', marginBottom: 22 }}>
          <LinearGradient
            colors={['#8b5cf6', '#6366f1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 78,
              height: 78,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 18,
              shadowColor: '#8b5cf6',
              shadowOpacity: 0.45,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 10 },
              elevation: 8,
            }}
          >
            <Ionicons name="flash" size={36} color={colors.white} />
          </LinearGradient>
          <Text style={commonStyles.title}>ZAccess</Text>
          <Text style={[commonStyles.subtitle, { marginTop: 4 }]}>Acesso inteligente para moradores e síndicos</Text>
        </View>

        <View style={commonStyles.card}>
          {biometricAvailable ? (
            <Pressable style={[commonStyles.buttonSecondary, { marginBottom: 8, flexDirection: 'row', gap: 8 }]} onPress={submitBiometric} disabled={biometricLoading}>
              {biometricLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name={biometricLabel === 'Face ID' ? 'scan' : 'finger-print'} size={18} color="#fff" />
                  <Text style={commonStyles.buttonText}>Entrar com {biometricLabel}</Text>
                </>
              )}
            </Pressable>
          ) : null}

          <Text style={{ color: colors.text, fontWeight: '600' }}>E-mail</Text>
          <TextInput
            style={commonStyles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="seu@email.com"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={{ color: colors.text, fontWeight: '600' }}>Senha</Text>
          <TextInput
            style={commonStyles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="********"
            placeholderTextColor={colors.textMuted}
          />
          <View style={commonStyles.rowBetween}>
            <Text style={{ color: colors.textMuted }}>Lembrar e-mail</Text>
            <Switch value={rememberEmail} onValueChange={setRememberEmail} />
          </View>
          {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
          <Pressable style={commonStyles.button} onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={commonStyles.buttonText}>Entrar</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

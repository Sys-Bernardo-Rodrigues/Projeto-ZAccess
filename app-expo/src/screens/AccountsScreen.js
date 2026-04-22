import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthService } from '../services/auth';
import BottomQuickMenu, { BOTTOM_MENU_SPACE } from '../components/BottomQuickMenu';
import { useAppTheme } from '../styles';

export default function AccountsScreen({ navigation }) {
  const { commonStyles, colors } = useAppTheme();
  const [accounts, setAccounts] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [list, active] = await Promise.all([AuthService.getAccounts(), AuthService.getActiveAccountId()]);
    setAccounts(list);
    setActiveId(active || '');
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addAccount = async () => {
    if (!email || !password) {
      setNotice('Informe e-mail e senha para adicionar.');
      return;
    }
    setSaving(true);
    try {
      await AuthService.login(email, password, { setActive: false });
      setEmail('');
      setPassword('');
      setNotice('Conta adicionada com sucesso.');
      await load();
    } catch (err) {
      setNotice(err?.message || 'Não foi possível adicionar a conta.');
    } finally {
      setSaving(false);
    }
  };

  const switchAccount = async (id) => {
    await AuthService.switchAccount(id);
    setNotice('Conta ativa alterada.');
    await load();
    navigation.navigate('Home');
  };

  const removeAccount = async (id) => {
    await AuthService.removeAccount(id);
    setNotice('Conta removida.');
    await load();
  };

  if (loading) {
    return (
      <SafeAreaView style={[commonStyles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.screen}>
      <View style={{ flex: 1 }}>
      <FlatList
        contentContainerStyle={[commonStyles.container, { paddingBottom: BOTTOM_MENU_SPACE }]}
        data={accounts}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={(
          <View style={{ gap: 12 }}>
            <View style={[commonStyles.card, { padding: 0, overflow: 'hidden' }]}>
              <LinearGradient colors={['rgba(99,102,241,0.22)', 'rgba(139,92,246,0.12)']} style={{ padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Pressable
                    onPress={() => navigation.navigate('Home')}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 11,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(255,255,255,0.14)',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.2)',
                    }}
                  >
                    <Ionicons name="arrow-back" size={18} color="#fff" />
                  </Pressable>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 19 }}>Contas</Text>
                  <View style={{ width: 38 }} />
                </View>
              </LinearGradient>
            </View>

            {notice ? (
              <View style={[commonStyles.card, { borderColor: 'rgba(99,102,241,0.5)' }]}>
                <Text style={[commonStyles.subtitle, { color: colors.text }]}>{notice}</Text>
              </View>
            ) : null}

            <View style={commonStyles.card}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>Adicionar nova conta</Text>
              <TextInput
                style={commonStyles.input}
                placeholder="E-mail"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
              />
              <TextInput
                style={commonStyles.input}
                placeholder="Senha"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <Pressable style={commonStyles.button} onPress={addAccount} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={commonStyles.buttonText}>Adicionar conta</Text>}
              </Pressable>
            </View>
          </View>
        )}
        renderItem={({ item }) => {
          const isActive = item.id === activeId;
          return (
            <View style={[commonStyles.card, { borderColor: isActive ? 'rgba(16,185,129,0.5)' : colors.border }]}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{item.user?.name || item.email || 'Conta'}</Text>
              <Text style={commonStyles.subtitle}>{item.location?.name || 'Sem local'}</Text>
              <Text style={commonStyles.subtitle}>{item.email}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  style={[commonStyles.buttonSecondary, { flex: 1, backgroundColor: isActive ? 'rgba(16,185,129,0.8)' : colors.primaryAlt }]}
                  onPress={() => switchAccount(item.id)}
                >
                  <Text style={commonStyles.buttonText}>{isActive ? 'Conta ativa' : 'Usar esta conta'}</Text>
                </Pressable>
                <Pressable style={[commonStyles.buttonDanger, { flex: 1 }]} onPress={() => removeAccount(item.id)}>
                  <Text style={commonStyles.buttonText}>Remover</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={(
          <View style={commonStyles.card}>
            <Text style={commonStyles.subtitle}>Nenhuma conta adicional cadastrada.</Text>
          </View>
        )}
      />
      <BottomQuickMenu navigation={navigation} currentRoute="Accounts" />
      </View>
    </SafeAreaView>
  );
}

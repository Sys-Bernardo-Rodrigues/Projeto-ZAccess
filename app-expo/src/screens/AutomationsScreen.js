import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable } from 'react-native';
import { ApiService } from '../services/api';
import { AuthService } from '../services/auth';
import BottomQuickMenu, { BOTTOM_MENU_SPACE } from '../components/BottomQuickMenu';
import { useAppTheme } from '../styles';

export default function AutomationsScreen({ navigation }) {
  const { commonStyles, colors } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [automations, setAutomations] = useState([]);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const session = await AuthService.getSession();
      const canAccess = session?.role === 'sindico';
      setAllowed(canAccess);
      if (!canAccess) return;
      const data = await ApiService.getAutomations();
      setAutomations(data.automations || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Falha ao carregar automações.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <SafeAreaView style={[commonStyles.screen, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color={colors.primary} /></SafeAreaView>;
  }

  if (!allowed) {
    return (
      <SafeAreaView style={commonStyles.screen}>
        <View style={[commonStyles.container, { flex: 1, justifyContent: 'center' }]}>
          <View style={commonStyles.card}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 18 }}>Acesso restrito</Text>
            <Text style={[commonStyles.subtitle, { marginTop: 8 }]}>
              Automações são permitidas apenas para contas de síndico.
            </Text>
            <Pressable style={[commonStyles.button, { marginTop: 12 }]} onPress={() => navigation.navigate('Home')}>
              <Text style={commonStyles.buttonText}>Voltar ao início</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.screen}>
      <View style={{ flex: 1 }}>
      <FlatList
        contentContainerStyle={[commonStyles.container, { paddingBottom: BOTTOM_MENU_SPACE }]}
        data={automations}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={(
          <View style={{ gap: 12 }}>
            <View style={[commonStyles.card, { padding: 0, overflow: 'hidden' }]}>
              <LinearGradient
                colors={['rgba(99,102,241,0.22)', 'rgba(139,92,246,0.12)']}
                style={{ padding: 14 }}
              >
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
                  <Text style={{ color: colors.text, fontSize: 19, fontWeight: '800' }}>Automações</Text>
                  <View style={{ width: 38 }} />
                </View>
              </LinearGradient>
            </View>

            <View style={[commonStyles.card, { padding: 0, overflow: 'hidden' }]}>
              <LinearGradient
                colors={['rgba(139,92,246,0.22)', 'rgba(99,102,241,0.10)']}
                style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}
              >
                <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Regras inteligentes</Text>
                <Text style={commonStyles.subtitle}>Automação ativa do seu local</Text>
              </LinearGradient>
              <View style={{ padding: 16 }}>
                <Text style={[commonStyles.subtitle, { color: colors.text }]}>
                  Total: {automations.length}
                </Text>
              </View>
            </View>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={commonStyles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: item.enabled ? 'rgba(16,185,129,0.18)' : 'rgba(148,163,184,0.2)',
                }}
              >
                <Ionicons
                  name={item.enabled ? 'sparkles' : 'pause-circle'}
                  size={18}
                  color={item.enabled ? colors.success : colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{item.name || 'Automação'}</Text>
                <Text style={commonStyles.subtitle}>Trigger: {item.trigger?.inputId?.name || '-'}</Text>
              </View>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: item.enabled ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.15)',
                  borderWidth: 1,
                  borderColor: item.enabled ? 'rgba(16,185,129,0.4)' : colors.border,
                }}
              >
                <Text style={{ color: item.enabled ? colors.success : colors.textMuted, fontWeight: '700', fontSize: 12 }}>
                  {item.enabled ? 'ATIVA' : 'PAUSADA'}
                </Text>
              </View>
            </View>
            <Text style={[commonStyles.subtitle, { marginTop: 4 }]}>
              Ação: {item.action?.relayId?.name || '-'}
            </Text>
          </View>
        )}
        ListEmptyComponent={<View style={commonStyles.card}><Text style={commonStyles.subtitle}>{error || 'Nenhuma automação encontrada.'}</Text></View>}
      />
      <BottomQuickMenu navigation={navigation} currentRoute="Menu" />
      </View>
    </SafeAreaView>
  );
}

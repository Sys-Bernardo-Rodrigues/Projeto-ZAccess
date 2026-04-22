import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ApiService } from '../services/api';
import { AuthService } from '../services/auth';
import BottomQuickMenu, { BOTTOM_MENU_SPACE } from '../components/BottomQuickMenu';
import { useAppTheme } from '../styles';

export default function HomeScreen({ navigation, onLogout }) {
  const { commonStyles, colors } = useAppTheme();
  const [session, setSession] = useState({ user: null, location: null, role: 'morador' });
  const [relays, setRelays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const currentSession = await AuthService.getSession();
      const relayData = await ApiService.getRelays();
      setSession(currentSession);
      setRelays(relayData.relays || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    load();
    return unsub;
  }, [navigation, load]);

  const toggleRelay = async (relayId) => {
    setToggling(relayId);
    try {
      await ApiService.toggleRelay(relayId);
      await load();
    } finally {
      setToggling('');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[commonStyles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.screen}>
      <View style={{ flex: 1 }}>
      <FlatList
        contentContainerStyle={[commonStyles.container, { paddingBottom: BOTTOM_MENU_SPACE }]}
        data={relays}
        keyExtractor={(item) => item._id}
        numColumns={2}
        columnWrapperStyle={{ gap: 10 }}
        ListHeaderComponent={(
          <View style={{ gap: 12 }}>
            <View style={[commonStyles.card, { padding: 0, overflow: 'hidden' }]}>
              <LinearGradient
                colors={['rgba(139,92,246,0.34)', 'rgba(79,70,229,0.16)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: 18 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      backgroundColor: 'rgba(255,255,255,0.16)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Ionicons name="flash" size={24} color={colors.white} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }} numberOfLines={1}>
                        Olá, {session.user?.name || 'Usuário'}
                      </Text>
                      <Text style={commonStyles.subtitle} numberOfLines={1}>{session.location?.name || 'Seu local'}</Text>
                    </View>
                  </View>
                  <Pressable onPress={onLogout} style={{ padding: 6 }}>
                    <Ionicons name="log-out-outline" size={24} color={colors.textMuted} />
                  </Pressable>
                </View>
              </LinearGradient>
            </View>

          </View>
        )}
        ListFooterComponent={<View style={{ height: 20 }} />}
        renderItem={({ item }) => {
          const isOpen = item.mode !== 'pulse' && item.state === 'open';
          const busy = toggling === item._id;
          return (
            <View style={[commonStyles.card, { flex: 1, minHeight: 170, borderColor: isOpen ? 'rgba(16,185,129,0.5)' : colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{item.name}</Text>
                </View>
              </View>
              <View style={{ flex: 1 }} />
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 }}>
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: isOpen ? 'rgba(16,185,129,0.16)' : 'rgba(148,163,184,0.16)',
                    borderWidth: 1,
                    borderColor: isOpen ? 'rgba(16,185,129,0.45)' : colors.border,
                  }}
                >
                  <Text style={{ color: isOpen ? colors.success : colors.textMuted, fontSize: 11, fontWeight: '700' }}>
                    {isOpen ? 'ABERTO' : 'FECHADO'}
                  </Text>
                </View>

                <Pressable onPress={() => toggleRelay(item._id)} disabled={busy}>
                  {({ pressed }) => (
                    <LinearGradient
                      colors={isOpen ? ['#10b981', '#059669'] : ['#6366f1', '#8b5cf6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: busy ? 0.75 : pressed ? 0.82 : 1,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.2)',
                        shadowColor: isOpen ? '#10b981' : '#6366f1',
                        shadowOpacity: 0.35,
                        shadowRadius: 10,
                        shadowOffset: { width: 0, height: 6 },
                        elevation: 4,
                      }}
                    >
                      {busy ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Ionicons
                          name={isOpen ? 'lock-open' : 'lock-closed'}
                          size={20}
                          color="#fff"
                        />
                      )}
                    </LinearGradient>
                  )}
                </Pressable>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={(
          <View style={commonStyles.card}>
            <Text style={commonStyles.subtitle}>Nenhuma porta cadastrada para o seu local.</Text>
          </View>
        )}
      />
      <BottomQuickMenu navigation={navigation} currentRoute="Home" />
      </View>
    </SafeAreaView>
  );
}

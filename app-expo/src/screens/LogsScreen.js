import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable } from 'react-native';
import { ApiService } from '../services/api';
import BottomQuickMenu, { BOTTOM_MENU_SPACE } from '../components/BottomQuickMenu';
import { useAppTheme } from '../styles';

export default function LogsScreen({ navigation }) {
  const { commonStyles, colors } = useAppTheme();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await ApiService.getLogs();
      setLogs(data.logs || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Falha ao carregar logs.');
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

  return (
    <SafeAreaView style={commonStyles.screen}>
      <View style={{ flex: 1 }}>
      <FlatList
        contentContainerStyle={[commonStyles.container, { paddingBottom: BOTTOM_MENU_SPACE }]}
        data={logs}
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
                  <Text style={{ color: colors.text, fontSize: 19, fontWeight: '800' }}>Verificações</Text>
                  <View style={{ width: 38 }} />
                </View>
              </LinearGradient>
            </View>

            <View style={[commonStyles.card, { padding: 0, overflow: 'hidden' }]}>
              <LinearGradient
                colors={['rgba(99,102,241,0.18)', 'rgba(139,92,246,0.10)']}
                style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}
              >
                <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Histórico</Text>
                <Text style={commonStyles.subtitle}>Ações e acessos realizados</Text>
              </LinearGradient>
            </View>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={commonStyles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: 'rgba(99,102,241,0.18)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="time" size={17} color={colors.primaryAlt} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{item.action || 'Ação'}</Text>
                <Text style={commonStyles.subtitle}>{item.description || '-'}</Text>
              </View>
            </View>
            <Text style={[commonStyles.subtitle, { marginTop: 2 }]}>
              {new Date(item.createdAt || Date.now()).toLocaleString('pt-BR')}
            </Text>
          </View>
        )}
        ListEmptyComponent={<View style={commonStyles.card}><Text style={commonStyles.subtitle}>{error || 'Sem registros.'}</Text></View>}
      />
      <BottomQuickMenu navigation={navigation} currentRoute="Menu" />
      </View>
    </SafeAreaView>
  );
}

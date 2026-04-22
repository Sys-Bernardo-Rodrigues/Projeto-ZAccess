import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import BottomQuickMenu, { BOTTOM_MENU_SPACE } from '../components/BottomQuickMenu';
import { AuthService } from '../services/auth';
import { useAppTheme } from '../styles';

export default function MenuScreen({ navigation }) {
  const { commonStyles, colors } = useAppTheme();
  const [role, setRole] = useState('morador');

  useEffect(() => {
    AuthService.getSession().then((session) => setRole(session?.role || 'morador'));
  }, []);

  const pages = useMemo(() => {
    const base = [
      { key: 'Home', title: 'Início', subtitle: 'Visão geral e relés', icon: 'home' },
      { key: 'QrUnlock', title: 'Leitor de QR', subtitle: 'Abrir porta pelo QR Code', icon: 'camera' },
      { key: 'Accounts', title: 'Contas', subtitle: 'Gerencie contas salvas', icon: 'people' },
      { key: 'Invites', title: 'Convite', subtitle: 'Gerar e administrar convites', icon: 'mail' },
      { key: 'Notifications', title: 'Notificações', subtitle: 'Avisos e comunicados', icon: 'notifications' },
    ];

    if (role === 'sindico') {
      base.push(
        { key: 'Automations', title: 'Automações', subtitle: 'Regras inteligentes', icon: 'sparkles' },
        { key: 'Logs', title: 'Verificações', subtitle: 'Histórico de ações', icon: 'shield-checkmark' },
        { key: 'LocationUsers', title: 'Usuários', subtitle: 'Cadastrar moradores e síndicos', icon: 'person-add' },
      );
    }
    return base;
  }, [role]);

  return (
    <SafeAreaView style={commonStyles.screen}>
      <View style={{ flex: 1 }}>
        <FlatList
          contentContainerStyle={[commonStyles.container, { paddingBottom: BOTTOM_MENU_SPACE + 20 }]}
          data={pages}
          keyExtractor={(item) => item.key}
          ListHeaderComponent={(
            <View style={{ gap: 12 }}>
              <View style={[commonStyles.card, { padding: 0, overflow: 'hidden' }]}>
                <LinearGradient colors={['rgba(99,102,241,0.24)', 'rgba(139,92,246,0.12)']} style={{ padding: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ width: 38 }} />
                    <Text style={{ color: colors.text, fontSize: 19, fontWeight: '800' }}>Menu</Text>
                    <View style={{ width: 38 }} />
                  </View>
                </LinearGradient>
              </View>
            </View>
          )}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => navigation.navigate(item.key)}
              style={[commonStyles.card, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(99,102,241,0.16)',
                  borderWidth: 1,
                  borderColor: 'rgba(99,102,241,0.35)',
                }}
              >
                <Ionicons name={item.icon} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{item.title}</Text>
                <Text style={commonStyles.subtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        />
        <BottomQuickMenu navigation={navigation} currentRoute="Menu" />
      </View>
    </SafeAreaView>
  );
}

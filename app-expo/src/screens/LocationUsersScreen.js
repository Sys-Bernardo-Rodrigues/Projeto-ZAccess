import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ApiService } from '../services/api';
import BottomQuickMenu, { BOTTOM_MENU_SPACE } from '../components/BottomQuickMenu';
import { useAppTheme } from '../styles';

export default function LocationUsersScreen({ navigation }) {
  const { commonStyles, colors } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'morador',
    phone: '',
    unit: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ApiService.getLocationUsers();
      setUsers(data.users || []);
    } catch (error) {
      setNotice(error?.response?.data?.message || 'Falha ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!form.name || !form.email || !form.password) {
      setNotice('Preencha nome, e-mail e senha.');
      return;
    }
    setSaving(true);
    try {
      await ApiService.createLocationUser(form);
      setForm({ name: '', email: '', password: '', role: 'morador', phone: '', unit: '' });
      setNotice('Usuário cadastrado com sucesso.');
      await load();
    } catch (error) {
      setNotice(error?.response?.data?.message || 'Erro ao cadastrar usuário.');
    } finally {
      setSaving(false);
    }
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
        data={users}
        keyExtractor={(item) => item._id}
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
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 19 }}>Usuários</Text>
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
              <Text style={{ color: colors.text, fontWeight: '700' }}>Cadastrar usuário do local</Text>
              <TextInput
                style={commonStyles.input}
                placeholder="Nome completo"
                placeholderTextColor={colors.textMuted}
                value={form.name}
                onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
              />
              <TextInput
                style={commonStyles.input}
                placeholder="E-mail"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                value={form.email}
                onChangeText={(v) => setForm((p) => ({ ...p, email: v }))}
              />
              <TextInput
                style={commonStyles.input}
                placeholder="Senha"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={form.password}
                onChangeText={(v) => setForm((p) => ({ ...p, password: v }))}
              />
              <TextInput
                style={commonStyles.input}
                placeholder="Telefone (opcional)"
                placeholderTextColor={colors.textMuted}
                value={form.phone}
                onChangeText={(v) => setForm((p) => ({ ...p, phone: v }))}
              />
              <TextInput
                style={commonStyles.input}
                placeholder="Unidade (opcional)"
                placeholderTextColor={colors.textMuted}
                value={form.unit}
                onChangeText={(v) => setForm((p) => ({ ...p, unit: v }))}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  style={[commonStyles.buttonSecondary, { flex: 1, backgroundColor: form.role === 'morador' ? colors.primaryAlt : '#1e293b' }]}
                  onPress={() => setForm((p) => ({ ...p, role: 'morador' }))}
                >
                  <Text style={commonStyles.buttonText}>Morador</Text>
                </Pressable>
                <Pressable
                  style={[commonStyles.buttonSecondary, { flex: 1, backgroundColor: form.role === 'sindico' ? colors.primaryAlt : '#1e293b' }]}
                  onPress={() => setForm((p) => ({ ...p, role: 'sindico' }))}
                >
                  <Text style={commonStyles.buttonText}>Síndico</Text>
                </Pressable>
              </View>
              <Pressable style={commonStyles.button} onPress={submit} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={commonStyles.buttonText}>Cadastrar usuário</Text>}
              </Pressable>
            </View>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={commonStyles.card}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{item.name}</Text>
            <Text style={commonStyles.subtitle}>{item.email}</Text>
            <Text style={commonStyles.subtitle}>Papel: {item.role}</Text>
            <Text style={commonStyles.subtitle}>Unidade: {item.unit || '-'}</Text>
          </View>
        )}
        ListEmptyComponent={(
          <View style={commonStyles.card}>
            <Text style={commonStyles.subtitle}>Nenhum usuário cadastrado no local.</Text>
          </View>
        )}
      />
      <BottomQuickMenu navigation={navigation} currentRoute="Menu" />
      </View>
    </SafeAreaView>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, KeyboardAvoidingView, Modal, Pressable, RefreshControl, ScrollView, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ApiService } from '../services/api';
import { AuthService } from '../services/auth';
import BottomQuickMenu, { BOTTOM_MENU_SPACE } from '../components/BottomQuickMenu';
import { useAppTheme } from '../styles';

export default function NotificationsScreen({ navigation }) {
  const { commonStyles, colors } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [sessionRole, setSessionRole] = useState('morador');
  const [notice, setNotice] = useState({ type: '', message: '' });
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [form, setForm] = useState({
    title: '',
    message: '',
    audience: 'morador',
  });

  const notificationsCount = useMemo(() => notifications.length, [notifications]);

  const getAudienceLabel = (audience) => {
    if (audience === 'all') return 'Todos';
    if (audience === 'sindico') return 'Síndicos';
    return 'Moradores';
  };

  const getAudienceStyle = (audience) => {
    if (audience === 'all') {
      return {
        backgroundColor: 'rgba(99,102,241,0.18)',
        borderColor: 'rgba(99,102,241,0.45)',
        color: '#c7d2fe',
        icon: 'people',
      };
    }
    if (audience === 'sindico') {
      return {
        backgroundColor: 'rgba(245,158,11,0.18)',
        borderColor: 'rgba(245,158,11,0.45)',
        color: '#fde68a',
        icon: 'shield',
      };
    }
    return {
      backgroundColor: 'rgba(16,185,129,0.16)',
      borderColor: 'rgba(16,185,129,0.45)',
      color: '#86efac',
      icon: 'home',
    };
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const session = await AuthService.getSession();
      setSessionRole(session?.role || 'morador');
      const data = await ApiService.getNotifications();
      setNotifications(data.notifications || []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Falha ao carregar notificações.');
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      setNotice({ type: 'error', message: 'Preencha título e mensagem.' });
      return;
    }
    setSaving(true);
    try {
      await ApiService.createNotification({
        title: form.title.trim(),
        message: form.message.trim(),
        audience: form.audience,
      });
      setForm({ title: '', message: '', audience: 'morador' });
      setNotice({ type: 'success', message: 'Notificação enviada com sucesso.' });
      setShowComposer(false);
      await load();
    } catch (e) {
      setNotice({ type: 'error', message: e?.response?.data?.message || 'Falha ao enviar notificação.' });
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
        contentContainerStyle={[commonStyles.container, { paddingBottom: BOTTOM_MENU_SPACE + 48 }]}
        data={notifications}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={(
          <View style={{ gap: 12 }}>
            <View style={[commonStyles.card, { padding: 0, overflow: 'hidden' }]}>
              <LinearGradient colors={['rgba(99,102,241,0.24)', 'rgba(139,92,246,0.12)']} style={{ padding: 14 }}>
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
                  <Text style={{ color: colors.text, fontSize: 19, fontWeight: '800' }}>Notificações</Text>
                  <View style={{ width: 38 }} />
                </View>
                <View style={{ marginTop: 12, flexDirection: 'row', gap: 8 }}>
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.2)',
                      backgroundColor: 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12 }}>
                      Total: {notificationsCount}
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: 'rgba(16,185,129,0.35)',
                      backgroundColor: 'rgba(16,185,129,0.12)',
                    }}
                  >
                    <Text style={{ color: colors.success, fontWeight: '700', fontSize: 12 }}>
                      Atualizações do local
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {sessionRole === 'sindico' ? (
              <View style={[commonStyles.card, { padding: 0, overflow: 'hidden', marginBottom: 8 }]}>
                <LinearGradient
                  colors={['rgba(139,92,246,0.22)', 'rgba(99,102,241,0.10)']}
                  style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}
                >
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 18 }}>Comunicados</Text>
                  <Text style={commonStyles.subtitle}>Envie avisos para moradores e acompanhe o histórico</Text>
                </LinearGradient>
                <View style={{ padding: 16 }}>
                  <Pressable
                    style={[commonStyles.button, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}
                    onPress={() => setShowComposer(true)}
                  >
                    <Ionicons name="send" size={16} color="#fff" />
                    <Text style={commonStyles.buttonText}>Enviar notificação</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {notice.message ? (
              <View
                style={[
                  commonStyles.card,
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    borderColor: notice.type === 'success' ? 'rgba(16,185,129,0.45)' : 'rgba(239,68,68,0.45)',
                    backgroundColor: notice.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  },
                ]}
              >
                <Ionicons
                  name={notice.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                  size={16}
                  color={notice.type === 'success' ? colors.success : colors.danger}
                />
                <Text style={[commonStyles.subtitle, { color: colors.text, flex: 1 }]}>{notice.message}</Text>
              </View>
            ) : null}

            {error ? (
              <View style={commonStyles.card}>
                <Text style={[commonStyles.subtitle, { color: colors.text }]}>{error}</Text>
              </View>
            ) : null}
          </View>
        )}
        renderItem={({ item }) => {
          const audienceStyle = getAudienceStyle(item.audience);
          return (
            <View style={[commonStyles.card, { gap: 10 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16, flex: 1 }}>{item.title}</Text>
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: audienceStyle.borderColor,
                    backgroundColor: audienceStyle.backgroundColor,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <Ionicons name={audienceStyle.icon} size={12} color={audienceStyle.color} />
                  <Text style={{ color: audienceStyle.color, fontWeight: '700', fontSize: 11 }}>
                    {getAudienceLabel(item.audience)}
                  </Text>
                </View>
              </View>
              <Text style={[commonStyles.subtitle, { color: colors.text, lineHeight: 20 }]}>{item.message}</Text>
              <View style={{ height: 1, backgroundColor: colors.border }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Ionicons name="person-circle-outline" size={15} color={colors.textMuted} />
                  <Text style={commonStyles.subtitle} numberOfLines={1}>
                    {item.createdByLocationUser?.name || 'Sistema'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="time-outline" size={15} color={colors.textMuted} />
                  <Text style={commonStyles.subtitle}>
                    {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={(
          <View style={[commonStyles.card, { alignItems: 'center', paddingVertical: 26 }]}>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(99,102,241,0.16)',
                borderWidth: 1,
                borderColor: 'rgba(99,102,241,0.4)',
                marginBottom: 8,
              }}
            >
              <Ionicons name="notifications-off-outline" size={22} color={colors.primary} />
            </View>
            <Text style={[commonStyles.subtitle, { color: colors.text }]}>Nenhuma notificação disponível.</Text>
            <Text style={[commonStyles.subtitle, { textAlign: 'center' }]}>
              Quando houver um novo comunicado, ele aparecerá aqui.
            </Text>
          </View>
        )}
      />
      <Modal
        visible={showComposer}
        transparent
        animationType="fade"
        onRequestClose={() => setShowComposer(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior="padding"
            style={{
              flex: 1,
              backgroundColor: 'rgba(2,6,23,0.82)',
              justifyContent: 'center',
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          >
            <Pressable onPress={() => {}} style={[commonStyles.card, { padding: 0, overflow: 'hidden', height: '55%' }]}>
            <LinearGradient
              colors={['rgba(139,92,246,0.24)', 'rgba(99,102,241,0.10)']}
              style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}
            >
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 18 }}>Nova notificação</Text>
              <Text style={commonStyles.subtitle}>Preencha o comunicado e confirme o envio</Text>
            </LinearGradient>

            <ScrollView
              contentContainerStyle={{ padding: 16, gap: 10 }}
              keyboardShouldPersistTaps="handled"
            >
              <TextInput
                style={commonStyles.input}
                placeholder="Título"
                placeholderTextColor={colors.textMuted}
                value={form.title}
                onChangeText={(v) => setForm((p) => ({ ...p, title: v }))}
              />
              <TextInput
                style={[commonStyles.input, { minHeight: 140, textAlignVertical: 'top', paddingTop: 12 }]}
                multiline
                placeholder="Mensagem"
                placeholderTextColor={colors.textMuted}
                value={form.message}
                onChangeText={(v) => setForm((p) => ({ ...p, message: v }))}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  style={[commonStyles.buttonSecondary, { flex: 1, backgroundColor: form.audience === 'morador' ? colors.primaryAlt : '#1e293b', borderWidth: 1, borderColor: colors.border }]}
                  onPress={() => setForm((p) => ({ ...p, audience: 'morador' }))}
                >
                  <Text style={commonStyles.buttonText}>Moradores</Text>
                </Pressable>
                <Pressable
                  style={[commonStyles.buttonSecondary, { flex: 1, backgroundColor: form.audience === 'all' ? colors.primaryAlt : '#1e293b', borderWidth: 1, borderColor: colors.border }]}
                  onPress={() => setForm((p) => ({ ...p, audience: 'all' }))}
                >
                  <Text style={commonStyles.buttonText}>Todos</Text>
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                <Pressable
                  style={[commonStyles.buttonSecondary, { flex: 1, backgroundColor: '#1e293b', borderWidth: 1, borderColor: colors.border }]}
                  onPress={() => setShowComposer(false)}
                  disabled={saving}
                >
                  <Text style={commonStyles.buttonText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={[commonStyles.button, { flex: 1, minHeight: 50 }]}
                  onPress={submit}
                  disabled={saving}
                >
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={commonStyles.buttonText}>Enviar</Text>}
                </Pressable>
              </View>
            </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
      <BottomQuickMenu navigation={navigation} currentRoute="Menu" />
      </View>
    </SafeAreaView>
  );
}

import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ApiService } from '../services/api';
import { AuthService } from '../services/auth';
import BottomQuickMenu, { BOTTOM_MENU_SPACE } from '../components/BottomQuickMenu';
import { buildPublicInviteUrl, PUBLIC_INVITE_BASE_URL } from '../config';
import { useAppTheme } from '../styles';

const defaultForm = () => {
  const now = new Date();
  const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    name: '',
    validFrom: now,
    validUntil: future,
    relayIds: [],
  };
};

export default function InvitesScreen({ navigation }) {
  const { commonStyles, colors, isDark } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [sessionRole, setSessionRole] = useState('morador');
  const [invites, setInvites] = useState([]);
  const [relays, setRelays] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState(defaultForm());
  const [saving, setSaving] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const noticeTimeoutRef = useRef(null);
  const [picker, setPicker] = useState({
    visible: false,
    field: 'validFrom',
    value: new Date(),
    mode: 'date',
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const session = await AuthService.getSession();
      setSessionRole(session?.role || 'morador');
      const [i, r] = await Promise.all([ApiService.getInvitations(), ApiService.getRelays()]);
      setInvites(i.invitations || []);
      const appRelays = r.relays || [];
      const allowedRelays = (session?.role === 'morador')
        ? appRelays.filter((relay) => relay.allowResidentInvitation)
        : appRelays;
      setRelays(allowedRelays);
    } catch (e) {
      setError(e.response?.data?.message || 'Falha ao carregar convites.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => () => {
    if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
  }, []);

  const formatLocalDateTime = (value) => {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) return '-';
    const formatted = value.toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    return formatted.replace(/^(\d{2}) de ([a-zç]+)/i, (_, day, month) => `${day} de ${month.charAt(0).toUpperCase()}${month.slice(1)}`);
  };

  const applyPickedDate = (field, selectedDate, selectionMode = 'date') => {
    if (!selectedDate) return;
    const current = form[field] instanceof Date ? form[field] : new Date();

    let mergedDate;
    if (selectionMode === 'time') {
      // Mantém a data atual e aplica apenas hora/minuto selecionados.
      mergedDate = new Date(current);
      mergedDate.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
    } else {
      // Mantém a hora atual e aplica apenas o dia/mês/ano selecionados.
      mergedDate = new Date(selectedDate);
      if (!Number.isNaN(current.getTime())) {
        mergedDate.setHours(current.getHours(), current.getMinutes(), 0, 0);
      }
    }

    setForm((prev) => ({
      ...prev,
      [field]: mergedDate,
    }));
  };

  const openDatePicker = (field) => {
    Keyboard.dismiss();
    const currentValue = form[field] instanceof Date ? form[field] : new Date();
    setPicker({
      visible: true,
      field,
      value: currentValue,
      mode: 'date',
    });
  };

  const onChangePicker = (event, selectedDate) => {
    const fallbackFromEvent = event?.nativeEvent?.timestamp
      ? new Date(event.nativeEvent.timestamp)
      : null;
    const nextValue = selectedDate || fallbackFromEvent;
    if (!nextValue || Number.isNaN(nextValue.getTime?.())) return;
    setPicker((prev) => ({ ...prev, value: nextValue }));
  };

  const confirmPicker = () => {
    const selectedDate = picker.value;
    if (picker.field === 'validUntil' && selectedDate < form.validFrom) {
      setNotice('A data final não pode ser menor que a inicial.');
      setPicker((prev) => ({ ...prev, visible: false }));
      return;
    }
    applyPickedDate(picker.field, selectedDate, picker.mode);
    setPicker((prev) => ({ ...prev, visible: false }));
  };

  const closePicker = () => {
    setPicker((prev) => ({ ...prev, visible: false }));
  };

  const toggleRelay = (relayId) => {
    setForm((prev) => ({
      ...prev,
      relayIds: prev.relayIds.includes(relayId)
        ? prev.relayIds.filter((id) => id !== relayId)
        : [...prev.relayIds, relayId],
    }));
  };

  const createInvite = async () => {
    if (!form.name || form.relayIds.length === 0) return;
    setSaving(true);
    try {
      await ApiService.createInvitation({
        ...form,
        validFrom: form.validFrom.toISOString(),
        validUntil: form.validUntil.toISOString(),
      });
      setForm(defaultForm());
      setShowComposer(false);
      setNotice('Convite criado com sucesso!');
      if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
      noticeTimeoutRef.current = setTimeout(() => setNotice(''), 2200);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const deleteInvite = async (id) => {
    await ApiService.deleteInvitation(id);
    load();
  };

  const copyLink = async (token) => {
    const publicLink = buildPublicInviteUrl(token);
    await Clipboard.setStringAsync(publicLink);
    if (!PUBLIC_INVITE_BASE_URL) {
      setNotice('Link copiado. Configure EXPO_PUBLIC_PUBLIC_WEB_URL para URL pública correta.');
    } else {
      setNotice('Link copiado com sucesso!');
    }
    if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
    noticeTimeoutRef.current = setTimeout(() => setNotice(''), 2200);
  };

  if (loading) {
    return <SafeAreaView style={[commonStyles.screen, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color={colors.primary} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={commonStyles.screen}>
      <View style={{ flex: 1 }}>
      <FlatList
        contentContainerStyle={[commonStyles.container, { paddingBottom: BOTTOM_MENU_SPACE }]}
        data={invites}
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
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 19 }}>Convites</Text>
                  <View style={{ width: 38 }} />
                </View>
              </LinearGradient>
            </View>

            {notice ? (
              <View
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: 'rgba(16,185,129,0.45)',
                  backgroundColor: 'rgba(16,185,129,0.16)',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={{ color: colors.success, fontWeight: '700', fontSize: 12 }}>{notice}</Text>
              </View>
            ) : null}

            <View style={[commonStyles.card, { padding: 0, overflow: 'hidden' }]}>
              <LinearGradient
                colors={['rgba(139,92,246,0.24)', 'rgba(99,102,241,0.10)']}
                style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}
              >
                <Text style={{ color: colors.text, fontWeight: '800', fontSize: 20 }}>Convites</Text>
                <Text style={commonStyles.subtitle}>
                  {sessionRole === 'morador'
                    ? 'Crie links para visitantes nas portas liberadas pelo síndico'
                    : 'Crie links temporarios para visitantes'}
                </Text>
              </LinearGradient>
              <View style={{ padding: 16 }}>
                <Pressable
                  style={[commonStyles.button, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}
                  onPress={() => setShowComposer(true)}
                  disabled={sessionRole === 'morador' && relays.length === 0}
                >
                  <Ionicons name="add-circle-outline" size={16} color="#fff" />
                  <Text style={commonStyles.buttonText}>Novo convite</Text>
                </Pressable>
                {sessionRole === 'morador' && relays.length === 0 ? (
                  <Text style={[commonStyles.subtitle, { marginTop: 8 }]}>
                    Nenhuma porta está liberada para convite de morador neste local.
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={commonStyles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(99,102,241,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="mail-open" size={16} color={colors.primaryAlt} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{item.name}</Text>
                <Text style={commonStyles.subtitle}>
                  {new Date(item.validFrom).toLocaleString('pt-BR')} ate {new Date(item.validUntil).toLocaleString('pt-BR')}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable style={[commonStyles.buttonSecondary, { flex: 1 }]} onPress={() => copyLink(item.token)}>
                <Text style={commonStyles.buttonText}>Copiar link</Text>
              </Pressable>
              <Pressable style={[commonStyles.buttonDanger, { flex: 1 }]} onPress={() => deleteInvite(item._id)}>
                <Text style={commonStyles.buttonText}>Remover</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={<View style={commonStyles.card}><Text style={commonStyles.subtitle}>{error || 'Nenhum convite encontrado.'}</Text></View>}
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
            <Pressable onPress={() => {}} style={[commonStyles.card, { padding: 0, overflow: 'hidden', height: '68%' }]}>
              <LinearGradient
                colors={['rgba(99,102,241,0.24)', 'rgba(139,92,246,0.12)']}
                style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}
              >
                <Text style={{ color: colors.text, fontWeight: '800', fontSize: 18 }}>Novo convite</Text>
                <Text style={commonStyles.subtitle}>Preencha os dados e confirme a criação</Text>
              </LinearGradient>

              <ScrollView
                contentContainerStyle={{ padding: 14, gap: 10 }}
                keyboardShouldPersistTaps="handled"
              >
                <TextInput
                  style={commonStyles.input}
                  placeholder="Nome do convidado"
                  placeholderTextColor={colors.textMuted}
                  value={form.name}
                  onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
                />
                <Pressable
                  onPress={() => openDatePicker('validFrom')}
                  style={[commonStyles.input, { justifyContent: 'center', height: 52 }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600' }}>Início</Text>
                      <Text style={{ color: colors.text, fontWeight: '700', marginTop: 2 }}>
                        {formatLocalDateTime(form.validFrom)}
                      </Text>
                    </View>
                    <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => openDatePicker('validUntil')}
                  style={[commonStyles.input, { justifyContent: 'center', height: 52 }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600' }}>Fim</Text>
                      <Text style={{ color: colors.text, fontWeight: '700', marginTop: 2 }}>
                        {formatLocalDateTime(form.validUntil)}
                      </Text>
                    </View>
                    <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
                  </View>
                </Pressable>
                <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Portas</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {relays.map((r) => (
                    <Pressable
                      key={r._id}
                      onPress={() => toggleRelay(r._id)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: form.relayIds.includes(r._id) ? 'rgba(139,92,246,0.7)' : colors.border,
                        backgroundColor: form.relayIds.includes(r._id) ? 'rgba(139,92,246,0.2)' : colors.cardAlt,
                      }}
                    >
                      <Text style={{ color: colors.text, fontWeight: '600', fontSize: 12 }}>{r.name}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                  <Pressable
                    style={[commonStyles.buttonSecondary, { flex: 1, backgroundColor: '#1e293b', borderWidth: 1, borderColor: colors.border }]}
                    onPress={() => setShowComposer(false)}
                    disabled={saving}
                  >
                    <Text style={commonStyles.buttonText}>Cancelar</Text>
                  </Pressable>
                  <Pressable style={[commonStyles.button, { flex: 1 }]} onPress={createInvite} disabled={saving}>
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={commonStyles.buttonText}>Criar</Text>}
                  </Pressable>
                </View>
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
      <Modal
        transparent
        visible={picker.visible}
        animationType="fade"
        onRequestClose={closePicker}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(2,6,23,0.82)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 420,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 18,
              overflow: 'hidden',
            }}
          >
            <LinearGradient
              colors={['rgba(99,102,241,0.24)', 'rgba(139,92,246,0.1)']}
              style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}
            >
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 18 }}>
                {picker.field === 'validFrom' ? 'Selecionar início' : 'Selecionar fim'}
              </Text>
              <Text style={commonStyles.subtitle}>
                {picker.field === 'validFrom'
                  ? 'Defina quando o convite começa'
                  : 'Defina quando o convite expira'}
              </Text>
            </LinearGradient>

            <View style={{ padding: 14, gap: 10 }}>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  backgroundColor: colors.cardAlt,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600' }}>
                  Valor selecionado
                </Text>
                <Text style={{ color: colors.text, fontWeight: '700', marginTop: 2 }}>
                  {formatLocalDateTime(picker.value)}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() => setPicker((prev) => ({ ...prev, mode: 'date' }))}
                  style={[commonStyles.buttonSecondary, { flex: 1, backgroundColor: picker.mode === 'date' ? colors.primaryAlt : '#1e293b', borderWidth: 1, borderColor: colors.border }]}
                >
                  <Text style={commonStyles.buttonText}>Data</Text>
                </Pressable>
                <Pressable
                  onPress={() => setPicker((prev) => ({ ...prev, mode: 'time' }))}
                  style={[commonStyles.buttonSecondary, { flex: 1, backgroundColor: picker.mode === 'time' ? colors.primaryAlt : '#1e293b', borderWidth: 1, borderColor: colors.border }]}
                >
                  <Text style={commonStyles.buttonText}>Horário</Text>
                </Pressable>
              </View>

              <View style={{ alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardAlt }}>
                <DateTimePicker
                  value={picker.value}
                  mode={picker.mode}
                  display={
                    Platform.OS === 'ios'
                      ? (isDark ? 'spinner' : 'default')
                      : (picker.mode === 'time' ? 'clock' : 'calendar')
                  }
                  locale="pt-BR"
                  is24Hour
                  onChange={onChangePicker}
                  minimumDate={picker.mode === 'date' && picker.field === 'validUntil' ? form.validFrom : undefined}
                  style={{ width: Platform.OS === 'ios' ? 320 : undefined }}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={closePicker}
                  style={[commonStyles.buttonSecondary, { flex: 1, backgroundColor: '#1e293b', borderWidth: 1, borderColor: colors.border }]}
                >
                  <Text style={commonStyles.buttonText}>Cancelar</Text>
                </Pressable>
                <Pressable onPress={confirmPicker} style={[commonStyles.button, { flex: 1 }]}>
                  <Text style={commonStyles.buttonText}>Confirmar</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
      <BottomQuickMenu navigation={navigation} currentRoute="Invites" />
      </View>
    </SafeAreaView>
  );
}

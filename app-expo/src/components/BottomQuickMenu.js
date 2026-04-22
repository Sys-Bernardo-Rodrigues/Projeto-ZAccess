import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../styles';

export const BOTTOM_MENU_SPACE = 104;

export default function BottomQuickMenu({ navigation, currentRoute }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  const items = useMemo(() => {
    return [
      { key: 'Home', label: 'Início', icon: 'home' },
      { key: 'Accounts', label: 'Contas', icon: 'people' },
      { key: 'QrUnlock', label: 'Câmera', icon: 'camera', isCenter: true },
      { key: 'Invites', label: 'Convite', icon: 'mail' },
      { key: 'Menu', label: 'Menu', icon: 'grid' },
    ];
  }, []);

  return (
    <View
      style={{
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: Math.max(8, insets.bottom + 4),
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 18,
        paddingVertical: 10,
        paddingHorizontal: 8,
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 10,
      }}
    >
      <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 2, alignItems: 'flex-end' }}>
        {items.map((item) => {
          const active = currentRoute === item.key;
          if (item.isCenter) {
            return (
              <Pressable
                key={item.key}
                onPress={() => navigation.navigate(item.key)}
                style={{
                  width: 62,
                  height: 62,
                  marginTop: -26,
                  borderRadius: 31,
                  borderWidth: 2,
                  borderColor: active ? '#c4b5fd' : 'rgba(255,255,255,0.35)',
                  backgroundColor: active ? colors.primary : colors.primaryAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: colors.primary,
                  shadowOpacity: 0.35,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 8,
                }}
              >
                <Ionicons name={item.icon} size={24} color="#fff" />
              </Pressable>
            );
          }
          return (
            <Pressable
              key={item.key}
              onPress={() => navigation.navigate(item.key)}
              style={{
                flex: 1,
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: active ? 'rgba(139,92,246,0.55)' : 'transparent',
                backgroundColor: active ? 'rgba(139,92,246,0.18)' : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <Ionicons name={item.icon} size={17} color={active ? '#c4b5fd' : colors.textMuted} />
              <Text style={{ color: active ? colors.text : colors.textMuted, fontSize: 10, fontWeight: active ? '700' : '600' }}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

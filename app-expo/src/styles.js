import { useMemo } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';

const darkColors = {
  bg: '#070b17',
  card: '#0f172a',
  cardAlt: '#111c33',
  border: 'rgba(148,163,184,0.2)',
  text: '#f1f5f9',
  textMuted: '#93a3bd',
  primary: '#8b5cf6',
  primaryAlt: '#6366f1',
  success: '#10b981',
  danger: '#ef4444',
  white: '#ffffff',
  shadow: '#000000',
  surface: 'rgba(15,23,42,0.97)',
};

const lightColors = {
  bg: '#f1f5f9',
  card: '#ffffff',
  cardAlt: '#eef2ff',
  border: 'rgba(100,116,139,0.25)',
  text: '#0f172a',
  textMuted: '#475569',
  primary: '#7c3aed',
  primaryAlt: '#4f46e5',
  success: '#059669',
  danger: '#dc2626',
  white: '#ffffff',
  shadow: '#334155',
  surface: 'rgba(255,255,255,0.98)',
};

const buildStyles = (colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 16, gap: 12 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 10,
    shadowColor: colors.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  title: { color: colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.7 },
  subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  input: {
    borderColor: colors.border,
    borderWidth: 1,
    backgroundColor: colors.cardAlt,
    borderRadius: 12,
    height: 48,
    color: colors.text,
    paddingHorizontal: 12,
  },
  button: {
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondary: {
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDanger: {
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 0.2 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});

export const useAppTheme = () => {
  const scheme = useColorScheme();
  const isDark = scheme !== 'light';
  const colors = isDark ? darkColors : lightColors;
  const commonStyles = useMemo(() => buildStyles(colors), [isDark]);

  const navTheme = useMemo(() => ({
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.bg,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  }), [isDark, colors]);

  return {
    isDark,
    colors,
    commonStyles,
    navTheme,
    statusBarStyle: isDark ? 'light' : 'dark',
  };
};

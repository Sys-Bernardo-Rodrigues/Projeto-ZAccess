import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import InvitesScreen from './screens/InvitesScreen';
import AutomationsScreen from './screens/AutomationsScreen';
import LogsScreen from './screens/LogsScreen';
import AccountsScreen from './screens/AccountsScreen';
import LocationUsersScreen from './screens/LocationUsersScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import MenuScreen from './screens/MenuScreen';
import QrUnlockScreen from './screens/QrUnlockScreen';
import { AuthService } from './services/auth';
import { useAppTheme } from './styles';

const Stack = createNativeStackNavigator();

export default function AppRoot() {
  const { colors, navTheme, statusBarStyle } = useAppTheme();
  const [booting, setBooting] = useState(true);
  const [logged, setLogged] = useState(false);

  const checkAuth = async () => {
    const isLogged = await AuthService.isLoggedIn();
    setLogged(isLogged);
    setBooting(false);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const logout = async () => {
    await AuthService.logout({ keepBiometric: true });
    setLogged(false);
  };

  if (booting) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={{ color: colors.textMuted, marginTop: 10 }}>Carregando...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style={statusBarStyle} />
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            contentStyle: { backgroundColor: colors.bg },
            headerTitleStyle: { fontWeight: '800' },
            headerShadowVisible: false,
          }}
        >
          {!logged ? (
            <Stack.Screen name="Login" options={{ headerShown: false }}>
              {(props) => <LoginScreen {...props} onLoggedIn={() => setLogged(true)} />}
            </Stack.Screen>
          ) : (
            <>
              <Stack.Screen name="Home" options={{ headerShown: false }}>
                {(props) => <HomeScreen {...props} onLogout={logout} />}
              </Stack.Screen>
            <Stack.Screen name="Invites" component={InvitesScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Automations" component={AutomationsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Logs" component={LogsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Accounts" component={AccountsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="LocationUsers" component={LocationUsersScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Menu" component={MenuScreen} options={{ headerShown: false }} />
            <Stack.Screen name="QrUnlock" component={QrUnlockScreen} options={{ headerShown: false }} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

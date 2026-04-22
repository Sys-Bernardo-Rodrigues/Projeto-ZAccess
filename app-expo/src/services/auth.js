import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const TOKEN_KEY = 'zaccess_app_token';
const USER_KEY = 'zaccess_app_user';
const LOCATION_KEY = 'zaccess_app_location';
const ROLE_KEY = 'zaccess_app_role';
const REMEMBER_EMAIL_KEY = 'zaccess_app_remember_email';
const ACCOUNTS_KEY = 'zaccess_accounts';
const ACTIVE_ACCOUNT_ID_KEY = 'zaccess_active_account_id';

const secureTokenKey = 'zaccess_secure_token';
const secureUserKey = 'zaccess_secure_user';
const secureLocationKey = 'zaccess_secure_location';
const secureRoleKey = 'zaccess_secure_role';

const authApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

const parseJson = (value, fallback = null) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const buildAccountFromLoginData = (data, fallbackEmail = '') => {
  const user = data.user || {};
  const location = data.location || null;
  const role = data.role || 'morador';
  const accountId = String(user._id || `${fallbackEmail}_${location?._id || 'no_location'}`);
  return {
    id: accountId,
    email: (user.email || fallbackEmail || '').toLowerCase().trim(),
    token: data.token,
    user,
    location,
    role,
    updatedAt: new Date().toISOString(),
  };
};

const persistActiveAccount = async (account) => {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, account.token || ''],
    [USER_KEY, JSON.stringify(account.user || {})],
    [LOCATION_KEY, JSON.stringify(account.location || null)],
    [ROLE_KEY, account.role || 'morador'],
    [ACTIVE_ACCOUNT_ID_KEY, account.id],
  ]);
};

export const AuthService = {
  async login(email, password, options = {}) {
    const { setActive = true } = options;
    try {
      const res = await authApi.post('/api/auth/location-user/login', {
        email: email.trim(),
        password,
      });

      const data = res.data?.data;
      if (!data?.token) throw new Error('Token não retornado pela API.');

      const account = buildAccountFromLoginData(data, email);
      const existing = await this.getAccounts();
      const filtered = existing.filter((acc) => acc.id !== account.id);
      const accounts = [account, ...filtered];
      await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));

      if (setActive) {
        await persistActiveAccount(account);
      }

      await SecureStore.setItemAsync(secureTokenKey, data.token);
      await SecureStore.setItemAsync(secureUserKey, JSON.stringify(data.user || {}));
      await SecureStore.setItemAsync(secureLocationKey, JSON.stringify(data.location || null));
      await SecureStore.setItemAsync(secureRoleKey, data.role || 'morador');
      return { ...data, account };
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Timeout no login. Verifique a URL da API e sua rede.');
      }
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      if (error.message?.includes('Network Error')) {
        throw new Error('Sem conexão com a API. Confirme EXPO_PUBLIC_API_URL e se o servidor está rodando.');
      }
      throw error;
    }
  },

  async logout(options = {}) {
    const { keepBiometric = true } = options;
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY, LOCATION_KEY, ROLE_KEY, ACTIVE_ACCOUNT_ID_KEY]);
    if (!keepBiometric) {
      await SecureStore.deleteItemAsync(secureTokenKey);
      await SecureStore.deleteItemAsync(secureUserKey);
      await SecureStore.deleteItemAsync(secureLocationKey);
      await SecureStore.deleteItemAsync(secureRoleKey);
    }
  },

  async getToken() {
    return AsyncStorage.getItem(TOKEN_KEY);
  },

  async getSession() {
    const [token, user, location, role] = await AsyncStorage.multiGet([
      TOKEN_KEY,
      USER_KEY,
      LOCATION_KEY,
      ROLE_KEY,
    ]);
    return {
      token: token?.[1] || '',
      user: parseJson(user?.[1]),
      location: parseJson(location?.[1]),
      role: role?.[1] || 'morador',
    };
  },

  async isLoggedIn() {
    const synced = await this.ensureActiveAccountSession();
    if (!synced) return false;
    const token = await this.getToken();
    return Boolean(token);
  },

  async getRememberedEmail() {
    return AsyncStorage.getItem(REMEMBER_EMAIL_KEY);
  },

  async setRememberedEmail(email) {
    return AsyncStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
  },

  async clearRememberedEmail() {
    return AsyncStorage.removeItem(REMEMBER_EMAIL_KEY);
  },

  async getAccounts() {
    const raw = await AsyncStorage.getItem(ACCOUNTS_KEY);
    return parseJson(raw, []);
  },

  async getActiveAccountId() {
    return AsyncStorage.getItem(ACTIVE_ACCOUNT_ID_KEY);
  },

  async ensureActiveAccountSession() {
    const [activeId, accounts] = await Promise.all([
      this.getActiveAccountId(),
      this.getAccounts(),
    ]);

    if (!accounts.length) return false;

    const activeAccount = accounts.find((acc) => acc.id === activeId) || accounts[0];
    if (!activeAccount) return false;

    await persistActiveAccount(activeAccount);
    return Boolean(activeAccount.token);
  },

  async switchAccount(accountId) {
    const accounts = await this.getAccounts();
    const account = accounts.find((acc) => acc.id === accountId);
    if (!account) throw new Error('Conta não encontrada.');
    await persistActiveAccount(account);
    return account;
  },

  async removeAccount(accountId) {
    const accounts = await this.getAccounts();
    const nextAccounts = accounts.filter((acc) => acc.id !== accountId);
    await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(nextAccounts));

    const activeId = await this.getActiveAccountId();
    if (activeId === accountId) {
      if (nextAccounts[0]) {
        await persistActiveAccount(nextAccounts[0]);
      } else {
        await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY, LOCATION_KEY, ROLE_KEY, ACTIVE_ACCOUNT_ID_KEY]);
      }
    }
  },

  async canUseBiometric() {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  },

  async getBiometricLabel() {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'Face ID';
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'Biometria';
    return 'Biometria';
  },

  async hasBiometricCredentials() {
    const token = await SecureStore.getItemAsync(secureTokenKey);
    return Boolean(token);
  },

  async loginWithBiometric() {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Entrar no ZAccess com biometria',
      cancelLabel: 'Cancelar',
      disableDeviceFallback: false,
    });

    if (!result.success) {
      throw new Error('Autenticação biométrica cancelada ou falhou.');
    }

    const [token, user, location, role] = await Promise.all([
      SecureStore.getItemAsync(secureTokenKey),
      SecureStore.getItemAsync(secureUserKey),
      SecureStore.getItemAsync(secureLocationKey),
      SecureStore.getItemAsync(secureRoleKey),
    ]);

    if (!token) {
      throw new Error('Não há sessão biométrica salva. Faça login com senha uma vez.');
    }

    const parsedUser = parseJson(user, {});
    const parsedLocation = parseJson(location, null);
    const account = {
      id: String(parsedUser?._id || `biometric_${Date.now()}`),
      email: (parsedUser?.email || '').toLowerCase(),
      token,
      user: parsedUser,
      location: parsedLocation,
      role: role || 'morador',
      updatedAt: new Date().toISOString(),
    };

    const existing = await this.getAccounts();
    const filtered = existing.filter((acc) => acc.id !== account.id);
    await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify([account, ...filtered]));
    await persistActiveAccount(account);

    return true;
  },
};

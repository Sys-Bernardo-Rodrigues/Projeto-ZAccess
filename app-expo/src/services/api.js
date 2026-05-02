import axios from 'axios';
import { API_BASE_URL } from '../config';
import { AuthService } from './auth';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
});

api.interceptors.request.use(async (config) => {
  const token = await AuthService.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const getData = (res) => res.data?.data || {};

export const ApiService = {
  async getMe() {
    return getData(await api.get('/api/app/me'));
  },
  async getRelays() {
    return getData(await api.get('/api/app/relays'));
  },
  async toggleRelay(relayId) {
    return (await api.post(`/api/app/relays/${relayId}/toggle`)).data;
  },
  async getAutomations() {
    return getData(await api.get('/api/app/automations'));
  },
  async getInvitations() {
    return getData(await api.get('/api/app/invitations'));
  },
  async createInvitation(payload) {
    return (await api.post('/api/app/invitations', payload)).data;
  },
  async deleteInvitation(id) {
    return (await api.delete(`/api/app/invitations/${id}`)).data;
  },
  async getLogs() {
    return getData(await api.get('/api/app/logs'));
  },
  async getLocationUsers() {
    return getData(await api.get('/api/app/location-users'));
  },
  async createLocationUser(payload) {
    return (await api.post('/api/app/location-users', payload)).data;
  },
  async getNotifications() {
    return getData(await api.get('/api/app/notifications'));
  },
  async createNotification(payload) {
    return (await api.post('/api/app/notifications', payload)).data;
  },
  async getPublicInvitationByToken(token) {
    return getData(await api.get(`/api/invitations/access/${token}`));
  },
  async unlockByInvitationToken(token, relayId) {
    return (await api.post(`/api/invitations/access/${token}/unlock`, { relayId })).data;
  },
};

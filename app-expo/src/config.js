export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.50:3000';

const normalize = (value = '') => String(value).trim().replace(/\/+$/, '');
const replaceApiPortToWeb = (url) => url.replace(/:3000(?=\/|$)/, ':5173');

const configuredPublicBase = normalize(
  process.env.EXPO_PUBLIC_PUBLIC_WEB_URL || process.env.EXPO_PUBLIC_INVITE_BASE_URL || ''
);

const inferredPublicBase = normalize(replaceApiPortToWeb(API_BASE_URL));

export const PUBLIC_INVITE_BASE_URL = configuredPublicBase || inferredPublicBase;

export const buildPublicInviteUrl = (token) => `${PUBLIC_INVITE_BASE_URL}/invite/${token}`;

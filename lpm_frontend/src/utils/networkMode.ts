/* eslint-disable prettier/prettier */

const TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'on']);

const normalize = (value?: string): string => value?.trim().toLowerCase() || '';

export const PUBLIC_NETWORK_ENABLED = TRUTHY_VALUES.has(
  normalize(process.env.NEXT_PUBLIC_ENABLE_PUBLIC_NETWORK)
);

export const PUBLIC_APP_BASE_URL = (
  process.env.NEXT_PUBLIC_PUBLIC_APP_BASE_URL || 'https://app.secondme.io'
).replace(/\/+$/, '');

export const LOCAL_APP_PORT = process.env.NEXT_PUBLIC_LOCAL_APP_PORT || '8002';

export const PRIVATE_MODE_MESSAGE =
  'Public network features are off while you learn locally. Set ENABLE_PUBLIC_NETWORK=true in your local .env and restart when you are ready.';

export const getPublicAppUrl = (path = ''): string => {
  if (!path) {
    return PUBLIC_APP_BASE_URL;
  }

  return path.startsWith('/')
    ? `${PUBLIC_APP_BASE_URL}${path}`
    : `${PUBLIC_APP_BASE_URL}/${path}`;
};

export const getPublicPortalUrl = (uploadName?: string, instanceId?: string): string =>
  getPublicAppUrl(`${uploadName || '{upload_name}'}/${instanceId || '{instance_id}'}`);

export const getPublicChatApiUrl = (instanceId?: string): string =>
  getPublicAppUrl(`/api/chat/${instanceId || 'instance_id'}/chat/completions`);

export const getLocalApiBaseUrl = (): string => {
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  return `${protocol}//${hostname}:${LOCAL_APP_PORT}`;
};

export const getLocalChatApiUrl = (): string => `${getLocalApiBaseUrl()}/api/kernel2/chat`;
import { api } from '@/api/apiClient';

const WEB_PUSH_ENTITY = 'PushSubscription';

const getPushPublicKey = () => String(import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY || '').trim();

const isSecureForPush = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  if (window.isSecureContext) {
    return true;
  }

  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
};

export const isWebPushSupported = () => {
  return (
    typeof window !== 'undefined' &&
    isSecureForPush() &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
};

export const hasWebPushConfig = () => Boolean(getPushPublicKey());

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
};

const getScopePrefix = () => {
  if (typeof window === 'undefined') {
    return '/';
  }
  return window.location.pathname.startsWith('/midhd/') ? '/midhd/' : '/';
};

const getActiveServiceWorkerRegistration = async () => {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  const scopePrefix = getScopePrefix();
  const scopedRegistration = await navigator.serviceWorker.getRegistration(scopePrefix);
  if (scopedRegistration) {
    return scopedRegistration;
  }

  return navigator.serviceWorker.ready.catch(() => null);
};

const listSubscriptionRecords = async () => {
  try {
    return await api.entities[WEB_PUSH_ENTITY].list('-updated_date', 500);
  } catch {
    return [];
  }
};

const upsertSubscriptionRecord = async ({ subscription, user }) => {
  const json = subscription.toJSON();
  const endpoint = subscription.endpoint;
  const nowIso = new Date().toISOString();

  const payload = {
    endpoint,
    expiration_time: subscription.expirationTime || null,
    p256dh: json?.keys?.p256dh || null,
    auth: json?.keys?.auth || null,
    subscription: json,
    enabled: true,
    user_id: user?.id || null,
    user_email: user?.email || null,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    language: typeof navigator !== 'undefined' ? navigator.language : null,
    platform: typeof navigator !== 'undefined' ? navigator.platform : null,
    last_seen_at: nowIso,
    unsubscribed_at: null,
  };

  const records = await listSubscriptionRecords();
  const existing = records.find((item) => item?.endpoint === endpoint);

  if (existing?.id) {
    return api.entities[WEB_PUSH_ENTITY].update(existing.id, payload);
  }

  return api.entities[WEB_PUSH_ENTITY].create(payload);
};

const markSubscriptionAsDisabled = async ({ endpoint }) => {
  if (!endpoint) {
    return;
  }

  const records = await listSubscriptionRecords();
  const existing = records.find((item) => item?.endpoint === endpoint);
  if (!existing?.id) {
    return;
  }

  await api.entities[WEB_PUSH_ENTITY].update(existing.id, {
    enabled: false,
    unsubscribed_at: new Date().toISOString(),
  });
};

export const subscribeCurrentDeviceToPush = async ({ user }) => {
  if (!isWebPushSupported()) {
    return { ok: false, reason: 'unsupported' };
  }

  const publicKey = getPushPublicKey();
  if (!publicKey) {
    return { ok: false, reason: 'missing_key' };
  }

  if (Notification.permission !== 'granted') {
    return { ok: false, reason: 'permission' };
  }

  const registration = await getActiveServiceWorkerRegistration();
  if (!registration) {
    return { ok: false, reason: 'missing_sw' };
  }

  try {
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    await upsertSubscriptionRecord({ subscription, user });
    return { ok: true, subscription };
  } catch {
    return { ok: false, reason: 'subscribe_failed' };
  }
};

export const unsubscribeCurrentDeviceFromPush = async () => {
  if (!isWebPushSupported()) {
    return { ok: true, reason: 'unsupported' };
  }

  const registration = await getActiveServiceWorkerRegistration();
  if (!registration) {
    return { ok: true, reason: 'missing_sw' };
  }

  try {
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      return { ok: true, reason: 'no_subscription' };
    }

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await markSubscriptionAsDisabled({ endpoint });
    return { ok: true };
  } catch {
    return { ok: false, reason: 'unsubscribe_failed' };
  }
};
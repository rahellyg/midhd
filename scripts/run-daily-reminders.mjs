#!/usr/bin/env node
/**
 * Standalone daily-reminders sender.
 * Sends Web Push notifications to users whose reminder time matches the
 * current time slot.
 *
 * Data source priority:
 * 1. Supabase, if SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set
 * 2. Firebase Admin, if FIREBASE_SERVICE_ACCOUNT_JSON/FILE is set
 *
 * Run directly (e.g. from GitHub Actions every 15 min):
 *   node scripts/run-daily-reminders.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

try {
  const { default: dotenv } = await import('dotenv');
  dotenv.config({ path: path.resolve(__dirname, '..', '.env.push.local') });
  dotenv.config({ path: path.resolve(__dirname, '..', '.env.push') });
  dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
  dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
} catch {
  // GitHub Actions injects env vars directly.
}

const PUSH_PUBLIC_KEY = String(
  process.env.WEB_PUSH_PUBLIC_KEY || process.env.VITE_WEB_PUSH_PUBLIC_KEY || ''
).trim();
const PUSH_PRIVATE_KEY = String(process.env.WEB_PUSH_PRIVATE_KEY || '').trim();
const PUSH_SUBJECT = String(process.env.WEB_PUSH_SUBJECT || 'mailto:admin@example.com').trim();
const PUSH_APP_BASE_URL = String(process.env.PUSH_APP_BASE_URL || '/midhd/')
  .trim()
  .replace(/\/?$/, '/');

const FIREBASE_SERVICE_ACCOUNT_FILE = String(process.env.FIREBASE_SERVICE_ACCOUNT_FILE || '').trim();
const FIREBASE_SERVICE_ACCOUNT_JSON = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
const FIREBASE_PROJECT_ID = String(
  process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || ''
).trim();

const SUPABASE_URL = String(process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const SUPABASE_SCHEMA = String(process.env.SUPABASE_SCHEMA || 'public').trim();
const SUPABASE_PUSH_SUBSCRIPTIONS_TABLE = String(
  process.env.SUPABASE_PUSH_SUBSCRIPTIONS_TABLE || 'PushSubscription'
).trim();
const SUPABASE_NOTIFICATION_SETTINGS_TABLE = String(
  process.env.SUPABASE_NOTIFICATION_SETTINGS_TABLE || 'UserNotificationSettings'
).trim();

const TZ_OFFSET_HOURS = Number(process.env.REMINDER_TIMEZONE_OFFSET_HOURS || 0);
const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const hasFirebaseConfig = Boolean(FIREBASE_SERVICE_ACCOUNT_JSON || FIREBASE_SERVICE_ACCOUNT_FILE);

const missing = [];
if (!PUSH_PUBLIC_KEY) missing.push('WEB_PUSH_PUBLIC_KEY or VITE_WEB_PUSH_PUBLIC_KEY');
if (!PUSH_PRIVATE_KEY) missing.push('WEB_PUSH_PRIVATE_KEY');
if (!hasSupabaseConfig && !hasFirebaseConfig) {
  missing.push('SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY or FIREBASE_SERVICE_ACCOUNT_JSON/FILE');
}

if (missing.length > 0) {
  console.error(`[run-daily-reminders] Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

const { default: webpush } = await import('web-push');
webpush.setVapidDetails(PUSH_SUBJECT, PUSH_PUBLIC_KEY, PUSH_PRIVATE_KEY);

const getTodayKey = (offsetHours = 0) => {
  const now = new Date(Date.now() + offsetHours * 3_600_000);
  return now.toISOString().split('T')[0];
};

const getLocalTimeSlot = (offsetHours = 0) => {
  const now = new Date(Date.now() + offsetHours * 3_600_000);
  const h = String(now.getUTCHours()).padStart(2, '0');
  const m = String(now.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

const normalizeSubscription = (record) => {
  if (record?.subscription?.endpoint) {
    return record.subscription;
  }

  if (!record?.endpoint || !record?.p256dh || !record?.auth) {
    return null;
  }

  return {
    endpoint: record.endpoint,
    expirationTime: record.expiration_time || null,
    keys: {
      p256dh: record.p256dh,
      auth: record.auth,
    },
  };
};

const createSupabaseStore = () => {
  const supabaseRequest = async ({ table, method = 'GET', query = {}, body = undefined }) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${encodeURIComponent(table)}`);

    Object.entries(query || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });

    const res = await fetch(url.toString(), {
      method,
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Accept-Profile': SUPABASE_SCHEMA,
        'Content-Profile': SUPABASE_SCHEMA,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Supabase ${method} ${table} ${res.status}: ${detail}`);
    }

    if (res.status === 204) {
      return [];
    }

    return res.json().catch(() => []);
  };

  return {
    kind: 'supabase',
    loadDailyReminderUsers: async (timeSlot) => {
      return supabaseRequest({
        table: SUPABASE_NOTIFICATION_SETTINGS_TABLE,
        query: {
          select: '*',
          enabled: 'eq.true',
          time: `eq.${timeSlot}`,
        },
      });
    },
    loadEnabledSubscriptions: async ({ userEmail, userId }) => {
      const query = {
        select: '*',
        enabled: 'eq.true',
      };

      if (userEmail) {
        query.user_email = `eq.${String(userEmail).toLowerCase()}`;
      }
      if (userId) {
        query.user_id = `eq.${userId}`;
      }

      return supabaseRequest({
        table: SUPABASE_PUSH_SUBSCRIPTIONS_TABLE,
        query,
      });
    },
    markSubscriptionInvalid: async (recordId) => {
      await supabaseRequest({
        table: SUPABASE_PUSH_SUBSCRIPTIONS_TABLE,
        method: 'PATCH',
        query: { id: `eq.${recordId}` },
        body: {
          enabled: false,
          unsubscribed_at: new Date().toISOString(),
          updated_date: new Date().toISOString(),
        },
      });
    },
    markUserNotifiedToday: async (recordId, todayKey) => {
      await supabaseRequest({
        table: SUPABASE_NOTIFICATION_SETTINGS_TABLE,
        method: 'PATCH',
        query: { id: `eq.${recordId}` },
        body: {
          last_notified_date: todayKey,
          updated_date: new Date().toISOString(),
        },
      });
    },
  };
};

const buildFirebaseCredential = async () => {
  const { applicationDefault, cert } = await import('firebase-admin/app');

  if (FIREBASE_SERVICE_ACCOUNT_FILE) {
    const raw = fs.readFileSync(path.resolve(__dirname, '..', FIREBASE_SERVICE_ACCOUNT_FILE), 'utf8');
    return cert(JSON.parse(raw));
  }

  if (FIREBASE_SERVICE_ACCOUNT_JSON) {
    return cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON));
  }

  return applicationDefault();
};

const createFirebaseStore = async () => {
  const { getApps, initializeApp } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');

  const app = getApps()[0] || initializeApp({
    credential: await buildFirebaseCredential(),
    projectId: FIREBASE_PROJECT_ID || undefined,
  });
  const db = getFirestore(app);

  return {
    kind: 'firebase',
    loadDailyReminderUsers: async (timeSlot) => {
      const snapshot = await db
        .collection('UserNotificationSettings')
        .where('enabled', '==', true)
        .where('time', '==', timeSlot)
        .get();

      return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    },
    loadEnabledSubscriptions: async ({ userEmail, userId }) => {
      const snapshot = await db
        .collection('PushSubscription')
        .where('enabled', '==', true)
        .get();

      return snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((record) => {
          if (userEmail && String(record.user_email || '').toLowerCase() !== String(userEmail).toLowerCase()) {
            return false;
          }
          if (userId && String(record.user_id || '') !== String(userId)) {
            return false;
          }
          return true;
        });
    },
    markSubscriptionInvalid: async (recordId) => {
      await db.collection('PushSubscription').doc(recordId).update({
        enabled: false,
        unsubscribed_at: new Date().toISOString(),
        updated_date: new Date().toISOString(),
      });
    },
    markUserNotifiedToday: async (recordId, todayKey) => {
      await db.collection('UserNotificationSettings').doc(recordId).update({
        last_notified_date: todayKey,
        updated_date: new Date().toISOString(),
      });
    },
  };
};

const store = hasSupabaseConfig ? createSupabaseStore() : await createFirebaseStore();

const todayKey = getTodayKey(TZ_OFFSET_HOURS);
const timeSlot = getLocalTimeSlot(TZ_OFFSET_HOURS);
const tasksUrl = `${PUSH_APP_BASE_URL}Tasks`;

console.log(`[run-daily-reminders] store=${store.kind} date=${todayKey} slot=${timeSlot} tz_offset=${TZ_OFFSET_HOURS}h`);

let usersToNotify = [];
try {
  const allEnabled = await store.loadDailyReminderUsers(timeSlot);
  usersToNotify = allEnabled.filter((record) => record.last_notified_date !== todayKey);
  console.log(`[run-daily-reminders] users matched for slot: ${usersToNotify.length}`);
} catch (error) {
  console.error('[run-daily-reminders] Failed to load notification settings:', error.message);
  process.exit(1);
}

if (usersToNotify.length === 0) {
  console.log('[run-daily-reminders] No users to notify at this time slot. Done.');
  process.exit(0);
}

const payload = JSON.stringify({
  title: 'midhd – משימות להיום',
  body: 'פתחו את האפליקציה כדי לראות את המשימות להיום.',
  url: tasksUrl,
  tag: 'midhd-daily-tasks',
  icon: 'app-icon.svg',
  badge: 'app-icon.svg',
  data: { url: tasksUrl },
});

let totalSent = 0;
let totalFailed = 0;

for (const userRecord of usersToNotify) {
  let subscriptions = [];
  try {
    subscriptions = await store.loadEnabledSubscriptions({
      userEmail: userRecord.user_email || undefined,
      userId: userRecord.user_id || undefined,
    });
  } catch (error) {
    console.warn(
      `[run-daily-reminders] Could not load subscriptions for user ${userRecord.user_email || userRecord.user_id}:`,
      error.message
    );
  }

  for (const sub of subscriptions) {
    const subscription = normalizeSubscription(sub);
    if (!subscription) {
      totalFailed += 1;
      continue;
    }

    try {
      await webpush.sendNotification(subscription, payload);
      totalSent += 1;
      console.log(`  ✓ sent to ${subscription.endpoint.slice(0, 60)}…`);
    } catch (error) {
      totalFailed += 1;
      const statusCode = Number(error?.statusCode || 0);
      console.warn(`  ✗ failed (${statusCode}): ${error.message}`);

      if (statusCode === 404 || statusCode === 410) {
        try {
          await store.markSubscriptionInvalid(sub.id);
        } catch {
          // best-effort cleanup only
        }
      }
    }
  }

  try {
    await store.markUserNotifiedToday(userRecord.id, todayKey);
  } catch (error) {
    console.warn('[run-daily-reminders] Could not mark user notified:', error.message);
  }
}

console.log(`[run-daily-reminders] Done. sent=${totalSent} failed=${totalFailed}`);
process.exit(0);

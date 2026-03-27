import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import express from 'express';
import dotenv from 'dotenv';
import webpush from 'web-push';

dotenv.config({ path: path.resolve(process.cwd(), '.env.push.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.push') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const PORT = Number(process.env.PUSH_SERVER_PORT || 8787);
const API_KEY = String(process.env.PUSH_SERVER_API_KEY || '').trim();
const PUSH_PUBLIC_KEY = String(
  process.env.WEB_PUSH_PUBLIC_KEY || process.env.VITE_WEB_PUSH_PUBLIC_KEY || ''
).trim();
const PUSH_PRIVATE_KEY = String(process.env.WEB_PUSH_PRIVATE_KEY || '').trim();
const PUSH_SUBJECT = String(process.env.WEB_PUSH_SUBJECT || 'mailto:admin@example.com').trim();
const PUSH_APP_BASE_URL = String(process.env.PUSH_APP_BASE_URL || '/midhd/').trim().replace(/\/?$/, '/');
const FIREBASE_PROJECT_ID = String(
  process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || ''
).trim();
const SUPABASE_URL = String(process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const SUPABASE_PUSH_SUBSCRIPTIONS_TABLE = String(process.env.SUPABASE_PUSH_SUBSCRIPTIONS_TABLE || 'PushSubscription').trim();
const SUPABASE_NOTIFICATION_SETTINGS_TABLE = String(process.env.SUPABASE_NOTIFICATION_SETTINGS_TABLE || 'UserNotificationSettings').trim();

if (!PUSH_PUBLIC_KEY || !PUSH_PRIVATE_KEY) {
  throw new Error('Missing WEB_PUSH_PUBLIC_KEY or WEB_PUSH_PRIVATE_KEY in environment.');
}

const useSupabase = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

const buildFirebaseCredential = async () => {
  const { applicationDefault, cert } = await import('firebase-admin/app');

  const serviceAccountFile = String(process.env.FIREBASE_SERVICE_ACCOUNT_FILE || '').trim();
  if (serviceAccountFile) {
    const raw = fs.readFileSync(path.resolve(process.cwd(), serviceAccountFile), 'utf8');
    return cert(JSON.parse(raw));
  }

  const serviceAccountJson = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  if (serviceAccountJson) {
    return cert(JSON.parse(serviceAccountJson));
  }

  return applicationDefault();
};

const createFirebaseStore = async () => {
  const { initializeApp } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');

  const adminApp = initializeApp({
    credential: await buildFirebaseCredential(),
    projectId: FIREBASE_PROJECT_ID || undefined,
  });
  const db = getFirestore(adminApp);

  return {
    kind: 'firebase',
    health: () => ({ firebaseProjectId: FIREBASE_PROJECT_ID || null, supabaseUrl: null }),
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
    loadDailyReminderUsers: async (timeSlot) => {
      const snapshot = await db
        .collection('UserNotificationSettings')
        .where('enabled', '==', true)
        .where('time', '==', timeSlot)
        .get();

      return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    },
    markUserNotifiedToday: async (recordId, todayKey) => {
      await db.collection('UserNotificationSettings').doc(recordId).update({
        last_notified_date: todayKey,
        updated_date: new Date().toISOString(),
      });
    },
  };
};

const createSupabaseStore = () => {
  const apiBase = `${SUPABASE_URL}/rest/v1`;

  const request = async ({ table, method = 'GET', query = {}, body = undefined }) => {
    const url = new URL(`${apiBase}/${encodeURIComponent(table)}`);
    Object.entries(query || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }
      url.searchParams.set(key, String(value));
    });

    const response = await fetch(url, {
      method,
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Supabase ${method} ${table} failed: ${response.status} ${detail}`);
    }

    if (response.status === 204) {
      return [];
    }

    return response.json().catch(() => []);
  };

  return {
    kind: 'supabase',
    health: () => ({ firebaseProjectId: null, supabaseUrl: SUPABASE_URL || null }),
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

      return request({
        table: SUPABASE_PUSH_SUBSCRIPTIONS_TABLE,
        method: 'GET',
        query,
      });
    },
    markSubscriptionInvalid: async (recordId) => {
      await request({
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
    loadDailyReminderUsers: async (timeSlot) => {
      return request({
        table: SUPABASE_NOTIFICATION_SETTINGS_TABLE,
        method: 'GET',
        query: {
          select: '*',
          enabled: 'eq.true',
          time: `eq.${timeSlot}`,
        },
      });
    },
    markUserNotifiedToday: async (recordId, todayKey) => {
      await request({
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

const store = useSupabase ? createSupabaseStore() : await createFirebaseStore();
webpush.setVapidDetails(PUSH_SUBJECT, PUSH_PUBLIC_KEY, PUSH_PRIVATE_KEY);

const app = express();
app.use(express.json({ limit: '256kb' }));

const requireApiKey = (req, res, next) => {
  if (!API_KEY) {
    next();
    return;
  }

  const incoming = String(req.header('x-api-key') || '').trim();
  if (incoming !== API_KEY) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return;
  }

  next();
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

app.get('/health', (_req, res) => {
  const sourceHealth = store.health();
  res.json({
    ok: true,
    service: 'midhd-push-server',
    dataSource: store.kind,
    pushConfigured: Boolean(PUSH_PUBLIC_KEY && PUSH_PRIVATE_KEY),
    ...sourceHealth,
  });
});

const getTodayKey = () => new Date().toISOString().split('T')[0];

const getTimeSlot = (date = new Date()) => {
  const h = date.getHours();
  const m = date.getMinutes();
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

app.post('/push/send-daily-reminders', requireApiKey, async (_req, res) => {
  const timeSlot = getTimeSlot();
  const todayKey = getTodayKey();
  const title = 'midhd – משימות להיום';
  const body = 'פתחו את האפליקציה כדי לראות את המשימות להיום.';
  const url = `${PUSH_APP_BASE_URL}Tasks`;
  const tag = 'midhd-daily-tasks';

  try {
    const toNotify = (await store.loadDailyReminderUsers(timeSlot))
      .filter((record) => {
        const last = record.last_notified_date;
        return last !== todayKey && (last == null || last !== todayKey);
      });

    if (toNotify.length === 0) {
      res.json({
        ok: true,
        timeSlot,
        todayKey,
        usersMatched: 0,
        sent: 0,
        message: 'no_users_to_notify',
      });
      return;
    }

    const payload = JSON.stringify({
      title,
      body,
      url,
      tag,
      icon: 'app-icon.svg',
      badge: 'app-icon.svg',
      data: { url },
    });

    let totalSent = 0;
    let totalFailed = 0;

    for (const record of toNotify) {
      const records = await store.loadEnabledSubscriptions({
        userEmail: record.user_email || undefined,
        userId: record.user_id || undefined,
      });
      for (const sub of records) {
        const subscription = normalizeSubscription(sub);
        if (!subscription) {
          totalFailed += 1;
          continue;
        }
        try {
          await webpush.sendNotification(subscription, payload);
          totalSent += 1;
        } catch (error) {
          totalFailed += 1;
          const statusCode = Number(error?.statusCode || 0);
          if (statusCode === 404 || statusCode === 410) {
            await store.markSubscriptionInvalid(sub.id);
          }
        }
      }
      await store.markUserNotifiedToday(record.id, todayKey);
    }

    res.json({
      ok: true,
      timeSlot,
      todayKey,
      usersMatched: toNotify.length,
      sent: totalSent,
      failed: totalFailed,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: 'daily_reminders_failed',
      detail: String(error?.message || 'unknown_error'),
    });
  }
});

app.post('/push/send', requireApiKey, async (req, res) => {
  const {
    title = 'midhd',
    body = '',
    url = '/',
    tag = 'midhd-web-push',
    icon = 'app-icon.svg',
    badge = 'app-icon.svg',
    data = {},
    userEmail,
    userId,
    dryRun = false,
  } = req.body || {};

  if (!body && !title) {
    res.status(400).json({ ok: false, error: 'title_or_body_required' });
    return;
  }

  try {
    const records = await store.loadEnabledSubscriptions({ userEmail, userId });
    if (records.length === 0) {
      res.json({ ok: true, total: 0, sent: 0, failed: 0, message: 'no_subscriptions' });
      return;
    }

    if (dryRun) {
      res.json({ ok: true, total: records.length, dryRun: true });
      return;
    }

    const payload = JSON.stringify({
      title,
      body,
      url,
      tag,
      icon,
      badge,
      data,
    });

    let sent = 0;
    let failed = 0;
    const failures = [];

    for (const record of records) {
      const subscription = normalizeSubscription(record);
      if (!subscription) {
        failed += 1;
        failures.push({ endpoint: record.endpoint || null, reason: 'invalid_subscription_shape' });
        continue;
      }

      try {
        await webpush.sendNotification(subscription, payload);
        sent += 1;
      } catch (error) {
        failed += 1;
        const statusCode = Number(error?.statusCode || 0);
        if (statusCode === 404 || statusCode === 410) {
          await store.markSubscriptionInvalid(record.id);
        }

        failures.push({
          endpoint: record.endpoint || null,
          statusCode: statusCode || null,
          reason: String(error?.message || 'send_failed'),
        });
      }
    }

    res.json({
      ok: true,
      total: records.length,
      sent,
      failed,
      failures: failures.slice(0, 20),
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: 'push_send_failed',
      detail: String(error?.message || 'unknown_error'),
    });
  }
});

app.listen(PORT, () => {
  console.log(`Push server listening on http://localhost:${PORT} (data source: ${store.kind})`);
});

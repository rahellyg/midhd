#!/usr/bin/env node
/**
 * Standalone daily-reminders sender using Firebase Admin.
 * Sends Web Push notifications to users who have pending tasks for today.
 * Time of day is ignored; each eligible user is notified at most once per day.
 *
 * Run directly (e.g. from GitHub Actions every 15 min):
 *   node scripts/run-daily-reminders.mjs
 *
 * Required env vars:
 *   WEB_PUSH_PUBLIC_KEY (or VITE_WEB_PUSH_PUBLIC_KEY)
 *   WEB_PUSH_PRIVATE_KEY
 *   FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_FILE
 *
 * Optional env vars:
 *   WEB_PUSH_SUBJECT
 *   PUSH_APP_BASE_URL
 *   FIREBASE_PROJECT_ID
 *   REMINDER_TIMEZONE_OFFSET_HOURS
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

const TZ_OFFSET_HOURS = Number(process.env.REMINDER_TIMEZONE_OFFSET_HOURS || 0);
const FORCE_ALL_USERS = String(process.env.FORCE_ALL_USERS || 'false').trim().toLowerCase() === 'true';

const missing = [];
if (!PUSH_PUBLIC_KEY) missing.push('WEB_PUSH_PUBLIC_KEY or VITE_WEB_PUSH_PUBLIC_KEY');
if (!PUSH_PRIVATE_KEY) missing.push('WEB_PUSH_PRIVATE_KEY');
if (!FIREBASE_SERVICE_ACCOUNT_JSON && !FIREBASE_SERVICE_ACCOUNT_FILE) {
  missing.push('FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_FILE');
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

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) {
    return null;
  }
  return (h * 60) + m;
};

const isInReminderWindow = (scheduledTime, currentSlot, windowMinutes = 15) => {
  const scheduled = toMinutes(scheduledTime);
  const now = toMinutes(currentSlot);
  if (scheduled == null || now == null) {
    return false;
  }

  // Handle same-day and midnight wrap-around windows.
  const diff = (now - scheduled + 1440) % 1440;
  return diff >= 0 && diff < windowMinutes;
};

const isTaskForToday = (task, todayKey) => {
  const isDone = task?.status === 'done';
  const isForToday = !task?.scheduled_date || task.scheduled_date === todayKey;
  return !isDone && isForToday;
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
    loadDailyReminderUsers: async () => {
      const snapshot = await db
        .collection('UserNotificationSettings')
        .where('enabled', '==', true)
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
    loadTodayPendingTasks: async ({ userEmail, userId, todayKey }) => {
      if (userEmail) {
        const snapshot = await db
          .collection('Task')
          .where('user_email', '==', String(userEmail).toLowerCase())
          .get();

        return snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .filter((task) => isTaskForToday(task, todayKey));
      }

      if (userId) {
        const snapshot = await db.collection('Task').get();
        return snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .filter((task) => String(task.user_id || '') === String(userId))
          .filter((task) => isTaskForToday(task, todayKey));
      }

      return [];
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

const store = await createFirebaseStore();

const todayKey = getTodayKey(TZ_OFFSET_HOURS);
const timeSlot = getLocalTimeSlot(TZ_OFFSET_HOURS);
const tasksUrl = `${PUSH_APP_BASE_URL}Tasks`;
const runStartedAt = new Date().toISOString();

console.log(`[run-daily-reminders] date=${todayKey} slot=${timeSlot} tz_offset=${TZ_OFFSET_HOURS}h`);
console.log(`[run-daily-reminders] mode=${FORCE_ALL_USERS ? 'manual-force-all' : 'daily'}`);
console.log(`[run-daily-reminders] started_at=${runStartedAt}`);

let usersToNotify = [];
try {
  const allEnabled = await store.loadDailyReminderUsers(timeSlot);
  const skippedAlreadyNotified = [];
  const skippedOutsideWindow = [];

  usersToNotify = allEnabled.filter((record) => {
    if (!FORCE_ALL_USERS && record.last_notified_date === todayKey) {
      skippedAlreadyNotified.push(record);
      return false;
    }

    if (!FORCE_ALL_USERS && !isInReminderWindow(record.time, timeSlot, 15)) {
      skippedOutsideWindow.push(record);
      return false;
    }

    return true;
  });

  console.log(`[run-daily-reminders] enabled reminder docs: ${allEnabled.length}`);
  if (allEnabled.length > 0) {
    console.log(
      '[run-daily-reminders] users with notifications enabled:',
      allEnabled.slice(0, 50).map((record) => ({
        user_email: record.user_email || null,
        user_id: record.user_id || null,
        enabled: Boolean(record.enabled),
        last_notified_date: record.last_notified_date || null,
      }))
    );
  }
  console.log(`[run-daily-reminders] users matched for slot: ${usersToNotify.length}`);
  if (!FORCE_ALL_USERS && skippedAlreadyNotified.length > 0) {
    console.log(
      `[run-daily-reminders] skipped already notified today: ${skippedAlreadyNotified.length}`
    );
  }
  if (!FORCE_ALL_USERS && skippedOutsideWindow.length > 0) {
    console.log(
      `[run-daily-reminders] skipped outside 15-minute window: ${skippedOutsideWindow.length}`
    );
  }
} catch (error) {
  console.error('[run-daily-reminders] Failed to load notification settings:', error.message);
  process.exit(1);
}

if (usersToNotify.length === 0) {
  console.log('[run-daily-reminders] No users to notify today. Done.');
  process.exit(0);
}

let totalSent = 0;
let totalFailed = 0;
let totalNoTasks = 0;
const sentRecipients = [];
const failedRecipients = [];
const skippedNoTaskRecipients = [];

console.log(
  '[run-daily-reminders] matched users:',
  usersToNotify.map((userRecord) => ({
    user_email: userRecord.user_email || null,
    user_id: userRecord.user_id || null,
    reminder_time: userRecord.time || null,
  }))
);

for (const userRecord of usersToNotify) {
  const userLabel = userRecord.user_email || userRecord.user_id || 'unknown';
  let pendingTasks = [];
  try {
    pendingTasks = await store.loadTodayPendingTasks({
      userEmail: userRecord.user_email || undefined,
      userId: userRecord.user_id || undefined,
      todayKey,
    });
  } catch (error) {
    console.warn(
      `[run-daily-reminders] Could not load tasks for user ${userRecord.user_email || userRecord.user_id}:`,
      error.message
    );
  }

  if (!FORCE_ALL_USERS && pendingTasks.length === 0) {
    totalNoTasks += 1;
    skippedNoTaskRecipients.push(userLabel);
    console.log(`[run-daily-reminders] skipped user=${userLabel} reason=no_tasks`);
    continue;
  }

  const payload = JSON.stringify({
    title: 'midhd – משימות להיום',
    body:
      pendingTasks.length === 0
        ? 'תזכורת יומית: פתחו את האפליקציה כדי לראות את המשימות להיום.'
        : pendingTasks.length === 1
          ? `יש לך משימה אחת להיום: ${pendingTasks[0].title}`
          : `יש לך ${pendingTasks.length} משימות להיום. פתחו את האפליקציה כדי לראות אותן.`,
    url: tasksUrl,
    tag: 'midhd-daily-tasks',
    icon: 'app-icon.svg',
    badge: 'app-icon.svg',
    data: { url: tasksUrl, pendingTasksCount: pendingTasks.length },
  });

  let subscriptions = [];
  try {
    subscriptions = await store.loadEnabledSubscriptions({
      userEmail: userRecord.user_email || undefined,
      userId: userRecord.user_id || undefined,
    });
    console.log(
      `[run-daily-reminders] user=${userLabel} pending_tasks=${pendingTasks.length} subscriptions=${subscriptions.length}`
    );
  } catch (error) {
    console.warn(
      `[run-daily-reminders] Could not load subscriptions for user ${userLabel}:`,
      error.message
    );
  }

  if (subscriptions.length === 0) {
    console.log(`[run-daily-reminders] skipped user=${userLabel} reason=no_subscriptions`);
  }

  for (const sub of subscriptions) {
    const subscription = normalizeSubscription(sub);
    if (!subscription) {
      totalFailed += 1;
      failedRecipients.push(`${userLabel} (invalid_subscription_record)`);
      continue;
    }

    try {
      await webpush.sendNotification(subscription, payload);
      totalSent += 1;
      sentRecipients.push(userLabel);
      const sentAt = new Date().toISOString();
      console.log(`  ✓ sent_at=${sentAt} user=${userLabel} endpoint=${subscription.endpoint.slice(0, 60)}…`);
    } catch (error) {
      totalFailed += 1;
      const statusCode = Number(error?.statusCode || 0);
      failedRecipients.push(`${userLabel} (${statusCode || 'unknown'})`);
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

  if (!FORCE_ALL_USERS) {
    try {
      await store.markUserNotifiedToday(userRecord.id, todayKey);
    } catch (error) {
      console.warn('[run-daily-reminders] Could not mark user notified:', error.message);
    }
  }
}

console.log(`[run-daily-reminders] Done. sent=${totalSent} failed=${totalFailed} no_tasks=${totalNoTasks}`);
console.log(`[run-daily-reminders] finished_at=${new Date().toISOString()}`);
if (sentRecipients.length > 0) {
  console.log('[run-daily-reminders] sent recipients:', [...new Set(sentRecipients)]);
}
if (failedRecipients.length > 0) {
  console.log('[run-daily-reminders] failed recipients:', failedRecipients);
}
if (skippedNoTaskRecipients.length > 0) {
  console.log('[run-daily-reminders] skipped no-task recipients:', skippedNoTaskRecipients);
}
process.exit(0);

#!/usr/bin/env node
/**
 * Standalone daily-reminders sender.
 * Reads enabled subscriptions from Supabase and sends Web Push notifications
 * to users whose reminder time matches the current UTC time slot.
 *
 * Run directly (e.g. from GitHub Actions every 15 min):
 *   node scripts/run-daily-reminders.mjs
 *
 * Required env vars:
 *   WEB_PUSH_PUBLIC_KEY
 *   WEB_PUSH_PRIVATE_KEY
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional env vars:
 *   WEB_PUSH_SUBJECT                    (default: mailto:admin@example.com)
 *   PUSH_APP_BASE_URL                   (default: /midhd/)
 *   SUPABASE_PUSH_SUBSCRIPTIONS_TABLE   (default: PushSubscription)
 *   SUPABASE_NOTIFICATION_SETTINGS_TABLE (default: UserNotificationSettings)
 *   REMINDER_TIMEZONE_OFFSET_HOURS      (default: 0 — UTC. Set e.g. 3 for UTC+3)
 */

import process from 'node:process';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Load dotenv (try several common locations, fail silently if missing)
try {
  const { default: dotenv } = await import('dotenv');
  dotenv.config({ path: path.resolve(__dirname, '..', '.env.push.local') });
  dotenv.config({ path: path.resolve(__dirname, '..', '.env.push') });
  dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
  dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
} catch {
  // dotenv not available – env vars must be supplied externally (e.g. GitHub Secrets)
}

// ── Configuration ──────────────────────────────────────────────────────────────

const PUSH_PUBLIC_KEY  = String(process.env.WEB_PUSH_PUBLIC_KEY  || process.env.VITE_WEB_PUSH_PUBLIC_KEY || '').trim();
const PUSH_PRIVATE_KEY = String(process.env.WEB_PUSH_PRIVATE_KEY || '').trim();
const PUSH_SUBJECT     = String(process.env.WEB_PUSH_SUBJECT     || 'mailto:admin@example.com').trim();
const PUSH_APP_BASE_URL = String(process.env.PUSH_APP_BASE_URL   || '/midhd/').trim().replace(/\/?$/, '/');

const SUPABASE_URL              = String(process.env.SUPABASE_URL              || '').trim().replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const SUBSCRIPTIONS_TABLE       = String(process.env.SUPABASE_PUSH_SUBSCRIPTIONS_TABLE        || 'PushSubscription').trim();
const NOTIFICATION_SETTINGS_TABLE = String(process.env.SUPABASE_NOTIFICATION_SETTINGS_TABLE || 'UserNotificationSettings').trim();

// Optional offset so the "time" stored in UserNotificationSettings (local time) lines
// up with the UTC clock in GitHub Actions runners.
const TZ_OFFSET_HOURS = Number(process.env.REMINDER_TIMEZONE_OFFSET_HOURS || 0);

// ── Validation ─────────────────────────────────────────────────────────────────

const missing = [];
if (!PUSH_PUBLIC_KEY)        missing.push('WEB_PUSH_PUBLIC_KEY');
if (!PUSH_PRIVATE_KEY)       missing.push('WEB_PUSH_PRIVATE_KEY');
if (!SUPABASE_URL)           missing.push('SUPABASE_URL');
if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');

if (missing.length > 0) {
  console.error(`[run-daily-reminders] Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

// ── web-push ───────────────────────────────────────────────────────────────────

const { default: webpush } = await import('web-push');
webpush.setVapidDetails(PUSH_SUBJECT, PUSH_PUBLIC_KEY, PUSH_PRIVATE_KEY);

// ── Supabase helpers ───────────────────────────────────────────────────────────

const supabaseRequest = async ({ table, method = 'GET', query = {}, body = undefined }) => {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${encodeURIComponent(table)}`);

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Supabase ${method} ${table} ${res.status}: ${detail}`);
  }

  if (res.status === 204) return [];
  return res.json().catch(() => []);
};

// ── Time helpers ───────────────────────────────────────────────────────────────

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

// ── Subscription normalizer ────────────────────────────────────────────────────

const normalizeSubscription = (record) => {
  if (record?.subscription?.endpoint) return record.subscription;
  if (!record?.endpoint || !record?.p256dh || !record?.auth) return null;
  return {
    endpoint: record.endpoint,
    expirationTime: record.expiration_time || null,
    keys: { p256dh: record.p256dh, auth: record.auth },
  };
};

// ── Main ───────────────────────────────────────────────────────────────────────

const todayKey  = getTodayKey(TZ_OFFSET_HOURS);
const timeSlot  = getLocalTimeSlot(TZ_OFFSET_HOURS);
const tasksUrl  = `${PUSH_APP_BASE_URL}Tasks`;

console.log(`[run-daily-reminders] date=${todayKey} slot=${timeSlot} tz_offset=${TZ_OFFSET_HOURS}h`);

// 1. Load users whose reminder time matches this slot and haven't been notified today
let usersToNotify = [];
try {
  const allEnabled = await supabaseRequest({
    table: NOTIFICATION_SETTINGS_TABLE,
    query: { select: '*', enabled: 'eq.true', time: `eq.${timeSlot}` },
  });

  usersToNotify = allEnabled.filter((r) => r.last_notified_date !== todayKey);
  console.log(`[run-daily-reminders] users matched for slot: ${usersToNotify.length}`);
} catch (err) {
  console.error('[run-daily-reminders] Failed to load notification settings:', err.message);
  process.exit(1);
}

if (usersToNotify.length === 0) {
  console.log('[run-daily-reminders] No users to notify at this time slot. Done.');
  process.exit(0);
}

// 2. For each user, load their push subscriptions and send
const payload = JSON.stringify({
  title: 'midhd – משימות להיום',
  body:  'פתחו את האפליקציה כדי לראות את המשימות להיום.',
  url:   tasksUrl,
  tag:   'midhd-daily-tasks',
  icon:  'app-icon.svg',
  badge: 'app-icon.svg',
  data:  { url: tasksUrl },
});

let totalSent   = 0;
let totalFailed = 0;

for (const userRecord of usersToNotify) {
  const filterQuery = { select: '*', enabled: 'eq.true' };
  if (userRecord.user_email) {
    filterQuery.user_email = `eq.${String(userRecord.user_email).toLowerCase()}`;
  } else if (userRecord.user_id) {
    filterQuery.user_id = `eq.${userRecord.user_id}`;
  }

  let subscriptions = [];
  try {
    subscriptions = await supabaseRequest({ table: SUBSCRIPTIONS_TABLE, query: filterQuery });
  } catch (err) {
    console.warn(`[run-daily-reminders] Could not load subscriptions for user ${userRecord.user_email || userRecord.user_id}:`, err.message);
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
    } catch (err) {
      totalFailed += 1;
      const statusCode = Number(err?.statusCode || 0);
      console.warn(`  ✗ failed (${statusCode}): ${err.message}`);

      // Mark expired / invalid subscriptions as disabled
      if (statusCode === 404 || statusCode === 410) {
        try {
          await supabaseRequest({
            table: SUBSCRIPTIONS_TABLE,
            method: 'PATCH',
            query: { id: `eq.${sub.id}` },
            body: { enabled: false, unsubscribed_at: new Date().toISOString(), updated_date: new Date().toISOString() },
          });
        } catch { /* best-effort */ }
      }
    }
  }

  // Mark user as notified today
  try {
    await supabaseRequest({
      table: NOTIFICATION_SETTINGS_TABLE,
      method: 'PATCH',
      query: { id: `eq.${userRecord.id}` },
      body: { last_notified_date: todayKey, updated_date: new Date().toISOString() },
    });
  } catch (err) {
    console.warn(`[run-daily-reminders] Could not mark user notified:`, err.message);
  }
}

console.log(`[run-daily-reminders] Done. sent=${totalSent} failed=${totalFailed}`);
process.exit(0);

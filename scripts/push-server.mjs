import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import express from 'express';
import dotenv from 'dotenv';
import webpush from 'web-push';
import { applicationDefault, cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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
const FIREBASE_PROJECT_ID = String(
  process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || ''
).trim();

if (!PUSH_PUBLIC_KEY || !PUSH_PRIVATE_KEY) {
  throw new Error('Missing WEB_PUSH_PUBLIC_KEY or WEB_PUSH_PRIVATE_KEY in environment.');
}

const buildFirebaseCredential = () => {
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

const adminApp = initializeApp({
  credential: buildFirebaseCredential(),
  projectId: FIREBASE_PROJECT_ID || undefined,
});

const db = getFirestore(adminApp);
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

const loadEnabledSubscriptions = async ({ userEmail, userId }) => {
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
};

const markSubscriptionInvalid = async (recordId) => {
  await db.collection('PushSubscription').doc(recordId).update({
    enabled: false,
    unsubscribed_at: new Date().toISOString(),
    updated_date: new Date().toISOString(),
  });
};

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'midhd-push-server',
    pushConfigured: Boolean(PUSH_PUBLIC_KEY && PUSH_PRIVATE_KEY),
    firebaseProjectId: FIREBASE_PROJECT_ID || null,
  });
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
    const records = await loadEnabledSubscriptions({ userEmail, userId });
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
          await markSubscriptionInvalid(record.id);
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
  console.log(`Push server listening on http://localhost:${PORT}`);
});

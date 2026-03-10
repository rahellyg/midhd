#!/usr/bin/env node
/**
 * Call the push server to send daily reminders for the current time slot.
 * Run this on a schedule (e.g. every 15 minutes via cron or Cloud Scheduler).
 *
 * Env: PUSH_SERVER_URL (default http://localhost:8787), PUSH_SERVER_API_KEY (optional)
 *
 * Cron example (every 15 min):
 *   */15 * * * * cd /path/to/midhd-main && node scripts/trigger-daily-reminders.mjs
 */
import dotenv from 'dotenv';
import path from 'path';
import process from 'process';

dotenv.config({ path: path.resolve(process.cwd(), '.env.push.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.push') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const baseUrl = (process.env.PUSH_SERVER_URL || 'http://localhost:8787').replace(/\/$/, '');
const apiKey = String(process.env.PUSH_SERVER_API_KEY || process.env.API_KEY || '').trim();
const url = `${baseUrl}/push/send-daily-reminders`;
const headers = { 'Content-Type': 'application/json' };
if (apiKey) headers['x-api-key'] = apiKey;

const res = await fetch(url, { method: 'POST', headers });
const data = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error('Daily reminders request failed:', res.status, data);
  process.exit(1);
}
console.log('Daily reminders:', data.message || data);
process.exit(0);

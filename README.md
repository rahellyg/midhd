# midhd

React + Vite app for ADHD-focused task, focus-session, and profile flows.

## Local development

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.local.example` and configure values:

```dotenv
VITE_APP_ID=your_app_id
VITE_API_BASE_URL=http://localhost:3000
VITE_FUNCTIONS_VERSION=
VITE_GOOGLE_CLIENT_ID=
VITE_OPENAI_API_KEY=
VITE_OPENAI_MODEL=gpt-4o-mini
VITE_EMAILJS_SERVICE_ID=
VITE_EMAILJS_TEMPLATE_ID=
VITE_EMAILJS_PUBLIC_KEY=
VITE_WEB_PUSH_PUBLIC_KEY=
```

`VITE_GOOGLE_CLIENT_ID` is optional. If you set it, the login page will render the Google Identity Services sign-in button.

`VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID`, and `VITE_EMAILJS_PUBLIC_KEY` are optional, but required for the Home page contact form to send real emails to `rahelly23@gmail.com`.

`VITE_WEB_PUSH_PUBLIC_KEY` is required for Web Push subscription (browser device registration). Generate VAPID keys with:

```bash
npx web-push generate-vapid-keys
```

Use the `publicKey` value as `VITE_WEB_PUSH_PUBLIC_KEY`.

The app stores subscriptions in the `PushSubscription` entity (Firestore collection). To deliver real background push notifications, your backend/worker must send push messages to saved subscription endpoints using the matching VAPID private key.

3. Run the dev server:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
```

## GitHub Secrets (recommended)

To avoid committing sensitive values, configure these repository secrets:

- `VITE_APP_ID`
- `VITE_API_BASE_URL`
- `VITE_FUNCTIONS_VERSION`
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_OPENAI_API_KEY`
- `VITE_OPENAI_MODEL`
- `VITE_EMAILJS_SERVICE_ID`
- `VITE_EMAILJS_TEMPLATE_ID`
- `VITE_EMAILJS_PUBLIC_KEY`
- `VITE_WEB_PUSH_PUBLIC_KEY`

Deployment workflow file:

- `.github/workflows/deploy-pages.yml`

Open: `GitHub repo -> Settings -> Secrets and variables -> Actions -> New repository secret`.

## Web Push sender service

This repo includes a Node sender script that sends Web Push notifications to subscriptions stored in Firestore (`PushSubscription` collection).

1. Copy the server env template:

```bash
cp .env.push.example .env.push
```

On Windows PowerShell:

```powershell
Copy-Item .env.push.example .env.push
```

2. Fill required values in `.env.push`:

- `WEB_PUSH_PUBLIC_KEY`
- `WEB_PUSH_PRIVATE_KEY`
- `WEB_PUSH_SUBJECT`
- one Firebase admin credential option:
	- `FIREBASE_SERVICE_ACCOUNT_FILE`, or
	- `FIREBASE_SERVICE_ACCOUNT_JSON`

Alternative: use Supabase as the push-server datastore (instead of Firebase Admin):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional Supabase table overrides:

- `SUPABASE_PUSH_SUBSCRIPTIONS_TABLE` (default `PushSubscription`)
- `SUPABASE_NOTIFICATION_SETTINGS_TABLE` (default `UserNotificationSettings`)

3. Generate VAPID keys (one-time):

```bash
npm run push:keys
```

Run the daily reminders sender manually:

```bash
npm run push:send
```

### Global on/off switch for everyone

Push is now controlled directly in code with two constants:

- `src/lib/webPush.js` -> `PUSH_NOTIFICATIONS_ENABLED`
- `scripts/run-daily-reminders.mjs` -> `PUSH_NOTIFICATIONS_ENABLED`

Set both constants to `false` to disable push globally.
Set both constants to `true` to enable push globally.

Notes:

- You must redeploy/restart services after changing these constants.
- Turning off only the frontend constant stops new subscriptions, but existing subscriptions can still receive pushes if sender stays enabled.
- Turning off only the sender constant stops all daily push delivery even if users stay subscribed.

### How push notifications work (code walkthrough)

This section explains the current push flow in code and answers common operational questions.

#### 1) End-to-end flow

1. User enables notifications in the Tasks page.
2. Browser permission is requested.
3. If granted and VAPID public key exists, the app subscribes the current browser/device to Web Push and stores the subscription in `PushSubscription`.
4. GitHub Actions runs the daily reminders script every 15 minutes.
5. Script loads users with notifications enabled (`UserNotificationSettings`), checks if they are due now, and loads their pending tasks for today.
6. Script sends push to each enabled subscription endpoint for matching users.
7. Invalid endpoints (404/410) are disabled automatically.
8. For normal scheduled runs, the user is marked as already notified today.

Main files:

- Frontend subscribe/unsubscribe logic: `src/lib/webPush.js`
- Frontend notification settings/local test notifications: `src/lib/dailyTaskNotifications.js`
- Daily sender (actual push delivery): `scripts/run-daily-reminders.mjs`
- Service worker push display/click handling: `public/push-handler.js`
- Scheduler (GitHub Actions): `.github/workflows/daily-reminders.yml`

#### 2) When is push sent?

The scheduled workflow runs every 15 minutes (UTC cron). The sender script converts current time using `REMINDER_TIMEZONE_OFFSET_HOURS` and only sends for users whose configured reminder time is at or before "now".

In normal scheduled mode (`FORCE_ALL_USERS=false`):

- User must have notifications enabled in `UserNotificationSettings`.
- User must not have `last_notified_date` equal to today.
- Current local slot must be at/after the user's configured reminder time.
- User must have at least one pending task for today.

If all checks pass, push is sent.

#### 3) Can one user get several pushes in one day?

Yes, but it depends on scenario:

- Normal scheduled mode: usually one reminder per user per day because `last_notified_date` is updated after processing.
- Multiple devices/browsers: one run can send multiple pushes for the same user (one per active subscription endpoint).
- Manual workflow dispatch (`workflow_dispatch`): sets `FORCE_ALL_USERS=true`, which bypasses daily/time/task filters and can resend on the same day if triggered multiple times.

Single-user repeated test mode (recommended for QA):

- Edit the code constants in `scripts/run-daily-reminders.mjs`:
	- `CODE_TEST_TARGET_USER_EMAIL` or `CODE_TEST_TARGET_USER_ID`
	- `CODE_TEST_TARGET_USER_REPEAT_PER_DAY`
	- `CODE_TEST_TARGET_USER_IGNORE_TIME`
	- `CODE_TEST_TARGET_USER_ALLOW_NO_TASKS`

In this mode, only the target user is considered by the sender. All other users are skipped.

Example (GitHub Actions):

- Push your code changes and run the workflow on schedule or manually.
- No test-target secrets are required.
- After testing is complete, revert those `CODE_TEST_*` constants back to neutral values.

#### 4) What checks happen before sending push?

Config/environment checks at startup:

- `WEB_PUSH_PUBLIC_KEY` (or `VITE_WEB_PUSH_PUBLIC_KEY`) must exist.
- `WEB_PUSH_PRIVATE_KEY` must exist.
- Firebase admin credentials must exist (`FIREBASE_SERVICE_ACCOUNT_JSON` or file path).
- If the sender `PUSH_NOTIFICATIONS_ENABLED` constant is `false`, script exits immediately without sending.

Per-user checks:

- `enabled == true` in `UserNotificationSettings`.
- Not already notified today (except `FORCE_ALL_USERS=true`).
- Reminder time is due now or earlier today (except `FORCE_ALL_USERS=true`).
- Has pending tasks for today (except `FORCE_ALL_USERS=true`).

Per-subscription checks:

- Subscription record must be valid (`endpoint` and keys).
- Only subscriptions with `enabled == true` are used.
- On push provider response 404/410, subscription is marked disabled.

#### 5) How push from GitHub works

Workflow file: `.github/workflows/daily-reminders.yml`

- Trigger 1: `schedule` every 15 minutes.
- Trigger 2: `workflow_dispatch` for manual runs from the Actions tab.
- Job installs dependencies and validates required secrets.
- Job runs `node scripts/run-daily-reminders.mjs` with secrets injected as environment variables.

Important behavior:

- `workflow_dispatch` sets `FORCE_ALL_USERS=true` in this workflow.
- Scheduled runs set `FORCE_ALL_USERS=false`.
- Global stop can be enforced by setting both code constants to `false`.

#### 6) Frontend gating and subscription creation

The app only attempts browser subscription when all are true:

- Browser supports Notifications, Service Worker, and PushManager.
- Context is secure (HTTPS or localhost).
- Frontend `PUSH_NOTIFICATIONS_ENABLED` constant is `true`.
- Notification permission is granted.
- `VITE_WEB_PUSH_PUBLIC_KEY` is configured.

If any check fails, no subscription is created.

4. Run the script manually for testing:

```bash
npm run push:send
```

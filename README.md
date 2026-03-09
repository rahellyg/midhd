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

This repo now includes a small Node endpoint that sends real Web Push notifications to subscriptions stored in Firestore (`PushSubscription` collection).

1. Copy the server env template:

```bash
cp .env.push.example .env.push
```

2. Fill required values in `.env.push`:

- `WEB_PUSH_PUBLIC_KEY`
- `WEB_PUSH_PRIVATE_KEY`
- `WEB_PUSH_SUBJECT`
- one Firebase admin credential option:
	- `FIREBASE_SERVICE_ACCOUNT_FILE`, or
	- `FIREBASE_SERVICE_ACCOUNT_JSON`

3. Start the push endpoint:

```bash
npm run push:server
```

4. Send a test push request:

```bash
curl -X POST http://localhost:8787/push/send \
	-H "Content-Type: application/json" \
	-H "x-api-key: $PUSH_SERVER_API_KEY" \
	-d '{
		"title": "Test",
		"body": "Hello from push endpoint",
		"url": "/Tasks"
	}'
```

Optional filters in request body:

- `userEmail`: send only to one user email
- `userId`: send only to one user id
- `dryRun: true`: validate recipient count without sending

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
```

`VITE_GOOGLE_CLIENT_ID` is optional. If you set it, the login page will render the Google Identity Services sign-in button.

`VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID`, and `VITE_EMAILJS_PUBLIC_KEY` are optional, but required for the Home page contact form to send real emails to `rahelly23@gmail.com`.

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

Deployment workflow file:

- `.github/workflows/deploy-pages.yml`

Open: `GitHub repo -> Settings -> Secrets and variables -> Actions -> New repository secret`.

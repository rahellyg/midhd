import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { Mail } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import SiteCredit from '@/components/layout/SiteCredit';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function Login() {
  const [resetSent, setResetSent] = useState(false);
  const { t, i18n } = useTranslation();
  const { signInWithEmail, isSigningIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const isSubscribeMode = (searchParams.get('mode') || '').toLowerCase() === 'subscribe';

  const handleForgotPassword = async () => {
    setError('');
    setResetSent(false);
    const normalized = email.trim();
    if (!normalized || !normalized.includes('@')) {
      setError(t('login.errorInvalidEmail'));
      return;
    }

    if (!isFirebaseConfigured || !auth) {
      setError(t('login.resetError'));
      return;
    }

    try {
      await sendPasswordResetEmail(auth, normalized);
      setResetSent(true);
    } catch (err) {
      setError(t('login.resetError') + (err?.message ? `: ${err.message}` : ''));
    }
  };

  const handleEmailSignIn = async (event) => {
    event.preventDefault();
    setError('');
    setResetSent(false);

    const normalized = email.trim();
    if (!normalized || !normalized.includes('@')) {
      setError(t('login.errorInvalidEmail'));
      return;
    }

    if (!password || password.length < 4) {
      setError(t('login.errorShortPassword'));
      return;
    }

    if (isSubscribeMode && password !== confirmPassword) {
      setError(t('login.errorPasswordMismatch'));
      return;
    }

    try {
      await signInWithEmail({
        email: normalized,
        password,
        mode: isSubscribeMode ? 'subscribe' : 'login',
      });
      navigate('/');
    } catch (signInError) {
      setError(signInError?.message || t('login.errorFailed'));
    }
  };

  // Google Auth temporarily disabled

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5"
      dir={i18n.language === 'he' ? 'rtl' : 'ltr'}
      style={{ background: 'linear-gradient(140deg, #eef2ff 0%, #f8fafc 45%, #ecfeff 100%)' }}
    >
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-md bg-white/90 backdrop-blur rounded-3xl border border-slate-100 shadow-xl p-6">
        <div className="text-center mb-6">
          <p className="text-xs uppercase tracking-[0.18em] text-indigo-500 font-semibold mb-2">midhd</p>
          <h1 className="text-2xl font-bold text-slate-800">
            {isSubscribeMode ? t('login.signupTitle') : t('login.title')}
          </h1>
          <p className="text-slate-500 text-sm mt-2">
            {isSubscribeMode ? t('login.signupSubtitle') : t('login.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3 my-5">
          <div className="h-px bg-slate-200 flex-1" />
          <span className="text-xs text-slate-400">{t('login.or')}</span>
          <div className="h-px bg-slate-200 flex-1" />
        </div>

        <form onSubmit={handleEmailSignIn} className="space-y-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">{t('login.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t('login.emailPlaceholder')}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">{t('login.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t('login.passwordPlaceholder')}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <div className="flex justify-end mt-1">
              <button
                type="button"
                className="text-xs text-indigo-600 hover:underline disabled:opacity-50"
                onClick={handleForgotPassword}
                disabled={!email || isSigningIn}
              >
                {t('login.forgotPassword')}
              </button>
            </div>
          </div>
          {isSubscribeMode && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t('login.confirmPassword')}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder={t('login.confirmPlaceholder')}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={isSigningIn}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 text-white py-3 font-semibold hover:bg-indigo-700 disabled:opacity-60"
          >
            <Mail size={18} />
            {isSigningIn ? t('login.signingIn') : (isSubscribeMode ? t('login.signUpWithEmail') : t('login.signInWithEmail'))}
          </button>
        </form>

        {error && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </p>
        )}
        {resetSent && (
          <p className="mt-4 text-sm text-green-600 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
            {t('login.resetSent')}
          </p>
        )}
      </div>
      <SiteCredit />
    </div>
  );
}

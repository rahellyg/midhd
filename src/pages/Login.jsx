import { useEffect, useRef, useState } from 'react';
import { Mail, Chrome } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import SiteCredit from '@/components/layout/SiteCredit';

export default function Login() {
  const { signInWithEmail, isSigningIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [googleSdkFailed, setGoogleSdkFailed] = useState(false);
  const googleContainerRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isSubscribeMode = (searchParams.get('mode') || '').toLowerCase() === 'subscribe';


  // Google Auth temporarily disabled

  const handleEmailSignIn = async (event) => {
    event.preventDefault();
    setError('');

    const normalized = email.trim();
    if (!normalized || !normalized.includes('@')) {
      setError('נא להזין כתובת אימייל תקינה.');
      return;
    }

    if (!password || password.length < 4) {
      setError('נא להזין סיסמה של לפחות 4 תווים.');
      return;
    }

    if (isSubscribeMode && password !== confirmPassword) {
      setError('אימות הסיסמה אינו תואם.');
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
      setError(signInError?.message || 'ההתחברות נכשלה. נסה שוב.');
    }
  };


  // Google Auth temporarily disabled

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5" style={{ background: 'linear-gradient(140deg, #eef2ff 0%, #f8fafc 45%, #ecfeff 100%)' }}>
      <div className="w-full max-w-md bg-white/90 backdrop-blur rounded-3xl border border-slate-100 shadow-xl p-6">
        <div className="text-center mb-6">
          <p className="text-xs uppercase tracking-[0.18em] text-indigo-500 font-semibold mb-2">midhd</p>
          <h1 className="text-2xl font-bold text-slate-800">{isSubscribeMode ? 'הרשמה' : 'התחברות'}</h1>
          <p className="text-slate-500 text-sm mt-2">
            {isSubscribeMode ? 'פתח חשבון חדש עם Google או אימייל' : 'בחר כניסה עם Google או עם אימייל'}
          </p>
        </div>

        {/* Google Auth temporarily disabled */}

        <div className="flex items-center gap-3 my-5">
          <div className="h-px bg-slate-200 flex-1" />
          <span className="text-xs text-slate-400">או</span>
          <div className="h-px bg-slate-200 flex-1" />
        </div>

        <form onSubmit={handleEmailSignIn} className="space-y-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">אימייל</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">סיסמה</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="לפחות 4 תווים"
              className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          {isSubscribeMode && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">אימות סיסמה</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="הזן שוב את הסיסמה"
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
            {isSigningIn ? 'מתחבר...' : (isSubscribeMode ? 'הרשמה עם אימייל' : 'כניסה עם אימייל')}
          </button>
        </form>

        {error && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </p>
        )}
      </div>
      <SiteCredit />
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Mail, Chrome } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import SiteCredit from '@/components/layout/SiteCredit';

export default function Login() {
  const { signInWithEmail, signInWithGoogle, signInWithGoogleCredential, isSigningIn } = useAuth();
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

  useEffect(() => {
    if (!googleClientId) {
      return;
    }
    const googleApi = /** @type {any} */ (window).google;

    const initializeGoogle = () => {
      if (!googleApi?.accounts?.id || !googleContainerRef.current) {
        setGoogleSdkFailed(true);
        setError('Google SDK לא נטען. אפשר להתחבר כרגע עם אימייל.');
        return;
      }

      googleApi.accounts.id.initialize({
        client_id: googleClientId,
        callback: async ({ credential }) => {
          if (!credential) {
            setError('לא התקבל אישור התחברות מ-Google.');
            return;
          }
          try {
            setError('');
            await signInWithGoogleCredential(credential);
            navigate('/');
          } catch (signInError) {
            setError(signInError?.message || 'ההתחברות עם Google נכשלה.');
          }
        }
      });

      googleContainerRef.current.innerHTML = '';
      googleApi.accounts.id.renderButton(googleContainerRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        width: 360,
        text: 'signin_with'
      });
      setGoogleSdkFailed(false);
    };

    if (googleApi?.accounts?.id) {
      initializeGoogle();
      return;
    }

    const scriptId = 'google-identity-services';
    let script = /** @type {HTMLScriptElement | null} */ (document.getElementById(scriptId));
    const handleScriptError = () => {
      setGoogleSdkFailed(true);
      setError('התחברות Google לא זמינה כרגע (שגיאת טעינת SDK).');
    };
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener('load', initializeGoogle);
    script.addEventListener('error', handleScriptError);

    return () => {
      script?.removeEventListener('load', initializeGoogle);
      script?.removeEventListener('error', handleScriptError);
    };
  }, [googleClientId]);

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

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      await signInWithGoogle();
      navigate('/');
    } catch (signInError) {
      setError(signInError?.message || 'ההתחברות עם Google נכשלה.');
    }
  };

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

        {googleClientId && !googleSdkFailed ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-3 px-3 flex justify-center">
            <div ref={googleContainerRef} />
          </div>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-60"
            >
              <Chrome size={18} />
              {isSigningIn ? 'מתחבר...' : (isSubscribeMode ? 'הרשמה עם Google' : 'התחברות עם Google')}
            </button>
            {!googleClientId && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 leading-5">
                כדי להפעיל Google אמיתי יש להגדיר <code>VITE_GOOGLE_CLIENT_ID</code> ב-<code>.env.local</code> ולהוסיף את כתובת האתר ל-Authorized JavaScript origins ב-Google Cloud Console.
              </p>
            )}
          </div>
        )}

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

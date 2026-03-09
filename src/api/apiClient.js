import { appParams } from '@/lib/app-params';
import { isFirebaseConfigured } from '@/lib/firebase';
import { firestoreEntityApi } from '@/lib/db';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const normalizeBaseUrl = (url) => {
  if (!url) {
    return '';
  }
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

const isValidAppId = Boolean(appId && appId !== 'null' && appId !== 'undefined');
const baseUrl = normalizeBaseUrl(appBaseUrl);
// Only Firebase authentication is allowed (no backend API)
const isApiConfigured = false;
const isLocalFallbackEnabled = isFirebaseConfigured;
const appApiPath = isValidAppId ? `/api/apps/${appId}` : '/api/apps/null';
const appApiRoot = `${baseUrl}${appApiPath}`;
const publicApiRoot = `${baseUrl}/api/apps/public`;
const LOCAL_DB_KEY = 'midhd_local_db_v1';
const LOCAL_USER_KEY = 'midhd_local_user_v1';
const LOCAL_AUTH_USERS_KEY = 'midhd_local_auth_users_v1';
const CLOUD_CONFIG_ERROR = 'Cloud sync is not configured. Set VITE_APP_ID and VITE_API_BASE_URL.';

const ensureLocalFallbackEnabled = () => {
  if (!isLocalFallbackEnabled) {
    throw new ApiError(CLOUD_CONFIG_ERROR, 503, null);
  }
};

const createLocalDb = () => ({
  Task: [],
  FocusSession: [],
  UserProfile: [],
  AuthEvent: []
});

const readLocalDb = () => {
  if (typeof window === 'undefined') {
    return createLocalDb();
  }
  try {
    const raw = window.localStorage.getItem(LOCAL_DB_KEY);
    if (!raw) {
      return createLocalDb();
    }
    const parsed = JSON.parse(raw);
    return {
      Task: Array.isArray(parsed?.Task) ? parsed.Task : [],
      FocusSession: Array.isArray(parsed?.FocusSession) ? parsed.FocusSession : [],
      UserProfile: Array.isArray(parsed?.UserProfile) ? parsed.UserProfile : [],
      AuthEvent: Array.isArray(parsed?.AuthEvent) ? parsed.AuthEvent : []
    };
  } catch {
    return createLocalDb();
  }
};

const logAuthEvent = async ({ eventType, user, provider = 'unknown' }) => {
  try {
    await api.entities['AuthEvent'].create({
      event_type: eventType,
      user_email: user?.email || null,
      user_name: user?.full_name || null,
      provider,
      event_time: new Date().toISOString(),
      origin: 'firebase'
    });
  } catch {
    // Auth event tracking must never block login flow.
  }
};

const writeLocalDb = (db) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(db));
};

const createLocalId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const applySortAndLimit = (rows, sort = '-created_date', limit = 100) => {
  const sortKey = String(sort || '-created_date');
  const isDesc = sortKey.startsWith('-');
  const field = isDesc ? sortKey.slice(1) : sortKey;
  const sorted = [...rows].sort((a, b) => {
    const aValue = a?.[field];
    const bValue = b?.[field];
    if (aValue == null && bValue == null) {
      return 0;
    }
    if (aValue == null) {
      return 1;
    }
    if (bValue == null) {
      return -1;
    }
    if (aValue < bValue) {
      return isDesc ? 1 : -1;
    }
    if (aValue > bValue) {
      return isDesc ? -1 : 1;
    }
    return 0;
  });
  return sorted.slice(0, Number(limit) || 100);
};

const localEntityApi = (entityName) => ({
  list: async (sort = '-created_date', limit = 100) => {
    const db = readLocalDb();
    return applySortAndLimit(db[entityName] || [], sort, limit);
  },
  filter: async (criteria = {}, sort = '-created_date', limit = 100) => {
    const rows = await localEntityApi(entityName).list(sort, limit);
    if (!criteria || typeof criteria !== 'object') {
      return rows;
    }
    return rows.filter((item) =>
      Object.entries(criteria).every(([key, value]) => item?.[key] === value)
    );
  },
  create: async (data) => {
    const db = readLocalDb();
    const now = new Date().toISOString();
    const created = {
      id: createLocalId(),
      created_date: now,
      updated_date: now,
      ...data
    };
    db[entityName] = [...(db[entityName] || []), created];
    writeLocalDb(db);
    return created;
  },
  update: async (id, data) => {
    const db = readLocalDb();
    const rows = db[entityName] || [];
    let updatedRow = null;
    db[entityName] = rows.map((row) => {
      if (String(row.id) !== String(id)) {
        return row;
      }
      updatedRow = {
        ...row,
        ...data,
        updated_date: new Date().toISOString()
      };
      return updatedRow;
    });
    writeLocalDb(db);
    return updatedRow;
  },
  delete: async (id) => {
    const db = readLocalDb();
    db[entityName] = (db[entityName] || []).filter((row) => String(row.id) !== String(id));
    writeLocalDb(db);
    return { success: true };
  }
});

const getAuthToken = () => {
  if (typeof window === 'undefined') {
    return token || null;
  }
  return window.localStorage.getItem('app_access_token') || token || null;
};

const buildUrl = (path, query) => {
  const url = new URL(path, window.location.origin);
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    url.searchParams.set(key, String(value));
  });
  return url.toString();
};

const parseResponsePayload = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  const text = await response.text();
  return text || null;
};

const unwrapEntityPayload = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }
  if (payload && Array.isArray(payload.results)) {
    return payload.results;
  }
  return payload;
};

const apiRequest = async ({
  method = 'GET',
  path,
  query = undefined,
  body = undefined,
  includeAuth = true
}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (functionsVersion) {
    headers['X-Functions-Version'] = String(functionsVersion);
  }
  if (includeAuth) {
    const authToken = getAuthToken();
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include'
  });

  const payload = await parseResponsePayload(response);
  if (!response.ok) {
    throw new ApiError(`Request failed with status code ${response.status}`, response.status, payload);
  }
  return unwrapEntityPayload(payload);
};

const entityApi = (entityName) => ({
  list: async (sort = '-created_date', limit = 100) => {
    return apiRequest({
      method: 'GET',
      path: `${appApiRoot}/entities/${entityName}`,
      query: { sort, limit }
    });
  },
  filter: async (criteria = {}, sort = '-created_date', limit = 100) => {
    const rows = await apiRequest({
      method: 'GET',
      path: `${appApiRoot}/entities/${entityName}`,
      query: { sort, limit }
    });
    if (!criteria || typeof criteria !== 'object') {
      return rows;
    }
    return (rows || []).filter((item) =>
      Object.entries(criteria).every(([key, value]) => item?.[key] === value)
    );
  },
  create: async (data) => {
    return apiRequest({
      method: 'POST',
      path: `${appApiRoot}/entities/${entityName}`,
      body: data
    });
  },
  update: async (id, data) => {
    return apiRequest({
      method: 'PATCH',
      path: `${appApiRoot}/entities/${entityName}/${id}`,
      body: data
    });
  },
  delete: async (id) => {
    return apiRequest({
      method: 'DELETE',
      path: `${appApiRoot}/entities/${entityName}/${id}`
    });
  }
});

const clearAuthStorage = () => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(LOCAL_USER_KEY);
  window.localStorage.removeItem('app_access_token');
  window.localStorage.removeItem('token');
};

const readLocalAuthUsers = () => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(LOCAL_AUTH_USERS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalAuthUsers = (users) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(LOCAL_AUTH_USERS_KEY, JSON.stringify(users));
};

const getLocalAuthUser = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  const tokenValue = window.localStorage.getItem('app_access_token');
  const raw = window.localStorage.getItem(LOCAL_USER_KEY);
  if (!tokenValue || !raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const setLocalAuthSession = (user) => {
  if (typeof window === 'undefined') {
    return null;
  }
  const authToken = `local_${createLocalId()}`;
  window.localStorage.setItem('app_access_token', authToken);
  window.localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
  return user;
};

const decodeJwtPayload = (credentialToken) => {
  const [, payloadPart] = String(credentialToken || '').split('.');
  if (!payloadPart) {
    throw new ApiError('Invalid Google credential', 400, null);
  }
  const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const jsonPayload = atob(padded);
  return JSON.parse(jsonPayload);
};

const resolveFromUrl = (fromUrl) => {
  if (fromUrl) {
    return fromUrl;
  }
  if (typeof window === 'undefined') {
    return '/';
  }
  return window.location.href;
};

/**
 * Entity API shape for type-checking. List/filter return arrays of entity objects (shape varies by entity).
 * @typedef {{
 *   list: (sort?: string, limit?: number) => Promise<any[]>;
 *   filter: (criteria?: Record<string, unknown>, sort?: string, limit?: number) => Promise<any[]>;
 *   create: (data: Record<string, unknown>) => Promise<any>;
 *   update: (id: string, data: Record<string, unknown>) => Promise<any>;
 *   delete: (id: string) => Promise<{ success: boolean }>;
 * }} EntityApi
 * @typedef {{ Task: EntityApi; FocusSession: EntityApi; ForumThread: EntityApi; DailyCheckIn: EntityApi; UserProfile: EntityApi; AuthEvent: EntityApi }} ApiEntities
 */

export const getAppPublicSettings = async (id) => {
  if (!isApiConfigured) {
    return {
      id: id || 'local',
      public_settings: { mode: isFirebaseConfigured ? 'firebase' : 'local' }
    };
  }
  return apiRequest({
    method: 'GET',
    path: `${publicApiRoot}/prod/public-settings/by-id/${id}`,
    includeAuth: true
  });
};

export const api = {
  auth: {
    me: async () => {
      if (!isApiConfigured) {
        ensureLocalFallbackEnabled();
        const localUser = getLocalAuthUser();
        if (!localUser) {
          throw new ApiError('Not authenticated', 401, null);
        }
        return localUser;
      }
      return apiRequest({
        method: 'GET',
        path: `${appApiRoot}/entities/User/me`,
        includeAuth: true
      });
    },
    signInWithEmail: async ({ email, fullName, birthDate, password, mode = 'login' }) => {
      if (!isFirebaseConfigured) {
        throw new ApiError('Firebase is not configured. Cannot login.', 503, null);
      }
      const normalizedEmail = String(email || '').trim().toLowerCase();
      const normalizedPassword = String(password || '');
      if (!normalizedEmail || !normalizedEmail.includes('@')) {
        throw new ApiError('נא להזין כתובת אימייל תקינה.', 400, null);
      }
      if (!normalizedPassword || normalizedPassword.length < 4) {
        throw new ApiError('הסיסמה חייבת להכיל לפחות 4 תווים.', 400, null);
      }
      const name = (fullName && fullName.trim()) || normalizedEmail.split('@')[0];
      const { auth } = await import('@/lib/firebase');
      const { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
      let userCredential;
      try {
        if (mode === 'subscribe') {
          userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, normalizedPassword);
          if (name) {
            await updateProfile(userCredential.user, { displayName: name });
          }
        } else {
          userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, normalizedPassword);
        }
      } catch (err) {
        if (err.code === 'auth/email-already-in-use') {
          throw new ApiError('המשתמש כבר קיים. אפשר להתחבר עם אימייל וסיסמה.', 409, null);
        }
        if (err.code === 'auth/user-not-found') {
          throw new ApiError('לא נמצא חשבון עם האימייל הזה. בצעו הרשמה קודם.', 404, null);
        }
        if (err.code === 'auth/wrong-password') {
          throw new ApiError('סיסמה שגויה.', 401, null);
        }
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-email') {
          throw new ApiError(err.message || 'פרטי התחברות לא תקינים.', 400, null);
        }
        if (err.code === 'auth/operation-not-allowed') {
          throw new ApiError('התחברות באימייל אינה מופעלת בפרויקט. הפעל Email/Password ב-Firebase Console.', 503, null);
        }
        throw new ApiError(err.message || 'ההתחברות נכשלה. נסה שוב.', 400, null);
      }
      const sessionUser = {
        id: userCredential.user.uid,
        email: userCredential.user.email,
        full_name: userCredential.user.displayName || userCredential.user.email || name,
        provider: 'email',
      };
      setLocalAuthSession(sessionUser);
      void logAuthEvent({
        eventType: mode === 'subscribe' ? 'signup' : 'login',
        user: sessionUser,
        provider: 'email',
      }).catch(() => {});
      return sessionUser;
    },
    signInWithGoogle: async () => {
      throw new ApiError('Google sign-in is not implemented for Firebase-only mode.', 501, null);
    },
    signInWithGoogleCredential: async (credentialToken) => {
      ensureLocalFallbackEnabled();
      const profile = decodeJwtPayload(credentialToken);
      const user = {
        id: profile.sub || createLocalId(),
        email: (profile.email || 'google-user@midhd.dev').toLowerCase(),
        full_name: profile.name || profile.given_name || 'Google User',
        role: 'user',
        provider: 'google'
      };
      const sessionUser = setLocalAuthSession(user);
      void logAuthEvent({ eventType: 'login', user: sessionUser, provider: 'google' }).catch(() => {});
      return sessionUser;
    },
    logout: (fromUrl) => {
      clearAuthStorage();
      if (fromUrl && typeof window !== 'undefined') {
        window.location.href = fromUrl;
      }
    },
    redirectToLogin: (fromUrl) => {
      throw new Error('redirectToLogin is not available in Firebase-only mode.');
    }
  },
  entities: /** @type {ApiEntities} */ (
    new Proxy(
      {},
      {
        get: (_target, entityName) => {
          if (isFirebaseConfigured) {
            return firestoreEntityApi(String(entityName));
          }
          // Only Firebase authentication is allowed; no API entity fallback
          if (isLocalFallbackEnabled) {
            return localEntityApi(String(entityName));
          }
          return {
            list: async () => {
              throw new ApiError(CLOUD_CONFIG_ERROR, 503, null);
            },
            filter: async () => {
              throw new ApiError(CLOUD_CONFIG_ERROR, 503, null);
            },
            create: async () => {
              throw new ApiError(CLOUD_CONFIG_ERROR, 503, null);
            },
            update: async () => {
              throw new ApiError(CLOUD_CONFIG_ERROR, 503, null);
            },
            delete: async () => {
              throw new ApiError(CLOUD_CONFIG_ERROR, 503, null);
            }
          };
        }
      }
    )
  )
};

export { isApiConfigured, isLocalFallbackEnabled, isFirebaseConfigured };

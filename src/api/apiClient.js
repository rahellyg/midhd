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
const isApiConfigured = isValidAppId && Boolean(baseUrl);
const isBrowser = typeof window !== 'undefined';
const isLocalHost = isBrowser
  ? ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
  : false;
const isLocalFallbackEnabled = !isApiConfigured && (import.meta.env.DEV || isLocalHost || isFirebaseConfigured);
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
      event_time: new Date().toISOString()
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

export const getAppPublicSettings = async (id) => {
  if (!isApiConfigured) {
    ensureLocalFallbackEnabled();
    return {
      id: id || 'local',
      public_settings: { mode: 'local' }
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
      if (isApiConfigured) {
        api.auth.redirectToLogin(window.location.href);
        return null;
      }
      ensureLocalFallbackEnabled();

      const normalizedEmail = String(email || '').trim().toLowerCase();
      const normalizedPassword = String(password || '');

      if (!normalizedEmail || !normalizedEmail.includes('@')) {
        throw new ApiError('נא להזין כתובת אימייל תקינה.', 400, null);
      }

      if (!normalizedPassword || normalizedPassword.length < 4) {
        throw new ApiError('הסיסמה חייבת להכיל לפחות 4 תווים.', 400, null);
      }

      const users = readLocalAuthUsers();
      const existingUser = users.find((item) => item.email === normalizedEmail);
      const name = fullName?.trim() || normalizedEmail.split('@')[0];

      if (mode === 'subscribe') {
        if (existingUser) {
          throw new ApiError('המשתמש כבר קיים. אפשר להתחבר עם אימייל וסיסמה.', 409, null);
        }

        // Add user to Firebase (UserProfile collection)
        let createdUser = null;
        if (isFirebaseConfigured) {
          createdUser = await (api.entities as any).UserProfile.create({
            user_email: normalizedEmail,
            full_name: name,
            birth_date: birthDate || null,
            role: 'user',
            provider: 'email',
            // You may add more fields as needed
          });
        } else {
          throw new ApiError('Firebase is not configured. Cannot register user.', 503, null);
        }

        // Set session user (without password)
        const sessionUser = {
          id: createdUser?.id,
          email: createdUser?.user_email,
          full_name: createdUser?.full_name,
          birth_date: createdUser?.birth_date,
          role: createdUser?.role,
          provider: createdUser?.provider,
        };
        setLocalAuthSession(sessionUser);
        void logAuthEvent({ eventType: 'signup', user: sessionUser, provider: 'email' }).catch(() => {});
        return sessionUser;
      }

      if (!existingUser) {
        throw new ApiError('לא נמצא חשבון עם האימייל הזה. בצעו הרשמה קודם.', 404, null);
      }

      if (existingUser.password !== normalizedPassword) {
        throw new ApiError('סיסמה שגויה.', 401, null);
      }

      const { password: _ignoredPassword, ...safeUser } = existingUser;
      const sessionUser = setLocalAuthSession(safeUser);
      void logAuthEvent({ eventType: 'login', user: sessionUser, provider: 'email' }).catch(() => {});
      return sessionUser;
    },
    signInWithGoogle: async () => {
      if (isApiConfigured) {
        api.auth.redirectToLogin(window.location.href);
        return null;
      }
      ensureLocalFallbackEnabled();
      const user = {
        id: createLocalId(),
        email: 'demo.google@midhd.dev',
        full_name: 'Google Demo User',
        role: 'user',
        provider: 'google'
      };
      const sessionUser = setLocalAuthSession(user);
      void logAuthEvent({ eventType: 'login', user: sessionUser, provider: 'google' }).catch(() => {});
      return sessionUser;
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
      if (!isApiConfigured) {
        return;
      }
      if (typeof window === 'undefined') {
        return;
      }
      const returnTo = encodeURIComponent(resolveFromUrl(fromUrl));
      if (appBaseUrl) {
        const appIdParam = isValidAppId ? `&app_id=${encodeURIComponent(appId)}` : '';
        window.location.href = `${normalizeBaseUrl(appBaseUrl)}/auth/login?from_url=${returnTo}${appIdParam}`;
        return;
      }
      window.location.href = `/auth/login?from_url=${returnTo}`;
    }
  },
  entities: new Proxy(
    {},
    {
      get: (_target, entityName) => {
        if (isFirebaseConfigured) {
          return firestoreEntityApi(String(entityName));
        }
        if (isApiConfigured) {
          return entityApi(String(entityName));
        }
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
};

export { isApiConfigured, isLocalFallbackEnabled, isFirebaseConfigured };

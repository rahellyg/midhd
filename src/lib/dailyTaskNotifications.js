import i18n from '@/i18n';

const SETTINGS_KEY = 'midhd_daily_tasks_notifications_v1';

const defaultSettings = {
  enabled: false,
  time: '09:00',
  lastNotifiedDate: null,
};

const getTodayKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toMinutes = (timeValue) => {
  const [hours, minutes] = String(timeValue || '09:00').split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return 9 * 60;
  }
  return (hours * 60) + minutes;
};

export const isNotificationsSupported = () => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getNotificationPermission = () => {
  if (!isNotificationsSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
};

export const getNotificationSettings = () => {
  if (typeof window === 'undefined') {
    return { ...defaultSettings };
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return { ...defaultSettings };
    }
    const parsed = JSON.parse(raw);
    return {
      ...defaultSettings,
      ...(parsed && typeof parsed === 'object' ? parsed : {}),
    };
  } catch {
    return { ...defaultSettings };
  }
};

export const updateNotificationSettings = (nextValues) => {
  const current = getNotificationSettings();
  const next = {
    ...current,
    ...(nextValues && typeof nextValues === 'object' ? nextValues : {}),
  };

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  }

  return next;
};

export const syncNotificationSettingsToCloud = async ({ user = null, settings = null } = {}) => {
  const resolved = settings || getNotificationSettings();

  if (!user?.id) {
    return resolved;
  }

  try {
    // Dynamic import avoids circular-dependency between lib files and apiClient.
    const { api } = await import('@/api/apiClient');
    const payload = {
      enabled: Boolean(resolved.enabled),
      time: resolved.time || '09:00',
      user_id: user.id,
      user_email: user.email || null,
      last_notified_date: resolved.lastNotifiedDate || null,
    };

    let existing = [];
    try {
      existing = await api.entities.UserNotificationSettings.filter(
        { user_id: user.id },
        'user_id',
        1
      );
    } catch (lookupError) {
      console.warn('UserNotificationSettings lookup failed, creating a new document instead.', lookupError);
    }

    if (existing.length > 0) {
      await api.entities.UserNotificationSettings.update(existing[0].id, payload);
    } else {
      await api.entities.UserNotificationSettings.create(payload);
    }
  } catch (syncError) {
    // Cloud sync must never break the local notification flow.
    console.warn('UserNotificationSettings sync failed.', syncError);
  }

  return resolved;
};

export const requestNotificationPermission = async () => {
  if (!isNotificationsSupported()) {
    return 'unsupported';
  }
  return Notification.requestPermission();
};

export const getTodayPendingTasks = (tasks) => {
  const todayKey = getTodayKey();
  return (tasks || []).filter((task) => {
    const isDone = task?.status === 'done';
    const isForToday = !task?.scheduled_date || task.scheduled_date === todayKey;
    return !isDone && isForToday;
  });
};

const buildNotificationBody = (tasks) => {
  if (!tasks.length) {
    return i18n.t('dailyTasksNotification.bodyEmpty');
  }

  const head = tasks.slice(0, 3).map((task) => `- ${task.title}`).join('\n');
  const tail = tasks.length > 3 ? `\n${i18n.t('dailyTasksNotification.moreTasks', { count: tasks.length - 3 })}` : '';
  return `${head}${tail}`;
};

export const sendTodayTasksNotification = async (pendingTasks) => {
  if (!isNotificationsSupported()) {
    return { sent: false, reason: 'unsupported' };
  }

  if (Notification.permission !== 'granted') {
    return { sent: false, reason: 'permission' };
  }

  const title = pendingTasks.length
    ? i18n.t('dailyTasksNotification.titleWithCount', { count: pendingTasks.length })
    : i18n.t('dailyTasksNotification.titleUpdate');
  const body = buildNotificationBody(pendingTasks);
  const tasksUrl = `${import.meta.env.BASE_URL}Tasks`;

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.showNotification) {
        await registration.showNotification(title, {
          body,
          icon: `${import.meta.env.BASE_URL}app-icon.svg`,
          badge: `${import.meta.env.BASE_URL}app-icon.svg`,
          tag: 'midhd-daily-tasks',
            data: { url: tasksUrl },
        });
        return { sent: true };
      }
    }

    new Notification(title, { body, icon: `${import.meta.env.BASE_URL}app-icon.svg`, tag: 'midhd-daily-tasks' });
    return { sent: true };
  } catch {
    return { sent: false, reason: 'error' };
  }
};

export const shouldSendDailyNotification = (settings, now = new Date()) => {
  if (!settings?.enabled) {
    return false;
  }

  const alreadyNotifiedToday = settings.lastNotifiedDate === getTodayKey();
  if (alreadyNotifiedToday) {
    return false;
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes >= toMinutes(settings.time || '09:00');
};

export const markNotifiedToday = () => {
  return updateNotificationSettings({ lastNotifiedDate: getTodayKey() });
};

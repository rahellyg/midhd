const SETTINGS_KEY = 'midhd_daily_tasks_notifications_v1';

const defaultSettings = {
  enabled: false,
  time: '09:00',
  lastNotifiedDate: null,
};

const getTodayKey = () => new Date().toISOString().split('T')[0];

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
    return 'אין משימות פתוחות להיום. כל הכבוד.';
  }

  const head = tasks.slice(0, 3).map((task) => `- ${task.title}`).join('\n');
  const tail = tasks.length > 3 ? `\n+${tasks.length - 3} נוספות` : '';
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
    ? `משימות להיום (${pendingTasks.length})`
    : 'עדכון משימות להיום';
  const body = buildNotificationBody(pendingTasks);

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.showNotification) {
        await registration.showNotification(title, {
          body,
          icon: '/app-icon.svg',
          badge: '/app-icon.svg',
          tag: 'midhd-daily-tasks',
        });
        return { sent: true };
      }
    }

    new Notification(title, { body, icon: '/app-icon.svg', tag: 'midhd-daily-tasks' });
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

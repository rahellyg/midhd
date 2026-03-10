import { useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useAuth } from '@/lib/AuthContext';
import {
  getNotificationPermission,
  getNotificationSettings,
  getTodayPendingTasks,
  markNotifiedToday,
  sendTodayTasksNotification,
  shouldSendDailyNotification,
  syncNotificationSettingsToCloud,
} from '@/lib/dailyTaskNotifications';

export default function DailyTaskNotifier({ isAuthenticated }) {
  const { user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let stopped = false;

    const checkAndNotify = async () => {
      if (stopped) {
        return;
      }

      const permission = getNotificationPermission();
      if (permission !== 'granted') {
        return;
      }

      const settings = getNotificationSettings();
      if (!shouldSendDailyNotification(settings)) {
        return;
      }

      try {
        const allTasks = await api.entities['Task'].list('-created_date', 100);
        const pendingToday = getTodayPendingTasks(allTasks);
        const result = await sendTodayTasksNotification(pendingToday);
        if (result.sent) {
          markNotifiedToday();
          syncNotificationSettingsToCloud(api.entities, user, getNotificationSettings());
        }
      } catch {
        // Silent by design: reminders should not break app flow.
      }
    };

    checkAndNotify();
    const intervalId = window.setInterval(checkAndNotify, 60 * 1000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        checkAndNotify();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      stopped = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isAuthenticated, user]);

  return null;
}

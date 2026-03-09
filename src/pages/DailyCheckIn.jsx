import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarCheck2, Save, Sparkles } from 'lucide-react';
import BottomNav from '@/components/layout/BottomNav';
import { api } from '@/api/apiClient';
import { useAuth } from '@/lib/AuthContext';

const COLLECTION = 'DailyCheckIn';

const getTodayKey = () => new Date().toISOString().split('T')[0];

const emptyEntry = () => ({
  wakeMood: '',
  tasksToday: '',
  proudYesterday: '',
  challengeNow: '',
  supportNeed: '',
  oneSmallStep: ''
});

const loadEntriesFromFirestore = async (userEmail) => {
  if (!userEmail) return {};
  const entries = await api.entities[COLLECTION].filter({ user_email: userEmail });
  // Map by date for easy access
  const mapped = {};
  entries.forEach(entry => {
    mapped[entry.date] = entry;
  });
  return mapped;
};


export default function DailyCheckIn() {
  const { t } = useTranslation();
  const todayKey = getTodayKey();
  const { user } = useAuth();
  const userEmail = user?.email;
  const [entries, setEntries] = useState({});
  const [form, setForm] = useState(emptyEntry());
  const [saved, setSaved] = useState(false);
  const [todayTasks, setTodayTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(true);

  useEffect(() => {
    if (!userEmail) return;
    setLoadingEntries(true);
    loadEntriesFromFirestore(userEmail).then((loaded) => {
      setEntries(loaded);
      setForm(loaded[todayKey] || emptyEntry());
      setLoadingEntries(false);
    });
  }, [todayKey, userEmail]);

  useEffect(() => {
    const loadTodayTasks = async () => {
      setTasksLoading(true);
      try {
        const data = await api.entities['Task'].list('-created_date', 100);
        const filtered = data.filter((task) => task.scheduled_date === todayKey);
        setTodayTasks(filtered);
      } catch {
        setTodayTasks([]);
      } finally {
        setTasksLoading(false);
      }
    };

    loadTodayTasks();
  }, [todayKey]);

  const recentEntries = useMemo(() => {
    return Object.entries(entries)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 7);
  }, [entries]);

  const handleChange = (field, value) => {
    setSaved(false);
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!userEmail) return;
    const payload = {
      ...form,
      user_email: userEmail,
      date: todayKey,
      updatedAt: new Date().toISOString(),
    };
    // Upsert: check if entry exists for today, update or create
    const existing = entries[todayKey];
    if (existing && existing.id) {
      await api.entities[COLLECTION].update(existing.id, payload);
    } else {
      await api.entities[COLLECTION].create(payload);
    }
    // Reload entries
    const loaded = await loadEntriesFromFirestore(userEmail);
    setEntries(loaded);
    setForm(loaded[todayKey] || emptyEntry());
    setSaved(true);
  };

  if (loadingEntries) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">{t("dailyCheckIn.loading")}</div>;
  }

  const notFilled = t("dailyCheckIn.notFilled");

  return (
    <div className="min-h-screen pb-28 px-4 pt-8 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{t("dailyCheckIn.title")}</h1>
        <p className="text-slate-500 text-sm">{t("dailyCheckIn.subtitle")}</p>
      </div>

      <div className="glass rounded-3xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <CalendarCheck2 size={18} className="text-indigo-600" />
          <p className="text-sm font-semibold text-slate-700">{t("dailyCheckIn.todayQuestion", { date: todayKey })}</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">{t("dailyCheckIn.wakeMoodLabel")}</label>
            <textarea
              value={form.wakeMood}
              onChange={(event) => handleChange('wakeMood', event.target.value)}
              className="w-full min-h-20 bg-white/80 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder={t("dailyCheckIn.wakeMoodPlaceholder")}
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">{t("dailyCheckIn.tasksTodayLabel")}</label>
            <div className="mb-2 bg-white/70 border border-slate-200 rounded-2xl p-3">
              <p className="text-xs font-semibold text-slate-600 mb-1">{t("dailyCheckIn.tasksAuto")}</p>
              {tasksLoading ? (
                <p className="text-xs text-slate-500">{t("dailyCheckIn.tasksLoading")}</p>
              ) : todayTasks.length === 0 ? (
                <p className="text-xs text-slate-500">{t("dailyCheckIn.tasksNone")}</p>
              ) : (
                <div className="space-y-1">
                  {todayTasks.slice(0, 5).map((task) => {
                    const isDone = task.status === 'done';
                    return (
                      <div key={task.id} className="text-sm text-slate-700 flex items-center gap-2">
                        <span>{isDone ? '✅' : '📌'}</span>
                        <span className={isDone ? 'line-through opacity-70' : ''}>{task.title}</span>
                      </div>
                    );
                  })}
                  {todayTasks.length > 5 && (
                    <p className="text-xs text-slate-500">+{todayTasks.length - 5} {t("dailyCheckIn.moreTasks")}</p>
                  )}
                </div>
              )}
            </div>
            <textarea
              value={form.tasksToday}
              onChange={(event) => handleChange('tasksToday', event.target.value)}
              className="w-full min-h-20 bg-white/80 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder={t("dailyCheckIn.tasksTodayTextareaPlaceholder")}
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">{t("dailyCheckIn.proudLabel")}</label>
            <textarea
              value={form.proudYesterday}
              onChange={(event) => handleChange('proudYesterday', event.target.value)}
              className="w-full min-h-20 bg-white/80 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder={t("dailyCheckIn.proudPlaceholder")}
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">{t("dailyCheckIn.challengeLabel")}</label>
            <input
              value={form.challengeNow}
              onChange={(event) => handleChange('challengeNow', event.target.value)}
              className="w-full bg-white/80 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder={t("dailyCheckIn.challengePlaceholder")}
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">{t("dailyCheckIn.supportLabel")}</label>
            <input
              value={form.supportNeed}
              onChange={(event) => handleChange('supportNeed', event.target.value)}
              className="w-full bg-white/80 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder={t("dailyCheckIn.supportPlaceholder")}
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">{t("dailyCheckIn.oneSmallStepLabel")}</label>
            <input
              value={form.oneSmallStep}
              onChange={(event) => handleChange('oneSmallStep', event.target.value)}
              className="w-full bg-white/80 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder={t("dailyCheckIn.oneSmallStepPlaceholder")}
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          className="mt-4 w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white py-3 font-semibold flex items-center justify-center gap-2"
        >
          <Save size={18} />
          {t("dailyCheckIn.saveButton")}
        </button>

        {saved && (
          <p className="mt-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
            {t("dailyCheckIn.savedMessage")}
          </p>
        )}
      </div>

      <div className="glass rounded-3xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={18} className="text-indigo-600" />
          <h2 className="font-bold text-slate-800">{t("dailyCheckIn.last7Days")}</h2>
        </div>

        {recentEntries.length === 0 ? (
          <p className="text-sm text-slate-500">{t("dailyCheckIn.noEntriesYet")}</p>
        ) : (
          <div className="space-y-2">
            {recentEntries.map(([date, item]) => (
              <div key={date} className="bg-white/70 rounded-2xl px-3 py-2 border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">{date}</p>
                <div className="space-y-1.5 text-sm text-slate-700">
                  <p><strong>{t("dailyCheckIn.wakeMoodShort")}</strong> {item.wakeMood || notFilled}</p>
                  <p><strong>{t("dailyCheckIn.tasksTodayShort")}</strong> {item.tasksToday || notFilled}</p>
                  <p><strong>{t("dailyCheckIn.proudShort")}</strong> {item.proudYesterday || notFilled}</p>
                  <p><strong>{t("dailyCheckIn.challengeShort")}</strong> {item.challengeNow || notFilled}</p>
                  <p><strong>{t("dailyCheckIn.supportShort")}</strong> {item.supportNeed || notFilled}</p>
                  <p><strong>{t("dailyCheckIn.stepShort")}</strong> {item.oneSmallStep || notFilled}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

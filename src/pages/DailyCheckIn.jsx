import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck2, Save, Sparkles } from 'lucide-react';
import BottomNav from '@/components/layout/BottomNav';

const STORAGE_KEY = 'midhd_daily_checkin_v1';

const getTodayKey = () => new Date().toISOString().split('T')[0];

const emptyEntry = () => ({
  wakeMood: '',
  tasksToday: '',
  proudYesterday: '',
  challengeNow: '',
  supportNeed: '',
  oneSmallStep: ''
});

const loadEntries = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export default function DailyCheckIn() {
  const todayKey = getTodayKey();
  const [entries, setEntries] = useState({});
  const [form, setForm] = useState(emptyEntry());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loaded = loadEntries();
    setEntries(loaded);
    setForm(loaded[todayKey] || emptyEntry());
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

  const handleSave = () => {
    const next = {
      ...entries,
      [todayKey]: {
        ...form,
        updatedAt: new Date().toISOString()
      }
    };
    setEntries(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSaved(true);
  };

  return (
    <div className="min-h-screen pb-28 px-4 pt-8 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">שאלון יומי</h1>
        <p className="text-slate-500 text-sm">רפלקציה קצרה כדי להתחיל את היום בפוקוס.</p>
      </div>

      <div className="glass rounded-3xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <CalendarCheck2 size={18} className="text-indigo-600" />
          <p className="text-sm font-semibold text-slate-700">איך קמתי היום? ({todayKey})</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">איך קמתי היום? מצב רוח ואנרגיה</label>
            <textarea
              value={form.wakeMood}
              onChange={(event) => handleChange('wakeMood', event.target.value)}
              className="w-full min-h-20 bg-white/80 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="לדוגמה: קמתי עייף אבל עם רצון להתחיל לאט..."
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">איזה משימות יש לי היום?</label>
            <textarea
              value={form.tasksToday}
              onChange={(event) => handleChange('tasksToday', event.target.value)}
              className="w-full min-h-20 bg-white/80 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="3 משימות חשובות להיום..."
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">במה אני גאה מעצמי מאתמול?</label>
            <textarea
              value={form.proudYesterday}
              onChange={(event) => handleChange('proudYesterday', event.target.value)}
              className="w-full min-h-20 bg-white/80 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="גם הצלחה קטנה נחשבת."
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">מה האתגר הכי גדול שלי כרגע?</label>
            <input
              value={form.challengeNow}
              onChange={(event) => handleChange('challengeNow', event.target.value)}
              className="w-full bg-white/80 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="למשל: להתחיל את המשימה הראשונה"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">איזו תמיכה תעזור לי היום?</label>
            <input
              value={form.supportNeed}
              onChange={(event) => handleChange('supportNeed', event.target.value)}
              className="w-full bg-white/80 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="למשל: טיימר, הפסקות יזומות, מוזיקה"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">צעד קטן אחד שאני מתחייב אליו עכשיו</label>
            <input
              value={form.oneSmallStep}
              onChange={(event) => handleChange('oneSmallStep', event.target.value)}
              className="w-full bg-white/80 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="משהו של עד 5 דקות"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          className="mt-4 w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white py-3 font-semibold flex items-center justify-center gap-2"
        >
          <Save size={18} />
          שמירת שאלון יומי
        </button>

        {saved && (
          <p className="mt-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
            נשמר בהצלחה. מעולה שהשקעת בעצמך היום.
          </p>
        )}
      </div>

      <div className="glass rounded-3xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={18} className="text-indigo-600" />
          <h2 className="font-bold text-slate-800">7 הימים האחרונים</h2>
        </div>

        {recentEntries.length === 0 ? (
          <p className="text-sm text-slate-500">עדיין אין תשובות שמורות.</p>
        ) : (
          <div className="space-y-2">
            {recentEntries.map(([date, item]) => (
              <div key={date} className="bg-white/70 rounded-2xl px-3 py-2 border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">{date}</p>
                <p className="text-sm text-slate-700 line-clamp-2">
                  <strong>גאווה:</strong> {item.proudYesterday || 'לא מולא'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

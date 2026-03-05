import { useMemo, useState } from 'react';
import { Sparkles, Wand2 } from 'lucide-react';
import BottomNav from '@/components/layout/BottomNav';
import { generateRemoteAIPlan, hasRemoteAI } from '@/lib/aiCoach';

const pickTone = (text) => {
  const value = text.toLowerCase();
  if (value.includes('panic') || value.includes('לחץ') || value.includes('חרדה')) {
    return 'calm';
  }
  if (value.includes('עייף') || value.includes('tired') || value.includes('fatigue')) {
    return 'gentle';
  }
  return 'action';
};

const buildPlan = (problem, minutes, energy) => {
  const tone = pickTone(problem);
  const text = String(problem || '').toLowerCase();
  const tags = {
    start: text.includes('להתחיל') || text.includes('start') || text.includes('דחיינות'),
    exam: text.includes('מבחן') || text.includes('study') || text.includes('ללמוד'),
    overwhelm: text.includes('הצפה') || text.includes('overwhelm') || text.includes('לחץ'),
    phone: text.includes('טלפון') || text.includes('פלאפון') || text.includes('instagram') || text.includes('tiktok'),
    focus: text.includes('ריכוז') || text.includes('focus') || text.includes('מוסח')
  };
  const quickReset = tone === 'calm'
    ? '90 שניות נשימה: 4 שניות שאיפה, 6 שניות נשיפה.'
    : tone === 'gentle'
      ? 'כוס מים + 2 דקות מתיחות צוואר/כתפיים.'
      : 'הפעל טיימר קצר והתחל בגרסה הכי קטנה של המשימה.';

  const firstStep = energy === 'low'
    ? 'בחר פעולה של פחות מ-3 דקות (למשל לפתוח מסמך ולכתוב כותרת).'
    : energy === 'medium'
      ? 'בחר תת-משימה אחת ברורה ועבוד עליה ברצף קצר.'
      : 'התחל בתת-משימה החשובה ביותר בזמן הפוקוס הראשוני.';

  const focusBlock = Number(minutes) <= 10
    ? 'ספרינט: 8 דקות עבודה + 2 דקות הפסקה.'
    : Number(minutes) <= 20
      ? 'פוקוס: 15 דקות עבודה + 5 דקות הפסקה.'
      : 'פומודורו: 25 דקות עבודה + 5 דקות הפסקה.';

  const safetyLine = tone === 'calm'
    ? 'אם יש הצפה רגשית, עצור לרגע, עבור לתרגיל רגיעה וחזור בצעד קטן.'
    : 'אם נתקעת, הורד את רמת הקושי עד לצעד שאי אפשר להיכשל בו.';

  const targetedTips = [];
  if (tags.start) {
    targetedTips.push('טכניקת 5-4-3-2-1 התחלה: בחר פעולה של 5 דקות והתחייב רק להן.');
  }
  if (tags.exam) {
    targetedTips.push('חלוקה למקטעים: 10 דקות סיכום + 5 דקות שאלות + 5 דקות חזרה.');
  }
  if (tags.overwhelm) {
    targetedTips.push('פריקת עומס: כתוב הכל על דף, ואז בחר משימה אחת בלבד לביצוע עכשיו.');
  }
  if (tags.phone) {
    targetedTips.push('הגנת קשב: מצב טיסה ל-20 דקות + הטלפון מחוץ לטווח יד.');
  }
  if (tags.focus) {
    targetedTips.push('פוקוס סביבתי: אוזניות, מסך אחד פתוח, טיימר גלוי מול העיניים.');
  }
  if (targetedTips.length === 0) {
    targetedTips.push('פתח טיימר של 15 דקות והגדר יעד אחד מדיד לסיום.');
  }

  return {
    quickReset,
    firstStep,
    focusBlock,
    safetyLine,
    targetedTips,
    encouragement: 'אתה לא צריך לסיים הכל עכשיו, רק להניע את המומנטום.'
  };
};

export default function AIHelp() {
  const [problem, setProblem] = useState('');
  const [minutes, setMinutes] = useState(15);
  const [energy, setEnergy] = useState('medium');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);

  const plan = useMemo(() => buildPlan(problem, minutes, energy), [problem, minutes, energy]);
  const activePlan = generatedPlan || plan;

  const handleGenerate = async () => {
    if (!problem.trim()) {
      setError('כדי לקבל פתרון מותאם, כתוב בקצרה מה הבעיה שלך כרגע.');
      setSubmitted(false);
      return;
    }
    setError('');
    setIsGenerating(true);
    try {
      const remotePlan = await generateRemoteAIPlan({
        problem,
        minutes,
        energy,
        fallbackPlan: plan
      });
      setGeneratedPlan(remotePlan);
      setSubmitted(true);
    } catch {
      setGeneratedPlan(plan);
      setSubmitted(true);
      setError('לא הצלחנו לקבל תשובה מהמודל כרגע, מוצג פתרון חכם מקומי.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen pb-28 px-4 pt-8 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">AI לפתרון בעיות קשב</h1>
        <p className="text-slate-500 text-sm">תאר את הבעיה שלך וקבל תוכנית פעולה מיידית.</p>
      </div>

      <div className="glass rounded-3xl p-5 mb-4">
        <label className="block text-sm font-semibold text-slate-700 mb-2">מה הבעיה כרגע?</label>
        <textarea
          value={problem}
          onChange={(event) => setProblem(event.target.value)}
          placeholder="לדוגמה: אני לא מצליח להתחיל ללמוד למבחן ומרגיש הצפה..."
          className="w-full min-h-24 bg-white/80 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">זמן פנוי (דקות)</label>
            <input
              type="number"
              min={5}
              max={60}
              value={minutes}
              onChange={(event) => setMinutes(Number(event.target.value || 15))}
              className="w-full bg-white/80 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">רמת אנרגיה</label>
            <select
              value={energy}
              onChange={(event) => setEnergy(event.target.value)}
              className="w-full bg-white/80 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="low">נמוכה</option>
              <option value="medium">בינונית</option>
              <option value="high">גבוהה</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="mt-4 w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white py-3 font-semibold flex items-center justify-center gap-2"
        >
          <Wand2 size={18} />
          {isGenerating ? 'מייצר פתרון...' : 'תן לי פתרון עכשיו'}
        </button>

        <p className="mt-2 text-xs text-slate-500">
          מצב AI: {hasRemoteAI() ? 'מודל אונליין פעיל' : 'fallback מקומי (להפעלת אונליין: VITE_OPENAI_API_KEY)'}
        </p>

        {error && (
          <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </p>
        )}
      </div>

      {submitted && (
        <div className="glass rounded-3xl p-5 bg-gradient-to-br from-sky-50 to-indigo-50 border border-sky-100">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-indigo-600" />
            <h2 className="font-bold text-slate-800">תוכנית פעולה מותאמת</h2>
          </div>
          <ul className="space-y-2 text-sm text-slate-700 leading-6">
            <li><strong>1.</strong> איפוס מהיר: {activePlan.quickReset}</li>
            <li><strong>2.</strong> צעד ראשון: {activePlan.firstStep}</li>
            <li><strong>3.</strong> בלוק פוקוס: {activePlan.focusBlock}</li>
            <li><strong>4.</strong> אם נתקעים: {activePlan.safetyLine}</li>
          </ul>
          <div className="mt-4 bg-white/60 rounded-2xl p-3 border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 mb-2">המלצות ממוקדות לפי מה שכתבת</p>
            <ul className="space-y-1 text-sm text-slate-700">
              {activePlan.targetedTips.map((tip) => (
                <li key={tip}>• {tip}</li>
              ))}
            </ul>
          </div>
          <p className="mt-3 text-sm font-semibold text-indigo-700">{activePlan.encouragement}</p>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

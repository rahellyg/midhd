import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Wand2 } from "lucide-react";
import BottomNav from "@/components/layout/BottomNav";
import { generateRemoteAIPlan, hasRemoteAI } from "@/lib/aiCoach";

const pickTone = (text) => {
  const value = String(text || "").toLowerCase();
  if (value.includes("panic") || value.includes("לחץ") || value.includes("חרדה")) {
    return "calm";
  }
  if (value.includes("עייף") || value.includes("tired") || value.includes("fatigue")) {
    return "gentle";
  }
  return "action";
};

const getPlanText = (language = "he") => {
  const isHebrew = language === "he";
  return {
    quickResetCalm: isHebrew
      ? "90 שניות נשימה: 4 שניות שאיפה, 6 שניות נשיפה."
      : "90-second breathing reset: inhale for 4 seconds, exhale for 6 seconds.",
    quickResetGentle: isHebrew
      ? "כוס מים + 2 דקות מתיחות צוואר/כתפיים."
      : "Drink water and do 2 minutes of neck/shoulder stretches.",
    quickResetAction: isHebrew
      ? "הפעל טיימר קצר והתחל בגרסה הכי קטנה של המשימה."
      : "Set a short timer and start with the smallest possible version of the task.",
    firstStepLow: isHebrew
      ? "בחר פעולה של פחות מ-3 דקות (למשל לפתוח מסמך ולכתוב כותרת)."
      : "Choose one action under 3 minutes (for example, open a doc and write a title).",
    firstStepMedium: isHebrew
      ? "בחר תת-משימה אחת ברורה ועבוד עליה ברצף קצר."
      : "Pick one clear sub-task and work on it in one short focused block.",
    firstStepHigh: isHebrew
      ? "התחל בתת-משימה החשובה ביותר בזמן הפוקוס הראשוני."
      : "Start with the most important sub-task during your initial focus window.",
    focusBlockShort: isHebrew
      ? "ספרינט: 8 דקות עבודה + 2 דקות הפסקה."
      : "Sprint: 8 minutes work + 2 minutes break.",
    focusBlockMedium: isHebrew
      ? "פוקוס: 15 דקות עבודה + 5 דקות הפסקה."
      : "Focus block: 15 minutes work + 5 minutes break.",
    focusBlockLong: isHebrew
      ? "פומודורו: 25 דקות עבודה + 5 דקות הפסקה."
      : "Pomodoro: 25 minutes work + 5 minutes break.",
    safetyCalm: isHebrew
      ? "אם יש הצפה רגשית, עצור לרגע, עבור לתרגיל רגיעה וחזור בצעד קטן."
      : "If emotions spike, pause, do a short calming reset, then return with a tiny step.",
    safetyAction: isHebrew
      ? "אם נתקעת, הורד את רמת הקושי עד לצעד שאי אפשר להיכשל בו."
      : "If you're stuck, lower the difficulty until the next step feels impossible to fail.",
    tipStart: isHebrew
      ? "טכניקת 5-4-3-2-1 התחלה: בחר פעולה של 5 דקות והתחייב רק להן."
      : "5-minute launch: pick one action and commit to only 5 minutes.",
    tipExam: isHebrew
      ? "חלוקה למקטעים: 10 דקות סיכום + 5 דקות שאלות + 5 דקות חזרה."
      : "Chunk your study: 10 min summary + 5 min questions + 5 min review.",
    tipOverwhelm: isHebrew
      ? "פריקת עומס: כתוב הכל על דף, ואז בחר משימה אחת בלבד לביצוע עכשיו."
      : "Unload overwhelm: write everything down, then choose one task for now.",
    tipPhone: isHebrew
      ? "הגנת קשב: מצב טיסה ל-20 דקות + הטלפון מחוץ לטווח יד."
      : "Protect focus: airplane mode for 20 minutes and keep your phone out of reach.",
    tipFocus: isHebrew
      ? "פוקוס סביבתי: אוזניות, מסך אחד פתוח, טיימר גלוי מול העיניים."
      : "Focus setup: headphones on, one active screen, visible timer.",
    tipDefault: isHebrew
      ? "פתח טיימר של 15 דקות והגדר יעד אחד מדיד לסיום."
      : "Set a 15-minute timer and define one measurable finish line.",
  };
};

const buildPlan = ({ problem, minutes, energy, language }) => {
  const tone = pickTone(problem);
  const text = String(problem || "").toLowerCase();
  const copy = getPlanText(language);
  const tags = {
    start: text.includes("להתחיל") || text.includes("start") || text.includes("דחיינות") || text.includes("procrast"),
    exam: text.includes("מבחן") || text.includes("study") || text.includes("ללמוד") || text.includes("exam"),
    overwhelm: text.includes("הצפה") || text.includes("overwhelm") || text.includes("לחץ"),
    phone: text.includes("טלפון") || text.includes("פלאפון") || text.includes("instagram") || text.includes("tiktok") || text.includes("phone"),
    focus: text.includes("ריכוז") || text.includes("focus") || text.includes("מוסח") || text.includes("distract"),
  };

  const quickReset =
    tone === "calm" ? copy.quickResetCalm : tone === "gentle" ? copy.quickResetGentle : copy.quickResetAction;

  const firstStep =
    energy === "low" ? copy.firstStepLow : energy === "medium" ? copy.firstStepMedium : copy.firstStepHigh;

  const parsedMinutes = Number(minutes);
  const focusBlock = parsedMinutes <= 10 ? copy.focusBlockShort : parsedMinutes <= 20 ? copy.focusBlockMedium : copy.focusBlockLong;

  const safetyLine = tone === "calm" ? copy.safetyCalm : copy.safetyAction;

  const targetedTips = [];
  if (tags.start) targetedTips.push(copy.tipStart);
  if (tags.exam) targetedTips.push(copy.tipExam);
  if (tags.overwhelm) targetedTips.push(copy.tipOverwhelm);
  if (tags.phone) targetedTips.push(copy.tipPhone);
  if (tags.focus) targetedTips.push(copy.tipFocus);
  if (targetedTips.length === 0) targetedTips.push(copy.tipDefault);

  return {
    quickReset,
    firstStep,
    focusBlock,
    safetyLine,
    targetedTips,
  };
};

export default function AIHelp() {
  const { t, i18n } = useTranslation();
  const [problem, setProblem] = useState("");
  const [minutes, setMinutes] = useState(15);
  const [energy, setEnergy] = useState("medium");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);

  const fallbackPlan = useMemo(
    () => buildPlan({ problem, minutes, energy, language: i18n.language }),
    [problem, minutes, energy, i18n.language],
  );

  const activePlan = generatedPlan || fallbackPlan;

  const handleGenerate = async () => {
    if (!problem.trim()) {
      setError(t("aiHelp.errorEmpty"));
      setSubmitted(false);
      return;
    }

    setError("");
    setIsGenerating(true);

    try {
      const remotePlan = await generateRemoteAIPlan({
        problem,
        minutes,
        energy,
        fallbackPlan: {
          ...fallbackPlan,
          encouragement: t("aiHelp.encouragement"),
        },
      });
      setGeneratedPlan(remotePlan);
      setSubmitted(true);
    } catch {
      setGeneratedPlan({
        ...fallbackPlan,
        encouragement: t("aiHelp.encouragement"),
      });
      setSubmitted(true);
      setError(t("aiHelp.errorFallback"));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen pb-28 px-4 pt-8 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{t("aiHelp.title")}</h1>
        <p className="text-slate-500 text-sm">{t("aiHelp.subtitle")}</p>
      </div>

      <div className="glass rounded-3xl p-5 mb-4">
        <label className="block text-sm font-semibold text-slate-700 mb-2">{t("aiHelp.problemLabel")}</label>
        <textarea
          value={problem}
          onChange={(event) => setProblem(event.target.value)}
          placeholder={t("aiHelp.problemPlaceholder")}
          className="w-full min-h-24 bg-white/80 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">{t("aiHelp.minutesLabel")}</label>
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
            <label className="text-xs text-slate-500 block mb-1">{t("aiHelp.energyLabel")}</label>
            <select
              value={energy}
              onChange={(event) => setEnergy(event.target.value)}
              className="w-full bg-white/80 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="low">{t("aiHelp.energyLow")}</option>
              <option value="medium">{t("aiHelp.energyMedium")}</option>
              <option value="high">{t("aiHelp.energyHigh")}</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="mt-4 w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white py-3 font-semibold flex items-center justify-center gap-2"
        >
          <Wand2 size={18} />
          {isGenerating ? t("aiHelp.generating") : t("aiHelp.getPlanNow")}
        </button>

        <p className="mt-2 text-xs text-slate-500">
          {t("aiHelp.aiStatusLabel")}: {hasRemoteAI() ? t("aiHelp.aiStatusOnline") : t("aiHelp.aiStatusLocal")}
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
            <h2 className="font-bold text-slate-800">{t("aiHelp.planTitle")}</h2>
          </div>
          <ul className="space-y-2 text-sm text-slate-700 leading-6">
            <li><strong>1.</strong> {t("aiHelp.planQuickReset")} {activePlan.quickReset}</li>
            <li><strong>2.</strong> {t("aiHelp.planFirstStep")} {activePlan.firstStep}</li>
            <li><strong>3.</strong> {t("aiHelp.planFocusBlock")} {activePlan.focusBlock}</li>
            <li><strong>4.</strong> {t("aiHelp.planSafety")} {activePlan.safetyLine}</li>
          </ul>
          <div className="mt-4 bg-white/60 rounded-2xl p-3 border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 mb-2">{t("aiHelp.planTargetedTips")}</p>
            <ul className="space-y-1 text-sm text-slate-700">
              {activePlan.targetedTips.map((tip) => (
                <li key={tip}>• {tip}</li>
              ))}
            </ul>
          </div>
          <p className="mt-3 text-sm font-semibold text-indigo-700">
            {activePlan.encouragement || t("aiHelp.encouragement")}
          </p>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
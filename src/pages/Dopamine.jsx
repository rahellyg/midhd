import { useState } from "react";
import DopamineTip from "../components/dopamine/DopamineTip";
import BottomNav from "../components/layout/BottomNav";
import { Zap, Brain, Activity } from "lucide-react";

const scienceInfo = [
  {
    icon: "🧠",
    title: "מה זה דופמין?",
    desc: "דופמין הוא מוליך עצבי שאחראי על מוטיבציה, תגמול ותשומת לב. במוח עם ADHD, מערכת הדופמין עובדת אחרת – לכן קשה יותר להתחיל ולהתמיד במשימות."
  },
  {
    icon: "⚡",
    title: "למה זה קשה?",
    desc: "ADHD קשור לרמות דופמין נמוכות יותר במעגלים ספציפיים של המוח. זה יוצר חיפוש מתמיד אחר גירויים חזקים ומיידיים."
  },
  {
    icon: "🌟",
    title: "כיצד להעלות דופמין?",
    desc: "תנועה, מוזיקה, הצלחות קטנות, אור שמש, קשר חברתי, יצירתיות ואוכל מסוים – כולם מגבירים דופמין באופן טבעי ובריא."
  },
];

const dailyHabits = [
  { time: "בוקר", emoji: "🌅", habits: ["אור שמש ישיר 10 דק'", "שתיית מים", "תנועה קלה"] },
  { time: "צהריים", emoji: "☀️", habits: ["הפסקת אוכל בלי מסכים", "הליכה קצרה", "מוזיקה מהנה"] },
  { time: "ערב", emoji: "🌙", habits: ["כתיבת 3 הצלחות היום", "ללא מסכים שעה לפני שינה", "שגרת שינה קבועה"] },
];

export default function Dopamine() {
  const [activeTab, setActiveTab] = useState("tips");

  return (
    <div className="min-h-screen pb-28 px-4 pt-8 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">בוסט דופמין ⚡</h1>
        <p className="text-slate-500 text-sm">טיפים מבוססי מדע להגברת מוטיבציה ואנרגיה</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 glass rounded-2xl p-1">
        {[
          { key: "tips", label: "טיפים", icon: Zap },
          { key: "habits", label: "הרגלים יומיים", icon: Activity },
          { key: "science", label: "המדע", icon: Brain },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === key ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow" : "text-slate-500"}`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "tips" && <DopamineTip />}

      {activeTab === "habits" && (
        <div className="space-y-4">
          {dailyHabits.map((period, i) => (
            <div key={i} className="glass rounded-3xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{period.emoji}</span>
                <h3 className="font-bold text-slate-700 text-lg">{period.time}</h3>
              </div>
              <div className="space-y-2">
                {period.habits.map((habit, j) => (
                  <div key={j} className="flex items-center gap-3 bg-white/60 rounded-2xl px-4 py-3">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-pink-400 to-rose-400 shrink-0" />
                    <span className="text-sm text-slate-700">{habit}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="glass rounded-3xl p-5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
            <p className="font-bold text-slate-700 mb-2">💡 טיפ חשוב</p>
            <p className="text-sm text-slate-600 leading-relaxed">
              אל תנסה לשנות הכל בבת אחת! בחר הרגל אחד קטן ועשה אותו שבוע. הצלחה קטנה אחת תיצור גל של שינויים.
            </p>
          </div>
        </div>
      )}

      {activeTab === "science" && (
        <div className="space-y-4">
          {scienceInfo.map((info, i) => (
            <div key={i} className="glass rounded-3xl p-5">
              <div className="text-4xl mb-3">{info.icon}</div>
              <h3 className="font-bold text-slate-800 mb-2">{info.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{info.desc}</p>
            </div>
          ))}

          <div className="glass rounded-3xl p-5 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100">
            <p className="font-bold text-slate-700 mb-2">🔬 מה המחקר אומר?</p>
            <p className="text-sm text-slate-600 leading-relaxed">
              מחקרים מראים שאנשים עם ADHD מרוויחים יותר מפעילות גופנית סדירה, שינה מספקת, ותזונה נכונה – לעיתים באותה מידה כמו תרופות. שינויים קטנים בסגנון החיים יכולים לשנות הכל.
            </p>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
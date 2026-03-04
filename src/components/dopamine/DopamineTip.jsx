import { useState } from "react";
import { Zap } from "lucide-react";

const tips = [
  { id: 1, icon: "☀️", title: "אור שמש בבוקר", desc: "10–15 דקות אור יום ישיר מעלות דופמין ומכוונות את השעון הביולוגי." },
  { id: 2, icon: "🏃", title: "תנועה קצרה", desc: "5–10 דקות הליכה או קפיצות מעלות דופמין ומוטיבציה ל־שעות." },
  { id: 3, icon: "🎵", title: "מוזיקה שאתה אוהב", desc: "האזנה למוזיקה מהנה משחררת דופמין ומשפרת ריכוז." },
  { id: 4, icon: "✅", title: "הצלחה קטנה", desc: "סיים משימה אחת קטנה – המוח מקבל תגמול דופמין ומבקש עוד." },
  { id: 5, icon: "💧", title: "מים", desc: "שתייה מספקת תומכת בתפקוד המוח ורמות דופמין." },
  { id: 6, icon: "🤝", title: "קשר חברתי", desc: "שיחה קצרה או חיבוק מעלים דופמין ומרגיעים." },
];

export default function DopamineTip() {
  const [selected, setSelected] = useState(0);

  return (
    <div className="space-y-4">
      <div className="glass rounded-3xl p-5 bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-100">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={20} className="text-pink-500" />
          <h3 className="font-bold text-slate-700">טיפ היום</h3>
        </div>
        <p className="text-4xl mb-2">{tips[selected].icon}</p>
        <h4 className="font-bold text-slate-800 text-lg mb-2">{tips[selected].title}</h4>
        <p className="text-sm text-slate-600 leading-relaxed">{tips[selected].desc}</p>
        <div className="flex gap-2 mt-4">
          {tips.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setSelected(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${i === selected ? "bg-pink-500 scale-110" : "bg-pink-200"}`}
              aria-label={t.title}
            />
          ))}
        </div>
      </div>

      <div className="glass rounded-3xl p-5">
        <h3 className="font-bold text-slate-700 mb-3">עוד טיפים להעלאת דופמין</h3>
        <div className="space-y-2">
          {tips.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setSelected(i)}
              className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-right transition-all ${i === selected ? "bg-pink-100 border-2 border-pink-300" : "bg-white/60 hover:bg-white border border-transparent"}`}
            >
              <span className="text-2xl">{t.icon}</span>
              <div className="flex-1">
                <p className="font-semibold text-slate-800 text-sm">{t.title}</p>
                <p className="text-xs text-slate-500 line-clamp-1">{t.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

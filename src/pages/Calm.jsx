import { useState } from "react";
import BreathingExercise from "@/components/calm/BreathingExercise";
import BottomNav from "@/components/layout/BottomNav";
import { Heart, Wind, Waves } from "lucide-react";

const calmTips = [
  { emoji: "🌊", title: "5-4-3-2-1", desc: "מצא 5 דברים שאתה רואה, 4 שאתה שומע, 3 שאתה מרגיש, 2 שאתה מריח, 1 שאתה טועם. מעגן אותך בהווה." },
  { emoji: "💧", title: "מים קרים", desc: "שטוף פנים במים קרים או שים קוביית קרח על פרק כף היד. מפעיל את עצב הוואגוס ומרגיע." },
  { emoji: "🤲", title: "מגע עצמי", desc: "שים יד על הלב, קח נשימה עמוקה ואמר לעצמך: 'אני בסדר, אני בטוח'. עוזר לווסת רגשות." },
  { emoji: "🎵", title: "שיר מרגיע", desc: "האזן לשיר מרגיע שאהבת. מוזיקה איטית (60 BPM) מסנכרנת את הלב ומרגיעה את מערכת העצבים." },
  { emoji: "🌿", title: "הליכה קצרה", desc: "5 דקות בחוץ, בעדיפות בטבע או ליד עצים. טבע מוריד קורטיזול בצורה מוכחת." },
];

export default function Calm() {
  const [activeTab, setActiveTab] = useState("breath");

  return (
    <div className="min-h-screen pb-28 px-4 pt-8 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">רגיעה ואיזון 🌿</h1>
        <p className="text-slate-500 text-sm">תרגילים לוויסות עצמי עם ADHD</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 glass rounded-2xl p-1">
        {[
          { key: "breath", label: "נשימה", icon: Wind },
          { key: "tips", label: "טיפים", icon: Heart },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === key ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow" : "text-slate-500"}`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "breath" && (
        <div className="glass rounded-3xl p-6">
          <p className="text-center text-sm text-slate-500 mb-5">
            נשימה מבוקרת מפעילה את מערכת העצבים הפאראסימפתטית ומרגיעה בתוך דקות
          </p>
          <BreathingExercise />
        </div>
      )}

      {activeTab === "tips" && (
        <div className="space-y-3">
          {calmTips.map((tip, i) => (
            <div key={i} className="glass rounded-3xl p-5 flex gap-4">
              <div className="text-4xl shrink-0">{tip.emoji}</div>
              <div>
                <h3 className="font-bold text-slate-800 mb-1">{tip.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{tip.desc}</p>
              </div>
            </div>
          ))}

          {/* ADHD emotion regulation note */}
          <div className="glass rounded-3xl p-5 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100">
            <div className="flex items-center gap-2 mb-2">
              <Waves size={18} className="text-purple-500" />
              <h3 className="font-bold text-slate-700">ויסות רגשי עם ADHD</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              אנשים עם ADHD חווים רגשות באינטנסיביות גבוהה יותר. זה נורמלי ואפשרי לנהל.
              הטריק הוא לזהות את הרגש מוקדם ולהפעיל כלי הרגעה לפני שהוא מציף.
            </p>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
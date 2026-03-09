import { useState } from "react";
import { useTranslation } from "react-i18next";
import DopamineTip from "../components/dopamine/DopamineTip";
import BottomNav from "../components/layout/BottomNav";
import { Zap, Brain, Activity } from "lucide-react";

const HABIT_KEYS = [
  { timeKey: "morning", emoji: "🌅", habits: ["dopamine.habitMorning1", "dopamine.habitMorning2", "dopamine.habitMorning3"] },
  { timeKey: "noon", emoji: "☀️", habits: ["dopamine.habitNoon1", "dopamine.habitNoon2", "dopamine.habitNoon3"] },
  { timeKey: "evening", emoji: "🌙", habits: ["dopamine.habitEvening1", "dopamine.habitEvening2", "dopamine.habitEvening3"] },
];

export default function Dopamine() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("tips");

  const scienceInfo = [
    { icon: "🧠", titleKey: "dopamine.scienceTitle1", descKey: "dopamine.scienceDesc1" },
    { icon: "⚡", titleKey: "dopamine.scienceTitle2", descKey: "dopamine.scienceDesc2" },
    { icon: "🌟", titleKey: "dopamine.scienceTitle3", descKey: "dopamine.scienceDesc3" },
  ];

  const tabs = [
    { key: "tips", labelKey: "dopamine.tabTips", icon: Zap },
    { key: "habits", labelKey: "dopamine.tabHabits", icon: Activity },
    { key: "science", labelKey: "dopamine.tabScience", icon: Brain },
  ];

  return (
    <div className="min-h-screen pb-28 px-4 pt-8 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{t("dopamine.title")}</h1>
        <p className="text-slate-500 text-sm">{t("dopamine.subtitle")}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 glass rounded-2xl p-1">
        {tabs.map(({ key, labelKey, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === key ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow" : "text-slate-500"}`}
          >
            <Icon size={14} />
            {t(labelKey)}
          </button>
        ))}
      </div>

      {activeTab === "tips" && <DopamineTip />}

      {activeTab === "habits" && (
        <div className="space-y-4">
          {HABIT_KEYS.map((period, i) => (
            <div key={i} className="glass rounded-3xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{period.emoji}</span>
                <h3 className="font-bold text-slate-700 text-lg">{t(`dopamine.${period.timeKey}`)}</h3>
              </div>
              <div className="space-y-2">
                {period.habits.map((habitKey, j) => (
                  <div key={j} className="flex items-center gap-3 bg-white/60 rounded-2xl px-4 py-3">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-pink-400 to-rose-400 shrink-0" />
                    <span className="text-sm text-slate-700">{t(habitKey)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="glass rounded-3xl p-5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
            <p className="font-bold text-slate-700 mb-2">💡 {t("dopamine.habitTipTitle")}</p>
            <p className="text-sm text-slate-600 leading-relaxed">{t("dopamine.habitTip")}</p>
          </div>
        </div>
      )}

      {activeTab === "science" && (
        <div className="space-y-4">
          {scienceInfo.map((info, i) => (
            <div key={i} className="glass rounded-3xl p-5">
              <div className="text-4xl mb-3">{info.icon}</div>
              <h3 className="font-bold text-slate-800 mb-2">{t(info.titleKey)}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{t(info.descKey)}</p>
            </div>
          ))}

          <div className="glass rounded-3xl p-5 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100">
            <p className="font-bold text-slate-700 mb-2">🔬 {t("dopamine.researchTitle")}</p>
            <p className="text-sm text-slate-600 leading-relaxed">{t("dopamine.researchDesc")}</p>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
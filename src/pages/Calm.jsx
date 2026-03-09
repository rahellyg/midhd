import { useState } from "react";
import { useTranslation } from "react-i18next";
import BreathingExercise from "@/components/calm/BreathingExercise";
import BottomNav from "@/components/layout/BottomNav";
import { Heart, Wind, Waves } from "lucide-react";

const calmTipKeys = [
  { emoji: "🌊", titleKey: "calm.tip1Title", descKey: "calm.tip1Desc" },
  { emoji: "💧", titleKey: "calm.tip2Title", descKey: "calm.tip2Desc" },
  { emoji: "🤲", titleKey: "calm.tip3Title", descKey: "calm.tip3Desc" },
  { emoji: "🎵", titleKey: "calm.tip4Title", descKey: "calm.tip4Desc" },
  { emoji: "🌿", titleKey: "calm.tip5Title", descKey: "calm.tip5Desc" },
];

export default function Calm() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("breath");

  return (
    <div className="min-h-screen pb-28 px-4 pt-8 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{t("calm.title")}</h1>
        <p className="text-slate-500 text-sm">{t("calm.subtitle")}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 glass rounded-2xl p-1">
        {[
          { key: "breath", labelKey: "calm.tabBreath", icon: Wind },
          { key: "tips", labelKey: "calm.tabTips", icon: Heart },
        ].map(({ key, labelKey, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === key ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow" : "text-slate-500"}`}
          >
            <Icon size={16} />
            {t(labelKey)}
          </button>
        ))}
      </div>

      {activeTab === "breath" && (
        <div className="glass rounded-3xl p-6">
          <p className="text-center text-sm text-slate-500 mb-5">{t("calm.breathIntro")}</p>
          <BreathingExercise />
        </div>
      )}

      {activeTab === "tips" && (
        <div className="space-y-3">
          {calmTipKeys.map((tip, i) => (
            <div key={i} className="glass rounded-3xl p-5 flex gap-4">
              <div className="text-4xl shrink-0">{tip.emoji}</div>
              <div>
                <h3 className="font-bold text-slate-800 mb-1">{t(tip.titleKey)}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{t(tip.descKey)}</p>
              </div>
            </div>
          ))}

          <div className="glass rounded-3xl p-5 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100">
            <div className="flex items-center gap-2 mb-2">
              <Waves size={18} className="text-purple-500" />
              <h3 className="font-bold text-slate-700">{t("calm.emotionTitle")}</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{t("calm.emotionDesc")}</p>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
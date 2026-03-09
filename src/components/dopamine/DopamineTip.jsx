import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Zap } from "lucide-react";

const tips = [
  { id: 1, icon: "☀️", titleKey: "dopamine.tipSunTitle", descKey: "dopamine.tipSunDesc" },
  { id: 2, icon: "🏃", titleKey: "dopamine.tipMoveTitle", descKey: "dopamine.tipMoveDesc" },
  { id: 3, icon: "🎵", titleKey: "dopamine.tipMusicTitle", descKey: "dopamine.tipMusicDesc" },
  { id: 4, icon: "✅", titleKey: "dopamine.tipWinTitle", descKey: "dopamine.tipWinDesc" },
  { id: 5, icon: "💧", titleKey: "dopamine.tipWaterTitle", descKey: "dopamine.tipWaterDesc" },
  { id: 6, icon: "🤝", titleKey: "dopamine.tipSocialTitle", descKey: "dopamine.tipSocialDesc" },
];

export default function DopamineTip() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(0);

  return (
    <div className="space-y-4">
      <div className="glass rounded-3xl p-5 bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-100">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={20} className="text-pink-500" />
          <h3 className="font-bold text-slate-700">{t("dopamine.tipOfDayTitle")}</h3>
        </div>
        <p className="text-4xl mb-2">{tips[selected].icon}</p>
        <h4 className="font-bold text-slate-800 text-lg mb-2">{t(tips[selected].titleKey)}</h4>
        <p className="text-sm text-slate-600 leading-relaxed">{t(tips[selected].descKey)}</p>
        <div className="flex gap-2 mt-4">
          {tips.map((tip, i) => (
            <button
              key={tip.id}
              onClick={() => setSelected(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${i === selected ? "bg-pink-500 scale-110" : "bg-pink-200"}`}
              aria-label={t(tip.titleKey)}
            />
          ))}
        </div>
      </div>

      <div className="glass rounded-3xl p-5">
        <h3 className="font-bold text-slate-700 mb-3">{t("dopamine.moreTipsTitle")}</h3>
        <div className="space-y-2">
          {tips.map((tip, i) => (
            <button
              key={tip.id}
              onClick={() => setSelected(i)}
              className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-right transition-all ${i === selected ? "bg-pink-100 border-2 border-pink-300" : "bg-white/60 hover:bg-white border border-transparent"}`}
            >
              <span className="text-2xl">{tip.icon}</span>
              <div className="flex-1">
                <p className="font-semibold text-slate-800 text-sm">{t(tip.titleKey)}</p>
                <p className="text-xs text-slate-500 line-clamp-1">{t(tip.descKey)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

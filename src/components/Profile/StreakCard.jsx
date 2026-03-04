import { Flame, Award } from "lucide-react";

export default function StreakCard({ streak = 0, longest = 0, lastActive }) {
  return (
    <div className="glass rounded-3xl p-5 mb-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
      <div className="flex items-center gap-2 mb-3">
        <Flame size={22} className="text-amber-500" />
        <h3 className="font-bold text-slate-700">רצף ימים</h3>
      </div>
      <div className="flex gap-6">
        <div>
          <p className="text-3xl font-black text-amber-600">{streak}</p>
          <p className="text-xs text-slate-500">ימים ברצף</p>
        </div>
        <div className="w-px bg-amber-200" />
        <div>
          <p className="text-2xl font-bold text-slate-700 flex items-center gap-1">
            <Award size={18} className="text-indigo-500" />
            {longest}
          </p>
          <p className="text-xs text-slate-500">שיא אישי</p>
        </div>
      </div>
      {lastActive && (
        <p className="text-xs text-slate-400 mt-2">פעילות אחרונה: {lastActive}</p>
      )}
    </div>
  );
}

import { CheckSquare, Timer, TrendingUp, Award } from "lucide-react";

export default function StatsOverview({ tasks, sessions, profile }) {
  const totalDone = tasks.filter(t => t.status === "done").length;
  const totalFocusMin = sessions.filter(s => s.completed).reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

  const todayStr = new Date().toISOString().split("T")[0];
  const todayDone = tasks.filter(t => t.status === "done" && t.completed_at?.startsWith(todayStr)).length;
  const todayFocus = sessions.filter(s => s.completed && s.session_date === todayStr)
    .reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

  const taskGoal = profile?.daily_task_goal || 3;
  const focusGoal = profile?.daily_focus_goal_minutes || 50;
  const taskPct = Math.min(100, Math.round((todayDone / taskGoal) * 100));
  const focusPct = Math.min(100, Math.round((todayFocus / focusGoal) * 100));

  const stats = [
    { label: "משימות הושלמו", value: totalDone, icon: CheckSquare, color: "from-indigo-400 to-purple-500" },
    { label: "דקות פוקוס", value: totalFocusMin, icon: Timer, color: "from-amber-400 to-orange-500" },
    { label: "סשני פוקוס", value: sessions.filter(s => s.completed).length, icon: TrendingUp, color: "from-emerald-400 to-teal-500" },
    { label: "פרסים (bests)", value: profile?.longest_streak || 0, icon: Award, color: "from-pink-400 to-rose-500" },
  ];

  return (
    <div className="glass rounded-3xl p-5 mb-4">
      <h3 className="font-bold text-slate-700 mb-4">סטטיסטיקות כלליות</h3>

      <div className="grid grid-cols-2 gap-3 mb-5">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white/60 rounded-2xl p-4">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-2 shadow`}>
              <Icon size={18} className="text-white" />
            </div>
            <p className="text-2xl font-black text-slate-800">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Today's progress vs goals */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-600">התקדמות היום מול יעדים</p>
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>✅ משימות: {todayDone}/{taskGoal}</span>
            <span>{taskPct}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2.5 rounded-full transition-all" style={{ width: `${taskPct}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>⏱️ פוקוס: {todayFocus}/{focusGoal} דק'</span>
            <span>{focusPct}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5">
            <div className="bg-gradient-to-r from-amber-400 to-orange-500 h-2.5 rounded-full transition-all" style={{ width: `${focusPct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

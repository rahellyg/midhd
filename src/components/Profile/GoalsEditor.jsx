import { useState } from "react";
import { Target, Clock, Save, CheckCircle } from "lucide-react";

export default function GoalsEditor({ profile, onSave }) {
  const [taskGoal, setTaskGoal] = useState(profile?.daily_task_goal || 3);
  const [focusGoal, setFocusGoal] = useState(profile?.daily_focus_goal_minutes || 50);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await onSave({ daily_task_goal: taskGoal, daily_focus_goal_minutes: focusGoal });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="glass rounded-3xl p-5 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Target size={20} className="text-indigo-500" />
        <h3 className="font-bold text-slate-700">יעדים יומיים</h3>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
              <CheckCircle size={15} className="text-indigo-400" /> משימות ליום
            </label>
            <span className="text-xl font-bold text-indigo-600">{taskGoal}</span>
          </div>
          <input
            type="range" min={1} max={15} value={taskGoal}
            onChange={e => setTaskGoal(+e.target.value)}
            className="w-full accent-indigo-500 h-2 rounded-full"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>1</span><span>8</span><span>15</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
              <Clock size={15} className="text-purple-400" /> דקות פוקוס ליום
            </label>
            <span className="text-xl font-bold text-purple-600">{focusGoal}′</span>
          </div>
          <input
            type="range" min={10} max={240} step={5} value={focusGoal}
            onChange={e => setFocusGoal(+e.target.value)}
            className="w-full accent-purple-500 h-2 rounded-full"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>10′</span><span>2 שע'</span><span>4 שע'</span>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        className={`w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-all ${saved ? "bg-emerald-500 text-white" : "btn-primary text-white"}`}
      >
        {saved ? <><CheckCircle size={16} /> נשמר!</> : <><Save size={16} /> שמור יעדים</>}
      </button>
    </div>
  );
}
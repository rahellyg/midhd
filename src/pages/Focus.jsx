import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/api/apiClient";
import { useAuth } from "@/lib/AuthContext";
import PomodoroTimer from "../components/focus/PomodoroTimer";
import BottomNav from "../components/layout/BottomNav";
import { Trophy, Flame } from "lucide-react";

export default function Focus() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [justCompleted, setJustCompleted] = useState(false);

  useEffect(() => {
    if (user?.email) {
      api.entities.FocusSession.filter({ user_email: user.email }, "-created_date", 50).then(setSessions);
      api.entities.Task.filter({ user_email: user.email, status: "todo" }, "-created_date", 20).then(setTasks);
    } else {
      api.entities.FocusSession.list("-created_date", 50).then(setSessions);
      api.entities.Task.filter({ status: "todo" }, "-created_date", 20).then(setTasks);
    }
  }, [user]);

  const handleSessionComplete = async (minutes) => {
    setJustCompleted(true);
    setTimeout(() => setJustCompleted(false), 4000);
    await api.entities.FocusSession.create({
      task_id: selectedTask?.id || null,
      duration_minutes: minutes,
      completed: true,
      session_date: new Date().toISOString().split("T")[0],
      user_email: user?.email || null,
    });
    const updated = user?.email
      ? await api.entities.FocusSession.filter({ user_email: user.email }, "-created_date", 50)
      : await api.entities.FocusSession.list("-created_date", 50);
    setSessions(updated);
  };

  const handleStepToggle = async (stepIndex) => {
    if (!activeTask) return;

    const updatedSteps = (activeTask.steps || []).map((step, index) => (
      index === stepIndex ? { ...step, done: !step.done } : step
    ));

    await api.entities.Task.update(activeTask.id, { steps: updatedSteps });

    setTasks((prevTasks) => prevTasks.map((task) => (
      task.id === activeTask.id ? { ...task, steps: updatedSteps } : task
    )));

    setSelectedTask((prev) => {
      if (!prev || prev.id !== activeTask.id) return prev;
      return { ...prev, steps: updatedSteps };
    });
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const todaySessions = sessions.filter(s => s.session_date === todayStr && s.completed);
  const totalMinutes = todaySessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
  const activeTask = selectedTask ? tasks.find(t => t.id === selectedTask.id) || selectedTask : null;
  const totalSteps = activeTask?.steps?.length || 0;
  const doneSteps = activeTask?.steps?.filter(step => step.done).length || 0;
  const stepProgress = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;

  const adhd_tips = [t("focus.tip1"), t("focus.tip2"), t("focus.tip3"), t("focus.tip4"), t("focus.tip5")];

  return (
    <div className="min-h-screen pb-28 px-4 pt-8 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{t("focus.title")}</h1>
        <p className="text-slate-500 text-sm">{t("focus.subtitle")}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="glass rounded-3xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Flame size={20} className="text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{todaySessions.length}</p>
            <p className="text-xs text-slate-500">{t("focus.sessionsToday")}</p>
          </div>
        </div>
        <div className="glass rounded-3xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
            <Trophy size={20} className="text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{totalMinutes}</p>
            <p className="text-xs text-slate-500">{t("focus.focusMinutes")}</p>
          </div>
        </div>
      </div>

      {/* Task selector */}
      {tasks.length > 0 && (
        <div className="glass rounded-3xl p-4 mb-5">
          <p className="text-sm font-semibold text-slate-600 mb-2">{t("focus.whatWorkingOn")}</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setSelectedTask(null)}
              className={`text-right px-3 py-2 rounded-xl text-sm transition-all ${!selectedTask ? "bg-indigo-100 text-indigo-700 font-medium" : "bg-white/50 text-slate-600"}`}
            >
              🎯 {t("focus.noSpecificTask")}
            </button>
            {tasks.slice(0, 4).map((task) => (
              <button
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className={`text-right px-3 py-2 rounded-xl text-sm transition-all ${selectedTask?.id === task.id ? "bg-indigo-100 text-indigo-700 font-medium" : "bg-white/50 text-slate-600"}`}
              >
                📌 {task.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Timer */}
      <div className="glass rounded-3xl p-6 mb-5">
        <PomodoroTimer onSessionComplete={handleSessionComplete} />
      </div>

      {/* Active task progress */}
      {activeTask && (
        <div className="glass rounded-3xl p-5 mb-5">
          <p className="text-xs font-semibold text-indigo-600 mb-1">{t("focus.activeTaskNow")}</p>
          <h3 className="font-bold text-slate-800 text-base mb-3">{activeTask.title}</h3>

          <div className="flex items-center justify-between text-sm mb-2">
            <p className="text-slate-600">{t("focus.stepProgress")}</p>
            <p className="font-semibold text-slate-700">{doneSteps}/{totalSteps}</p>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden mb-3">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-500 transition-all duration-500"
              style={{ width: `${stepProgress}%` }}
            />
          </div>

          {totalSteps > 0 ? (
            <div className="space-y-1.5">
              {activeTask.steps.slice(0, 4).map((step, index) => (
                <button
                  type="button"
                  key={`${activeTask.id}-step-${index}`}
                  onClick={() => handleStepToggle(index)}
                  className="w-full text-right text-sm text-slate-600 flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-100/70 transition-colors"
                >
                  <span>{step.done ? "✅" : "▫️"}</span>
                  <span className={step.done ? "line-through opacity-70" : ""}>{step.text}</span>
                </button>
              ))}
              {totalSteps > 4 && (
                <p className="text-xs text-slate-500">+{totalSteps - 4} {t("focus.moreSteps")}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">{t("focus.noStepsYet")}</p>
          )}
        </div>
      )}

      {/* Completion celebration */}
      {justCompleted && (
        <div className="glass rounded-3xl p-5 mb-5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 text-center">
          <p className="text-4xl mb-2">🎉</p>
          <p className="font-bold text-slate-700 text-lg">{t("focus.wellDone")}</p>
          <p className="text-slate-500 text-sm">{t("focus.sessionComplete")}</p>
        </div>
      )}

      {/* ADHD tips */}
      <div className="glass rounded-3xl p-5">
        <h3 className="font-bold text-slate-700 mb-3">{t("focus.tipsTitle")}</h3>
        <div className="space-y-2">
          {adhd_tips.map((tip, i) => (
            <div key={i} className="bg-white/60 rounded-2xl px-4 py-2.5 text-sm text-slate-700">
              {tip}
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
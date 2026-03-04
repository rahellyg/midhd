import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import StreakCard from "../components/Profile/StreakCard";
import GoalsEditor from "../components/Profile/GoalsEditor";
import StatsOverview from "../components/Profile/StatsOverview";
import BottomNav from "../components/layout/BottomNav";
import { User, LogOut } from "lucide-react";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const [me, allTasks, allSessions] = await Promise.all([
      base44.auth.me(),
      base44.entities.Task.list("-created_date", 200),
      base44.entities.FocusSession.list("-created_date", 200),
    ]);
    setUser(me);
    setTasks(allTasks);
    setSessions(allSessions);

    // load or create profile
    const profiles = await base44.entities.UserProfile.filter({ user_email: me.email });
    const today = new Date().toISOString().split("T")[0];

    if (profiles.length > 0) {
      let p = profiles[0];
      // update streak
      const last = p.last_active_date;
      let streak = p.streak_days || 0;
      if (last !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().split("T")[0];
        if (last === yStr) {
          streak = streak + 1;
        } else if (last !== today) {
          streak = 1;
        }
        const longest = Math.max(streak, p.longest_streak || 0);
        const updated = await base44.entities.UserProfile.update(p.id, {
          streak_days: streak,
          last_active_date: today,
          longest_streak: longest,
          total_tasks_done: allTasks.filter(t => t.status === "done").length,
          total_focus_minutes: allSessions.filter(s => s.completed).reduce((sum, s) => sum + (s.duration_minutes || 0), 0),
        });
        setProfile({ ...p, ...updated });
      } else {
        setProfile(p);
      }
    } else {
      // create new profile
      const newProfile = await base44.entities.UserProfile.create({
        user_email: me.email,
        daily_task_goal: 3,
        daily_focus_goal_minutes: 50,
        streak_days: 1,
        last_active_date: today,
        longest_streak: 1,
        total_tasks_done: allTasks.filter(t => t.status === "done").length,
        total_focus_minutes: allSessions.filter(s => s.completed).reduce((sum, s) => sum + (s.duration_minutes || 0), 0),
      });
      setProfile(newProfile);
    }
    setLoading(false);
  };

  const handleSaveGoals = async (goals) => {
    if (!profile) return;
    const updated = await base44.entities.UserProfile.update(profile.id, goals);
    setProfile(prev => ({ ...prev, ...updated }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-3 pulse-soft">
            <User size={24} className="text-indigo-400" />
          </div>
          <p className="text-slate-500">טוען פרופיל...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28 px-4 pt-8 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">הפרופיל שלי 👤</h1>
          <p className="text-slate-500 text-sm">יעדים, רצף וסטטיסטיקות</p>
        </div>
        <button
          onClick={() => base44.auth.logout()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/70 text-slate-500 hover:text-red-500 hover:bg-red-50 transition-all text-sm"
        >
          <LogOut size={16} /> יציאה
        </button>
      </div>

      {/* User info */}
      <div className="glass rounded-3xl p-5 mb-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
          {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || "?"}
        </div>
        <div>
          <p className="font-bold text-slate-800 text-lg">{user?.full_name || "משתמש"}</p>
          <p className="text-slate-500 text-sm">{user?.email}</p>
          <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full mt-1 inline-block font-medium">
            {user?.role === "admin" ? "מנהל" : "משתמש"}
          </span>
        </div>
      </div>

      {/* Streak */}
      <StreakCard
        streak={profile?.streak_days || 0}
        longest={profile?.longest_streak || 0}
        lastActive={profile?.last_active_date}
      />

      {/* Goals */}
      <GoalsEditor profile={profile} onSave={handleSaveGoals} />

      {/* Stats */}
      <StatsOverview tasks={tasks} sessions={sessions} profile={profile} />
    </div>
  );
}
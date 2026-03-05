import { useState, useEffect, useRef } from "react";
import { api } from "@/api/apiClient";
import StreakCard from "../components/Profile/StreakCard";
import GoalsEditor from "../components/Profile/GoalsEditor";
import StatsOverview from "../components/Profile/StatsOverview";
import BottomNav from "../components/layout/BottomNav";
import { User, Upload, Trash2 } from "lucide-react";

const AUTH_REPORT_ALLOWED_EMAIL = "rahelly23@gmail.com";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [authEvents, setAuthEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const [me, allTasks, allSessions] = await Promise.all([
      api.auth.me(),
      api.entities.Task.list("-created_date", 200),
      api.entities.FocusSession.list("-created_date", 200),
    ]);

    const normalizedEmail = String(me?.email || "").trim().toLowerCase();
    const canSeeAuthReport = normalizedEmail === AUTH_REPORT_ALLOWED_EMAIL;
    const allAuthEvents = canSeeAuthReport
      ? await api.entities["AuthEvent"].list("-created_date", 200)
      : [];

    setUser(me);
    setTasks(allTasks);
    setSessions(allSessions);
    setAuthEvents(Array.isArray(allAuthEvents) ? allAuthEvents : []);

    // load or create profile
    const profiles = await api.entities.UserProfile.filter({ user_email: me.email });
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
        const updated = await api.entities.UserProfile.update(p.id, {
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
      const newProfile = await api.entities.UserProfile.create({
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
    const updated = await api.entities.UserProfile.update(profile.id, goals);
    setProfile(prev => ({ ...prev, ...updated }));
  };

  const handlePickAvatar = () => {
    setAvatarError("");
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (event) => {
    if (!profile) return;
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAvatarError("אפשר להעלות רק קובץ תמונה.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("התמונה גדולה מדי. אפשר עד 2MB.");
      return;
    }

    try {
      setUploadingAvatar(true);
      setAvatarError("");

      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Failed to read image"));
        reader.readAsDataURL(file);
      });

      const updated = await api.entities.UserProfile.update(profile.id, { avatar_url: dataUrl });
      setProfile((prev) => ({ ...prev, ...updated, avatar_url: dataUrl }));
    } catch {
      setAvatarError("העלאת התמונה נכשלה. נסה שוב.");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!profile) return;
    setAvatarError("");
    const updated = await api.entities.UserProfile.update(profile.id, { avatar_url: null });
    setProfile((prev) => ({ ...prev, ...updated, avatar_url: null }));
  };

  const signupCount = authEvents.filter((event) => event.event_type === "signup").length;
  const loginCount = authEvents.filter((event) => event.event_type === "login").length;
  const uniqueUsersCount = new Set(
    authEvents
      .map((event) => event.user_email)
      .filter(Boolean)
  ).size;
  const canSeeAuthReport = String(user?.email || "").trim().toLowerCase() === AUTH_REPORT_ALLOWED_EMAIL;

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
      </div>

      {/* User info */}
      <div className="glass rounded-3xl p-5 mb-4 flex items-center gap-4">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt="תמונת פרופיל"
            className="w-14 h-14 rounded-2xl object-cover shadow-lg border border-white/60"
          />
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || "?"}
          </div>
        )}
        <div>
          <p className="font-bold text-slate-800 text-lg">{user?.full_name || "משתמש"}</p>
          <p className="text-slate-500 text-sm">{user?.email}</p>
          <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full mt-1 inline-block font-medium">
            {user?.role === "admin" ? "מנהל" : "משתמש"}
          </span>
        </div>
      </div>

      <div className="glass rounded-3xl p-4 mb-4">
        <p className="text-sm font-semibold text-slate-700 mb-3">תמונת פרופיל</p>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={handlePickAvatar}
            disabled={uploadingAvatar}
            className="flex-1 rounded-2xl px-3 py-2.5 bg-indigo-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Upload size={16} />
            {uploadingAvatar ? "מעלה..." : "העלאת תמונה"}
          </button>
          {profile?.avatar_url && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              className="rounded-2xl px-3 py-2.5 bg-red-50 text-red-600 text-sm font-semibold flex items-center justify-center gap-1.5"
            >
              <Trash2 size={16} />
              הסרה
            </button>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-2">פורמטים נתמכים: תמונות עד 2MB</p>
        {avatarError && (
          <p className="text-xs text-red-600 mt-2">{avatarError}</p>
        )}
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

      {canSeeAuthReport && (
        <div className="glass rounded-3xl p-5 mb-4">
          <h3 className="font-bold text-slate-700 mb-3">נרשמים וכניסות</h3>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-white/70 rounded-2xl p-3 text-center">
              <p className="text-xl font-bold text-slate-800">{uniqueUsersCount}</p>
              <p className="text-[11px] text-slate-500">משתמשים</p>
            </div>
            <div className="bg-white/70 rounded-2xl p-3 text-center">
              <p className="text-xl font-bold text-emerald-700">{signupCount}</p>
              <p className="text-[11px] text-slate-500">הרשמות</p>
            </div>
            <div className="bg-white/70 rounded-2xl p-3 text-center">
              <p className="text-xl font-bold text-indigo-700">{loginCount}</p>
              <p className="text-[11px] text-slate-500">כניסות</p>
            </div>
          </div>

          {authEvents.length === 0 ? (
            <p className="text-sm text-slate-500">עדיין אין אירועי הרשמה או כניסה.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {authEvents.slice(0, 25).map((event) => {
                const actionText = event.event_type === "signup" ? "נרשם" : "נכנס";
                const providerText = event.provider === "google" ? "Google" : "Email";
                const when = event.event_time || event.created_date;
                return (
                  <div key={event.id} className="bg-white/70 rounded-2xl px-3 py-2.5 border border-slate-100">
                    <p className="text-sm text-slate-700 font-medium">{event.user_name || event.user_email || "משתמש לא ידוע"}</p>
                    <p className="text-xs text-slate-500">{event.user_email || "ללא אימייל"}</p>
                    <div className="flex items-center justify-between mt-1.5 text-xs">
                      <span className="text-slate-600">{actionText} דרך {providerText}</span>
                      <span className="text-slate-400">{when ? new Date(when).toLocaleString("he-IL") : "ללא זמן"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
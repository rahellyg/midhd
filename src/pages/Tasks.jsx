import { useState, useEffect } from "react";
import { api } from "@/api/apiClient";
import { Plus, Bell, BellOff } from "lucide-react";
import TaskCard from "../components/tasks/TaskCard";
import AddTaskModal from "../components/tasks/AddTaskModal";
import BottomNav from "../components/layout/BottomNav";
import {
  getNotificationPermission,
  getNotificationSettings,
  getTodayPendingTasks,
  isNotificationsSupported,
  markNotifiedToday,
  requestNotificationPermission,
  sendTodayTasksNotification,
  updateNotificationSettings,
} from "@/lib/dailyTaskNotifications";

const filters = [
  { key: "all", label: "הכל" },
  { key: "todo", label: "לביצוע" },
  { key: "in_progress", label: "בתהליך" },
  { key: "done", label: "הושלם" },
];

const energyFilters = [
  { key: "all", label: "כל האנרגיה" },
  { key: "low", label: "🌿 נמוכה" },
  { key: "medium", label: "⚡ בינונית" },
  { key: "high", label: "🔥 גבוהה" },
];

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [energyFilter, setEnergyFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notificationsSupported, setNotificationsSupported] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState("default");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationTime, setNotificationTime] = useState("09:00");
  const [notificationMessage, setNotificationMessage] = useState("");

  const load = async () => {
    setLoading(true);
    const data = await api.entities.Task.list("-created_date", 100);
    setTasks(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const supported = isNotificationsSupported();
    setNotificationsSupported(supported);
    if (!supported) {
      return;
    }

    const settings = getNotificationSettings();
    setNotificationsEnabled(Boolean(settings.enabled));
    setNotificationTime(settings.time || "09:00");
    setNotificationPermission(getNotificationPermission());
  }, []);

  const handleEnableNotifications = async () => {
    if (!notificationsSupported) {
      setNotificationMessage("הדפדפן לא תומך בהתראות.");
      return;
    }

    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);

    if (permission !== "granted") {
      setNotificationsEnabled(false);
      updateNotificationSettings({ enabled: false });
      setNotificationMessage("נדרש לאשר התראות בדפדפן כדי לקבל תזכורות.");
      return;
    }

    setNotificationsEnabled(true);
    updateNotificationSettings({ enabled: true, time: notificationTime });
    setNotificationMessage("התזכורת היומית הופעלה בהצלחה.");
  };

  const handleDisableNotifications = () => {
    setNotificationsEnabled(false);
    updateNotificationSettings({ enabled: false });
    setNotificationMessage("התזכורת היומית בוטלה.");
  };

  const handleTimeChange = (event) => {
    const nextTime = event.target.value;
    setNotificationTime(nextTime);
    updateNotificationSettings({ time: nextTime });
  };

  const handleSendTestNotification = async () => {
    setNotificationMessage("");
    const pending = getTodayPendingTasks(tasks);
    const result = await sendTodayTasksNotification(pending);
    if (!result.sent) {
      setNotificationMessage("לא נשלח. אשר/י הרשאת התראות ונסה/י שוב.");
      return;
    }
    markNotifiedToday();
    setNotificationMessage("נשלחה תזכורת עם המשימות להיום.");
  };

  const filtered = tasks.filter(t => {
    const normalizedStatus = t.status || "todo";
    const sMatch = statusFilter === "all" || normalizedStatus === statusFilter;
    const eMatch = energyFilter === "all" || t.energy_level === energyFilter;
    return sMatch && eMatch;
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const todayTasks = filtered.filter(t => !t.scheduled_date || t.scheduled_date === todayStr);
  const otherTasks = filtered.filter(t => t.scheduled_date && t.scheduled_date !== todayStr);

  return (
    <div className="min-h-screen pb-28 px-4 pt-8 max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">המשימות שלי 📋</h1>
          <p className="text-slate-500 text-sm">{tasks.filter(t => t.status !== "done").length} משימות פעילות</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="glass rounded-3xl p-4 mb-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-sm font-semibold text-slate-700">תזכורת יומית למשימות</p>
            <p className="text-xs text-slate-500">Push לטלפון/דפדפן עם משימות להיום</p>
          </div>
          {notificationsEnabled ? (
            <button
              type="button"
              onClick={handleDisableNotifications}
              className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium flex items-center gap-1.5"
            >
              <BellOff size={16} /> בטל
            </button>
          ) : (
            <button
              type="button"
              onClick={handleEnableNotifications}
              className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium flex items-center gap-1.5"
            >
              <Bell size={16} /> הפעל
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
          <label className="text-xs text-slate-500">
            שעה לתזכורת
            <input
              type="time"
              value={notificationTime}
              onChange={handleTimeChange}
              className="mt-1 w-full bg-white/80 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </label>

          <button
            type="button"
            onClick={handleSendTestNotification}
            className="h-10 px-3 rounded-xl bg-emerald-600 text-white text-sm font-medium"
          >
            שלח בדיקה
          </button>
        </div>

        <p className="mt-2 text-xs text-slate-500">הרשאה: {notificationPermission}</p>
        {!notificationsSupported && (
          <p className="mt-2 text-xs text-red-600">הדפדפן הנוכחי לא תומך בהתראות.</p>
        )}
        {notificationMessage && (
          <p className="mt-2 text-xs text-indigo-700">{notificationMessage}</p>
        )}
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide pb-1">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`px-4 py-2 rounded-2xl text-sm font-medium whitespace-nowrap transition-all ${statusFilter === f.key ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow" : "bg-white/70 text-slate-600 hover:bg-indigo-50"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Energy filter */}
      <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide pb-1">
        {energyFilters.map(f => (
          <button
            key={f.key}
            onClick={() => setEnergyFilter(f.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${energyFilter === f.key ? "bg-emerald-500 text-white shadow" : "bg-white/70 text-slate-600 hover:bg-emerald-50"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass rounded-3xl h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {todayTasks.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-400 mb-2 px-1">היום</p>
              {todayTasks.map(t => (
                <TaskCard key={t.id} task={t} onUpdate={load} onDelete={load} />
              ))}
            </div>
          )}
          {otherTasks.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2 px-1">תאריכים אחרים</p>
              {otherTasks.map(t => (
                <TaskCard key={t.id} task={t} onUpdate={load} onDelete={load} />
              ))}
            </div>
          )}
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-5xl mb-4">✨</p>
              <p className="font-bold text-slate-600 text-lg">אין משימות כאן</p>
              <p className="text-slate-400 text-sm mt-1">לחץ + כדי להוסיף משימה חדשה</p>
            </div>
          )}
        </>
      )}

      {showModal && <AddTaskModal onClose={() => setShowModal(false)} onSave={load} />}
      <BottomNav />
    </div>
  );
}
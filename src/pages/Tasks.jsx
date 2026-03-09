import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/api/apiClient";
import { useAuth } from "@/lib/AuthContext";
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

const filterKeys = ["all", "todo", "in_progress", "done"];
const energyKeys = ["all", "low", "medium", "high"];

export default function Tasks() {
  const { t } = useTranslation();
  const { user } = useAuth();
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
    const data = user?.email
      ? await api.entities.Task.filter({ user_email: user.email }, "-created_date", 100)
      : await api.entities.Task.list("-created_date", 100);
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
      setNotificationMessage(t("tasks.notificationsNotSupported"));
      return;
    }

    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);

    if (permission !== "granted") {
      setNotificationsEnabled(false);
      updateNotificationSettings({ enabled: false });
      setNotificationMessage(t("tasks.notificationsPermissionRequired"));
      return;
    }

    setNotificationsEnabled(true);
    updateNotificationSettings({ enabled: true, time: notificationTime });
    setNotificationMessage(t("tasks.notificationsEnabled"));
  };

  const handleDisableNotifications = () => {
    setNotificationsEnabled(false);
    updateNotificationSettings({ enabled: false });
    setNotificationMessage(t("tasks.notificationsDisabled"));
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
      setNotificationMessage(t("tasks.testNotSent"));
      return;
    }
    markNotifiedToday();
    setNotificationMessage(t("tasks.testSent"));
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

  const filterLabels = { all: "filterAll", todo: "filterTodo", in_progress: "filterInProgress", done: "filterDone" };
  const energyLabels = { all: "energyAll", low: "energyLow", medium: "energyMedium", high: "energyHigh" };
  const filters = filterKeys.map((key) => ({ key, label: t(`tasks.${filterLabels[key]}`) }));
  const energyFilters = energyKeys.map((key) => ({ key, label: t(`tasks.${energyLabels[key]}`) }));
  const activeCount = tasks.filter((task) => task.status !== "done").length;

  return (
    <div className="min-h-screen pb-28 px-4 pt-8 max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t("tasks.title")} 📋</h1>
          <p className="text-slate-500 text-sm">{t("tasks.activeCount", { count: activeCount })}</p>
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
            <p className="text-sm font-semibold text-slate-700">{t("tasks.reminderTitle")}</p>
            <p className="text-xs text-slate-500">{t("tasks.reminderDesc")}</p>
          </div>
          {notificationsEnabled ? (
            <button
              type="button"
              onClick={handleDisableNotifications}
              className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium flex items-center gap-1.5"
            >
              <BellOff size={16} /> {t("tasks.disable")}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleEnableNotifications}
              className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium flex items-center gap-1.5"
            >
              <Bell size={16} /> {t("tasks.enable")}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
          <label className="text-xs text-slate-500">
            {t("tasks.reminderTimeLabel")}
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
            {t("tasks.sendTest")}
          </button>
        </div>

        <p className="mt-2 text-xs text-slate-500">{t("tasks.permissionLabel")}: {notificationPermission}</p>
        {!notificationsSupported && (
          <p className="mt-2 text-xs text-red-600">{t("tasks.notificationsNotSupported")}</p>
        )}
        {notificationMessage && (
          <p className="mt-2 text-xs text-indigo-700">{notificationMessage}</p>
        )}
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide pb-1">
        {filters.map((f) => (
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
        {energyFilters.map((f) => (
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
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-3xl h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {todayTasks.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-400 mb-2 px-1">{t("tasks.today")}</p>
              {todayTasks.map((task) => (
                <TaskCard key={task.id} task={task} onUpdate={load} onDelete={load} />
              ))}
            </div>
          )}
          {otherTasks.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2 px-1">{t("tasks.otherDates")}</p>
              {otherTasks.map((task) => (
                <TaskCard key={task.id} task={task} onUpdate={load} onDelete={load} />
              ))}
            </div>
          )}
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-5xl mb-4">✨</p>
              <p className="font-bold text-slate-600 text-lg">{t("tasks.noTasks")}</p>
              <p className="text-slate-400 text-sm mt-1">{t("tasks.addPrompt")}</p>
            </div>
          )}
        </>
      )}

      {showModal && <AddTaskModal onClose={() => setShowModal(false)} onSave={load} />}
      <BottomNav />
    </div>
  );
}
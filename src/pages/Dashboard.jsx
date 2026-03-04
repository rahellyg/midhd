import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { CheckSquare, Timer, Leaf, Zap, TrendingUp, Sun, Moon, CloudSun } from "lucide-react";
import BottomNav from "../components/layout/BottomNav";

const adhd_quotes = [
  "המוח שלך עובד אחרת – וזה כוח, לא חולשה 💜",
  "צעד קטן אחד הוא ניצחון גדול 🌟",
  "אתה לא צריך להיות מושלם, רק להתחיל ✨",
  "כל יום הוא הזדמנות חדשה לנסות שוב 🌱",
  "הצלחות קטנות מצטברות למשהו גדול 🚀",
];

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return { text: "בוקר טוב", icon: Sun, color: "text-amber-500" };
  if (h < 17) return { text: "צהריים טובים", icon: CloudSun, color: "text-orange-400" };
  return { text: "ערב טוב", icon: Moon, color: "text-indigo-500" };
};

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [quote] = useState(adhd_quotes[Math.floor(Math.random() * adhd_quotes.length)]);
  const greeting = getGreeting();
  const GreetIcon = greeting.icon;

  useEffect(() => {
    base44.entities.Task.list("-created_date", 50).then(setTasks);
  }, []);

  const todayStr = new Date().toISOString().split("T")[0];
  const todayTasks = tasks.filter(t => !t.scheduled_date || t.scheduled_date === todayStr);
  const doneTasks = todayTasks.filter(t => t.status === "done");
  const pendingTasks = todayTasks.filter(t => t.status !== "done");
  const progress = todayTasks.length ? Math.round((doneTasks.length / todayTasks.length) * 100) : 0;

  const quickLinks = [
    { label: "משימות", icon: CheckSquare, page: "Tasks", color: "from-indigo-400 to-purple-500", desc: `${pendingTasks.length} ממתינות` },
    { label: "פוקוס", icon: Timer, page: "Focus", color: "from-amber-400 to-orange-500", desc: "טיימר פומודורו" },
    { label: "רגיעה", icon: Leaf, page: "Calm", color: "from-emerald-400 to-teal-500", desc: "נשימה ומדיטציה" },
    { label: "דופמין", icon: Zap, page: "Dopamine", color: "from-pink-400 to-rose-500", desc: "טיפים לאנרגיה" },
  ];

  return (
    <div className="min-h-screen pb-28 px-4 pt-8 max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <GreetIcon size={22} className={greeting.color} />
          <h1 className="text-2xl font-bold text-slate-800">{greeting.text}! 👋</h1>
        </div>
        <p className="text-slate-500 text-sm">{new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}</p>
      </div>

      {/* Quote card */}
      <div className="glass rounded-3xl p-5 mb-5 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100">
        <p className="text-slate-700 font-medium text-center leading-relaxed">"{quote}"</p>
      </div>

      {/* Progress */}
      {todayTasks.length > 0 && (
        <div className="glass rounded-3xl p-5 mb-5">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-indigo-500" />
              <span className="font-bold text-slate-700">ההתקדמות שלי היום</span>
            </div>
            <span className="text-2xl font-bold text-indigo-600">{progress}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-slate-500 mt-2">
            {doneTasks.length} מתוך {todayTasks.length} משימות הושלמו 🎉
          </p>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {quickLinks.map(({ label, icon: Icon, page, color, desc }) => (
          <Link
            key={page}
            to={createPageUrl(page)}
            className="glass rounded-3xl p-5 flex flex-col gap-2 task-card"
          >
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
              <Icon size={24} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-800">{label}</p>
              <p className="text-xs text-slate-500">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Upcoming tasks */}
      {pendingTasks.length > 0 && (
        <div className="glass rounded-3xl p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-slate-700">משימות להיום</h3>
            <Link to={createPageUrl("Tasks")} className="text-indigo-500 text-sm font-medium">הכל →</Link>
          </div>
          {pendingTasks.slice(0, 3).map(task => (
            <div key={task.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
              <div className={`w-2 h-2 rounded-full ${task.priority === "high" ? "bg-red-400" : task.priority === "medium" ? "bg-amber-400" : "bg-emerald-400"}`} />
              <span className="text-sm text-slate-700 flex-1 line-clamp-1">{task.title}</span>
              {task.estimated_minutes && <span className="text-xs text-slate-400">{task.estimated_minutes}′</span>}
            </div>
          ))}
        </div>
      )}

      {todayTasks.length === 0 && (
        <div className="text-center py-8 glass rounded-3xl">
          <p className="text-4xl mb-3">🌟</p>
          <p className="font-bold text-slate-700">אין משימות להיום עדיין</p>
          <p className="text-slate-500 text-sm mt-1">לחץ על 'משימות' כדי להוסיף</p>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
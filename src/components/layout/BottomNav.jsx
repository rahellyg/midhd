import { createPageUrl } from "@/utils";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { CheckSquare, Timer, Leaf, LayoutDashboard, UserCircle, Sparkles, ClipboardCheck, MessagesSquare } from "lucide-react";

const navItems = [
  { key: "Dashboard", Icon: LayoutDashboard, page: "Dashboard" },
  { key: "Tasks", Icon: CheckSquare, page: "Tasks" },
  { key: "Focus", Icon: Timer, page: "Focus" },
  { key: "Calm", Icon: Leaf, page: "Calm" },
  { key: "DailyCheckIn", Icon: ClipboardCheck, page: "DailyCheckIn" },
  { key: "Forum", Icon: MessagesSquare, page: "Forum" },
  { key: "AIHelp", Icon: Sparkles, page: "AIHelp" },
  { key: "Profile", Icon: UserCircle, page: "Profile" },
];

export default function BottomNav() {
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/50 shadow-2xl">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-2 px-2 max-w-lg mx-auto">
        {navItems.map(({ key, Icon, page }) => {
          const href = createPageUrl(page);
          const active =
            location.pathname.toLowerCase().includes(page.toLowerCase()) ||
            (page === "Dashboard" && (location.pathname === "/" || location.pathname === ""));
          return (
            <Link
              key={page}
              to={href}
              className={`shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all duration-300 ${
                active
                  ? "bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg scale-105"
                  : "text-slate-500 hover:text-indigo-500"
              }`}
            >
              <Icon size={20} />
              <span className="text-xs font-medium">{t(key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
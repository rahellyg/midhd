import { createPageUrl } from "@/utils";
import { Link, useLocation } from "react-router-dom";
import { CheckSquare, Timer, Leaf, Zap, LayoutDashboard, UserCircle } from "lucide-react";

const navItems = [
  { label: "בית", Icon: LayoutDashboard, page: "Dashboard" },
  { label: "משימות", Icon: CheckSquare, page: "Tasks" },
  { label: "פוקוס", Icon: Timer, page: "Focus" },
  { label: "רגיעה", Icon: Leaf, page: "Calm" },
  { label: "פרופיל", Icon: UserCircle, page: "Profile" },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/50 shadow-2xl">
      <div className="flex justify-around items-center py-2 px-2 max-w-lg mx-auto">
        {navItems.map(({ label, Icon, page }) => {
          const href = createPageUrl(page);
          const active =
            location.pathname.toLowerCase().includes(page.toLowerCase()) ||
            (page === "Dashboard" && (location.pathname === "/" || location.pathname === ""));
          return (
            <Link
              key={page}
              to={href}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all duration-300 ${
                active
                  ? "bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg scale-105"
                  : "text-slate-500 hover:text-indigo-500"
              }`}
            >
              <Icon size={20} />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
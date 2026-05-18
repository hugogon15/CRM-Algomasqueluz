import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard, Users, Columns3, FileText, CalendarClock,
  FileBarChart2, UserCog, LogOut, Sparkles,
} from "lucide-react";
import { ROLE_MAP } from "../../lib/constants";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "sidebar-nav-dashboard" },
  { to: "/clientes", label: "Clientes", icon: Users, testid: "sidebar-nav-clientes" },
  { to: "/pipeline", label: "Pipeline", icon: Columns3, testid: "sidebar-nav-pipeline" },
  { to: "/contratos", label: "Contratos", icon: FileText, testid: "sidebar-nav-contratos" },
  { to: "/renovaciones", label: "Renovaciones", icon: CalendarClock, testid: "sidebar-nav-renovaciones" },
  { to: "/documentos", label: "Documentos / OCR", icon: FileBarChart2, testid: "sidebar-nav-documentos" },
  { to: "/usuarios", label: "Equipo", icon: UserCog, testid: "sidebar-nav-usuarios", roles: ["admin"] },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <aside className="w-64 shrink-0 border-r border-zinc-200 bg-white flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-zinc-200">
        <Link to="/dashboard" className="flex items-center gap-2.5" data-testid="sidebar-brand">
          <div className="relative w-8 h-8 rounded-md bg-zinc-950 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#F97316]" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="font-display text-[13px] font-bold text-zinc-950 tracking-tight">AlgoMásQueLuz</div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-400 font-medium">Sistema Operativo</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-400 font-semibold px-3 py-2">Operativa</div>
        {NAV.filter((n) => !n.roles || n.roles.includes(user?.role)).map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            data-testid={n.testid}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-zinc-950 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
              }`
            }
          >
            <n.icon className="w-4 h-4" strokeWidth={2} />
            <span className="font-medium">{n.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-zinc-200 p-3">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center overflow-hidden">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[11px] font-semibold text-zinc-600">
                {user?.name?.split(" ").map((s) => s[0]).slice(0, 2).join("")}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-zinc-950 truncate">{user?.name}</div>
            <div className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">
              {ROLE_MAP[user?.role]?.label || user?.role}
            </div>
          </div>
          <button
            onClick={async () => { await logout(); nav("/login"); }}
            data-testid="sidebar-logout-button"
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

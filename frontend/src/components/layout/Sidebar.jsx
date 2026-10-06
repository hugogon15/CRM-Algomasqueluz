import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard, Users, Columns3, FileText, CalendarClock,
  FileBarChart2, UserCog, LogOut, MapPin, BookOpen, MessageSquare, Power,
} from "lucide-react";
import { cn } from "../../lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "sidebar-nav-dashboard" },
  { to: "/clientes", label: "Clientes", icon: Users, testid: "sidebar-nav-clientes" },
  { to: "/pipeline", label: "Pipeline", icon: Columns3, testid: "sidebar-nav-pipeline" },
  { to: "/mapa", label: "Mapa Clientes", icon: MapPin, testid: "sidebar-nav-mapa" },
  { to: "/contratos", label: "Contratos", icon: FileText, testid: "sidebar-nav-contratos" },
  { to: "/renovaciones", label: "Renovaciones", icon: CalendarClock, testid: "sidebar-nav-renovaciones" },
  { to: "/documentos", label: "Documentos / OCR", icon: FileBarChart2, testid: "sidebar-nav-documentos" },
  { to: "/documentacion", label: "Documentación", icon: BookOpen, testid: "sidebar-nav-documentacion" },
  { to: "/mensajes", label: "Mensajes", icon: MessageSquare, testid: "sidebar-nav-mensajes" },
  { to: "/usuarios", label: "Equipo", icon: UserCog, testid: "sidebar-nav-usuarios", roles: ["admin"] },
];

export default function Sidebar({ className, forceExpanded }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const isExpanded = true; // Fixed expanded sidebar

  return (
    <aside 
      className={cn(
        "shrink-0 flex flex-col h-full bg-zinc-950 border-r border-zinc-900 py-6 transition-all duration-300 ease-in-out z-50 w-64 px-4 sidebar-expanded",
        className
      )}
    >
      {/* Brand logo container */}
      <div className="pb-5 border-b border-zinc-800 flex w-full px-2 justify-start">
        <Link to="/dashboard" className="flex items-center gap-3 justify-start" data-testid="sidebar-brand" title="AlgoMásQueLuz CRM">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm p-0.5 border border-zinc-800">
            <img src="/logo-sun.svg" className="w-full h-full object-contain" alt="Logo" />
          </div>
          <span className="font-display font-black text-sm text-white tracking-tight leading-none animate-in fade-in duration-200">
            AlgoMásQueLuz
          </span>
        </Link>
      </div>

      {/* Nav list - slim vertical icons or full list */}
      <nav className="flex-1 py-6 space-y-2 overflow-y-auto flex flex-col w-full items-start px-1">
        {NAV.filter((n) => {
          if (user?.permissions && Array.isArray(user.permissions) && user.permissions.length > 0) {
            return user.permissions.includes(n.to);
          }
          return !n.roles || n.roles.includes(user?.role);
        }).map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            data-testid={n.testid}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 transition-all duration-200 w-full h-11 px-4 rounded-xl justify-start",
                isActive
                  ? "active"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              )
            }
          >
            <n.icon className="w-5 h-5 shrink-0" strokeWidth={2} />
            <span className="text-xs font-bold whitespace-nowrap animate-in fade-in duration-200">
              {n.label}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom Profile and Logout action */}
      <div className="border-t border-zinc-800 pt-5 flex w-full flex-row items-center justify-between px-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden border border-zinc-800 cursor-pointer shrink-0" title={user?.name}>
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] font-bold text-zinc-300">
                {user?.name?.split(" ").map((s) => s[0]).slice(0, 2).join("")}
              </span>
            )}
          </div>
          <div className="flex flex-col text-left leading-tight min-w-0">
            <span className="text-xs font-bold text-white truncate max-w-[125px] leading-none">{user?.name || "Hugo"}</span>
            <span className="text-[9px] text-zinc-400 font-semibold truncate max-w-[125px] mt-0.5">{user?.email || "hugo@algomasqueluz.com"}</span>
          </div>
        </div>

        <div
          onClick={async () => { await logout(); nav("/login"); }}
          data-testid="sidebar-logout-button"
          className={cn(
            "rounded-full text-red-500 hover:text-red-400 hover:bg-red-950/20 flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0",
            "w-10 h-10"
          )}
          title="Apagar / Cerrar sesión"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5"
          >
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
            <line x1="12" y1="2" x2="12" y2="12" />
          </svg>
        </div>
      </div>
    </aside>
  );
}

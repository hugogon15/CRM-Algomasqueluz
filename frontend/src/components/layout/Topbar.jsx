import { useEffect, useState } from "react";
import { Bell, Search, Plus, Zap } from "lucide-react";
import { api } from "../../lib/api";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { toast } from "sonner";

export default function Topbar({ title, subtitle, action }) {
  const [notifs, setNotifs] = useState([]);

  const loadNotifs = async () => {
    try {
      const { data } = await api.get("/notifications");
      setNotifs(data);
    } catch {}
  };

  useEffect(() => {
    loadNotifs();
    const id = setInterval(loadNotifs, 60_000);
    return () => clearInterval(id);
  }, []);

  const runRenewalCheck = async () => {
    try {
      const { data } = await api.post("/automations/run-renewal-check");
      toast.success(`Automatización ejecutada — ${data.notifications_created} notificaciones`);
      loadNotifs();
    } catch {
      toast.error("Error ejecutando la automatización");
    }
  };

  const markRead = async (id) => {
    await api.post(`/notifications/${id}/read`);
    loadNotifs();
  };

  const unread = notifs.filter((n) => !n.read).length;

  return (
    <header className="h-16 sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-zinc-200 px-6 md:px-8 flex items-center justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-xl font-bold text-zinc-950 tracking-tight truncate" data-testid="page-title">{title}</h1>
        {subtitle && <p className="text-xs text-zinc-500 mt-0.5 truncate">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={runRenewalCheck}
          variant="outline"
          size="sm"
          className="hidden md:flex h-9 border-zinc-200 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-50"
          data-testid="topbar-run-automation"
        >
          <Zap className="w-3.5 h-3.5 mr-1.5 text-[#F97316]" />
          <span className="text-xs font-medium">Escanear renovaciones</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="relative h-9 w-9 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 flex items-center justify-center transition-colors"
              data-testid="topbar-notifications-button"
            >
              <Bell className="w-4 h-4 text-zinc-700" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#F97316] text-white text-[9px] font-bold flex items-center justify-center">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.1em] text-zinc-400">
              Notificaciones
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifs.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-zinc-500">
                Sin notificaciones. Pulsa <span className="font-semibold">Escanear renovaciones</span>.
              </div>
            )}
            {notifs.slice(0, 8).map((n) => (
              <DropdownMenuItem
                key={n.id}
                onClick={() => markRead(n.id)}
                className="flex flex-col items-start gap-0.5 py-2"
                data-testid={`notif-item-${n.id}`}
              >
                <div className="flex items-start gap-2 w-full">
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                    n.level === "urgent" ? "bg-rose-500" : n.level === "warning" ? "bg-amber-500" : "bg-zinc-300"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-medium ${n.read ? "text-zinc-500" : "text-zinc-950"}`}>{n.title}</div>
                    <div className="text-[11px] text-zinc-500 line-clamp-2">{n.body}</div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {action}
      </div>
    </header>
  );
}

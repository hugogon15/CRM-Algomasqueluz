import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { formatEUR, formatDate, STATE_MAP } from "../lib/constants";
import Topbar from "../components/layout/Topbar";
import {
  Users, Activity, TrendingUp, AlertTriangle, BadgeCheck,
  Building2, ArrowUpRight, Zap, Clock,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

const STATE_BAR_COLORS = {
  nuevo_lead: "#3b82f6",
  pendiente_estudio: "#f59e0b",
  enviado: "#8b5cf6",
  renovacion: "#f43f5e",
  cliente_activo: "#10b981",
  sin_ahorro: "#a1a1aa",
};

function KpiCard({ label, value, sub, icon: Icon, accent }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-md p-5 flex flex-col gap-3 hover:border-zinc-300 transition-colors" data-testid={`kpi-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.12em] font-semibold text-zinc-400">{label}</div>
        <Icon className={`w-4 h-4 ${accent || "text-zinc-400"}`} />
      </div>
      <div className="font-display text-3xl font-bold text-zinc-950 tracking-tight">{value}</div>
      {sub && <div className="text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [upcoming, setUpcoming] = useState([]);

  useEffect(() => {
    api.get("/dashboard/stats").then((r) => setStats(r.data)).catch(() => {});
    api.get("/dashboard/alerts").then((r) => setAlerts(r.data.alerts)).catch(() => {});
    api.get("/renovations/upcoming?days=180").then((r) => setUpcoming(r.data.slice(0, 8))).catch(() => {});
  }, []);

  const chartData = stats?.state_distribution?.map((s) => ({
    estado: STATE_MAP[s.estado]?.label || s.estado,
    count: s.count,
    color: STATE_BAR_COLORS[s.estado] || "#a1a1aa",
  })) || [];

  return (
    <>
      <Topbar title="Dashboard Ejecutivo" subtitle="Vista general de la cartera, alertas y rendimiento comercial" />

      <div className="p-6 md:p-8 anim-fadeup">
        {/* KPI Strip */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <KpiCard label="Clientes Totales" value={stats?.total_clients ?? "—"} sub="Cartera completa" icon={Users} accent="text-zinc-500" />
          <KpiCard label="Activos" value={stats?.active_clients ?? "—"} sub={`${stats?.conversion_rate ?? 0}% conversión`} icon={BadgeCheck} accent="text-emerald-500" />
          <KpiCard label="Renovaciones 30d" value={stats?.upcoming_renewals_30d ?? "—"} sub="Próximas a vencer" icon={AlertTriangle} accent="text-rose-500" />
          <KpiCard label="Nuevos Leads" value={stats?.nuevos_leads ?? "—"} sub="Por estudiar" icon={TrendingUp} accent="text-blue-500" />
          <KpiCard label="Ahorro Anual" value={formatEUR(stats?.total_ahorro || 0)} sub={`${stats?.con_ahorro ?? 0} clientes con ahorro`} icon={Activity} accent="text-[#F97316]" />
        </section>

        {/* Main Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Alerts */}
          <div className="bg-white border border-zinc-200 rounded-md lg:col-span-2 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-semibold text-zinc-950 tracking-tight">Alertas de Renovación</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Contratos a vencer en los próximos 60 días</p>
              </div>
              <Link to="/renovaciones" className="text-xs text-zinc-600 hover:text-zinc-950 inline-flex items-center gap-1 font-medium" data-testid="dashboard-view-all-renewals">
                Ver todas <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-zinc-100">
              {alerts.length === 0 && (
                <div className="px-5 py-10 text-center text-sm text-zinc-500 flex flex-col items-center gap-2">
                  <Zap className="w-6 h-6 text-zinc-300" />
                  Sin alertas pendientes
                </div>
              )}
              {alerts.slice(0, 6).map((a) => (
                <Link
                  to={`/clientes/${a.client_id}`}
                  key={a.contract_id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-50 transition-colors"
                  data-testid={`dashboard-alert-${a.contract_id}`}
                >
                  <span className={`w-1.5 h-8 rounded-full ${a.level === "urgent" ? "bg-rose-500" : "bg-amber-500"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-950 truncate">{a.client_name}</div>
                    <div className="text-xs text-zinc-500 flex items-center gap-2 mt-0.5">
                      <Building2 className="w-3 h-3" />
                      <span>{a.comercializadora}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono text-zinc-950 font-medium">{formatDate(a.fecha_renovacion)}</div>
                    <div className={`text-[10px] uppercase tracking-[0.08em] font-semibold mt-0.5 ${a.days_until <= 30 ? "text-rose-600" : "text-amber-600"}`}>
                      {a.days_until} días
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Pipeline distribution chart */}
          <div className="bg-white border border-zinc-200 rounded-md overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-200">
              <h3 className="font-display text-base font-semibold text-zinc-950 tracking-tight">Distribución Pipeline</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Clientes por estado</p>
            </div>
            <div className="p-3 h-72" style={{ minWidth: 0, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                  <CartesianGrid stroke="#f4f4f5" vertical={false} />
                  <XAxis dataKey="estado" tick={{ fontSize: 10, fill: "#71717a" }} angle={-30} textAnchor="end" height={60} interval={0} />
                  <YAxis tick={{ fontSize: 10, fill: "#71717a" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 11, border: "1px solid #e4e4e7", borderRadius: 6 }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Upcoming renewals list */}
          <div className="bg-white border border-zinc-200 rounded-md lg:col-span-3 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-semibold text-zinc-950 tracking-tight">Próximas Renovaciones</h3>
                <p className="text-xs text-zinc-500 mt-0.5">6 meses por delante</p>
              </div>
              <Clock className="w-4 h-4 text-zinc-400" />
            </div>
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr className="text-[10px] uppercase tracking-[0.08em] text-zinc-500 font-semibold">
                  <th className="text-left px-5 py-2.5">Cliente</th>
                  <th className="text-left px-3 py-2.5">Comercializadora</th>
                  <th className="text-left px-3 py-2.5">Tarifa</th>
                  <th className="text-right px-3 py-2.5">Importe Anual</th>
                  <th className="text-right px-5 py-2.5">Renovación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {upcoming.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-10 text-zinc-500 text-sm">Sin renovaciones próximas</td></tr>
                )}
                {upcoming.map((r) => (
                  <tr key={r.contract_id} className="hover:bg-zinc-50 transition-colors" data-testid={`dashboard-renewal-row-${r.contract_id}`}>
                    <td className="px-5 py-3">
                      <Link to={`/clientes/${r.client_id}`} className="font-medium text-zinc-950 hover:underline">{r.client_name}</Link>
                    </td>
                    <td className="px-3 py-3 text-zinc-700">{r.comercializadora}</td>
                    <td className="px-3 py-3 font-mono text-xs text-zinc-700">{r.tarifa}</td>
                    <td className="px-3 py-3 text-right font-mono text-zinc-950">{formatEUR(r.importe_anual)}</td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-mono text-xs text-zinc-950">{formatDate(r.fecha_renovacion)}</span>
                      <span className={`block text-[10px] uppercase tracking-[0.08em] font-semibold ${
                        r.days_until <= 30 ? "text-rose-600" : r.days_until <= 60 ? "text-amber-600" : "text-zinc-500"
                      }`}>
                        {r.days_until}d
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

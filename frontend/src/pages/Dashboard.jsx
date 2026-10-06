import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { formatEUR, formatDate, CLIENT_STATE_MAP, CLIENT_STATES, CONTRACT_STATES, STATE_MAP } from "../lib/constants";
import Topbar from "../components/layout/Topbar";
import { supabase } from "../lib/supabase";
import {
  Users, Activity, TrendingUp, AlertTriangle, BadgeCheck,
  Building2, ArrowUpRight, Zap, Clock, Filter, Coins
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend, AreaChart, Area } from "recharts";

const STATE_BAR_COLORS = {
  nuevo_lead: "#3b82f6",          // Blue
  pendiente_estudio: "#f59e0b",   // Amber
  sin_ahorro: "#71717a",          // Zinc
  incompleto: "#a855f7",          // Purple
  enviado_firma: "#6366f1",       // Indigo
  incidencia: "#ec4899",          // Pink
  pendiente_activacion: "#8b5cf6", // Violet
  cliente_activo: "#10b981",      // Emerald green (activo)
  renovacion: "#f97316",          // Orange (renovación)
  no_renovado: "#f43f5e",         // Rose
  baja: "#ef4444",                // Red (baja)
};

const TARIFF_PIE_COLORS = [
  "#6366f1", // Indigo
  "#f97316", // Orange
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#f59e0b", // Amber
  "#14b8a6", // Teal
  "#ef4444", // Red
  "#71717a", // Zinc
];
function KpiCard({ label, value, sub, icon: Icon, accent, highlight, active, onClick, sparkData, dataKey, lineColor }) {
  const activeClass = active 
    ? "ring-2 ring-[#ff5722] scale-[1.02] shadow-[0_8px_30px_rgba(255,87,34,0.15)] border-[#ff5722]"
    : "border-zinc-200/60";
  
  if (highlight) {
    const highlightActive = active
      ? "ring-2 ring-offset-2 ring-[#ff5722] scale-[1.02] shadow-[0_8px_30px_rgba(255,87,34,0.35)]"
      : "";
    return (
      <button 
        onClick={onClick}
        className={`w-full text-left bg-gradient-to-br from-[#ff5722] to-[#e64a19] border border-[#ff5722] rounded-[1.5rem] p-5 pb-3 flex flex-col gap-2.5 shadow-md card-hover text-white transition-all duration-300 hover:shadow-[0_8px_30px_rgba(255,87,34,0.3)] cursor-pointer focus:outline-none ${highlightActive}`} 
        data-testid={`kpi-${label.toLowerCase().replace(/\s/g, "-")}`}
      >
        <div className="flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-[0.12em] font-bold text-white/80">{label}</div>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="font-display text-3xl font-bold text-white tracking-tight">{value}</div>
        {sub && <div className="text-xs text-white/80 font-medium">{sub}</div>}
        
        {sparkData && sparkData.length > 0 && (
          <div className="h-8 mt-1 w-full opacity-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                <defs>
                  <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey={dataKey} 
                  stroke="#ffffff" 
                  strokeWidth={1.5} 
                  fillOpacity={1} 
                  fill={`url(#grad-${label})`} 
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </button>
    );
  }
  return (
    <button 
      onClick={onClick}
      className={`w-full text-left bg-white border rounded-[1.5rem] p-5 pb-3 flex flex-col gap-2.5 card-hover shadow-sm transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] cursor-pointer focus:outline-none ${activeClass}`} 
      data-testid={`kpi-${label.toLowerCase().replace(/\s/g, "-")}`}
    >
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.12em] font-bold text-zinc-400">{label}</div>
        <Icon className={`w-4 h-4 ${accent || "text-zinc-400"}`} />
      </div>
      <div className="font-display text-3xl font-bold text-zinc-950 tracking-tight">{value}</div>
      {sub && <div className="text-xs text-zinc-500 font-medium">{sub}</div>}
      
      {sparkData && sparkData.length > 0 && (
        <div className="h-8 mt-1 w-full opacity-70">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
              <defs>
                <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={lineColor || "#6366f1"} stopOpacity={0.25}/>
                  <stop offset="95%" stopColor={lineColor || "#6366f1"} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey={dataKey} 
                stroke={lineColor || "#6366f1"} 
                strokeWidth={1.5} 
                fillOpacity={1} 
                fill={`url(#grad-${label})`} 
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </button>
  );
}


function getEnergyType(tarifa) {
  if (!tarifa) return { label: "Luz", color: "bg-amber-50 text-amber-700 border-amber-200" };
  const t = tarifa.toUpperCase().trim();
  if (t.startsWith("RL") || t.startsWith("TU") || t.includes("GAS") || t.startsWith("3.1G") || t.startsWith("3.2G")) {
    return { label: "Gas", color: "bg-blue-50 text-blue-700 border-blue-200" };
  }
  return { label: "Luz", color: "bg-amber-50 text-amber-700 border-amber-200" };
}

function formatKWh(val) {
  if (!val || isNaN(val)) return "0 kWh";
  if (val >= 1000000) {
    return `${(val / 1000000).toFixed(1)} GWh`;
  }
  if (val >= 1000) {
    return `${(val / 1000).toFixed(0)} MWh`;
  }
  return `${val.toLocaleString("es-ES")} kWh`;
}

const LUZ_TARIFFS = ["2.0TD", "3.0TD", "6.1TD"];
const GAS_TARIFFS = ["RL1", "RL2", "RL3", "RL4"];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [clients, setClients] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [comerciales, setComerciales] = useState([]);
  const [serviceFilter, setServiceFilter] = useState("all");
  const [tariffFilter, setTariffFilter] = useState("all");
  const [comercialFilter, setComercialFilter] = useState("all");
  const [activeKpiFilter, setActiveKpiFilter] = useState("all");
  const [rightCardTab, setRightCardTab] = useState("captaciones");
  const [mainChartTab, setMainChartTab] = useState("pipeline");

  const loadDashboardData = () => {
    api.get("/dashboard/stats").then((r) => setStats(r.data)).catch(() => {});
    api.get("/dashboard/alerts").then((r) => setAlerts(r.data.alerts)).catch(() => {});
    api.get("/clients").then((r) => setClients(r.data)).catch(() => {});
    api.get("/contracts").then((r) => setContracts(r.data)).catch(() => {});
    api.get("/users").then((r) => setComerciales(r.data)).catch(() => {});
  };

  useEffect(() => {
    loadDashboardData();

    // Subscribe to realtime database changes on public.clientes and public.contratos tables
    const channel = supabase
      .channel("dashboard-realtime-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "clientes" }, () => {
        loadDashboardData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "contratos" }, () => {
        loadDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleServiceChange = (val) => {
    setServiceFilter(val);
    setTariffFilter("all");
  };

  // Build client map by ID for fast join
  const clientsMap = useMemo(() => {
    const map = {};
    if (clients) {
      clients.forEach(c => {
        map[c.id] = c;
      });
    }
    return map;
  }, [clients]);

  // Filter clients based on selected service, tariff and commercial
  const filteredClients = useMemo(() => {
    if (!clients) return [];
    return clients.filter((c) => {
      // 1. Filter by service type
      if (serviceFilter !== "all") {
        const clientService = c.tipo_servicio || getEnergyType(c.tarifa).label.toLowerCase();
        if (clientService !== serviceFilter) return false;
      }
      // 2. Filter by tariff
      if (tariffFilter !== "all") {
        if (!c.tarifa) return false;
        if (c.tarifa.trim() !== tariffFilter.trim()) return false;
      }
      // 3. Filter by commercial agent
      if (comercialFilter !== "all") {
        if (c.comercial_id !== comercialFilter) return false;
      }
      return true;
    });
  }, [clients, serviceFilter, tariffFilter, comercialFilter]);

  // Filter contracts based on selected service, tariff and commercial
  const filteredContracts = useMemo(() => {
    if (!contracts) return [];
    return contracts.filter((c) => {
      const client = clientsMap[c.cliente_id];
      // 1. Filter by commercial agent
      if (comercialFilter !== "all") {
        if (!client || client.comercial_id !== comercialFilter) return false;
      }
      // 2. Filter by service type
      if (serviceFilter !== "all") {
        const contractService = c.tipo_servicio || getEnergyType(c.tarifa).label.toLowerCase();
        if (contractService !== serviceFilter) return false;
      }
      // 3. Filter by tariff
      if (tariffFilter !== "all") {
        if (!c.tarifa) return false;
        if (c.tarifa.trim() !== tariffFilter.trim()) return false;
      }
      return true;
    });
  }, [contracts, clientsMap, serviceFilter, tariffFilter, comercialFilter]);

  // Dynamically compute local metrics based on filter
  const localStats = useMemo(() => {
    const total = filteredClients.length;
    const active = filteredClients.filter(c => c.estado === "cliente_activo").length;
    const novos = filteredClients.filter(c => c.estado === "nuevo_lead").length;
    const totalComision = filteredClients.reduce((sum, c) => sum + (Number(c.comision) || 0), 0);
    const rate = total > 0 ? Math.round((active / total) * 100) : 0;
    
    // Sum energy consumption (consumo_anual) on filteredContracts
    const totalEnergy = filteredContracts.reduce((sum, c) => sum + (Number(c.consumo_anual) || 0), 0);
    
    // Calculate local renewals expiring in 30 days
    const renewals30d = filteredContracts.filter(c => {
      if (!c.fecha_renovacion) return false;
      const t = new Date(c.fecha_renovacion).getTime();
      const diff = Math.floor((t - Date.now()) / 86400000);
      return diff >= 0 && diff <= 30;
    }).length;

    return {
      total,
      active,
      novos,
      totalComision,
      rate,
      renewals30d,
      totalEnergy
    };
  }, [filteredClients, filteredContracts]);

  // Apply active KPI card filter to clients
  const displayClients = useMemo(() => {
    let list = filteredClients;
    if (activeKpiFilter === "active") {
      list = list.filter(c => c.estado === "cliente_activo");
    } else if (activeKpiFilter === "leads") {
      list = list.filter(c => c.estado === "nuevo_lead");
    } else if (activeKpiFilter === "commissions") {
      list = list.filter(c => (Number(c.comision) || 0) > 0);
    } else if (activeKpiFilter === "energy") {
      const clientIdsWithEnergy = new Set(
        filteredContracts
          .filter(c => (Number(c.consumo_anual) || 0) > 0)
          .map(c => c.cliente_id)
      );
      list = list.filter(c => clientIdsWithEnergy.has(c.id));
    } else if (activeKpiFilter === "renewals") {
      const clientIdsWithRenewals = new Set(
        filteredContracts
          .filter(c => {
            if (!c.fecha_renovacion) return false;
            const t = new Date(c.fecha_renovacion).getTime();
            const diff = Math.floor((t - Date.now()) / 86400000);
            return diff >= 0 && diff <= 30;
          })
          .map(c => c.cliente_id)
      );
      list = list.filter(c => clientIdsWithRenewals.has(c.id));
    }
    return list;
  }, [filteredClients, filteredContracts, activeKpiFilter]);

  // Apply active KPI card filter to contracts
  const displayContracts = useMemo(() => {
    let list = filteredContracts;
    if (activeKpiFilter === "active") {
      list = list.filter(c => c.estado === "cliente_activo");
    } else if (activeKpiFilter === "leads") {
      list = list.filter(c => c.estado === "nuevo_lead");
    } else if (activeKpiFilter === "renewals") {
      list = list.filter(c => {
        if (!c.fecha_renovacion) return false;
        const t = new Date(c.fecha_renovacion).getTime();
        const diff = Math.floor((t - Date.now()) / 86400000);
        return diff >= 0 && diff <= 30;
      });
    } else if (activeKpiFilter === "commissions") {
      list = list.filter(c => (Number(c.importe_anual) || 0) > 0);
    } else if (activeKpiFilter === "energy") {
      list = list.filter(c => (Number(c.consumo_anual) || 0) > 0);
    }
    return list;
  }, [filteredContracts, activeKpiFilter]);

  // 6-month historical sparkline data based on client and contract creation dates
  const sparklineData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString("es-ES", { month: "short" }),
        clients: 0,
        active: 0,
        renewals: 0,
        leads: 0,
        commissions: 0,
        energy: 0
      });
    }

    filteredClients.forEach(c => {
      if (!c.created_at) return;
      const cDate = c.created_at.substring(0, 7); // "YYYY-MM"
      const monthBucket = months.find(m => m.key === cDate);
      if (monthBucket) {
        monthBucket.clients++;
        if (c.estado === "cliente_activo") {
          monthBucket.active++;
        } else if (c.estado === "nuevo_lead") {
          monthBucket.leads++;
        }
        monthBucket.commissions += Number(c.comision) || 0;
      }
    });

    filteredContracts.forEach(c => {
      if (!c.created_at) return;
      const cDate = c.created_at.substring(0, 7);
      const monthBucket = months.find(m => m.key === cDate);
      if (monthBucket) {
        monthBucket.energy += Number(c.consumo_anual) || 0;
        if (c.fecha_renovacion) {
          const diff = (new Date(c.fecha_renovacion) - new Date(c.created_at)) / (1000 * 60 * 60 * 24);
          if (diff >= 0 && diff <= 30) {
            monthBucket.renewals++;
          }
        }
      }
    });

    // Accumulate for running totals
    let runClients = 0;
    let runActive = 0;
    let runLeads = 0;
    let runCommissions = 0;
    let runRenewals = 0;
    let runEnergy = 0;

    return months.map(m => {
      runClients += m.clients;
      runActive += m.active;
      runLeads += m.leads;
      runCommissions += m.commissions;
      runRenewals += m.renewals;
      runEnergy += m.energy;
      return {
        label: m.label,
        clients: runClients || 2,
        active: runActive || 1,
        renewals: runRenewals || 1,
        leads: runLeads || 1,
        commissions: runCommissions || 250,
        energy: runEnergy || 5000
      };
    });
  }, [filteredClients, filteredContracts]);

  // Market share of contracts by utility company (Donut chart data)
  const comercializadoraStats = useMemo(() => {
    const counts = {};
    filteredContracts.forEach(c => {
      const name = c.comercializadora || "Desconocida";
      counts[name] = (counts[name] || 0) + 1;
    });
    const total = filteredContracts.length;
    return Object.entries(counts)
      .map(([name, count], idx) => ({
        name,
        value: count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(1) : 0,
        color: TARIFF_PIE_COLORS[idx % TARIFF_PIE_COLORS.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filteredContracts]);

  // Local pipeline distribution chart data (contracts based)
  const chartData = useMemo(() => {
    const counts = {};
    CONTRACT_STATES.forEach((s) => {
      counts[s.value] = 0;
    });
    displayContracts.forEach((c) => {
      const stateVal = c.estado || "nuevo_lead";
      counts[stateVal] = (counts[stateVal] || 0) + 1;
    });
    return Object.entries(counts)
      .filter(([stateKey]) => stateKey !== "eliminado")
      .map(([stateKey, count]) => ({
        estado: STATE_MAP[stateKey]?.label || stateKey,
        count,
        color: STATE_BAR_COLORS[stateKey] || "#a1a1aa",
      }));
  }, [displayContracts]);

  // Revenues chart data (commissions per client)
  const revenueChartData = useMemo(() => {
    return displayClients
      .filter(c => (Number(c.comision) || 0) > 0)
      .map(c => ({
        name: c.nombre.length > 15 ? c.nombre.slice(0, 12) + "..." : c.nombre,
        Ingresos: Number(c.comision) || 0,
      }))
      .sort((a, b) => b.Ingresos - a.Ingresos)
      .slice(0, 10);
  }, [displayClients]);

  // Dynamic upcoming renewals list (reactive to all filters)
  const upcomingList = useMemo(() => {
    let list = filteredContracts.map(c => {
      const client = clientsMap[c.cliente_id];
      const days = Math.ceil((new Date(c.fecha_renovacion) - new Date()) / (1000 * 60 * 60 * 24));
      return {
        contract_id: c.id,
        client_id: c.cliente_id,
        client_name: client?.nombre || c.cliente_nombre || "Cliente",
        client_phone: client?.telefono || "",
        client_email: client?.email || "",
        client_address: client?.direccion || "",
        comercializadora: c.comercializadora,
        tarifa: c.tarifa,
        importe_anual: c.importe_anual,
        fecha_renovacion: c.fecha_renovacion,
        days_until: days,
        client_estado: client?.estado
      };
    }).filter(a => a.days_until >= -30 && a.days_until <= 180);

    // Apply KPI filter
    if (activeKpiFilter === "active") {
      list = list.filter(r => r.client_estado === "cliente_activo");
    } else if (activeKpiFilter === "renewals") {
      list = list.filter(r => r.days_until >= -30 && r.days_until <= 30);
    } else if (activeKpiFilter === "leads") {
      list = list.filter(r => r.client_estado === "nuevo_lead");
    } else if (activeKpiFilter === "commissions") {
      list = list.filter(r => (Number(r.importe_anual) || 0) > 0);
    } else if (activeKpiFilter === "energy") {
      list = list.filter(r => (Number(r.importe_anual) || 0) > 0);
    }

    return list.sort((a, b) => a.days_until - b.days_until).slice(0, 8);
  }, [filteredContracts, clientsMap, activeKpiFilter]);

  // Future captures contract list (reactive to all filters)
  const futureCapturesList = useMemo(() => {
    let list = filteredContracts
      .filter((c) => (c.estado === "sin_ahorro" && c.fecha_fin_contrato) || c.fecha_alerta_personalizada)
      .map((c) => {
        const client = clientsMap[c.cliente_id];
        const targetDate = c.fecha_alerta_personalizada || c.fecha_fin_contrato;
        const days = Math.ceil((new Date(targetDate) - new Date()) / (1000 * 60 * 60 * 24));
        return {
          id: c.cliente_id,
          contract_id: c.id,
          nombre: client?.nombre || c.cliente_nombre || "Contrato",
          cups: c.cups || client?.cups || "Sin CUPS",
          target_date: targetDate,
          is_custom_alert: !!c.fecha_alerta_personalizada,
          days_until: days,
          motivo_alerta_personalizada: c.motivo_alerta_personalizada,
          client_estado: client?.estado
        };
      });

    // Apply KPI filter
    if (activeKpiFilter === "active") {
      list = list.filter(c => c.client_estado === "cliente_activo");
    } else if (activeKpiFilter === "renewals") {
      list = list.filter(c => c.days_until >= -30 && c.days_until <= 30);
    } else if (activeKpiFilter === "leads") {
      list = list.filter(c => c.client_estado === "nuevo_lead");
    } else if (activeKpiFilter === "commissions") {
      list = list.filter(c => {
        const client = clientsMap[c.id];
        return (Number(client?.comision) || 0) > 0;
      });
    } else if (activeKpiFilter === "energy") {
      list = list.filter(c => {
        const client = clientsMap[c.id];
        return (Number(client?.comision) || 0) > 0;
      });
    }

    return list.sort((a, b) => a.days_until - b.days_until).slice(0, 10);
  }, [filteredContracts, clientsMap, activeKpiFilter]);

  // Commercial performance data
  const comercialStats = useMemo(() => {
    const statsMap = {};
    
    if (comerciales) {
      comerciales.forEach(u => {
        statsMap[u.id] = {
          name: u.name,
          role: u.role,
          clientsCount: 0,
          activeClientsCount: 0,
          totalCommission: 0
        };
      });
    }

    filteredClients.forEach(c => {
      const cid = c.comercial_id;
      if (!cid) return;
      if (!statsMap[cid]) {
        statsMap[cid] = {
          name: c.comercial_name || "Desconocido",
          role: "comercial",
          clientsCount: 0,
          activeClientsCount: 0,
          totalCommission: 0
        };
      }
      statsMap[cid].clientsCount++;
      if (c.estado === "cliente_activo") {
        statsMap[cid].activeClientsCount++;
      }
      statsMap[cid].totalCommission += Number(c.comision) || 0;
    });

    return Object.entries(statsMap)
      .map(([id, data]) => ({
        id,
        ...data
      }))
      .filter(c => c.clientsCount > 0)
      .sort((a, b) => b.totalCommission - a.totalCommission);
  }, [filteredClients, comerciales]);

  const luzTariffStats = useMemo(() => {
    const counts = {
      "2.0TD": 0,
      "3.0TD": 0,
      "6.1TD": 0
    };
    displayClients.forEach(c => {
      const t = c.tarifa ? c.tarifa.trim() : "";
      if (counts[t] !== undefined) {
        counts[t]++;
      }
    });
    const total = displayClients.length;
    return LUZ_TARIFFS.map(t => {
      const count = counts[t] || 0;
      return {
        name: t,
        count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(1) : 0
      };
    });
  }, [displayClients]);

  const gasTariffStats = useMemo(() => {
    const counts = {
      "RL1": 0,
      "RL2": 0,
      "RL3": 0,
      "RL4": 0
    };
    displayClients.forEach(c => {
      const t = c.tarifa ? c.tarifa.trim() : "";
      if (counts[t] !== undefined) {
        counts[t]++;
      }
    });
    const total = displayClients.length;
    return GAS_TARIFFS.map(t => {
      const count = counts[t] || 0;
      return {
        name: t,
        count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(1) : 0
      };
    });
  }, [displayClients]);

  return (
    <>
      <Topbar title="Dashboard Ejecutivo" subtitle="Vista general de la cartera, alertas y rendimiento comercial" />

      <div className="p-6 md:p-8 anim-fadeup">
        {/* KPI Strip */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <KpiCard 
            label="Clientes" 
            value={localStats.total} 
            sub="En la vista actual" 
            icon={Users} 
            accent="text-indigo-500" 
            active={activeKpiFilter === "all"}
            onClick={() => setActiveKpiFilter("all")}
            sparkData={sparklineData}
            dataKey="clients"
            lineColor="#6366f1"
          />
          <KpiCard 
            label="Activos" 
            value={localStats.active} 
            sub={`${localStats.rate}% conversión`} 
            icon={BadgeCheck} 
            accent="text-emerald-500" 
            active={activeKpiFilter === "active"}
            onClick={() => setActiveKpiFilter(activeKpiFilter === "active" ? "all" : "active")}
            sparkData={sparklineData}
            dataKey="active"
            lineColor="#10b981"
          />
          <KpiCard 
            label="Renovaciones 30d" 
            value={localStats.renewals30d} 
            sub="Próximas a vencer" 
            icon={AlertTriangle} 
            accent="text-rose-500" 
            active={activeKpiFilter === "renewals"}
            onClick={() => setActiveKpiFilter(activeKpiFilter === "renewals" ? "all" : "renewals")}
            sparkData={sparklineData}
            dataKey="renewals"
            lineColor="#f43f5e"
          />
          <KpiCard 
            label="Nuevos Leads" 
            value={localStats.novos} 
            sub="Por estudiar" 
            icon={TrendingUp} 
            accent="text-amber-500" 
            active={activeKpiFilter === "leads"}
            onClick={() => setActiveKpiFilter(activeKpiFilter === "leads" ? "all" : "leads")}
            sparkData={sparklineData}
            dataKey="leads"
            lineColor="#f59e0b"
          />
          <KpiCard 
            label="Energía Gestionada" 
            value={formatKWh(localStats.totalEnergy)} 
            sub="Consumo anual total" 
            icon={Zap} 
            accent="text-amber-500 animate-pulse" 
            active={activeKpiFilter === "energy"}
            onClick={() => setActiveKpiFilter(activeKpiFilter === "energy" ? "all" : "energy")}
            sparkData={sparklineData}
            dataKey="energy"
            lineColor="#eab308"
          />
          <KpiCard 
            label="Comisiones" 
            value={formatEUR(localStats.totalComision)} 
            sub="Total facturado" 
            icon={Coins} 
            accent="text-white" 
            highlight={true} 
            active={activeKpiFilter === "commissions"}
            onClick={() => setActiveKpiFilter(activeKpiFilter === "commissions" ? "all" : "commissions")}
            sparkData={sparklineData}
            dataKey="commissions"
          />
        </section>

        {/* Filter Bar */}
        <div className="bg-white/80 backdrop-blur-md border border-zinc-200/60 rounded-2xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-[#ff5722]" />
            <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Filtro de Cartera</span>
            
            {(serviceFilter !== "all" || tariffFilter !== "all" || comercialFilter !== "all" || activeKpiFilter !== "all") && (
              <button
                onClick={() => {
                  setServiceFilter("all");
                  setTariffFilter("all");
                  setComercialFilter("all");
                  setActiveKpiFilter("all");
                }}
                className="text-[10px] font-bold text-[#ff5722] hover:text-[#d03d0e] transition-colors flex items-center gap-1 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full cursor-pointer focus:outline-none"
              >
                Limpiar Filtros
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            {/* Selector de Comercial */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-500">Comercial:</span>
              <select
                value={comercialFilter}
                onChange={(e) => setComercialFilter(e.target.value)}
                className="h-8.5 rounded-xl border border-zinc-200 px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#ff5722] font-semibold"
              >
                <option value="all">👥 Todos los comerciales</option>
                {comerciales.map(u => (
                  <option key={u.id} value={u.id}>
                    👤 {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de Servicio */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-500">Servicio:</span>
              <select
                value={serviceFilter}
                onChange={(e) => handleServiceChange(e.target.value)}
                className="h-8.5 rounded-xl border border-zinc-200 px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#ff5722] font-semibold"
              >
                <option value="all">Todos los servicios</option>
                <option value="luz">💡 Suministro de Luz</option>
                <option value="gas">🔥 Suministro de Gas</option>
              </select>
            </div>

            {/* Selector de Tarifa */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-500">Tarifa:</span>
              <select
                value={tariffFilter}
                disabled={serviceFilter === "all"}
                onChange={(e) => setTariffFilter(e.target.value)}
                className="h-8.5 rounded-xl border border-zinc-200 px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#ff5722] font-semibold disabled:bg-zinc-50 disabled:text-zinc-400 disabled:cursor-not-allowed"
              >
                {serviceFilter === "all" && (
                  <option value="all">Selecciona un servicio</option>
                )}
                {serviceFilter === "luz" && (
                  <>
                    <option value="all">Todas las tarifas de Luz</option>
                    <option value="2.0TD">2.0TD</option>
                    <option value="3.0TD">3.0TD</option>
                    <option value="6.1TD">6.1TD</option>
                  </>
                )}
                {serviceFilter === "gas" && (
                  <>
                    <option value="all">Todas las tarifas de Gas</option>
                    <option value="RL1">RL1</option>
                    <option value="RL2">RL2</option>
                    <option value="RL3">RL3</option>
                    <option value="RL4">RL4</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </div>
        {/* Charts & Market Share Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left: Pipeline & Revenue Analysis Tabbed Widget */}
          <div className="bg-gradient-to-b from-white to-zinc-50/40 border border-zinc-200/80 rounded-[1.5rem] p-5 flex flex-col gap-3 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-2">
              <div>
                <h3 className="font-display text-sm font-semibold text-zinc-950 tracking-tight flex items-center gap-1.5">
                  {mainChartTab === "pipeline" ? (
                    <><Activity className="w-4.5 h-4.5 text-[#ff5722]" /> Distribución Pipeline</>
                  ) : (
                    <><Coins className="w-4.5 h-4.5 text-emerald-500" /> Ingresos por Cliente (Top 10)</>
                  )}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {mainChartTab === "pipeline" ? "Distribución en tiempo real de contratos por estado" : "Comisiones totales acumuladas por cliente"}
                </p>
              </div>
              
              <div className="flex bg-zinc-100 p-0.5 rounded-lg border border-zinc-200/50 shrink-0">
                <button 
                  onClick={() => setMainChartTab("pipeline")} 
                  className={`text-[9px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer ${mainChartTab === "pipeline" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-800"}`}
                >
                  Pipeline
                </button>
                <button 
                  onClick={() => setMainChartTab("ingresos")} 
                  className={`text-[9px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer ${mainChartTab === "ingresos" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-800"}`}
                >
                  Ingresos
                </button>
              </div>
            </div>

            <div className="h-72 flex-1">
              {mainChartTab === "pipeline" ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 45 }}>
                    <CartesianGrid stroke="#e4e4e7" vertical={false} />
                    <XAxis dataKey="estado" tick={{ fontSize: 8, fill: "#71717a", fontWeight: 550 }} angle={-25} textAnchor="end" height={60} interval={0} />
                    <YAxis tick={{ fontSize: 9, fill: "#71717a", fontWeight: 550 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 11, border: "1px solid #e4e4e7", borderRadius: 6 }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                revenueChartData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-sm text-zinc-500 gap-2 bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200">
                    <Coins className="w-8 h-8 text-zinc-300" />
                    Sin comisiones registradas en la selección actual
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <defs>
                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ff5722" stopOpacity={1}/>
                          <stop offset="100%" stopColor="#ff7043" stopOpacity={0.75}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#f1f1f4" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#71717a", fontWeight: 550 }} interval={0} />
                      <YAxis tick={{ fontSize: 9, fill: "#71717a", fontWeight: 550 }} />
                      <Tooltip 
                        formatter={(val) => [`${formatEUR(val)}`, 'Ingreso']}
                        contentStyle={{ fontSize: 11, border: "1px solid #e4e4e7", borderRadius: 6 }} 
                      />
                      <Bar dataKey="Ingresos" fill="url(#revenueGradient)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )
              )}
            </div>
          </div>

          {/* Right: Comercializadora Share */}
          <div className="bg-gradient-to-b from-white to-zinc-50/40 border border-zinc-200/80 rounded-[1.5rem] p-5 flex flex-col gap-3 shadow-sm lg:col-span-1">
            <div>
              <h3 className="font-display text-sm font-semibold text-zinc-950 tracking-tight flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-500" /> Cuota de Comercializadoras
              </h3>
              <p className="text-xs text-zinc-500">Reparto porcentual de contratos activos por compañía</p>
            </div>
            
            <div className="flex-1 flex flex-col justify-center min-h-[220px]">
              {comercializadoraStats.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-xs text-zinc-400 gap-2">
                  <Building2 className="w-8 h-8 text-zinc-300" />
                  Sin contratos en esta selección
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div className="h-44 flex justify-center items-center relative">
                    {/* Centered Total */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">Total</span>
                      <span className="text-xl font-display font-bold text-zinc-950">{filteredContracts.length}</span>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={comercializadoraStats}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {comercializadoraStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(val) => [`${val} contratos`, 'Volumen']}
                          contentStyle={{ fontSize: 11, border: "1px solid #e4e4e7", borderRadius: 6 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
                    {comercializadoraStats.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-[11px] gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span 
                            className="w-2 h-2 rounded-full shrink-0" 
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-bold text-zinc-700 truncate" title={item.name}>
                            {item.name}
                          </span>
                        </div>
                        <span className="font-sans text-zinc-950 font-bold shrink-0">
                          {item.percentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Operations & Follow-up Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Renewals table */}
          <div className="bg-gradient-to-b from-white to-zinc-50/40 border border-zinc-200/80 rounded-[1.5rem] lg:col-span-2 overflow-hidden shadow-sm flex flex-col min-h-[400px]">
            <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-semibold text-zinc-950 tracking-tight flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-rose-500" /> Control y Alertas de Renovación
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">Vencimientos futuros y alertas de contratación en los próximos 180 días (Filtrado)</p>
              </div>
              <Link to="/renovaciones" className="text-xs text-zinc-650 hover:text-zinc-950 inline-flex items-center gap-1 font-medium border border-zinc-200 rounded px-2.5 py-1 bg-zinc-50 hover:bg-zinc-100 transition-colors">
                Ver todas <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            
            <div className="overflow-x-auto flex-1 max-h-[420px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 border-b border-zinc-200 sticky top-0 z-10">
                  <tr className="text-[10px] uppercase tracking-[0.08em] text-zinc-500 font-semibold">
                    <th className="text-left px-5 py-2.5">Cliente / Contacto</th>
                    <th className="text-left px-3 py-2.5">Comercializadora</th>
                    <th className="text-left px-3 py-2.5">Tarifa</th>
                    <th className="text-right px-3 py-2.5">Importe</th>
                    <th className="text-right px-5 py-2.5">Vencimiento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {upcomingList.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-zinc-550 text-sm">
                        <Zap className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                        Sin renovaciones ni alertas programadas en este filtro
                      </td>
                    </tr>
                  )}
                  {upcomingList.map((r) => {
                    const days = r.days_until;
                    let badgeClass = "bg-zinc-100 text-zinc-600 border-zinc-200";
                    if (days <= 30) {
                      badgeClass = "bg-rose-50 text-rose-700 border-rose-200 font-bold";
                    } else if (days <= 60) {
                      badgeClass = "bg-amber-50 text-amber-700 border-amber-200 font-bold";
                    } else {
                      badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                    }
                    
                    return (
                      <tr key={r.contract_id} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-5 py-3">
                          <Link to={`/clientes/${r.client_id}`} className="font-semibold text-zinc-950 hover:underline text-xs block">
                            {r.client_name}
                          </Link>
                          <span className="text-[10px] text-zinc-400 mt-0.5 block">{r.client_email || r.client_phone || "—"}</span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5 text-xs text-zinc-700 font-medium">
                            <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            {r.comercializadora}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold text-zinc-700 bg-zinc-50 border border-zinc-200">
                            {r.tarifa || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right text-xs font-semibold text-zinc-650">
                          {formatEUR(r.importe_anual)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="text-xs text-zinc-900 font-semibold">{formatDate(r.fecha_renovacion)}</div>
                          <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] uppercase tracking-[0.06em] mt-0.5 border ${badgeClass}`}>
                            {days < 0 ? `Vencido hace ${Math.abs(days)}d` : (days === 0 ? "Vence hoy" : `${days} días`)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Tabbed Card for Tariff Distribution / Future Captures */}
          <div className="bg-gradient-to-b from-white to-zinc-50/40 border border-zinc-200/80 rounded-[1.5rem] overflow-hidden shadow-sm flex flex-col min-h-[400px]">
            <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-zinc-950 tracking-tight flex items-center gap-1.5">
                {rightCardTab === "tarifas" ? (
                  <><Zap className="w-4 h-4 text-orange-500 animate-pulse" /> Distribución por Tarifa</>
                ) : (
                  <><TrendingUp className="w-4 h-4 text-amber-500" /> Futuras Captaciones</>
                )}
              </h3>
              <div className="flex bg-zinc-100 p-0.5 rounded-lg border border-zinc-200/50 shrink-0">
                <button 
                  onClick={() => setRightCardTab("captaciones")} 
                  className={`text-[9px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer ${rightCardTab === "captaciones" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-800"}`}
                >
                  Captaciones
                </button>
                <button 
                  onClick={() => setRightCardTab("tarifas")} 
                  className={`text-[9px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer ${rightCardTab === "tarifas" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-800"}`}
                >
                  Tarifas
                </button>
              </div>
            </div>

            {rightCardTab === "tarifas" ? (
              <div className="p-5 flex-1 flex flex-col justify-center gap-4 min-h-[300px]">
                {/* Luz Tariffs */}
                <div className="border border-zinc-100 rounded-xl p-3 bg-zinc-50/30 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 border-b border-zinc-100 pb-1.5 mb-0.5">
                    <span className="text-sm">💡</span>
                    <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Tarifas Luz</span>
                  </div>
                  <div className="space-y-2.5">
                    {luzTariffStats.map((stat) => (
                      <div key={stat.name} className="flex flex-col gap-0.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-zinc-700">{stat.name}</span>
                          <span className="text-zinc-500 font-medium">
                            <strong className="text-zinc-900">{stat.count}</strong> ({stat.percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-zinc-100 rounded-full h-1.5">
                          <div 
                            className="bg-gradient-to-r from-amber-400 to-orange-500 h-1.5 rounded-full transition-all duration-500" 
                            style={{ width: `${stat.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gas Tariffs */}
                <div className="border border-zinc-100 rounded-xl p-3 bg-zinc-50/30 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 border-b border-zinc-100 pb-1.5 mb-0.5">
                    <span className="text-sm">🔥</span>
                    <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Tarifas Gas</span>
                  </div>
                  <div className="space-y-2.5">
                    {gasTariffStats.map((stat) => (
                      <div key={stat.name} className="flex flex-col gap-0.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-zinc-700">{stat.name}</span>
                          <span className="text-zinc-500 font-medium">
                            <strong className="text-zinc-900">{stat.count}</strong> ({stat.percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-zinc-100 rounded-full h-1.5">
                          <div 
                            className="bg-gradient-to-r from-blue-400 to-indigo-600 h-1.5 rounded-full transition-all duration-500" 
                            style={{ width: `${stat.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 flex-1 overflow-y-auto max-h-[340px] space-y-2.5">
                {futureCapturesList.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-sm text-zinc-550 gap-2 py-16 bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200">
                    <Zap className="w-8 h-8 text-zinc-300" />
                    Sin futuras captaciones en este filtro
                  </div>
                ) : (
                  futureCapturesList.map((c) => {
                    const days = c.days_until;
                    let badgeClass = "bg-zinc-100 text-zinc-650 border-zinc-200";
                    if (days <= 30) {
                      badgeClass = "bg-rose-50 text-rose-700 border-rose-200 font-bold";
                    } else if (days <= 60) {
                      badgeClass = "bg-amber-50 text-amber-700 border-amber-200 font-bold";
                    } else {
                      badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                    }

                    return (
                      <div 
                        key={c.contract_id || c.id} 
                        className="p-3 rounded-xl border border-zinc-200 bg-white hover:border-[#ff5722] hover:shadow-[0_4px_12px_rgba(255,87,34,0.06)] transition-all flex items-center justify-between gap-3 card"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Link 
                              to={`/clientes/${c.id}`} 
                              className="font-bold text-xs text-zinc-900 hover:text-[#ff5722] hover:underline truncate"
                            >
                              {c.nombre}
                            </Link>
                            {c.is_custom_alert && (
                              <span className="shrink-0 text-[8px] font-bold bg-rose-50 text-rose-600 border border-rose-200 px-1 py-0.2 rounded">
                                Seguimiento
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-zinc-400 block mt-0.5 truncate">
                            CUPS: {c.cups || "Sin CUPS"}
                          </span>
                          {c.is_custom_alert && c.motivo_alerta_personalizada && (
                            <span className="text-[9px] text-rose-500 font-medium block mt-0.5 truncate" title={c.motivo_alerta_personalizada}>
                              📌 {c.motivo_alerta_personalizada}
                            </span>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[10px] font-bold text-zinc-900">
                            {c.is_custom_alert ? "Aviso: " : "Fin: "} {formatDate(c.target_date)}
                          </div>
                          <span className={`inline-block px-1.5 py-0.2 rounded text-[8px] uppercase tracking-[0.06em] mt-1 border ${badgeClass}`}>
                            {c.is_custom_alert ? (
                              days < 0 ? `Hace ${Math.abs(days)}d` : (days === 0 ? "Aviso HOY" : `En ${days}d`)
                            ) : (
                              days < 0 ? `Vencido hace ${Math.abs(days)}d` : (days === 0 ? "Vence hoy" : `${days} días`)
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

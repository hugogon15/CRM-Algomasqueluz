import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { formatEUR, formatDate } from "../lib/constants";
import Topbar from "../components/layout/Topbar";
import { Calendar } from "../components/ui/calendar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";

export default function Renovations() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(new Date());
  useEffect(() => { api.get("/renovations/upcoming?days=365").then((r) => setItems(r.data)); }, []);

  const bucket = (d) => {
    if (d < 0) return "vencido";
    if (d <= 30) return "urgent";
    if (d <= 90) return "soon";
    return "future";
  };

  const dayHasItem = (date) => items.some((i) => i.fecha_renovacion === date.toISOString().slice(0, 10));

  return (
    <>
      <Topbar title="Renovaciones" subtitle={`${items.length} próximas renovaciones en 12 meses`} />
      <div className="p-6 md:p-8 anim-fadeup">
        <Tabs defaultValue="lista">
          <TabsList className="bg-zinc-100 p-1 h-9 mb-4">
            <TabsTrigger value="lista" data-testid="tab-renovations-list" className="text-xs px-3 data-[state=active]:bg-white">Lista priorizada</TabsTrigger>
            <TabsTrigger value="calendar" data-testid="tab-renovations-calendar" className="text-xs px-3 data-[state=active]:bg-white">Calendario</TabsTrigger>
          </TabsList>

          <TabsContent value="lista">
            <div className="space-y-2">
              {items.map((r) => {
                const b = bucket(r.days_until);
                const color = b === "urgent" ? "bg-rose-500" : b === "soon" ? "bg-amber-500" : b === "vencido" ? "bg-zinc-900" : "bg-emerald-500";
                return (
                  <Link to={`/clientes/${r.client_id}`} key={r.contract_id} className="block bg-white border border-zinc-200 rounded-md p-4 hover:border-zinc-300 hover:-translate-y-[1px] transition-all" data-testid={`renovation-card-${r.contract_id}`}>
                    <div className="flex items-center gap-4">
                      <span className={`w-1 h-10 rounded-full ${color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-zinc-950">{r.client_name}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">{r.comercializadora} · <span className="font-mono">{r.tarifa}</span></div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-xs text-zinc-950">{formatDate(r.fecha_renovacion)}</div>
                        <div className={`text-[10px] uppercase tracking-[0.08em] font-semibold ${b === "urgent" ? "text-rose-600" : b === "soon" ? "text-amber-600" : "text-zinc-500"}`}>{r.days_until} días</div>
                      </div>
                      <div className="text-right hidden md:block">
                        <div className="text-[10px] uppercase tracking-[0.08em] text-zinc-400 font-semibold">Importe anual</div>
                        <div className="font-mono text-zinc-950">{formatEUR(r.importe_anual)}</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
              {items.length === 0 && <div className="text-center py-12 text-zinc-500 text-sm">Sin renovaciones próximas</div>}
            </div>
          </TabsContent>

          <TabsContent value="calendar">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 bg-white border border-zinc-200 rounded-md p-4">
                <Calendar
                  mode="single"
                  selected={selected}
                  onSelect={(d) => d && setSelected(d)}
                  modifiers={{ haveRenewal: (d) => dayHasItem(d) }}
                  modifiersClassNames={{ haveRenewal: "bg-[#F97316]/10 text-[#F97316] font-semibold" }}
                />
              </div>
              <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-md p-5">
                <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-400 font-semibold">Renovaciones del</div>
                <div className="font-display text-xl font-bold text-zinc-950 mt-1">{formatDate(selected)}</div>
                <div className="mt-4 space-y-2">
                  {items.filter((i) => i.fecha_renovacion === selected.toISOString().slice(0, 10)).map((r) => (
                    <Link to={`/clientes/${r.client_id}`} key={r.contract_id} className="block border border-zinc-200 rounded-md p-3 hover:bg-zinc-50">
                      <div className="font-medium text-sm text-zinc-950">{r.client_name}</div>
                      <div className="text-xs text-zinc-500">{r.comercializadora} · {formatEUR(r.importe_anual)}</div>
                    </Link>
                  ))}
                  {items.filter((i) => i.fecha_renovacion === selected.toISOString().slice(0, 10)).length === 0 && (
                    <div className="text-xs text-zinc-500">Sin renovaciones este día.</div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

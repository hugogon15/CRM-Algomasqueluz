import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { formatEUR, formatDate } from "../lib/constants";
import Topbar from "../components/layout/Topbar";
import { Calendar } from "../components/ui/calendar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { MapPin, Phone, Mail } from "lucide-react";

function getEnergyType(tarifa) {
  if (!tarifa) return { label: "Luz", color: "bg-amber-50 text-amber-700 border-amber-200" };
  const t = tarifa.toUpperCase().trim();
  if (t.startsWith("RL") || t.startsWith("TU") || t.includes("GAS") || t.startsWith("3.1G") || t.startsWith("3.2G")) {
    return { label: "Gas", color: "bg-blue-50 text-blue-700 border-blue-200" };
  }
  return { label: "Luz", color: "bg-amber-50 text-amber-700 border-amber-200" };
}

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
                  <div key={r.contract_id} className="bg-white border border-zinc-200 rounded-md p-4 hover:border-zinc-300 hover:shadow-sm transition-all" data-testid={`renovation-card-${r.contract_id}`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <span className={`w-1 h-12 rounded-full shrink-0 ${color}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Link to={`/clientes/${r.client_id}`} className="font-semibold text-zinc-950 hover:underline text-sm truncate">{r.client_name}</Link>
                            <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[8px] uppercase tracking-[0.06em] font-bold border ${getEnergyType(r.tarifa).color}`}>
                              {getEnergyType(r.tarifa).label}
                            </span>
                          </div>
                          
                          {/* Dirección / Suministro */}
                          {r.client_address && (
                            <div className="text-xs text-zinc-500 flex items-center gap-1 mt-1 font-medium truncate" title={r.client_address}>
                              <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              <span className="truncate">{r.client_address}</span>
                            </div>
                          )}
                          
                          {/* Comercializadora y Tarifa */}
                          <div className="text-xs text-zinc-500 mt-1 flex items-center gap-2">
                            <span className="font-semibold text-zinc-700">{r.comercializadora}</span>
                            <span>·</span>
                            <span className="font-mono bg-zinc-50 border border-zinc-200 px-1.5 py-0.2 rounded text-[10px]">{r.tarifa || "—"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Contact Info & Renewal Alerts */}
                      <div className="flex items-center gap-4 flex-wrap md:flex-nowrap shrink-0 ml-4 md:ml-0">
                        {/* WhatsApp, Call & Email icons */}
                        <div className="flex items-center gap-1.5">
                          {r.client_phone && (
                            <>
                              <a
                                href={`https://wa.me/${r.client_phone.replace(/[^0-9]/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                                title="Enviar WhatsApp"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
                              </a>
                              <a
                                href={`tel:${r.client_phone}`}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-zinc-50 text-zinc-700 border border-zinc-200 hover:bg-zinc-100 transition-colors"
                                title={`Llamar (${r.client_phone})`}
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            </>
                          )}
                          {r.client_email && (
                            <a
                              href={`mailto:${r.client_email}`}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors"
                              title={`Enviar correo (${r.client_email})`}
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>

                        {/* Expiration date */}
                        <div className="text-left md:text-right shrink-0">
                          <div className="font-mono text-xs text-zinc-950 font-semibold">{formatDate(r.fecha_renovacion)}</div>
                          <div className={`text-[10px] uppercase tracking-[0.08em] font-bold ${b === "urgent" ? "text-rose-600" : b === "soon" ? "text-amber-600" : "text-zinc-500"}`}>{r.days_until} días</div>
                        </div>
                      </div>
                    </div>
                  </div>
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
                    <div key={r.contract_id} className="border border-zinc-200 rounded-md p-3.5 bg-white hover:border-zinc-300 hover:shadow-sm transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link to={`/clientes/${r.client_id}`} className="font-semibold text-sm text-zinc-950 hover:underline">{r.client_name}</Link>
                            <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[8px] uppercase tracking-[0.06em] font-bold border ${getEnergyType(r.tarifa).color}`}>
                              {getEnergyType(r.tarifa).label}
                            </span>
                          </div>
                          
                          {/* Dirección / Suministro */}
                          {r.client_address && (
                            <div className="text-xs text-zinc-500 flex items-center gap-1 mt-1 font-medium truncate" title={r.client_address}>
                              <MapPin className="w-3 h-3 text-zinc-400 shrink-0" />
                              <span className="truncate">{r.client_address}</span>
                            </div>
                          )}

                          <div className="text-xs text-zinc-500 flex items-center gap-1.5 mt-1">
                            <span className="font-semibold text-zinc-700">{r.comercializadora}</span>
                            <span>·</span>
                            <span className="font-mono text-[10px] text-zinc-700 bg-zinc-50 border border-zinc-150 px-1.5 py-0.2 rounded">
                              {r.tarifa || "—"}
                            </span>
                          </div>
                        </div>

                        {/* Action icons */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          {r.client_phone && (
                            <>
                              <a
                                href={`https://wa.me/${r.client_phone.replace(/[^0-9]/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center w-7.5 h-7.5 p-1.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                                title="Enviar WhatsApp"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
                              </a>
                              <a
                                href={`tel:${r.client_phone}`}
                                className="inline-flex items-center justify-center w-7.5 h-7.5 p-1.5 rounded-md bg-zinc-50 text-zinc-700 border border-zinc-200 hover:bg-zinc-100 transition-colors"
                                title={`Llamar (${r.client_phone})`}
                              >
                                <Phone className="w-3 h-3" />
                              </a>
                            </>
                          )}
                          {r.client_email && (
                            <a
                              href={`mailto:${r.client_email}`}
                              className="inline-flex items-center justify-center w-7.5 h-7.5 p-1.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors"
                              title={`Enviar correo (${r.client_email})`}
                            >
                              <Mail className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
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

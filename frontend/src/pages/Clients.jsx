import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { CLIENT_STATES, CLIENT_STATE_MAP, formatEUR, formatDate, formatPhone } from "../lib/constants";
import Topbar from "../components/layout/Topbar";
import { supabase } from "../lib/supabase";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Plus, Search, Filter, Check, AlertCircle, Copy, Phone, ChevronRight } from "lucide-react";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "../components/ui/select";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { toast } from "sonner";

function emptyClient() {
  return {
    nombre: "", telefono: "", email: "", cups: "", provincia: "",
    direccion: "", nif: "", estado: "nuevo_lead", comercial_id: "",
    tiene_ahorro: false, ahorro_estimado: 0, notas: "",
    fecha_vencimiento: "", tarifa: "2.0TD",
    fecha_nacimiento: "", tipo_titular: "fisica", cif: "",
    titular_no_firmante: false, firmante_nombre: "", firmante_dni: "", iban: "",
    comision: 0, tipo_servicio: "luz",
    fecha_fin_contrato: "", fecha_alerta_personalizada: "", motivo_alerta_personalizada: ""
  };
}

export default function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("__all__");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyClient());
  const [options, setOptions] = useState({ provincias: [], comercializadoras: [] });
  const handleInputChange = (k, val) => {
    const updatedForm = { ...form, [k]: val };
    if (k === "direccion" && val) {
      const lowerVal = val.toLowerCase();
      const provinciasConocidas = ["madrid", "barcelona", "valencia", "sevilla", "zaragoza", "málaga", "murcia", "palma", "las palmas", "bilbao", "alicante", "córdoba", "valladolid", "vigo", "gijón", "granada", "a coruña", "vitoria", "elche", "oviedo", "pamplona", "cartagena", "almería", "santander"];
      const matchedProvincia = provinciasConocidas.find(p => lowerVal.includes(p));
      if (matchedProvincia) {
        const capitalisedProv = options.provincias?.find(p => p.toLowerCase() === matchedProvincia) || 
                                matchedProvincia.charAt(0).toUpperCase() + matchedProvincia.slice(1);
        updatedForm.provincia = capitalisedProv;
      }
    }
    setForm(updatedForm);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const params = {};
    if (q) params.q = q;
    if (estado && estado !== "__all__") params.estado = estado;
    try {
      const { data } = await api.get("/clients", { params });
      setClients(data || []);
    } catch (e) {
      console.error("Error al cargar los clientes:", e);
      toast.error("Error al cargar la lista de clientes");
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [q, estado]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    // Subscribe to realtime database changes on public.clientes table
    const channel = supabase
      .channel("clients-list-realtime-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "clientes" }, () => {
        load();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  useEffect(() => {
    api.get("/meta/options").then((r) => setOptions(r.data));
  }, []);

  const submit = async () => {
    try {
      // 1. Crear al cliente
      const { data: newClient } = await api.post("/clients", form);
      
      // 2. Si ha puesto fecha de vencimiento, crear el contrato asociado y lanzar la alerta real por email
      if (form.fecha_vencimiento && newClient?.id) {
        await api.post("/contracts", {
          cliente_id: newClient.id,
          comercializadora: "Pendiente determinar",
          tarifa: "2.0TD",
          potencia_contratada: 5.5,
          fecha_inicio: new Date().toISOString().split("T")[0],
          fecha_renovacion: form.fecha_vencimiento,
          importe_anual: Number(form.comision || 0) * 2 || 1500.0,
          notas: "Contrato autogenerado al dar de alta al cliente"
        });
        
        // Llamar a nuestra Serverless Function de Vercel para enviar el correo real por SMTP
        const sessionToken = localStorage.getItem("aml_session_token");
        fetch("/api/send-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${sessionToken}`
          },
          body: JSON.stringify({
            cliente_nombre: form.nombre,
            fecha_vencimiento: formatDate(form.fecha_vencimiento)
          })
        }).then(res => {
          if (res.ok) {
            toast.success("Alerta de correo enviada con éxito a estudios@algomasqueluz.com");
          } else {
            console.warn("La alerta de correo se enviará tan pronto como completes la configuración de variables de entorno SMTP en tu panel de Vercel.");
          }
        }).catch(err => {
          console.error("Error enviando alerta por correo:", err);
        });
      }
      
      toast.success("Cliente creado exitosamente. Redirigiendo a ficha para crear contrato...");
      setOpen(false);
      setForm(emptyClient());
      if (newClient?.id) {
        navigate(`/clientes/${newClient.id}?newContract=true`);
      } else {
        load();
      }
    } catch (e) {
      toast.error("Error al crear cliente");
    }
  };

  return (
    <>
      <Topbar
        title="Clientes"
        subtitle={`${clients.length} resultados en la cartera`}
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="h-9 bg-zinc-950 text-white hover:bg-zinc-800 rounded-md text-xs font-semibold" data-testid="clients-new-button">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Nuevo cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display font-bold tracking-tight">Nuevo cliente</DialogTitle>
              </DialogHeader>
              
              {/* Datos de Titularidad y Contacto */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider mb-2">Datos del Titular</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="new-client-nombre" className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Titular</Label>
                      <Input id="new-client-nombre" className="mt-1 h-9 border-zinc-200" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre o Razón Social" />
                    </div>
                    <div>
                      <Label htmlFor="new-client-telefono" className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Teléfono</Label>
                      <Input id="new-client-telefono" className="mt-1 h-9 border-zinc-200" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="600 000 000" />
                    </div>
                    <div>
                      <Label htmlFor="new-client-email" className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Email</Label>
                      <Input id="new-client-email" type="email" className="mt-1 h-9 border-zinc-200" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="correo@ejemplo.com" />
                    </div>
                    <div>
                      <Label htmlFor="new-client-iban" className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">IBAN</Label>
                      <Input id="new-client-iban" className="mt-1 h-9 border-zinc-200" value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} placeholder="ES00 0000 0000 0000 0000 0000" />
                    </div>
                    <div>
                      <Label htmlFor="new-client-birthdate" className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">🎂 Fecha de Nacimiento (Felicidades automática)</Label>
                      <Input id="new-client-birthdate" type="date" className="mt-1 h-9 border-zinc-200" value={form.fecha_nacimiento} onChange={(e) => setForm({ ...form, fecha_nacimiento: e.target.value })} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Tipo de titular</Label>
                      <div className="mt-1.5 grid grid-cols-2 gap-2">
                        <label className="flex items-center gap-2 px-3 py-2.5 rounded-md border border-zinc-200 bg-white cursor-pointer text-xs text-zinc-800 font-medium">
                          <input 
                            type="radio" 
                            name="new_tipo_titular" 
                            checked={form.tipo_titular === "fisica"} 
                            onChange={() => setForm({ ...form, tipo_titular: "fisica" })}
                            className="w-3.5 h-3.5 text-zinc-950 focus:ring-0"
                          />
                          <span>Persona física</span>
                        </label>
                        <label className="flex items-center gap-2 px-3 py-2.5 rounded-md border border-zinc-200 bg-white cursor-pointer text-xs text-zinc-800 font-medium">
                          <input 
                            type="radio" 
                            name="new_tipo_titular" 
                            checked={form.tipo_titular === "juridica"} 
                            onChange={() => setForm({ ...form, tipo_titular: "juridica" })}
                            className="w-3.5 h-3.5 text-zinc-950 focus:ring-0"
                          />
                          <span>Persona jurídica</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="new-client-nif" className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">
                        {form.tipo_titular === "juridica" ? "CIF" : "DNI / NIF"}
                      </Label>
                      {form.tipo_titular === "juridica" ? (
                        <Input 
                          id="new-client-nif" 
                          className="mt-1 h-9 border-zinc-200" 
                          value={form.cif} 
                          onChange={(e) => setForm({ ...form, cif: e.target.value })} 
                          placeholder="A00000000"
                        />
                      ) : (
                        <Input 
                          id="new-client-nif" 
                          className="mt-1 h-9 border-zinc-200" 
                          value={form.nif} 
                          onChange={(e) => setForm({ ...form, nif: e.target.value })} 
                          placeholder="12345678Z"
                        />
                      )}
                    </div>

                    <div className="pt-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-800">
                        <input 
                          type="checkbox" 
                          checked={form.titular_no_firmante} 
                          onChange={(e) => setForm({ ...form, titular_no_firmante: e.target.checked })}
                          className="w-3.5 h-3.5 rounded border-zinc-300 text-zinc-950 focus:ring-0"
                        />
                        <span>La persona titular no es la firmante</span>
                      </label>
                    </div>

                    {form.titular_no_firmante && (
                      <div className="space-y-3 p-3 rounded-lg bg-zinc-50 border border-zinc-150 anim-fadeup mt-2">
                        <div>
                          <Label htmlFor="new-client-firmante-nombre" className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Titular firmante</Label>
                          <Input 
                            id="new-client-firmante-nombre" 
                            className="mt-1 h-8.5 text-xs border-zinc-200 bg-white" 
                            value={form.firmante_nombre} 
                            onChange={(e) => setForm({ ...form, firmante_nombre: e.target.value })} 
                            placeholder="Nombre del firmante / apoderado"
                          />
                        </div>
                        <div>
                          <Label htmlFor="new-client-firmante-dni" className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">DNI / NIF firmante</Label>
                          <Input 
                            id="new-client-firmante-dni" 
                            className="mt-1 h-8.5 text-xs border-zinc-200 bg-white" 
                            value={form.firmante_dni} 
                            onChange={(e) => setForm({ ...form, firmante_dni: e.target.value })} 
                            placeholder="DNI del firmante / apoderado"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={submit} className="bg-zinc-950 hover:bg-zinc-800 text-white" data-testid="new-client-submit">Crear</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      
      <div className="p-6 md:p-8 anim-fadeup">
        {/* Filtros */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shadow-sm">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Buscar por titular, NIF, CUPS o teléfono..."
              className="pl-9 h-9 border-zinc-200 text-xs"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              data-testid="clients-search-input"
            />
          </div>
          <div className="flex gap-2">
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger className="h-9 w-[180px] border-zinc-200" data-testid="clients-state-filter">
                <Filter className="w-3.5 h-3.5 text-zinc-400 mr-1" />
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos los estados</SelectItem>
                {CLIENT_STATES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={load} variant="outline" className="h-9 border-zinc-200 text-xs px-4" data-testid="clients-filter-apply">Aplicar</Button>
          </div>
        </div>

        {/* Mobile Client Cards View */}
        <div className="block md:hidden space-y-3">
          {loading && <div className="text-center py-10 text-zinc-500 text-sm">Cargando…</div>}
          {!loading && clients.length === 0 && (
            <div className="text-center py-12 text-zinc-500 text-sm bg-white border border-zinc-200 rounded-2xl">Sin resultados</div>
          )}
          {!loading && clients.map((c) => {
            const s = CLIENT_STATE_MAP[c.estado];
            return (
              <div
                key={c.id}
                className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3.5 relative"
                data-testid={`client-card-${c.id}`}
              >
                {/* Header: Name and Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      to={`/clientes/${c.id}`}
                      className="font-bold text-zinc-900 hover:underline text-sm block truncate"
                    >
                      {c.nombre}
                    </Link>
                    <span className="text-[10px] text-zinc-450 font-medium block truncate mt-0.5">
                      {c.email || "Sin email"}
                    </span>
                  </div>
                  <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[9px] uppercase tracking-[0.06em] font-bold border ${s?.color || "bg-zinc-50 text-zinc-600 border-zinc-200"}`}>
                    {s?.label || "Desconocido"}
                  </span>
                </div>

                {/* Body details */}
                <div className="grid grid-cols-2 gap-y-2.5 gap-x-2 text-[11px]">
                  <div>
                    <span className="text-zinc-400 block font-bold text-[9px] uppercase tracking-wider">CUPS</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-zinc-700 font-bold truncate max-w-[120px]">
                        {c.cups || "—"}
                      </span>
                      {c.cups && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(c.cups);
                            toast.success("CUPS copiado");
                          }}
                          className="text-zinc-400 hover:text-zinc-900 p-0.5 rounded hover:bg-zinc-50 transition-colors"
                          title="Copiar CUPS"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-zinc-400 block font-bold text-[9px] uppercase tracking-wider">Teléfono</span>
                    <a
                      href={c.telefono ? `tel:${c.telefono}` : "#"}
                      className={`flex items-center gap-1.5 mt-0.5 font-bold ${
                        c.telefono ? "text-amber-500 hover:underline" : "text-zinc-500 pointer-events-none"
                      }`}
                    >
                      <Phone className="w-3 h-3 shrink-0" />
                      <span>{formatPhone(c.telefono)}</span>
                    </a>
                  </div>

                  <div>
                    <span className="text-zinc-400 block font-bold text-[9px] uppercase tracking-wider">Comercial</span>
                    <span className="text-zinc-700 font-bold truncate block mt-0.5 uppercase">
                      {c.comercial_name || "—"}
                    </span>
                  </div>

                  <div>
                    <span className="text-zinc-400 block font-bold text-[9px] uppercase tracking-wider">Tarifa</span>
                    <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-zinc-700 bg-zinc-50 border border-zinc-200 mt-0.5">
                      {c.tarifa || "—"}
                    </span>
                  </div>
                </div>

                {/* Footer of Card */}
                <div className="border-t border-zinc-100 pt-3 flex items-center justify-between mt-0.5">
                  <div className="text-[10px] text-zinc-500 font-medium space-y-0.5 uppercase">
                    <div>Entrada: <span className="text-zinc-700 font-bold">{formatDate(c.created_at)}</span></div>
                  </div>
                  <Link
                    to={`/clientes/${c.id}`}
                    className="text-[11px] font-bold text-zinc-950 flex items-center gap-0.5 hover:text-zinc-750"
                  >
                    <span>Ver ficha</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block bg-white border border-zinc-200 rounded-md overflow-x-auto">
          <table className="w-full text-xs min-w-[900px]">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr className="text-[10px] uppercase tracking-[0.08em] text-zinc-500 font-semibold">
                <th className="text-left px-4 py-2">Cliente</th>
                <th className="text-left px-3 py-2">CUPS</th>
                <th className="text-left px-3 py-2">Dirección</th>
                <th className="text-left px-3 py-2">Estado</th>
                <th className="text-left px-3 py-2">Teléfono</th>
                <th className="text-left px-3 py-2">Comercial</th>
                <th className="text-left px-3 py-2">Tarifa</th>
                <th className="text-right px-4 py-2">Fecha entrada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading && <tr><td colSpan={8} className="text-center py-10 text-zinc-500 text-sm">Cargando…</td></tr>}
              {!loading && clients.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-zinc-500 text-sm">Sin resultados</td></tr>
              )}
              {!loading && clients.map((c) => {
                const s = CLIENT_STATE_MAP[c.estado];
                return (
                  <tr key={c.id} className="hover:bg-zinc-50/80 transition-colors" data-testid={`client-row-${c.id}`}>
                    <td className="px-4 py-2">
                      <Link to={`/clientes/${c.id}`} className="font-semibold text-zinc-950 hover:underline text-xs">{c.nombre}</Link>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{c.email || "—"}</div>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-zinc-700 tracking-tight">{c.cups || "—"}</td>
                    {(() => {
                      const addr = c.direccion_fiscal && c.direccion_fiscal.nombre_via
                        ? `${c.direccion_fiscal.tipo_via || ""} ${c.direccion_fiscal.nombre_via || ""} ${c.direccion_fiscal.numero || ""}`.trim().replace(/\s+/g, ' ')
                        : c.direccion;
                      return (
                        <td className="px-3 py-2 text-zinc-650 text-xs max-w-[220px] truncate uppercase" title={addr || "—"}>
                          {addr || "—"}
                        </td>
                      );
                    })()}
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] uppercase tracking-[0.06em] font-bold border ${s?.color || "bg-zinc-50 text-zinc-600 border-zinc-200"}`}>
                        {s?.label || "Desconocido"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-zinc-700 text-xs">{formatPhone(c.telefono)}</td>
                    <td className="px-3 py-2 text-zinc-700 text-xs uppercase">{c.comercial_name || "—"}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-zinc-700 bg-zinc-50 border border-zinc-200">
                        {c.tarifa || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-zinc-600 uppercase whitespace-nowrap">{formatDate(c.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

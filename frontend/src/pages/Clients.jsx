import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { CRM_STATES, STATE_MAP, formatEUR, formatDate } from "../lib/constants";
import Topbar from "../components/layout/Topbar";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Plus, Search, Filter, Check, AlertCircle } from "lucide-react";
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
  };
}

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("__all__");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyClient());
  const [options, setOptions] = useState({ provincias: [], comercializadoras: [] });

  const load = async () => {
    setLoading(true);
    const params = {};
    if (q) params.q = q;
    if (estado && estado !== "__all__") params.estado = estado;
    try {
      const { data } = await api.get("/clients", { params });
      setClients(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [estado]);
  useEffect(() => {
    api.get("/meta/options").then((r) => setOptions(r.data));
  }, []);

  const submit = async () => {
    try {
      await api.post("/clients", form);
      toast.success("Cliente creado");
      setOpen(false);
      setForm(emptyClient());
      load();
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
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-display font-bold tracking-tight">Nuevo cliente</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["nombre", "Nombre / Empresa"], ["nif", "NIF/CIF"],
                  ["telefono", "Teléfono"], ["email", "Email"],
                  ["cups", "CUPS"], ["direccion", "Dirección"],
                ].map(([k, label]) => (
                  <div key={k} className={k === "direccion" ? "col-span-2" : ""}>
                    <Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">{label}</Label>
                    <Input className="mt-1 h-9 border-zinc-200" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} data-testid={`new-client-${k}`} />
                  </div>
                ))}
                <div>
                  <Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Provincia</Label>
                  <Select value={form.provincia} onValueChange={(v) => setForm({ ...form, provincia: v })}>
                    <SelectTrigger className="mt-1 h-9 border-zinc-200" data-testid="new-client-provincia"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>{options.provincias?.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Estado</Label>
                  <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v })}>
                    <SelectTrigger className="mt-1 h-9 border-zinc-200" data-testid="new-client-estado"><SelectValue /></SelectTrigger>
                    <SelectContent>{CRM_STATES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
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
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <Input
              placeholder="Buscar por nombre, CUPS, email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              className="h-9 pl-9 border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              data-testid="clients-search-input"
            />
          </div>
          <Select value={estado} onValueChange={setEstado}>
            <SelectTrigger className="h-9 w-[180px] border-zinc-200" data-testid="clients-state-filter">
              <Filter className="w-3.5 h-3.5 text-zinc-400 mr-1" />
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos los estados</SelectItem>
              {CRM_STATES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={load} variant="outline" className="h-9 border-zinc-200 text-xs" data-testid="clients-filter-apply">Aplicar</Button>
        </div>

        {/* Table */}
        <div className="bg-white border border-zinc-200 rounded-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr className="text-[10px] uppercase tracking-[0.08em] text-zinc-500 font-semibold">
                <th className="text-left px-5 py-3">Cliente</th>
                <th className="text-left px-3 py-3">CUPS</th>
                <th className="text-left px-3 py-3">Provincia</th>
                <th className="text-left px-3 py-3">Estado</th>
                <th className="text-left px-3 py-3">Comercial</th>
                <th className="text-right px-3 py-3">Ahorro</th>
                <th className="text-right px-5 py-3">Último contacto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading && <tr><td colSpan={7} className="text-center py-10 text-zinc-500 text-sm">Cargando…</td></tr>}
              {!loading && clients.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-zinc-500 text-sm">Sin resultados</td></tr>
              )}
              {!loading && clients.map((c) => {
                const s = STATE_MAP[c.estado];
                return (
                  <tr key={c.id} className="hover:bg-zinc-50 transition-colors" data-testid={`client-row-${c.id}`}>
                    <td className="px-5 py-3">
                      <Link to={`/clientes/${c.id}`} className="font-medium text-zinc-950 hover:underline">{c.nombre}</Link>
                      <div className="text-xs text-zinc-500 mt-0.5">{c.email || c.telefono || "—"}</div>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-zinc-700">{c.cups || "—"}</td>
                    <td className="px-3 py-3 text-zinc-700 text-xs">{c.provincia || "—"}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase tracking-[0.06em] font-semibold border ${s?.color}`}>
                        {s?.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-zinc-700 text-xs">{c.comercial_name || "—"}</td>
                    <td className="px-3 py-3 text-right">
                      {c.tiene_ahorro ? (
                        <div className="inline-flex items-center gap-1 font-mono text-xs text-emerald-700">
                          <Check className="w-3 h-3" />{formatEUR(c.ahorro_estimado)}
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 text-xs text-zinc-400">
                          <AlertCircle className="w-3 h-3" />sin ahorro
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs text-zinc-600">{formatDate(c.ultimo_contacto)}</td>
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

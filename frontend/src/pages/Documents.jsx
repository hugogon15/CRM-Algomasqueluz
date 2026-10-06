import { useEffect, useState } from "react";
import { api } from "../lib/api";
import Topbar from "../components/layout/Topbar";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Sparkles, UploadCloud, Loader2, FileText, CheckCircle2, Search, Filter } from "lucide-react";
import { formatDate } from "../lib/constants";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const DOC_TYPES = [
  { value: "all", label: "Todos los documentos" },
  { value: "factura", label: "Facturas" },
  { value: "dni", label: "DNI" },
  { value: "nie", label: "NIE" },
  { value: "cif", label: "CIF" },
  { value: "contrato_alquiler", label: "Contratos de Alquiler" },
  { value: "recibo_autonomo", label: "Recibo de Autónomo" },
  { value: "justo_titulo", label: "Justo Título" },
  { value: "otro", label: "Otros" },
];

const DOC_TYPE_MAP = {
  factura: { label: "Factura", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  dni: { label: "DNI", color: "bg-blue-50 text-blue-700 border-blue-200" },
  nie: { label: "NIE", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  cif: { label: "CIF", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  contrato_alquiler: { label: "Contrato Alquiler", color: "bg-amber-50 text-amber-700 border-amber-200" },
  recibo_autonomo: { label: "Recibo Autónomo", color: "bg-purple-50 text-purple-700 border-purple-200" },
  justo_titulo: { label: "Justo Título", color: "bg-rose-50 text-rose-700 border-rose-200" },
  otro: { label: "Otros", color: "bg-zinc-50 text-zinc-600 border-zinc-200" },
};

export default function Documents() {
  const [clients, setClients] = useState([]);
  const [docs, setDocs] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  const loadDocs = async () => {
    const { data } = await api.get("/documents");
    setDocs(data);
  };

  useEffect(() => {
    api.get("/clients").then((r) => setClients(r.data));
    loadDocs();
  }, []);

  const upload = async (file) => {
    if (!clienteId) { toast.error("Selecciona un cliente primero"); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("cliente_id", clienteId);
    fd.append("tipo", "factura");
    try {
      const { data } = await api.post("/documents/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      if (data.ocr_status === "completed") toast.success("Factura analizada con IA");
      else if (data.ocr_status === "failed") toast.error("OCR falló — factura guardada");
      else toast.success("Factura subida");
      loadDocs();
    } catch {
      toast.error("Error subiendo");
    } finally { setUploading(false); }
  };

  const filteredDocs = docs.filter((d) => {
    if (filterType !== "all" && d.tipo !== filterType) return false;
    
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    
    const matchesFileName = (d.nombre || "").toLowerCase().includes(q);
    const clientName = (d.clientes?.nombre || "").toLowerCase();
    const clientCups = (d.clientes?.cups || "").toLowerCase();
    const clientNif = (d.clientes?.nif || "").toLowerCase();
    const clientPhone = (d.clientes?.telefono || "").toLowerCase();
    
    return matchesFileName || clientName.includes(q) || clientCups.includes(q) || clientNif.includes(q) || clientPhone.includes(q);
  });

  return (
    <>
      <Topbar title="Documentos / OCR" subtitle="Sube y visualiza la documentación asociada a cada cliente del CRM" />
      <div className="p-6 md:p-8 anim-fadeup space-y-6">
        
        {/* Panel de Carga Rápida */}
        <div className="bg-white border border-zinc-200/60 rounded-[1.5rem] p-6 shadow-sm">
          <div className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-4">Subida de Documentación</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
            <div className="md:col-span-1">
              <div className="text-[11px] uppercase tracking-[0.08em] font-bold text-zinc-400 mb-2">Seleccionar Cliente</div>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger className="h-10 border-zinc-200 rounded-lg bg-zinc-50/50 hover:bg-zinc-50 transition-colors" data-testid="docs-client-select">
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <label htmlFor="bulk-upload" className="md:col-span-2 border-2 border-dashed border-zinc-200 rounded-xl bg-zinc-50/50 hover:bg-zinc-50 transition-colors cursor-pointer p-6 text-center" data-testid="docs-upload-dropzone">
              {uploading ? (
                <div className="flex flex-col items-center gap-1.5">
                  <Loader2 className="w-5 h-5 animate-spin text-[#ff5722]" />
                  <div className="text-sm font-semibold text-zinc-700">Procesando archivo...</div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <UploadCloud className="w-6 h-6 text-zinc-400" />
                  <div className="text-sm font-bold text-zinc-700">Subir archivo para el cliente</div>
                  <div className="text-xs text-zinc-400 flex items-center gap-1.5 justify-center"><Sparkles className="w-3.5 h-3.5 text-orange-400" />Por defecto se guardará como Factura para análisis OCR</div>
                </div>
              )}
              <input id="bulk-upload" type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} data-testid="docs-upload-input" />
            </label>
          </div>
        </div>

        {/* Buscador y Filtros */}
        <div className="bg-white border border-zinc-200/60 rounded-[1.5rem] p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, CUPS, DNI..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full rounded-full"
            />
          </div>
          
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <Filter className="h-4 w-4 text-zinc-400 shrink-0" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="h-10 w-full md:w-52 rounded-full border border-zinc-200 px-3.5 text-xs bg-zinc-50/50 text-zinc-700"
            >
              {DOC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Historial de Documentos */}
        <div className="space-y-3">
          <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-400 font-bold">
            Resultados del Histórico ({filteredDocs.length})
          </div>
          {filteredDocs.map((d) => (
            <div key={d.id} className="bg-white border border-zinc-200 rounded-[1.5rem] p-5 shadow-sm hover:border-zinc-300 hover:shadow-md transition-all duration-200" data-testid={`docs-history-${d.id}`}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                
                {/* Info Archivo */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-zinc-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-zinc-900 truncate">{d.nombre}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8px] uppercase tracking-[0.06em] font-bold border ${(DOC_TYPE_MAP[d.tipo] || DOC_TYPE_MAP.otro).color}`}>
                        {(DOC_TYPE_MAP[d.tipo] || DOC_TYPE_MAP.otro).label}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 mt-1 font-medium">
                      {(d.size / 1024).toFixed(1)} KB · {formatDate(d.created_at)}
                    </div>
                  </div>
                </div>

                {/* Cliente info panel to identify the person */}
                {d.clientes ? (
                  <div 
                    className="lg:w-80 p-3.5 rounded-xl border text-[11px] space-y-1.5 shrink-0 font-medium text-left shadow-none"
                    style={{ backgroundColor: '#ffffff', borderColor: '#e4e6eb' }}
                  >
                    <div className="flex justify-between items-center border-b pb-1.5 mb-1.5" style={{ borderColor: '#edf0f5' }}>
                      <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Asociado a</span>
                      <Link to={`/clientes/${d.cliente_id}`} className="text-xs text-[#ff5722] hover:text-[#e64a19] hover:underline font-bold">Ver ficha →</Link>
                    </div>
                    <div><span className="text-zinc-450 text-[10px]">Titular:</span> <span className="text-zinc-900 font-bold">{d.clientes.nombre}</span></div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-500">
                      <div>NIF: <span className="font-mono text-zinc-700 font-semibold">{d.clientes.nif || "—"}</span></div>
                      <div>Teléfono: <span className="text-zinc-700 font-semibold">{d.clientes.telefono || "—"}</span></div>
                    </div>
                    {d.clientes.cups && <div className="text-[10px] text-zinc-550 truncate">CUPS: <span className="font-mono text-zinc-700 font-semibold">{d.clientes.cups}</span></div>}
                  </div>
                ) : (
                  <div className="text-xs text-zinc-400 shrink-0 italic p-2 bg-zinc-50/50 rounded-lg border border-zinc-150">Sin cliente asignado</div>
                )}

                {/* OCR Status */}
                <div className="flex items-center gap-2 shrink-0">
                  {d.ocr_status === "completed" && (
                    <span 
                      className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.08em] font-semibold px-2 py-0.5 rounded-full shrink-0 border"
                      style={{ backgroundColor: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0' }}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Analizado
                    </span>
                  )}
                  {d.ocr_status === "failed" && (
                    <span 
                      className="text-[10px] uppercase tracking-[0.08em] font-semibold px-2 py-0.5 rounded-full shrink-0 border"
                      style={{ backgroundColor: '#fef2f2', color: '#b91c1c', borderColor: '#fecaca' }}
                    >
                      Error
                    </span>
                  )}
                  {d.ocr_status === "skipped" && (
                    <span 
                      className="text-[10px] uppercase tracking-[0.08em] font-semibold px-2 py-0.5 rounded-full shrink-0 border"
                      style={{ backgroundColor: '#f4f4f5', color: '#52525b', borderColor: '#e4e4e7' }}
                    >
                      No OCR
                    </span>
                  )}
                </div>
              </div>

              {/* Datos extraídos si tiene */}
              {d.extracted_data && typeof d.extracted_data === "object" && !d.extracted_data.error && d.tipo === "factura" && (
                <div className="mt-3.5 pt-3.5 border-t border-zinc-150 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-left">
                  {["cups", "comercializadora", "tarifa", "importe_total_eur"].map((k) => d.extracted_data[k] && (
                    <div key={k}>
                      <div className="text-[9px] uppercase tracking-[0.08em] text-zinc-400 font-bold">{k.replace(/_/g, " ")}</div>
                      <div className="font-mono text-zinc-800 mt-1 truncate font-bold">{String(d.extracted_data[k])}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {filteredDocs.length === 0 && <div className="text-center py-12 text-zinc-400 text-sm bg-white border border-zinc-200 rounded-[1.5rem] shadow-sm">Sin documentos coincidentes</div>}
        </div>
      </div>
    </>
  );
}

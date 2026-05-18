import { useEffect, useState } from "react";
import { api } from "../lib/api";
import Topbar from "../components/layout/Topbar";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Sparkles, UploadCloud, Loader2, FileText, CheckCircle2 } from "lucide-react";
import { formatDate } from "../lib/constants";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function Documents() {
  const [clients, setClients] = useState([]);
  const [docs, setDocs] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const [uploading, setUploading] = useState(false);

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

  return (
    <>
      <Topbar title="Documentos / OCR" subtitle="Sube facturas energéticas para análisis automático con Gemini 3 Pro" />
      <div className="p-6 md:p-8 anim-fadeup">
        <div className="bg-white border border-zinc-200 rounded-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-1">
              <div className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500 mb-1.5">Cliente destino</div>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger className="h-9 border-zinc-200" data-testid="docs-client-select">
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <label htmlFor="bulk-upload" className="md:col-span-2 border-2 border-dashed border-zinc-300 rounded-md bg-zinc-50 hover:bg-zinc-100 transition-colors cursor-pointer p-6 text-center" data-testid="docs-upload-dropzone">
              {uploading ? (
                <div className="flex flex-col items-center gap-1.5">
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-700" />
                  <div className="text-sm font-medium">Procesando con IA…</div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <UploadCloud className="w-5 h-5 text-zinc-700" />
                  <div className="text-sm font-medium text-zinc-950">Subir factura energética</div>
                  <div className="text-xs text-zinc-500 flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-[#F97316]" />OCR con Gemini 3 Pro · PDF/JPG/PNG</div>
                </div>
              )}
              <input id="bulk-upload" type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} data-testid="docs-upload-input" />
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-400 font-semibold mb-2">Histórico ({docs.length})</div>
          {docs.map((d) => (
            <div key={d.id} className="bg-white border border-zinc-200 rounded-md p-4" data-testid={`docs-history-${d.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-5 h-5 text-zinc-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-zinc-950 truncate">{d.nombre}</div>
                    <div className="text-xs text-zinc-500">{(d.size / 1024).toFixed(1)} KB · {formatDate(d.created_at)} · {d.cliente_id && <Link to={`/clientes/${d.cliente_id}`} className="underline">ver cliente</Link>}</div>
                  </div>
                </div>
                {d.ocr_status === "completed" && <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.08em] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded shrink-0"><CheckCircle2 className="w-3 h-3" />Analizado</span>}
                {d.ocr_status === "failed" && <span className="text-[10px] uppercase tracking-[0.08em] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded shrink-0">Error</span>}
              </div>
              {d.extracted_data && typeof d.extracted_data === "object" && !d.extracted_data.error && (
                <div className="mt-3 pt-3 border-t border-zinc-100 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {["cups", "comercializadora", "tarifa", "importe_total_eur"].map((k) => d.extracted_data[k] && (
                    <div key={k}>
                      <div className="text-[10px] uppercase tracking-[0.08em] text-zinc-400 font-semibold">{k.replace(/_/g, " ")}</div>
                      <div className="font-mono text-zinc-950 mt-0.5 truncate">{String(d.extracted_data[k])}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {docs.length === 0 && <div className="text-center py-12 text-zinc-500 text-sm">Sin documentos subidos</div>}
        </div>
      </div>
    </>
  );
}

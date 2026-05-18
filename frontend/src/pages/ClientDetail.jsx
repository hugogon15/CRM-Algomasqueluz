import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import { CRM_STATES, STATE_MAP, formatEUR, formatDate } from "../lib/constants";
import Topbar from "../components/layout/Topbar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Building2, Phone, Mail, MapPin, FileText, UploadCloud, Trash2, Save, Plus, Sparkles, Loader2, CheckCircle2 } from "lucide-react";

export default function ClientDetail() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const [options, setOptions] = useState({ comercializadoras: [] });
  const [newContract, setNewContract] = useState({
    comercializadora: "", tarifa: "2.0TD", potencia_contratada: 5.5,
    fecha_inicio: new Date().toISOString().slice(0, 10),
    fecha_renovacion: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    permanencia_meses: 12, importe_anual: 0, notas: "",
  });

  const load = useCallback(async () => {
    const [c, ct, dc] = await Promise.all([
      api.get(`/clients/${id}`),
      api.get(`/contracts?cliente_id=${id}`),
      api.get(`/documents?cliente_id=${id}`),
    ]);
    setClient(c.data);
    setContracts(ct.data);
    setDocuments(dc.data);
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get("/meta/options").then((r) => setOptions(r.data)); }, []);

  if (!client) {
    return <div className="p-8 text-sm text-zinc-500">Cargando…</div>;
  }

  const save = async () => {
    setSaving(true);
    try {
      const { id: _, comercial_name, ...payload } = client;
      payload.ahorro_estimado = Number(payload.ahorro_estimado) || 0;
      await api.patch(`/clients/${id}`, payload);
      toast.success("Cliente actualizado");
      load();
    } catch {
      toast.error("Error guardando");
    } finally {
      setSaving(false);
    }
  };

  const createContract = async () => {
    try {
      await api.post("/contracts", { ...newContract, cliente_id: id });
      toast.success("Contrato creado");
      setContractOpen(false);
      load();
    } catch {
      toast.error("Error creando contrato");
    }
  };

  const deleteContract = async (cid) => {
    if (!confirm("¿Eliminar contrato?")) return;
    await api.delete(`/contracts/${cid}`);
    toast.success("Contrato eliminado");
    load();
  };

  const uploadInvoice = async (file) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("cliente_id", id);
      fd.append("tipo", "factura");
      const { data } = await api.post("/documents/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      if (data.ocr_status === "completed") {
        toast.success("Factura analizada — datos extraídos");
      } else if (data.ocr_status === "failed") {
        toast.error("OCR falló — factura guardada sin extracción");
      } else {
        toast.success("Factura subida");
      }
      load();
    } catch {
      toast.error("Error subiendo factura");
    } finally {
      setUploading(false);
    }
  };

  const s = STATE_MAP[client.estado];

  return (
    <>
      <Topbar
        title={client.nombre}
        subtitle={client.cups ? `CUPS · ${client.cups}` : "Sin CUPS asignado"}
        action={
          <Button variant="outline" asChild className="h-9 border-zinc-200 text-xs" data-testid="client-detail-back">
            <Link to="/clientes"><ArrowLeft className="w-3.5 h-3.5 mr-1.5" />Volver</Link>
          </Button>
        }
      />

      <div className="p-6 md:p-8 anim-fadeup">
        {/* Header card */}
        <div className="bg-white border border-zinc-200 rounded-md p-5 mb-6 flex flex-wrap items-start gap-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-md bg-zinc-100 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-zinc-700" />
            </div>
            <div>
              <div className="font-display text-xl font-bold text-zinc-950 tracking-tight">{client.nombre}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase tracking-[0.06em] font-semibold border ${s?.color}`}>
                  {s?.label}
                </span>
                <span className="text-xs text-zinc-500">{client.comercial_name && `· ${client.comercial_name}`}</span>
              </div>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div><div className="text-[10px] uppercase tracking-[0.08em] text-zinc-400 font-semibold">Teléfono</div><div className="font-mono text-zinc-950 mt-0.5">{client.telefono || "—"}</div></div>
            <div><div className="text-[10px] uppercase tracking-[0.08em] text-zinc-400 font-semibold">Email</div><div className="text-zinc-950 mt-0.5 truncate">{client.email || "—"}</div></div>
            <div><div className="text-[10px] uppercase tracking-[0.08em] text-zinc-400 font-semibold">Provincia</div><div className="text-zinc-950 mt-0.5">{client.provincia || "—"}</div></div>
            <div><div className="text-[10px] uppercase tracking-[0.08em] text-zinc-400 font-semibold">Ahorro</div><div className="font-mono text-zinc-950 mt-0.5">{client.tiene_ahorro ? formatEUR(client.ahorro_estimado) : "—"}</div></div>
          </div>
        </div>

        <Tabs defaultValue="datos">
          <TabsList className="bg-zinc-100 p-1 h-9">
            <TabsTrigger value="datos" data-testid="tab-datos" className="text-xs px-3 data-[state=active]:bg-white">Datos</TabsTrigger>
            <TabsTrigger value="contratos" data-testid="tab-contratos" className="text-xs px-3 data-[state=active]:bg-white">Contratos ({contracts.length})</TabsTrigger>
            <TabsTrigger value="documentos" data-testid="tab-documentos" className="text-xs px-3 data-[state=active]:bg-white">Documentos ({documents.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="datos">
            <div className="bg-white border border-zinc-200 rounded-md p-6 mt-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  ["nombre", "Nombre"], ["nif", "NIF/CIF"],
                  ["telefono", "Teléfono"], ["email", "Email"],
                  ["cups", "CUPS"], ["direccion", "Dirección"],
                ].map(([k, label]) => (
                  <div key={k}>
                    <Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">{label}</Label>
                    <Input className="mt-1 h-9 border-zinc-200" value={client[k] || ""} onChange={(e) => setClient({ ...client, [k]: e.target.value })} data-testid={`client-field-${k}`} />
                  </div>
                ))}
                <div>
                  <Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Estado</Label>
                  <Select value={client.estado} onValueChange={(v) => setClient({ ...client, estado: v })}>
                    <SelectTrigger className="mt-1 h-9 border-zinc-200" data-testid="client-field-estado"><SelectValue /></SelectTrigger>
                    <SelectContent>{CRM_STATES.map((st) => <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Ahorro estimado (€/año)</Label>
                  <Input type="number" className="mt-1 h-9 border-zinc-200" value={client.ahorro_estimado || 0} onChange={(e) => setClient({ ...client, ahorro_estimado: e.target.value, tiene_ahorro: Number(e.target.value) > 0 })} data-testid="client-field-ahorro" />
                </div>
                <div className="col-span-2 md:col-span-3">
                  <Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Notas</Label>
                  <textarea className="mt-1 w-full min-h-[80px] rounded-md border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900" value={client.notas || ""} onChange={(e) => setClient({ ...client, notas: e.target.value })} data-testid="client-field-notas" />
                </div>
              </div>
              <div className="mt-5 flex justify-end">
                <Button onClick={save} disabled={saving} className="h-9 bg-zinc-950 text-white hover:bg-zinc-800 text-xs font-semibold" data-testid="client-save-button">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Save className="w-3.5 h-3.5 mr-1.5" />Guardar</>}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="contratos">
            <div className="bg-white border border-zinc-200 rounded-md mt-4 overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
                <div><h3 className="font-display text-base font-semibold tracking-tight">Contratos energéticos</h3><p className="text-xs text-zinc-500 mt-0.5">Histórico de comercializadoras y renovaciones</p></div>
                <Dialog open={contractOpen} onOpenChange={setContractOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-8 bg-zinc-950 text-white hover:bg-zinc-800 text-xs" data-testid="new-contract-button"><Plus className="w-3 h-3 mr-1" />Nuevo</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Nuevo contrato</DialogTitle></DialogHeader>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Comercializadora</Label>
                        <Select value={newContract.comercializadora} onValueChange={(v) => setNewContract({ ...newContract, comercializadora: v })}>
                          <SelectTrigger className="mt-1 h-9 border-zinc-200" data-testid="new-contract-comercializadora"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>{options.comercializadoras?.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Tarifa</Label><Input className="mt-1 h-9 border-zinc-200" value={newContract.tarifa} onChange={(e) => setNewContract({ ...newContract, tarifa: e.target.value })} /></div>
                      <div><Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Potencia (kW)</Label><Input type="number" className="mt-1 h-9 border-zinc-200" value={newContract.potencia_contratada} onChange={(e) => setNewContract({ ...newContract, potencia_contratada: Number(e.target.value) })} /></div>
                      <div><Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Inicio</Label><Input type="date" className="mt-1 h-9 border-zinc-200" value={newContract.fecha_inicio} onChange={(e) => setNewContract({ ...newContract, fecha_inicio: e.target.value })} /></div>
                      <div><Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Renovación</Label><Input type="date" className="mt-1 h-9 border-zinc-200" value={newContract.fecha_renovacion} onChange={(e) => setNewContract({ ...newContract, fecha_renovacion: e.target.value })} /></div>
                      <div><Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Importe anual (€)</Label><Input type="number" className="mt-1 h-9 border-zinc-200" value={newContract.importe_anual} onChange={(e) => setNewContract({ ...newContract, importe_anual: Number(e.target.value) })} /></div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setContractOpen(false)}>Cancelar</Button>
                      <Button onClick={createContract} className="bg-zinc-950 hover:bg-zinc-800 text-white" data-testid="new-contract-submit">Crear</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr className="text-[10px] uppercase tracking-[0.08em] text-zinc-500 font-semibold">
                    <th className="text-left px-5 py-2.5">Comercializadora</th>
                    <th className="text-left px-3 py-2.5">Tarifa</th>
                    <th className="text-right px-3 py-2.5">Potencia</th>
                    <th className="text-left px-3 py-2.5">Inicio</th>
                    <th className="text-left px-3 py-2.5">Renovación</th>
                    <th className="text-right px-3 py-2.5">Anual</th>
                    <th className="px-3 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {contracts.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-8 text-zinc-500 text-sm">Sin contratos</td></tr>
                  )}
                  {contracts.map((c) => (
                    <tr key={c.id} className="hover:bg-zinc-50" data-testid={`contract-row-${c.id}`}>
                      <td className="px-5 py-2.5 text-zinc-950 font-medium">{c.comercializadora}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">{c.tarifa}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs">{c.potencia_contratada} kW</td>
                      <td className="px-3 py-2.5 font-mono text-xs">{formatDate(c.fecha_inicio)}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">{formatDate(c.fecha_renovacion)}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{formatEUR(c.importe_anual)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <button onClick={() => deleteContract(c.id)} className="text-zinc-400 hover:text-rose-600" data-testid={`delete-contract-${c.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="documentos">
            <div className="bg-white border border-zinc-200 rounded-md mt-4 p-5">
              <div className="flex items-center justify-between mb-4">
                <div><h3 className="font-display text-base font-semibold tracking-tight">Documentos y facturas</h3><p className="text-xs text-zinc-500 mt-0.5">Sube facturas para extracción automática con IA</p></div>
              </div>

              <label
                htmlFor="invoice-upload"
                className="block border-2 border-dashed border-zinc-300 rounded-md bg-zinc-50 hover:bg-zinc-100 transition-colors cursor-pointer p-8 text-center"
                data-testid="upload-invoice-dropzone"
              >
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-zinc-700" />
                    <div className="text-sm font-medium text-zinc-950">Analizando con Gemini 3 Pro…</div>
                    <div className="text-xs text-zinc-500">Esto puede tardar 10-30 segundos</div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-md bg-white border border-zinc-200 flex items-center justify-center">
                      <UploadCloud className="w-5 h-5 text-zinc-700" />
                    </div>
                    <div className="text-sm font-medium text-zinc-950">Arrastra o haz clic para subir factura</div>
                    <div className="text-xs text-zinc-500 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-[#F97316]" />OCR automático con Gemini 3 Pro · PDF, JPG, PNG (máx 12MB)
                    </div>
                  </div>
                )}
                <input
                  id="invoice-upload"
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadInvoice(f); e.target.value = ""; }}
                  data-testid="upload-invoice-input"
                />
              </label>

              <div className="mt-6 space-y-2">
                {documents.map((d) => (
                  <div key={d.id} className="bg-zinc-50 border border-zinc-200 rounded-md p-4" data-testid={`document-card-${d.id}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-5 h-5 text-zinc-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-zinc-950 truncate">{d.nombre}</div>
                          <div className="text-xs text-zinc-500 mt-0.5">
                            {(d.size / 1024).toFixed(1)} KB · {formatDate(d.created_at)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {d.ocr_status === "completed" && <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.08em] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded"><CheckCircle2 className="w-3 h-3" />Analizado</span>}
                        {d.ocr_status === "failed" && <span className="text-[10px] uppercase tracking-[0.08em] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">Error OCR</span>}
                        {d.ocr_status === "skipped" && <span className="text-[10px] uppercase tracking-[0.08em] font-semibold text-zinc-600 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded">No OCR</span>}
                      </div>
                    </div>
                    {d.extracted_data && typeof d.extracted_data === "object" && !d.extracted_data.error && (
                      <div className="mt-3 pt-3 border-t border-zinc-200 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        {["cups", "comercializadora", "tarifa", "potencia_contratada_kw", "consumo_kwh", "importe_total_eur", "periodo_facturacion_inicio", "periodo_facturacion_fin"].map((k) => {
                          const val = d.extracted_data[k];
                          if (val == null || val === "") return null;
                          return (
                            <div key={k}>
                              <div className="text-[10px] uppercase tracking-[0.08em] text-zinc-400 font-semibold">{k.replace(/_/g, " ")}</div>
                              <div className="font-mono text-zinc-950 mt-0.5 truncate">{String(val)}</div>
                            </div>
                          );
                        })}
                        {d.extracted_data.resumen && (
                          <div className="col-span-2 md:col-span-4 text-xs text-zinc-700 italic border-l-2 border-[#F97316] pl-3">
                            {d.extracted_data.resumen}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {documents.length === 0 && <div className="text-center py-6 text-zinc-500 text-sm">Sin documentos</div>}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

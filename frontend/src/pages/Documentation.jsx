import { useEffect, useState } from "react";
import { api } from "../lib/api";
import Topbar from "../components/layout/Topbar";
import {
  Sparkles, UploadCloud, Loader2, FileText, CheckCircle2,
  Plus, Search, Filter, Trash2, Edit, Download, BookOpen,
  FileSpreadsheet, Image, Building2, Folder, Grid, List, Save
} from "lucide-react";
import { formatDate } from "../lib/constants";
import { toast } from "sonner";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "../components/ui/select";

const CATEGORIES = [
  { value: "tarifas", label: "Tarifas Temporales", icon: FileSpreadsheet, color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "logos", label: "Logos Corporativos", icon: Image, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "paso_a_paso", label: "Guías / Paso a Paso", icon: BookOpen, color: "bg-violet-50 text-violet-700 border-violet-200" },
  { value: "info_empresa", label: "Información de Empresa", icon: Building2, color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "otros", label: "Otros Documentos", icon: Folder, color: "bg-zinc-100 text-zinc-600 border-zinc-200" }
];

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.value, c]));

export default function Documentation() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("__all__");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'list'
  
  // Dialog States
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("add"); // 'add' or 'edit'
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Form States
  const [formDocId, setFormDocId] = useState(null);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("tarifas");
  const [formDescription, setFormDescription] = useState("");

  const loadDocs = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/documents");
      // Filter documents where cliente_id is null (general corporate documentation)
      const generalDocs = (data || []).filter(d => !d.cliente_id);
      setDocs(generalDocs);
    } catch {
      toast.error("Error al cargar la documentación");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocs();
  }, []);

  const openAddDialog = () => {
    setDialogMode("add");
    setFormTitle("");
    setFormCategory("tarifas");
    setFormDescription("");
    setSelectedFile(null);
    setDialogOpen(true);
  };

  const openEditDialog = (doc) => {
    setDialogMode("edit");
    setFormDocId(doc.id);
    setFormTitle(doc.nombre);
    setFormCategory(doc.tipo || "otros");
    setFormDescription(doc.extracted_data?.description || "");
    setSelectedFile(null);
    setDialogOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!formTitle) {
        // Default title to file name without extension
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        setFormTitle(nameWithoutExt);
      }
    }
  };

  const handleSubmit = async () => {
    if (dialogMode === "add") {
      if (!selectedFile) {
        toast.error("Selecciona un archivo para subir");
        return;
      }
      setUploading(true);
      const fd = new FormData();
      fd.append("file", selectedFile);
      fd.append("tipo", formCategory);
      fd.append("description", formDescription);
      
      try {
        await api.post("/documents/upload", fd, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        toast.success("Documento subido correctamente");
        setDialogOpen(false);
        loadDocs();
      } catch {
        toast.error("Error al subir el documento");
      } finally {
        setUploading(false);
      }
    } else {
      if (!formTitle.trim()) {
        toast.error("El nombre del documento es obligatorio");
        return;
      }
      setUploading(true);
      try {
        await api.patch(`/documents/${formDocId}`, {
          nombre: formTitle.trim(),
          tipo: formCategory,
          extracted_data: { description: formDescription }
        });
        toast.success("Documento actualizado correctamente");
        setDialogOpen(false);
        loadDocs();
      } catch {
        toast.error("Error al actualizar el documento");
      } finally {
        setUploading(false);
      }
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este documento permanentemente?")) return;
    try {
      await api.delete(`/documents/${id}`);
      toast.success("Documento eliminado correctamente");
      loadDocs();
    } catch {
      toast.error("Error al eliminar el documento");
    }
  };

  const handleDownload = (doc) => {
    toast.success(`Descargando mock de "${doc.nombre}"`);
  };

  // Filtered Docs
  const filteredDocs = docs.filter(doc => {
    const matchesSearch = doc.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (doc.extracted_data?.description || "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "__all__" || doc.tipo === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <Topbar
        title="Documentación Corporativa"
        subtitle="Repositorio central de tarifas, guías, logos y recursos compartidos"
        action={
          <Button
            onClick={openAddDialog}
            className="h-9 bg-zinc-950 text-white hover:bg-zinc-800 rounded-md text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Subir Documento
          </Button>
        }
      />

      <div className="p-6 md:p-8 anim-fadeup">
        {/* Category Pills & Filters */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveCategory("__all__")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  activeCategory === "__all__"
                    ? "bg-zinc-950 text-white border-zinc-950"
                    : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
                }`}
              >
                Todos ({docs.length})
              </button>
              {CATEGORIES.map(cat => {
                const count = docs.filter(d => d.tipo === cat.value).length;
                return (
                  <button
                    key={cat.value}
                    onClick={() => setActiveCategory(cat.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${
                      activeCategory === cat.value
                        ? "bg-zinc-950 text-white border-zinc-950 shadow-sm"
                        : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    <cat.icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{cat.label}</span>
                    <span className="bg-zinc-100 text-zinc-600 px-1.5 py-0.2 rounded-full text-[9px] font-bold">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center bg-zinc-100 rounded-md p-0.5 border border-zinc-200 shrink-0 self-end md:self-auto">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-sm transition-all ${viewMode === "grid" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-950"}`}
                title="Vista cuadrícula"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-sm transition-all ${viewMode === "list" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-950"}`}
                title="Vista lista"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <Input
              placeholder="Buscar documentos por nombre o descripción…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 bg-white"
            />
          </div>
        </div>

        {/* Documents Grid / List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            <div className="text-sm font-medium">Cargando repositorio de documentación…</div>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-md p-16 text-center text-zinc-500 max-w-2xl mx-auto flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-400">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold text-zinc-950">Sin resultados</h3>
              <p className="text-xs text-zinc-500 mt-1 leading-normal">
                {search || activeCategory !== "__all__"
                  ? "Prueba a cambiar los criterios de búsqueda o de filtro."
                  : "Aún no has subido ningún documento corporativo. Comienza subiendo tarifas, logos o manuales."}
              </p>
            </div>
            {(search || activeCategory !== "__all__") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setSearch(""); setActiveCategory("__all__"); }}
                className="mt-2 text-xs"
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredDocs.map(doc => {
              const cat = CATEGORY_MAP[doc.tipo] || { label: doc.tipo || "Otro", icon: Folder, color: "bg-zinc-50 text-zinc-600 border-zinc-200" };
              const IconComponent = cat.icon;
              return (
                <div
                  key={doc.id}
                  className="bg-white border border-zinc-200 rounded-md p-5 flex flex-col justify-between hover:border-zinc-300 hover:shadow-md transition-all group relative overflow-hidden"
                >
                  {/* Subtle top decoration */}
                  <div className={`absolute top-0 left-0 right-0 h-1 ${cat.color.split(" ")[0]}`} />

                  <div>
                    {/* Category icon and tag */}
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-9 h-9 rounded-md flex items-center justify-center border ${cat.color} shrink-0`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] uppercase tracking-[0.06em] font-bold border ${cat.color}`}>
                        {cat.label}
                      </span>
                    </div>

                    {/* Doc metadata */}
                    <h4 className="font-display text-sm font-semibold text-zinc-950 group-hover:text-zinc-900 truncate mb-1" title={doc.nombre}>
                      {doc.nombre}
                    </h4>
                    <p className="text-[10px] text-zinc-400 font-mono mb-3">
                      {(doc.size / 1024).toFixed(1)} KB · {formatDate(doc.created_at)}
                    </p>
                    
                    {/* Description/Notes */}
                    <p className="text-xs text-zinc-500 line-clamp-3 leading-relaxed mb-4 min-h-[54px]">
                      {doc.extracted_data?.description || <span className="text-zinc-400 italic">Sin descripción adjunta.</span>}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-zinc-100 mt-2 shrink-0">
                    <button
                      onClick={() => handleDownload(doc)}
                      className="p-1.5 rounded-md hover:bg-zinc-50 text-zinc-500 hover:text-zinc-950 transition-colors"
                      title="Descargar archivo"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditDialog(doc)}
                        className="p-1.5 rounded-md hover:bg-zinc-50 text-zinc-500 hover:text-zinc-950 transition-colors"
                        title="Editar detalles"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-1.5 rounded-md hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-colors"
                        title="Eliminar permanentemente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="bg-white border border-zinc-200 rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr className="text-[10px] uppercase tracking-[0.08em] text-zinc-500 font-semibold">
                    <th className="text-left px-5 py-3">Documento</th>
                    <th className="text-left px-3 py-3">Categoría</th>
                    <th className="text-left px-3 py-3">Descripción</th>
                    <th className="text-left px-3 py-3">Tamaño</th>
                    <th className="text-left px-3 py-3">Fecha subida</th>
                    <th className="text-right px-5 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredDocs.map(doc => {
                    const cat = CATEGORY_MAP[doc.tipo] || { label: doc.tipo || "Otro", icon: Folder, color: "bg-zinc-50 text-zinc-600 border-zinc-200" };
                    return (
                      <tr key={doc.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded flex items-center justify-center border shrink-0 ${cat.color}`}>
                              <cat.icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="font-medium text-zinc-950 font-display text-xs truncate max-w-[200px]" title={doc.nombre}>
                              {doc.nombre}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] uppercase tracking-[0.06em] font-bold border ${cat.color}`}>
                            {cat.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-zinc-500 text-xs truncate max-w-xs" title={doc.extracted_data?.description || ""}>
                          {doc.extracted_data?.description || <span className="text-zinc-400 italic">Sin descripción</span>}
                        </td>
                        <td className="px-3 py-3 font-mono text-[11px] text-zinc-600">
                          {(doc.size / 1024).toFixed(1)} KB
                        </td>
                        <td className="px-3 py-3 font-mono text-[11px] text-zinc-600">
                          {formatDate(doc.created_at)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleDownload(doc)}
                              className="p-1 text-zinc-400 hover:text-zinc-950 transition-colors"
                              title="Descargar mock"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openEditDialog(doc)}
                              className="p-1 text-zinc-400 hover:text-zinc-950 transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(doc.id)}
                              className="p-1 text-zinc-400 hover:text-rose-600 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Upload/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display font-bold tracking-tight">
              {dialogMode === "add" ? "Subir nuevo documento" : "Editar detalles del documento"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* File selection only for Add Mode */}
            {dialogMode === "add" && (
              <div>
                <Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Archivo</Label>
                <label
                  htmlFor="doc-file-upload"
                  className="block mt-1.5 border-2 border-dashed border-zinc-200 rounded-md bg-zinc-50 hover:bg-zinc-100 transition-colors cursor-pointer p-6 text-center"
                >
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <UploadCloud className="w-5 h-5 text-zinc-500" />
                    <span className="text-xs font-semibold text-zinc-950">
                      {selectedFile ? selectedFile.name : "Seleccionar archivo"}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : "Formatos aceptados: PDF, JPG, PNG, Excel, Word (máx 12MB)"}
                    </span>
                  </div>
                  <input
                    id="doc-file-upload"
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            )}

            {/* Document Title / Name */}
            <div>
              <Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Nombre del documento</Label>
              <Input
                placeholder="Ej. Tarifas Endesa Junio 2026"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="mt-1 h-9 border-zinc-200"
              />
            </div>

            {/* Category Select */}
            <div>
              <Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Categoría</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger className="mt-1 h-9 border-zinc-200">
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description / Notes */}
            <div>
              <Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Descripción / Notas</Label>
              <textarea
                placeholder="Breve descripción del documento para búsquedas rápidas..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="mt-1 w-full min-h-[90px] rounded-md border border-zinc-200 px-3 py-2 text-xs focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={uploading}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={uploading}
              className="bg-zinc-950 hover:bg-zinc-800 text-white min-w-[80px]"
            >
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : dialogMode === "add" ? (
                "Subir"
              ) : (
                "Guardar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

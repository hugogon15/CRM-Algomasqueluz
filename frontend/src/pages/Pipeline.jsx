import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { api, getClients } from "../lib/api";
import { supabase } from "../lib/supabase";
import { CLIENT_STATES, CONTRACT_STATES, STATE_MAP, CLIENT_STATE_MAP, formatEUR, formatDate, formatPhone } from "../lib/constants";
import Topbar from "../components/layout/Topbar";
import { toast } from "sonner";
import { 
  Building2, X, ExternalLink, Copy, Check, RotateCw, Play, Send, 
  CheckCircle2, AlertCircle, Loader2, Sparkles, Phone, Mail, User, ShieldAlert,
  Save, Trash2, UploadCloud, FileText, Plus, Edit2, FileUp
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";

function emptyClient() {
  return {
    nombre: "", telefono: "", email: "", cups: "", provincia: "",
    direccion: "", nif: "", estado: "nuevo_lead", comercial_id: "",
    tiene_ahorro: false, ahorro_estimado: 0, notas: "",
    fecha_vencimiento: "", tarifa: "2.0TD",
    fecha_nacimiento: "", tipo_titular: "fisica", cif: "",
    titular_no_firmante: false, firmante_nombre: "", firmante_dni: "", iban: "",
    comision: 0, tipo_servicio: "luz"
  };
}

// Robust Inline Confetti Effect
function ConfettiEffect({ active }) {
  if (!active) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {[...Array(50)].map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 2;
        const duration = 2 + Math.random() * 2;
        const size = 6 + Math.random() * 8;
        const color = ["bg-red-500", "bg-yellow-400", "bg-blue-500", "bg-emerald-500", "bg-pink-500", "bg-purple-500"][Math.floor(Math.random() * 6)];
        const shape = Math.random() > 0.5 ? "rounded-full" : "rounded-sm";
        return (
          <div
            key={i}
            className={`absolute ${color} ${shape} opacity-75`}
            style={{
              left: `${left}%`,
              top: `-20px`,
              width: `${size}px`,
              height: `${size}px`,
              animation: `confetti-fall ${duration}s linear infinite`,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(105vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

const COLLABORATORS = [
  { value: "aenergetic", label: "Aenergetic Intranet", url: "https://intranet.aenergetic.es/index.php?controller=login", active: true },
  { value: "wixer", label: "Wixer / Optimizoo", url: "https://app.optimizoo.es/dashboard", active: true },
  { value: "telco", label: "Telco (Tribu One)", url: "https://app.tribu.one/order_items", active: true },
  { value: "siga", label: "Siga", url: null, active: false, badge: "Próximamente" },
  { value: "insolen", label: "Insolen", url: null, active: false, badge: "Próximamente" }
];

const STATE_COLORS_HEX = {
  nuevo_lead: "#3b82f6",          // Blue
  pendiente_estudio: "#f59e0b",   // Amber/Gold
  sin_ahorro: "#71717a",          // Zinc/Grey
  incompleto: "#a855f7",          // Purple
  enviado_firma: "#6366f1",       // Indigo
  incidencia: "#ec4899",          // Pink
  pendiente_activacion: "#8b5cf6", // Violet/Purple
  cliente_activo: "#10b981",      // Emerald/Green
  renovacion: "#f97316",          // Orange
  no_renovado: "#f43f5e",         // Rose
  baja: "#ef4444",                // Red
};

export default function Pipeline() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [clientCreateOpen, setClientCreateOpen] = useState(false);
  const [newClientForm, setNewClientForm] = useState(emptyClient());
  const [activeWizardStep, setActiveWizardStep] = useState("client"); // "client" | "contract"
  const [createdClient, setCreatedClient] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [pendingSignatureOpen, setPendingSignatureOpen] = useState(false);
  const [pendingSignatureClient, setPendingSignatureClient] = useState(null);
  const [pendingSignatureContractId, setPendingSignatureContractId] = useState(null);
  const [pendingSignatureForm, setPendingSignatureForm] = useState({
    email: "", iban: "", tipo_titular: "fisica", nif: "", cif: "",
    titular_no_firmante: false, firmante_nombre: "", firmante_dni: ""
  });
  const [pendingSignatureFile, setPendingSignatureFile] = useState(null);
  const [pendingSignatureUploading, setPendingSignatureUploading] = useState(false);

  const handleNewClientInputChange = (k, val) => {
    const updatedForm = { ...newClientForm, [k]: val };
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
    setNewClientForm(updatedForm);
  };

  const submitNewClient = async () => {
    if (!newClientForm.nombre?.trim()) {
      toast.error("El nombre del cliente es obligatorio");
      return;
    }
    try {
      // 1. Crear al cliente
      const { data: newClient } = await api.post("/clients", newClientForm);
      if (!newClient?.id) {
        throw new Error("No se recibió el ID del cliente");
      }
      setCreatedClient(newClient);
      
      // 2. Pre-rellenar los datos del nuevo contrato usando la info del cliente
      setNewContract({
        comercializadora: "",
        tarifa: newClientForm.tarifa || "2.0TD",
        potencia_contratada: 5.5,
        fecha_inicio: new Date().toISOString().slice(0, 10),
        fecha_renovacion: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
        permanencia_meses: 12,
        importe_anual: 0,
        notas: "",
        comercializadora_anterior: "",
        comercializadora_actual: "",
        empresa_colaboradora: "",
        cups: newClientForm.cups || "",
        consumo_anual: 0,
        estado: "pendiente_estudio",
        tipo_servicio: newClientForm.tipo_servicio || "luz",
        direccion: newClientForm.direccion || "",
        provincia: newClientForm.provincia || "",
        comision: newClientForm.comision || 0,
        etiqueta: "",
        fecha_fin_contrato: "",
        fecha_alerta_personalizada: "",
        motivo_alerta_personalizada: "",
        relaciones: []
      });
      
      setActiveWizardStep("contract");
      toast.success("Cliente creado con éxito. Introduce los datos de su contrato.");
    } catch (e) {
      console.error(e);
      toast.error("Error al crear cliente");
    }
  };

  const submitNewContractWizard = async () => {
    if (!createdClient?.id) {
      toast.error("No hay un cliente seleccionado para asociar el contrato");
      return;
    }
    try {
      // 1. Crear el contrato asociado al cliente creado
      await api.post("/contracts", { ...newContract, cliente_id: createdClient.id });
      
      // 2. Si se configuró fecha de renovación, enviar alerta
      if (newContract.fecha_renovacion) {
        const sessionToken = localStorage.getItem("aml_session_token");
        fetch("/api/send-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${sessionToken}`
          },
          body: JSON.stringify({
            cliente_nombre: createdClient.nombre,
            fecha_vencimiento: formatDate(newContract.fecha_renovacion)
          })
        }).then(res => {
          if (res.ok) {
            toast.success("Alerta de correo enviada con éxito a estudios@algomasqueluz.com");
          }
        }).catch(err => {
          console.error("Error enviando alerta por correo:", err);
        });
      }
      
      toast.success("Contrato creado y cliente añadido al Pipeline con éxito");
      setClientCreateOpen(false);
      setCreatedClient(null);
      setActiveWizardStep("client");
      load(); // Refrescar pipeline
    } catch (e) {
      console.error(e);
      toast.error("Error al crear el contrato");
    }
  };

  const submitPendingSignature = async () => {
    if (!pendingSignatureClient?.id || !pendingSignatureContractId) {
      toast.error("Faltan datos del cliente o contrato para procesar la firma");
      return;
    }
    
    if (!pendingSignatureForm.email?.trim()) {
      toast.error("El email es obligatorio para enviar a firma");
      return;
    }
    if (!pendingSignatureForm.iban?.trim()) {
      toast.error("El IBAN es obligatorio para enviar a firma");
      return;
    }
    if (pendingSignatureForm.tipo_titular === "juridica" && !pendingSignatureForm.cif?.trim()) {
      toast.error("El CIF es obligatorio para personas jurídicas");
      return;
    }
    if (pendingSignatureForm.tipo_titular === "fisica" && !pendingSignatureForm.nif?.trim()) {
      toast.error("El DNI / NIF es obligatorio para personas físicas");
      return;
    }
    if (pendingSignatureForm.titular_no_firmante) {
      if (!pendingSignatureForm.firmante_nombre?.trim()) {
        toast.error("El nombre del firmante es obligatorio");
        return;
      }
      if (!pendingSignatureForm.firmante_dni?.trim()) {
        toast.error("El DNI / NIF del firmante es obligatorio");
        return;
      }
    }
    if (!pendingSignatureFile) {
      toast.error("Debes adjuntar al menos un documento para pasar a pendiente de firma");
      return;
    }

    setPendingSignatureUploading(true);
    try {
      // 1. Guardar los datos actualizados del cliente
      const clientPayload = {
        email: pendingSignatureForm.email,
        iban: pendingSignatureForm.iban,
        tipo_titular: pendingSignatureForm.tipo_titular,
        nif: pendingSignatureForm.tipo_titular === "fisica" ? pendingSignatureForm.nif : "",
        cif: pendingSignatureForm.tipo_titular === "juridica" ? pendingSignatureForm.cif : "",
        titular_no_firmante: pendingSignatureForm.titular_no_firmante,
        firmante_nombre: pendingSignatureForm.titular_no_firmante ? pendingSignatureForm.firmante_nombre : "",
        firmante_dni: pendingSignatureForm.titular_no_firmante ? pendingSignatureForm.firmante_dni : ""
      };
      const { data: updatedClient } = await api.patch(`/clients/${pendingSignatureClient.id}`, clientPayload);

      // 2. Subir el documento obligatorio
      const fd = new FormData();
      fd.append("file", pendingSignatureFile);
      fd.append("cliente_id", pendingSignatureClient.id);
      fd.append("tipo", "contrato");
      await api.post("/documents/upload", fd);

      // 3. Modificar el estado del contrato en Supabase
      await api.patch(`/contracts/${pendingSignatureContractId}`, { estado: "enviado_firma" });

      toast.success("Cliente actualizado, documento subido y contrato enviado a firma");
      setPendingSignatureOpen(false);
      setPendingSignatureFile(null);
      
      // Abrir modal de WhatsApp automatizado
      handleOpenWhatsAppModal(updatedClient);
      
      load(); // Refrescar pipeline
    } catch (e) {
      console.error(e);
      toast.error("Error al procesar el envío a firma");
    } finally {
      setPendingSignatureUploading(false);
    }
  };
  
  // Confetti state
  const [showConfetti, setShowConfetti] = useState(false);
  
  // WhatsApp proposal template modal state
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [whatsappTarget, setWhatsappTarget] = useState("pepo"); // pepo or client
  const [whatsappClient, setWhatsappClient] = useState(null);
  const [whatsappText, setWhatsappText] = useState("");
  const [newCommentText, setNewCommentText] = useState("");

  // Sync Stepper State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStep, setSyncStep] = useState(0);
  const [syncLogs, setSyncLogs] = useState([]);
  const [syncCollaborator, setSyncCollaborator] = useState("aenergetic");
  
  // Copy feedback state
  const [copiedField, setCopiedField] = useState(null);

  // Contracts list and editor
  const [contracts, setContracts] = useState([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [newContract, setNewContract] = useState({
    comercializadora: "", tarifa: "2.0TD", potencia_contratada: 5.5,
    fecha_inicio: new Date().toISOString().slice(0, 10),
    fecha_renovacion: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    permanencia_meses: 12, importe_anual: 0, notas: "",
    comercializadora_anterior: "", comercializadora_actual: "",
    empresa_colaboradora: "", cups: "", consumo_anual: 0, estado: "pendiente_estudio",
    tipo_servicio: "luz", direccion: "", provincia: "", comision: 0,
    etiqueta: "", fecha_fin_contrato: "", fecha_alerta_personalizada: "",
    motivo_alerta_personalizada: "", relaciones: []
  });

  // Documents list and OCR
  const [documents, setDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Client editor form
  const [clientForm, setClientForm] = useState({
    nombre: "", nif: "", telefono: "", email: "", cups: "", provincia: "",
    direccion: "", tarifa: "2.0TD", estado: "nuevo_lead", comercial_id: "",
    tiene_ahorro: false, ahorro_estimado: 0, notas_limpias: "", comentarios: [],
    fecha_nacimiento: "", tipo_titular: "fisica", cif: "",
    titular_no_firmante: false, firmante_nombre: "", firmante_dni: "", iban: "",
    comision: 0, tipo_servicio: "luz"
  });
  const [savingClient, setSavingClient] = useState(false);
  const [options, setOptions] = useState({ provincias: [], comercializadoras: [] });

  // Fetch metadata options
  useEffect(() => {
    api.get("/meta/options").then((r) => setOptions(r.data));
  }, []);

  const loadClientContractsAndDocs = async (clientId) => {
    if (!clientId) return;
    setLoadingContracts(true);
    setLoadingDocuments(true);
    try {
      const { data: contractsData } = await api.get(`/contracts?cliente_id=${clientId}`);
      setContracts(contractsData);
    } catch (e) {
      console.error("Error al cargar contratos", e);
    } finally {
      setLoadingContracts(false);
    }

    try {
      const { data: documentsData } = await api.get(`/documents?cliente_id=${clientId}`);
      setDocuments(documentsData);
    } catch (e) {
      console.error("Error al cargar documentos", e);
    } finally {
      setLoadingDocuments(false);
    }
  };

  useEffect(() => {
    if (selectedClient) {
      loadClientContractsAndDocs(selectedClient.id);
      
      setClientForm({
        nombre: selectedClient.nombre || "",
        nif: selectedClient.nif || "",
        telefono: selectedClient.telefono || "",
        email: selectedClient.email || "",
        cups: selectedClient.cups || "",
        tarifa: selectedClient.tarifa || "2.0TD",
        direccion: selectedClient.direccion || "",
        provincia: selectedClient.provincia || "",
        estado: selectedClient.estado || "nuevo_lead",
        comercial_id: selectedClient.comercial_id || "",
        ahorro_estimado: selectedClient.ahorro_estimado || 0,
        tiene_ahorro: selectedClient.tiene_ahorro || false,
        notas_limpias: selectedClient.notas_limpias || "",
        comentarios: selectedClient.comentarios || [],
        fecha_nacimiento: selectedClient.fecha_nacimiento || "",
        tipo_titular: selectedClient.tipo_titular || "fisica",
        cif: selectedClient.cif || "",
        titular_no_firmante: selectedClient.titular_no_firmante || false,
        firmante_nombre: selectedClient.firmante_nombre || "",
        firmante_dni: selectedClient.firmante_dni || "",
        iban: selectedClient.iban || "",
        comision: selectedClient.comision || 0,
        tipo_servicio: selectedClient.tipo_servicio || "luz"
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClient?.id]);

  const handleSaveClient = async () => {
    if (!selectedClient) return;
    setSavingClient(true);
    try {
      const response = await api.patch(`/clients/${selectedClient.id}`, clientForm);
      toast.success("Cliente guardado correctamente");
      // Update local clients list to instantly update Kanban board!
      setClients(prev => prev.map(c => c.id === selectedClient.id ? response.data : c));
      // Refresh the active selectedClient so details are in sync
      setSelectedClient(response.data);
    } catch (e) {
      toast.error("Error al guardar los datos del cliente");
    } finally {
      setSavingClient(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;
    const stored = localStorage.getItem("aml_user");
    const user = stored ? JSON.parse(stored) : null;
    const isAdmin = user && user.role === "admin";

    const confirmMessage = isAdmin
      ? "¿Estás seguro de que deseas eliminar permanentemente este cliente, junto con todos sus contratos y documentos asociados? Esta acción no se puede deshacer."
      : "¿Estás seguro de que deseas eliminar este cliente? Se guardará en el registro del CRM y solo un administrador podrá borrarlo definitivamente.";

    if (!window.confirm(confirmMessage)) {
      return;
    }
    try {
      await api.delete(`/clients/${selectedClient.id}`);
      toast.success(isAdmin ? "Cliente eliminado permanentemente con éxito" : "Cliente eliminado correctamente del CRM");
      setClients(prev => prev.filter(c => c.id !== selectedClient.id));
      setSelectedClient(null);
    } catch (e) {
      toast.error("Error al eliminar el cliente");
    }
  };

  const handleUploadInvoice = async (file) => {
    if (!selectedClient) return;
    setUploadingDoc(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("cliente_id", selectedClient.id);
      fd.append("tipo", "factura");
      
      const { data } = await api.post("/documents/upload", fd);
      toast.success("Factura subida y analizada con éxito");
      
      // Reload documents
      const { data: documentsData } = await api.get(`/documents?cliente_id=${selectedClient.id}`);
      setDocuments(documentsData);
      
      // Reload clients to see if CUPS or other data was updated
      await load();
    } catch (e) {
      toast.error("Error al subir e integrar documento");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!confirm("¿Eliminar documento?")) return;
    try {
      await api.delete(`/documents/${docId}`);
      toast.success("Documento eliminado");
      // Reload documents
      const { data: documentsData } = await api.get(`/documents?cliente_id=${selectedClient.id}`);
      setDocuments(documentsData);
    } catch (e) {
      toast.error("Error al eliminar documento");
    }
  };

  const handleSaveContract = async () => {
    if (!selectedClient) return;
    try {
      if (editingContract) {
        await api.patch(`/contracts/${editingContract.id}`, newContract);
        toast.success("Contrato actualizado con éxito");
      } else {
        await api.post("/contracts", { ...newContract, cliente_id: selectedClient.id });
        toast.success("Contrato creado con éxito");
      }
      setContractOpen(false);
      setEditingContract(null);
      // Reload contracts
      const { data: contractsData } = await api.get(`/contracts?cliente_id=${selectedClient.id}`);
      setContracts(contractsData);
    } catch (e) {
      toast.error("Error al guardar contrato");
    }
  };

  const handleDeleteContract = async (contractId) => {
    if (!confirm("¿Eliminar contrato?")) return;
    try {
      await api.delete(`/contracts/${contractId}`);
      toast.success("Contrato eliminado");
      // Reload contracts
      const { data: contractsData } = await api.get(`/contracts?cliente_id=${selectedClient.id}`);
      setContracts(contractsData);
    } catch (e) {
      toast.error("Error al eliminar contrato");
    }
  };

  const load = async () => {
    try {
      const { data } = await api.get("/clients");
      setClients(data);
    } catch (e) {
      toast.error("Error cargando clientes");
    }

    try {
      const { data: contractsData } = await api.get("/contracts");
      setContracts(contractsData);
    } catch (e) {
      console.error("Error al cargar contratos", e);
    }

    try {
      const { data: usersData } = await api.get("/users");
      setUsers(usersData);
    } catch (e) {
      console.error("Error al cargar comerciales", e);
    }
  };

  useEffect(() => {
    load();
    
    // Live realtime channel subscription for pipeline view (listen to both clients and contracts)
    const channel = supabase
      .channel('pipeline-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, () => {
        load();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contratos' }, () => {
        load();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Update selected client if clients list updates to ensure fresh state inside drawer
  useEffect(() => {
    if (selectedClient) {
      const fresh = clients.find(c => c.id === selectedClient.id);
      if (fresh) {
        setSelectedClient(fresh);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients]);

  const pipelineContracts = contracts.map(contract => {
    const client = clients.find(cl => cl.id === contract.cliente_id) || {};
    return {
      ...contract,
      nombre: client.nombre || contract.cliente_nombre || "Sin nombre",
      provincia: client.provincia || "",
      cups: client.cups || contract.cups || "",
      comercial_id: client.comercial_id || "",
      comercial_name: client.comercial_name || "",
      telefono: client.telefono || "",
      email: client.email || "",
      cif: client.cif || "",
      nif: client.nif || "",
      colaborador: client.colaborador || "",
      sync_status: client.sync_status || "",
      comision: client.comision || 0
    };
  });

  const columns = CONTRACT_STATES
    .filter((s) => s.value !== "eliminado")
    .map((s) => ({
      ...s,
      items: pipelineContracts.filter((c) => c.estado === s.value),
    }));

  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => {
      setShowConfetti(false);
    }, 4000);
  };

  const handleOpenWhatsAppModal = (client) => {
    setWhatsappClient(client);
    setWhatsappTarget("pepo");
    
    const initialText = `Hola Pepo, acabo de enviar a firma el contrato de ${client.nombre} (CUPS: ${client.cups || "Sin CUPS"}). ¿Puedes echarle un ojo por favor?`;
    setWhatsappText(initialText);
    setWhatsappModalOpen(true);
  };

  const handleWhatsappTargetChange = (target) => {
    setWhatsappTarget(target);
    if (!whatsappClient) return;
    
    if (target === "pepo") {
      setWhatsappText(`Hola Pepo, acabo de enviar a firma el contrato de ${whatsappClient.nombre} (CUPS: ${whatsappClient.cups || "Sin CUPS"}). ¿Puedes echarle un ojo por favor?`);
    } else {
      setWhatsappText(`Hola ${whatsappClient.nombre}, te acabamos de enviar la propuesta de ahorro energético para tu firma digital. Avísanos en cuanto la completes para activarla. ¡Muchas gracias!`);
    }
  };

  const sendWhatsApp = async () => {
    if (!whatsappClient) return;
    const phone = whatsappTarget === "pepo" ? "34616907629" : whatsappClient.telefono.replace(/[^0-9]/g, "");
    
    if (!phone) {
      toast.error("El destinatario no tiene un teléfono válido");
      return;
    }

    // Encoded text
    const encoded = encodeURIComponent(whatsappText);
    window.open(`https://wa.me/${phone}?text=${encoded}`, "_blank");
    
    // Log WhatsApp in notes
    try {
      const logMsg = `[WhatsApp] Propuesta enviada a ${whatsappTarget === "pepo" ? "Pepo" : "Cliente"} el ${new Date().toLocaleDateString()}: "${whatsappText}"`;
      const currentComments = whatsappClient.comentarios || [];
      const newComment = {
        id: `comment-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user_name: "WhatsApp Log",
        text: logMsg
      };
      
      const response = await api.patch(`/clients/${whatsappClient.id}`, { comentarios: [...currentComments, newComment] });
      toast.success("Mensaje registrado en las notas del cliente");
      
      if (selectedClient && selectedClient.id === whatsappClient.id) {
        setSelectedClient(response.data);
        setClientForm(prev => ({ ...prev, comentarios: [...currentComments, newComment] }));
      }
      
      load();
    } catch (e) {
      console.error("Error logging whatsapp activity", e);
    }
    
    setWhatsappModalOpen(false);
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const fromState = result.source.droppableId;
    const toState = result.destination.droppableId;
    if (fromState === toState) return;

    const contractId = result.draggableId;
    const targetContract = pipelineContracts.find(c => c.id === contractId);
    if (!targetContract) return;

    // Interceptar el envío a firma para validar campos de cliente y subir documento
    if (toState === "enviado_firma") {
      try {
        const { data: client } = await api.get(`/clients/${targetContract.cliente_id}`);
        setPendingSignatureClient(client);
        setPendingSignatureContractId(contractId);
        setPendingSignatureForm({
          email: client.email || "",
          iban: client.iban || "",
          tipo_titular: client.tipo_titular || "fisica",
          nif: client.nif || "",
          cif: client.cif || "",
          titular_no_firmante: client.titular_no_firmante || false,
          firmante_nombre: client.firmante_nombre || "",
          firmante_dni: client.firmante_dni || ""
        });
        setPendingSignatureFile(null);
        setPendingSignatureOpen(true);
      } catch (e) {
        console.error(e);
        toast.error("Error al cargar datos del cliente");
      }
      return; // Detener flujo DnD (la tarjeta volverá a su origen hasta completar el diálogo)
    }

    // Optimistic state update
    setContracts((prev) => prev.map((c) => (c.id === contractId ? { ...c, estado: toState } : c)));
    
    try {
      await api.patch(`/contracts/${contractId}`, { estado: toState });
      toast.success(`Contrato movido a ${STATE_MAP[toState]?.label}`);
      
      // Auto-update client state to active if contract becomes active
      if (toState === "cliente_activo") {
        triggerConfetti();
        toast.success("🎉 ¡Excelente trabajo! Contrato activo.", { duration: 4000 });
      }
    } catch {
      toast.error("Error al mover contrato");
      load();
    }
  };


  // One-touch copy helper
  const handleCopy = (value, fieldName) => {
    if (!value) {
      toast.error(`No hay valor cargado para ${fieldName}`);
      return;
    }
    navigator.clipboard.writeText(value);
    setCopiedField(fieldName);
    toast.success(`${fieldName} copiado al portapapeles`);
    setTimeout(() => setCopiedField(null), 1500);
  };

  // Change Commercial Assignee
  const handleAssigneeChange = async (userId) => {
    if (!selectedClient) return;
    const commercial = users.find(u => u.id === userId);
    
    try {
      await api.patch(`/clients/${selectedClient.id}`, { comercial_id: userId || null });
      toast.success(`Cliente asignado a ${commercial ? commercial.name : "Sin asignar"}`);
      load();
    } catch (e) {
      toast.error("Error al asignar comercial");
    }
  };

  // Live Sync Stepper Simulation
  const handleStartSync = async () => {
    if (!selectedClient) return;
    const coll = COLLABORATORS.find(c => c.value === syncCollaborator);
    
    if (!coll || !coll.active) {
      toast.warning("Sincronización automática no disponible para este colaborador.");
      return;
    }

    setIsSyncing(true);
    setSyncStep(1);
    setSyncLogs([]);

    const log = (msg, type = "info") => {
      setSyncLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), message: msg, type }]);
    };

    // Simulated 5-Step Process
    // Step 1: Connecting
    log(`Iniciando conexión segura SSL con portal intranet de ${coll.label}...`, "info");
    
    setTimeout(() => {
      setSyncStep(2);
      log(`Autenticando credenciales de agencia de AlgoMásQueLuz en ${coll.label}...`, "info");
      log(`Conexión establecida con éxito. API Session Token: AMQL_JWT_${Math.random().toString(36).substring(5).toUpperCase()}`, "success");
      
      setTimeout(() => {
        setSyncStep(3);
        const searchVal = selectedClient.cups || selectedClient.nif || selectedClient.nombre;
        log(`Buscando expediente en intranet utilizando parámetros de cliente: CUPS/NIF/Nombre [${searchVal}]...`, "info");
        
        if (!selectedClient.cups && !selectedClient.nif) {
          log(`⚠️ Advertencia: CUPS y NIF no especificados en la ficha. Realizando búsqueda difusa por nombre: ${selectedClient.nombre}...`, "warning");
        }
        
        setTimeout(() => {
          setSyncStep(4);
          log(`¡Expediente de contrato localizado! ID de Portal: EXT-${Math.floor(100000 + Math.random() * 900000)}`, "success");
          log(`Extrayendo estado del contrato de la intranet externa...`, "info");
          log(`Estado en Portal: "CONTRATO FIRMADO Y APROBADO POR COMERCIALIZADORA"`, "success");
          
          setTimeout(() => {
            setSyncStep(5);
            log(`Actualizando estado en base de datos local de crm.algomasqueluz.com...`, "info");
            
            setTimeout(async () => {
              // Finalize and save to Supabase
              try {
                // Prepare new log to store in DB
                const newLog = {
                  timestamp: new Date().toISOString(),
                  message: `Sincronización automática con ${coll.label} completada. El estado del contrato se ha validado como ACTIVO en portal externo.`,
                  type: "success"
                };
                
                const updatedLogs = [newLog, ...(selectedClient.sync_logs || [])];
                
                // Update client state to Active and update metadata
                await api.patch(`/clients/${selectedClient.id}`, {
                  estado: "cliente_activo",
                  colaborador: syncCollaborator,
                  sync_status: "sincronizado",
                  sync_date: new Date().toISOString(),
                  sync_logs: updatedLogs
                });
                
                setIsSyncing(false);
                setSyncStep(0);
                toast.success(`🔄 ¡Portal sincronizado! Estado del cliente actualizado a Cliente Activo.`);
                triggerConfetti();
                load();
              } catch (e) {
                console.error(e);
                setIsSyncing(false);
                setSyncStep(0);
                toast.error("Error al actualizar la base de datos");
              }
            }, 1000);
            
          }, 1000);
          
        }, 1000);
        
      }, 1000);
      
    }, 1000);
  };

  return (
    <>
      <ConfettiEffect active={showConfetti} />
      
      <Topbar
        title="Pipeline Comercial"
        subtitle="Arrastra y suelta clientes entre estados para automatizar tareas"
        hideMenu={true}
        action={
          <Dialog open={clientCreateOpen} onOpenChange={(open) => {
            setClientCreateOpen(open);
            if (open) {
              setActiveWizardStep("client");
              setCreatedClient(null);
              setNewClientForm(emptyClient());
            }
          }}>
            <DialogTrigger asChild>
              <Button className="h-9 bg-zinc-950 text-white hover:bg-zinc-800 rounded-md text-xs font-semibold" data-testid="pipeline-new-client-button">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Nuevo cliente
              </Button>
            </DialogTrigger>
            <DialogContent className={activeWizardStep === "contract" ? "max-w-xs sm:max-w-md md:max-w-3xl lg:max-w-5xl max-h-[95vh] overflow-y-auto" : "max-w-xl max-h-[90vh] overflow-y-auto"}>
              <DialogHeader>
                <DialogTitle className="font-display font-bold tracking-tight">
                  {activeWizardStep === "contract" ? "Asistente: Crear Contrato Asociado" : "Nuevo cliente"}
                </DialogTitle>
              </DialogHeader>
              
              {activeWizardStep === "client" ? (
                <>
                  {/* Datos de Titularidad y Contacto */}
                  <div className="space-y-4">
                    <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider mb-2">Datos del Titular</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="new-client-nombre" className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Titular</Label>
                          <Input id="new-client-nombre" className="mt-1 h-9 border-zinc-200" value={newClientForm.nombre} onChange={(e) => setNewClientForm({ ...newClientForm, nombre: e.target.value })} placeholder="Nombre o Razón Social" />
                        </div>
                        <div>
                          <Label htmlFor="new-client-telefono" className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Teléfono</Label>
                          <Input id="new-client-telefono" className="mt-1 h-9 border-zinc-200" value={newClientForm.telefono} onChange={(e) => setNewClientForm({ ...newClientForm, telefono: e.target.value })} placeholder="600 000 000" />
                        </div>
                        <div>
                          <Label htmlFor="new-client-email" className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Email</Label>
                          <Input id="new-client-email" type="email" className="mt-1 h-9 border-zinc-200" value={newClientForm.email} onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })} placeholder="correo@ejemplo.com" />
                        </div>
                        <div>
                          <Label htmlFor="new-client-iban" className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">IBAN</Label>
                          <Input id="new-client-iban" className="mt-1 h-9 border-zinc-200" value={newClientForm.iban} onChange={(e) => setNewClientForm({ ...newClientForm, iban: e.target.value })} placeholder="ES00 0000 0000 0000 0000 0000" />
                        </div>
                        <div>
                          <Label htmlFor="new-client-birthdate" className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">🎂 Fecha de Nacimiento (Felicidades automática)</Label>
                          <Input id="new-client-birthdate" type="date" className="mt-1 h-9 border-zinc-200" value={newClientForm.fecha_nacimiento} onChange={(e) => setNewClientForm({ ...newClientForm, fecha_nacimiento: e.target.value })} />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Tipo de titular</Label>
                          <div className="mt-1.5 grid grid-cols-2 gap-2">
                            <label className="flex items-center gap-2 px-3 py-2.5 rounded-md border border-zinc-200 bg-white cursor-pointer text-xs text-zinc-800 font-medium">
                              <input 
                                type="radio" 
                                name="pipeline_new_tipo_titular" 
                                checked={newClientForm.tipo_titular === "fisica"} 
                                onChange={() => setNewClientForm({ ...newClientForm, tipo_titular: "fisica" })}
                                className="w-3.5 h-3.5 text-zinc-950 focus:ring-0"
                              />
                              <span>Persona física</span>
                            </label>
                            <label className="flex items-center gap-2 px-3 py-2.5 rounded-md border border-zinc-200 bg-white cursor-pointer text-xs text-zinc-800 font-medium">
                              <input 
                                type="radio" 
                                name="pipeline_new_tipo_titular" 
                                checked={newClientForm.tipo_titular === "juridica"} 
                                onChange={() => setNewClientForm({ ...newClientForm, tipo_titular: "juridica" })}
                                className="w-3.5 h-3.5 text-zinc-950 focus:ring-0"
                              />
                              <span>Persona jurídica</span>
                            </label>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="new-client-nif" className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">
                            {newClientForm.tipo_titular === "juridica" ? "CIF" : "DNI / NIF"}
                          </Label>
                          {newClientForm.tipo_titular === "juridica" ? (
                            <Input 
                              id="new-client-cif" 
                              className="mt-1 h-9 border-zinc-200" 
                              value={newClientForm.cif} 
                              onChange={(e) => setNewClientForm({ ...newClientForm, cif: e.target.value })} 
                              placeholder="A00000000"
                            />
                          ) : (
                            <Input 
                              id="new-client-nif" 
                              className="mt-1 h-9 border-zinc-200" 
                              value={newClientForm.nif} 
                              onChange={(e) => setNewClientForm({ ...newClientForm, nif: e.target.value })} 
                              placeholder="12345678Z"
                            />
                          )}
                        </div>

                        <div className="pt-2">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-800">
                            <input 
                              type="checkbox" 
                              checked={newClientForm.titular_no_firmante} 
                              onChange={(e) => setNewClientForm({ ...newClientForm, titular_no_firmante: e.target.checked })}
                              className="w-3.5 h-3.5 rounded border-zinc-300 text-zinc-950 focus:ring-0"
                            />
                            <span>La persona titular no es la firmante</span>
                          </label>
                        </div>

                        {newClientForm.titular_no_firmante && (
                          <div className="space-y-3 p-3 rounded-lg bg-zinc-50 border border-zinc-150 anim-fadeup mt-2">
                            <div>
                              <Label htmlFor="new-client-firmante-nombre" className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Titular firmante</Label>
                              <Input 
                                id="new-client-firmante-nombre" 
                                className="mt-1 h-8.5 text-xs border-zinc-200 bg-white" 
                                value={newClientForm.firmante_nombre} 
                                onChange={(e) => setNewClientForm({ ...newClientForm, firmante_nombre: e.target.value })} 
                                placeholder="Nombre del firmante / apoderado"
                              />
                            </div>
                            <div>
                              <Label htmlFor="new-client-firmante-dni" className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">DNI / NIF firmante</Label>
                              <Input 
                                id="new-client-firmante-dni" 
                                className="mt-1 h-8.5 text-xs border-zinc-200 bg-white" 
                                value={newClientForm.firmante_dni} 
                                onChange={(e) => setNewClientForm({ ...newClientForm, firmante_dni: e.target.value })} 
                                placeholder="DNI del firmante / apoderado"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="mt-4 pt-2 border-t border-zinc-100 gap-2">
                    <Button variant="outline" onClick={() => setClientCreateOpen(false)}>Cancelar</Button>
                    <Button onClick={submitNewClient} className="bg-zinc-950 hover:bg-zinc-800 text-white" data-testid="pipeline-new-client-submit">Siguiente: Contrato</Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  {/* Datos del Contrato */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 max-h-[70vh] overflow-y-auto px-1 py-1">
                    {/* Columna 1: Información Comercial */}
                    <div className="space-y-3 p-3.5 bg-zinc-50/50 rounded-xl border border-zinc-200/60">
                      <div className="flex items-center gap-2 border-b border-zinc-200/60 pb-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        <h4 className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">Datos Comerciales</h4>
                      </div>
                      
                      <div>
                        <Label className="text-[10px] uppercase font-bold text-zinc-500">Etiqueta (Casa, Local, Nave...)</Label>
                        <Input 
                          className="mt-1 h-8.5 text-xs border-zinc-200 bg-white" 
                          value={newContract.etiqueta || ""} 
                          onChange={(e) => setNewContract({ ...newContract, etiqueta: e.target.value })} 
                          placeholder="Ej: Casa, Oficina, Nave..." 
                        />
                      </div>
                      
                      <div>
                        <Label className="text-[10px] uppercase font-bold text-zinc-500">Comercializadora Anterior</Label>
                        <Input 
                          className="mt-1 h-8.5 text-xs border-zinc-200 bg-white" 
                          value={newContract.comercializadora_anterior || ""} 
                          onChange={(e) => setNewContract({ ...newContract, comercializadora_anterior: e.target.value })} 
                          placeholder="Ej: Iberdrola" 
                        />
                      </div>

                      <div>
                        <Label className="text-[10px] uppercase font-bold text-zinc-500">Nueva Comercializadora</Label>
                        <Select 
                          value={newContract.comercializadora_actual || newContract.comercializadora || ""} 
                          onValueChange={(v) => setNewContract({ ...newContract, comercializadora_actual: v, comercializadora: v })}
                        >
                          <SelectTrigger className="mt-1 h-8.5 text-xs border-zinc-200 bg-white">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {options.comercializadoras?.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-[10px] uppercase font-bold text-zinc-500">Empresa Colaboradora</Label>
                        <Select 
                          value={newContract.empresa_colaboradora || ""} 
                          onValueChange={(v) => setNewContract({ ...newContract, empresa_colaboradora: v })}
                        >
                          <SelectTrigger className="mt-1 h-8.5 text-xs border-zinc-200 bg-white">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {(() => {
                              const baseOptions = ["AENERGETIC", "TELCO", "WIXER", "GANA ENERGÍA", "SIGA"];
                              const currentVal = newContract.empresa_colaboradora;
                              const showOptions = [...baseOptions];
                              if (currentVal && !baseOptions.includes(currentVal.toUpperCase())) {
                                showOptions.push(currentVal);
                              }
                              return showOptions.map((opt) => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ));
                            })()}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-[10px] uppercase font-bold text-zinc-500">Estado del Contrato</Label>
                        <Select 
                          value={newContract.estado || "pendiente_estudio"} 
                          onValueChange={(v) => setNewContract({ ...newContract, estado: v })}
                        >
                          <SelectTrigger className="mt-1 h-8.5 text-xs border-zinc-200 bg-white">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {CONTRACT_STATES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-[10px] uppercase font-bold text-zinc-500">Comisión (€)</Label>
                        <Input 
                          type="number" 
                          className="mt-1 h-8.5 text-xs border-zinc-200 bg-white" 
                          value={newContract.comision || 0} 
                          onChange={(e) => setNewContract({ ...newContract, comision: Number(e.target.value) })} 
                          placeholder="0" 
                        />
                      </div>
                    </div>

                    {/* Columna 2: Datos Técnicos y Ubicación */}
                    <div className="space-y-3 p-3.5 bg-zinc-50/50 rounded-xl border border-zinc-200/60">
                      <div className="flex items-center gap-2 border-b border-zinc-200/60 pb-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <h4 className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">Datos Técnicos y Suministro</h4>
                      </div>
                      
                      <div>
                        <Label className="text-[10px] uppercase font-bold text-zinc-500">CUPS</Label>
                        <Input 
                          className="mt-1 h-8.5 text-xs font-mono border-zinc-200 bg-white" 
                          value={newContract.cups || ""} 
                          onChange={(e) => setNewContract({ ...newContract, cups: e.target.value })} 
                          placeholder="ES0021..." 
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] uppercase font-bold text-zinc-500">Suministro</Label>
                          <Select 
                            value={newContract.tipo_servicio || "luz"} 
                            onValueChange={(v) => setNewContract({ ...newContract, tipo_servicio: v })}
                          >
                            <SelectTrigger className="mt-1 h-8.5 text-xs border-zinc-200 bg-white">
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="luz">💡 Luz</SelectItem>
                              <SelectItem value="gas">🔥 Gas</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase font-bold text-zinc-500">Tarifa</Label>
                          <Input 
                            className="mt-1 h-8.5 text-xs border-zinc-200 bg-white" 
                            value={newContract.tarifa} 
                            onChange={(e) => setNewContract({ ...newContract, tarifa: e.target.value })} 
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] uppercase font-bold text-zinc-500">Potencia (kW)</Label>
                          <Input 
                            type="number" 
                            step="0.01" 
                            className="mt-1 h-8.5 text-xs border-zinc-200 bg-white" 
                            value={newContract.potencia_contratada} 
                            onChange={(e) => setNewContract({ ...newContract, potencia_contratada: Number(e.target.value) })} 
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase font-bold text-zinc-500">Consumo (kWh)</Label>
                          <Input 
                            type="number" 
                            className="mt-1 h-8.5 text-xs border-zinc-200 bg-white" 
                            value={newContract.consumo_anual || 0} 
                            onChange={(e) => setNewContract({ ...newContract, consumo_anual: Number(e.target.value) })} 
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-[10px] uppercase font-bold text-zinc-500">Dirección</Label>
                        <Input 
                          className="mt-1 h-8.5 text-xs border-zinc-200 bg-white" 
                          value={newContract.direccion || ""} 
                          onChange={(e) => setNewContract({ ...newContract, direccion: e.target.value })} 
                          placeholder="Dirección del suministro" 
                        />
                      </div>
                      
                      <div>
                        <Label className="text-[10px] uppercase font-bold text-zinc-500">Provincia</Label>
                        <Select 
                          value={newContract.provincia || ""} 
                          onValueChange={(v) => setNewContract({ ...newContract, provincia: v })}
                        >
                          <SelectTrigger className="mt-1 h-8.5 text-xs border-zinc-200 bg-white">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {options.provincias?.map((p) => (
                              <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Columna 3: Fechas y Alertas */}
                    <div className="space-y-3 p-3.5 bg-zinc-50/50 rounded-xl border border-zinc-200/60">
                      <div className="flex items-center gap-2 border-b border-zinc-200/60 pb-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <h4 className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">Fechas y Alertas</h4>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] uppercase font-bold text-zinc-500">Inicio</Label>
                          <Input 
                            type="date" 
                            className="mt-1 h-8.5 text-xs border-zinc-200 bg-white" 
                            value={newContract.fecha_inicio} 
                            onChange={(e) => setNewContract({ ...newContract, fecha_inicio: e.target.value })} 
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase font-bold text-zinc-500">Renovación</Label>
                          <Input 
                            type="date" 
                            className="mt-1 h-8.5 text-xs border-zinc-200 bg-white" 
                            value={newContract.fecha_renovacion} 
                            onChange={(e) => setNewContract({ ...newContract, fecha_renovacion: e.target.value })} 
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-[10px] uppercase font-bold text-zinc-500">Importe Anual (€)</Label>
                        <Input 
                          type="number" 
                          className="mt-1 h-8.5 text-xs border-zinc-200 bg-white" 
                          value={newContract.importe_anual} 
                          onChange={(e) => setNewContract({ ...newContract, importe_anual: Number(e.target.value) })} 
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] uppercase font-bold text-zinc-500">Fin Contrato</Label>
                          <Input 
                            type="date" 
                            className="mt-1 h-8.5 text-xs border-zinc-200 bg-white" 
                            value={newContract.fecha_fin_contrato || ""} 
                            onChange={(e) => setNewContract({ ...newContract, fecha_fin_contrato: e.target.value })} 
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase font-bold text-zinc-500">📅 Alerta</Label>
                          <Input 
                            type="date" 
                            className="mt-1 h-8.5 text-xs border-zinc-200 bg-white" 
                            value={newContract.fecha_alerta_personalizada || ""} 
                            onChange={(e) => setNewContract({ ...newContract, fecha_alerta_personalizada: e.target.value })} 
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-[10px] uppercase font-bold text-zinc-500">Motivo / Notas de Alerta Seguimiento</Label>
                        <textarea 
                          rows={2}
                          className="mt-1 w-full rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                          value={newContract.motivo_alerta_personalizada || ""} 
                          onChange={(e) => setNewContract({ ...newContract, motivo_alerta_personalizada: e.target.value })} 
                          placeholder="Ej: Tiene permanencia 1 año, revisar..." 
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="mt-4 pt-2 border-t border-zinc-100 gap-2">
                    <Button variant="outline" className="h-8.5 text-xs" onClick={() => { setActiveWizardStep("client"); }}>Atrás</Button>
                    <Button className="h-8.5 bg-zinc-950 hover:bg-zinc-800 text-white text-xs" onClick={submitNewContractWizard}>
                      Crear Cliente y Contrato
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        }
      />
      
      <div className="p-6 md:p-8 anim-fadeup">
        {/* Kanban Board Container */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-6 -mx-2 px-2 select-none" data-testid="kanban-board">
            {columns.map((col) => (
              <div key={col.value} className="w-80 shrink-0 flex flex-col bg-zinc-50 border border-zinc-200 rounded-lg p-2.5 min-h-[550px]">
                {/* Column Header */}
                <div className="px-3 py-2.5 flex items-center justify-between border border-zinc-900 mb-3 bg-zinc-950 rounded-md shadow-md">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`inline-block w-2 h-2 rounded-full ${col.color.split(" ")[0].replace("bg-", "bg-").replace("-50", "-500")}`} />
                    <span className="text-xs font-bold text-white truncate">{col.label}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-full px-2 py-0.5">
                    {col.items.length}
                  </span>
                </div>
                
                {/* Droppable Area */}
                <Droppable droppableId={col.value}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 space-y-2.5 p-1 rounded-md transition-colors duration-200 ${snapshot.isDraggingOver ? "bg-zinc-200/40" : ""}`}
                      data-testid={`kanban-column-${col.value}`}
                    >
                      {col.items.map((c, idx) => (
                        <Draggable key={c.id} draggableId={c.id} index={idx}>
                          {(prov, snap) => (
                            <div
                              onClick={() => {
                                navigate(`/clientes/${c.cliente_id}`);
                              }}
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                              className={`group block bg-white border p-4 hover:border-zinc-400 hover:shadow transition-all duration-200 cursor-pointer text-left pl-6 pipeline-card ${
                                snap.isDragging ? "border-zinc-950 ring-2 ring-zinc-950/10 shadow-lg scale-[1.02]" : "border-zinc-200"
                              }`}
                              style={{
                                ...prov.draggableProps.style,
                                "--status-color": STATE_COLORS_HEX[c.estado] || "#d4d4d8"
                              }}
                              data-testid={`kanban-card-${c.id}`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded bg-zinc-50 border border-zinc-200 flex items-center justify-center shrink-0 group-hover:bg-zinc-100 transition-colors">
                                  <Building2 className="w-4 h-4 text-zinc-700" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-bold text-zinc-950 truncate tracking-tight">{c.nombre}</div>
                                  <div className="text-[10px] text-zinc-500 font-medium mt-0.5">{c.provincia || "Sin provincia"}</div>
                                </div>
                              </div>
                              
                              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                                <span className="text-[9px] font-bold text-orange-700 bg-orange-50 border border-orange-200/40 rounded px-1.5 py-0.5 uppercase tracking-wider">
                                  {c.comercializadora || "Sin Comercializadora"}
                                </span>
                                <span className="text-[9px] font-mono font-bold text-zinc-600 bg-zinc-100 border border-zinc-200 rounded px-1.5 py-0.5">
                                  {c.tarifa || "Tarifa N/A"}
                                </span>
                              </div>
                              
                              {c.cups && (
                                <div className="mt-2 font-mono text-[9px] text-zinc-400 bg-zinc-50 border border-zinc-150 px-2 py-0.5 rounded truncate">
                                  {c.cups}
                                </div>
                              )}
                              
                              <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-[10px]">
                                <div className="flex items-center gap-1 text-zinc-500 font-medium truncate">
                                  <User className="w-3 h-3 text-zinc-400" />
                                  <span className="uppercase">{c.comercial_name || "Sin asignar"}</span>
                                </div>
                                {Number(c.comision) > 0 && (
                                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/50">
                                    {formatEUR(c.comision)}
                                  </span>
                                )}
                              </div>

                              {/* Colaborador Pill helper if configured */}
                              {c.colaborador && (
                                <div className="mt-2 flex items-center gap-1">
                                  <span className="text-[9px] font-semibold text-orange-700 bg-orange-50 border border-orange-200/40 rounded px-1.5 uppercase">
                                    {c.colaborador}
                                  </span>
                                  {c.sync_status === "sincronizado" && (
                                    <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/40 rounded px-1.5 uppercase">
                                      Sync OK
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      
                      {col.items.length === 0 && (
                        <div className="h-28 border border-dashed border-zinc-200 rounded-lg flex items-center justify-center text-[10px] text-zinc-400 italic">
                          Vacío. Arrastra leads aquí.
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>

      {/* PREMIUM SMART INSPECTOR DRAWER SIDEBAR */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop overlay */}
          <div 
            className="absolute inset-0 bg-zinc-950/30 backdrop-blur-[2px] transition-opacity duration-300"
            onClick={() => {
              if (!isSyncing) setSelectedClient(null);
            }}
          />

          {/* Sliding Panel */}
          <div className="relative w-full max-w-[550px] bg-white h-full shadow-2xl flex flex-col border-l border-zinc-200 z-10 transition-transform duration-300 transform translate-x-0 overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-white shrink-0">
              <div className="min-w-0">
                <span className="text-[9px] uppercase font-bold tracking-widest text-[#F97316] bg-orange-50 px-2 py-0.5 rounded border border-orange-200/60 inline-block mb-1">
                  Inspector de Cliente
                </span>
                <h3 className="font-sans text-md font-bold text-zinc-950 truncate tracking-tight">{selectedClient.nombre}</h3>
              </div>
              <button 
                onClick={() => setSelectedClient(null)} 
                disabled={isSyncing}
                className="p-1.5 rounded-full hover:bg-zinc-100 border border-zinc-200 text-zinc-500 hover:text-zinc-950 disabled:opacity-50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Radix Tabs for Sidebar */}
            <Tabs defaultValue="datos" className="flex-1 flex flex-col h-full min-h-0">
              <div className="px-6 border-b border-zinc-200 bg-zinc-50 py-2.5 shrink-0">
                <TabsList className="bg-zinc-200/60 p-0.5 h-8 w-full flex rounded-md border border-zinc-200/40">
                  <TabsTrigger value="datos" className="flex-1 text-[11px] font-semibold py-1 rounded-sm data-[state=active]:bg-white data-[state=active]:text-zinc-900 text-zinc-500 transition-colors">Datos</TabsTrigger>
                  <TabsTrigger value="contratos" className="flex-1 text-[11px] font-semibold py-1 rounded-sm data-[state=active]:bg-white data-[state=active]:text-zinc-900 text-zinc-500 transition-colors">Contratos ({contracts.length})</TabsTrigger>
                  <TabsTrigger value="documentos" className="flex-1 text-[11px] font-semibold py-1 rounded-sm data-[state=active]:bg-white data-[state=active]:text-zinc-900 text-zinc-500 transition-colors">Documentos ({documents.length})</TabsTrigger>
                </TabsList>
              </div>

              {/* Scrollable Content Pane */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* 1. DATOS TAB */}
                <TabsContent value="datos" className="space-y-5 outline-none mt-0">
                  
                  {/* General Actions Header */}
                  <div className="flex items-center justify-between bg-zinc-50 p-3.5 border border-zinc-200 rounded-lg">
                    <div>
                      <div className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider">Estado en CRM</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`inline-block w-2 h-2 rounded-full ${(CLIENT_STATE_MAP[clientForm.estado]?.color || "bg-zinc-500").split(" ")[0].replace("bg-", "bg-").replace("-50", "-500")}`} />
                        <span className="text-xs font-bold text-zinc-900">{CLIENT_STATE_MAP[clientForm.estado]?.label || "Estado Desconocido"}</span>
                      </div>
                    </div>
                    <Link 
                      to={`/clientes/${selectedClient.id}`}
                      className="inline-flex items-center text-xs font-bold text-zinc-950 hover:text-zinc-800 bg-white border border-zinc-200 px-3 py-1.5 rounded shadow-sm hover:shadow transition-all"
                    >
                      Ficha Completa <ExternalLink className="w-3 h-3 ml-1.5" />
                    </Link>
                  </div>

                  {/* Form fields */}
                           {/* Sección 1: Datos de Titularidad y Contacto (Imagen/Diseño solicitado) */}
                    <div className="border-b border-zinc-200 pb-4">
                      <h4 className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-3">Datos del Titular</h4>
                      <div className="grid grid-cols-2 gap-3.5">
                        <div>
                          <Label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Titular</Label>
                          <Input 
                            className="mt-1 h-9 text-xs" 
                            value={clientForm.nombre} 
                            onChange={(e) => setClientForm({ ...clientForm, nombre: e.target.value })} 
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Tipo de titular</Label>
                          <div className="mt-1 flex gap-2">
                            <label className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded border border-zinc-200 bg-white cursor-pointer text-[11px] text-zinc-800 font-medium">
                              <input 
                                type="radio" 
                                name="edit_drawer_tipo_titular" 
                                checked={clientForm.tipo_titular === "fisica"} 
                                onChange={() => setClientForm({ ...clientForm, tipo_titular: "fisica" })}
                                className="w-3 h-3 text-zinc-950 focus:ring-0 cursor-pointer"
                              />
                              <span>Física</span>
                            </label>
                            <label className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded border border-zinc-200 bg-white cursor-pointer text-[11px] text-zinc-800 font-medium">
                              <input 
                                type="radio" 
                                name="edit_drawer_tipo_titular" 
                                checked={clientForm.tipo_titular === "juridica"} 
                                onChange={() => setClientForm({ ...clientForm, tipo_titular: "juridica" })}
                                className="w-3 h-3 text-zinc-950 focus:ring-0 cursor-pointer"
                              />
                              <span>Jurídica</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Teléfono</Label>
                          <Input 
                            className="mt-1 h-9 text-xs" 
                            value={clientForm.telefono} 
                            onChange={(e) => setClientForm({ ...clientForm, telefono: e.target.value })} 
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                            {clientForm.tipo_titular === "juridica" ? "CIF" : "DNI / NIF"}
                          </Label>
                          {clientForm.tipo_titular === "juridica" ? (
                            <Input 
                              className="mt-1 h-9 text-xs" 
                              value={clientForm.cif} 
                              onChange={(e) => setClientForm({ ...clientForm, cif: e.target.value })} 
                              placeholder="B12345678"
                            />
                          ) : (
                            <Input 
                              className="mt-1 h-9 text-xs" 
                              value={clientForm.nif} 
                              onChange={(e) => setClientForm({ ...clientForm, nif: e.target.value })} 
                              placeholder="12345678Z"
                            />
                          )}
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Email</Label>
                          <Input 
                            className="mt-1 h-9 text-xs" 
                            value={clientForm.email} 
                            onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} 
                          />
                        </div>
                        <div className="pt-5">
                          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-zinc-800">
                            <input 
                              type="checkbox" 
                              checked={clientForm.titular_no_firmante} 
                              onChange={(e) => setClientForm({ ...clientForm, titular_no_firmante: e.target.checked })}
                              className="w-3 h-3 rounded border-zinc-300 text-zinc-950 focus:ring-0"
                            />
                            <span>El titular no es firmante</span>
                          </label>
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">IBAN</Label>
                          <Input 
                            className="mt-1 h-9 text-xs" 
                            value={clientForm.iban} 
                            onChange={(e) => setClientForm({ ...clientForm, iban: e.target.value })} 
                            placeholder="ES00..."
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">🎂 Fecha de Nacimiento</Label>
                          <Input 
                            type="date"
                            className="mt-1 h-9 text-xs" 
                            value={clientForm.fecha_nacimiento} 
                            onChange={(e) => setClientForm({ ...clientForm, fecha_nacimiento: e.target.value })} 
                          />
                        </div>
                        {clientForm.titular_no_firmante && (
                          <div className="col-span-2 space-y-3 p-3 rounded-lg bg-zinc-50 border border-zinc-150 anim-fadeup mt-1">
                            <div>
                              <Label className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Titular firmante</Label>
                              <Input 
                                className="mt-1 h-8 text-xs bg-white" 
                                value={clientForm.firmante_nombre} 
                                onChange={(e) => setClientForm({ ...clientForm, firmante_nombre: e.target.value })} 
                                placeholder="Nombre del firmante / apoderado"
                              />
                            </div>
                            <div>
                              <Label className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">DNI / NIF firmante</Label>
                              <Input 
                                className="mt-1 h-8 text-xs bg-white" 
                                value={clientForm.firmante_dni} 
                                onChange={(e) => setClientForm({ ...clientForm, firmante_dni: e.target.value })} 
                                placeholder="DNI del firmante / apoderado"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Sección 2: Datos de Suministro */}
                    <div>
                      <h4 className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-3">Datos del Suministro</h4>
                      <div className="grid grid-cols-2 gap-3.5">
                        <div>
                          <Label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">CUPS</Label>
                          <Input 
                            className="mt-1 h-9 text-xs font-mono" 
                            value={clientForm.cups} 
                            onChange={(e) => setClientForm({ ...clientForm, cups: e.target.value })} 
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Tipo Suministro</Label>
                          <select 
                            className="mt-1 w-full h-9 rounded border border-zinc-200 px-2.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-zinc-950"
                            value={clientForm.tipo_servicio || "luz"}
                            onChange={(e) => setClientForm({ ...clientForm, tipo_servicio: e.target.value, tarifa: "" })}
                          >
                            <option value="luz">💡 Luz</option>
                            <option value="gas">🔥 Gas</option>
                          </select>
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Tarifa</Label>
                          <select 
                            className="mt-1 w-full h-9 rounded border border-zinc-200 px-2.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-zinc-950"
                            value={clientForm.tarifa || ""}
                            onChange={(e) => setClientForm({ ...clientForm, tarifa: e.target.value })}
                          >
                            <option value="">Sin especificar</option>
                            {clientForm.tipo_servicio === "gas" ? (
                              <>
                                <option value="RL1">RL1</option>
                                <option value="RL2">RL2</option>
                                <option value="RL3">RL3</option>
                                <option value="RL4">RL4</option>
                              </>
                            ) : (
                              <>
                                <option value="2.0TD">2.0TD</option>
                                <option value="3.0TD">3.0TD</option>
                                <option value="6.1TD">6.1TD</option>
                              </>
                            )}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <Label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Dirección</Label>
                          <Input 
                            className="mt-1 h-9 text-xs uppercase" 
                            value={clientForm.direccion} 
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase();
                              const updateObj = { ...clientForm, direccion: val };
                              if (val) {
                                const lowerVal = val.toLowerCase();
                                const provinciasConocidas = ["madrid", "barcelona", "valencia", "sevilla", "zaragoza", "málaga", "murcia", "palma", "las palmas", "bilbao", "alicante", "córdoba", "valladolid", "vigo", "gijón", "granada", "a coruña", "vitoria", "elche", "oviedo", "pamplona", "cartagena", "almería", "santander"];
                                const matchedProvincia = provinciasConocidas.find(p => lowerVal.includes(p));
                                if (matchedProvincia) {
                                  const cap = matchedProvincia.charAt(0).toUpperCase() + matchedProvincia.slice(1);
                                  updateObj.provincia = cap;
                                }
                              }
                              setClientForm(updateObj);
                            }} 
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Provincia</Label>
                          <select 
                            className="mt-1 w-full h-9 rounded border border-zinc-200 px-2.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-zinc-950"
                            value={clientForm.provincia}
                            onChange={(e) => setClientForm({ ...clientForm, provincia: e.target.value })}
                          >
                            <option value="">Seleccionar...</option>
                            {options.provincias?.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Estado CRM</Label>
                          <select 
                            className={`mt-1 w-full h-9 rounded border px-2.5 text-xs focus:outline-none focus:ring-1 font-bold ${
                              CLIENT_STATE_MAP[clientForm.estado]?.color || "border-zinc-200 bg-white text-zinc-950"
                            }`}
                            value={clientForm.estado}
                            onChange={(e) => setClientForm({ ...clientForm, estado: e.target.value })}
                          >
                            {CLIENT_STATES.map((s) => (
                              <option key={s.value} value={s.value} className="bg-white text-zinc-900 font-medium">
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Comercial</Label>
                          <select 
                            className="mt-1 w-full h-9 rounded border border-zinc-200 px-2.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-zinc-950"
                            value={clientForm.comercial_id}
                            onChange={(e) => setClientForm({ ...clientForm, comercial_id: e.target.value })}
                          >
                            <option value="">Sin comercial...</option>
                            {users.map((u) => (
                              <option key={u.id} value={u.id}>{u.name.toUpperCase()} ({u.role.toUpperCase()})</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <Label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Comisión (€)</Label>
                          <Input 
                            type="number" 
                            className="mt-1 h-9 text-xs font-mono text-indigo-700 font-bold" 
                            value={clientForm.comision || 0} 
                            onChange={(e) => setClientForm({ 
                              ...clientForm, 
                              comision: e.target.value
                            })} 
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Notas comerciales</Label>
                          
                          {/* Comments Timeline */}
                          <div className="mt-1 space-y-3 max-h-[200px] overflow-y-auto pr-1 border border-zinc-150 rounded-md p-2 bg-zinc-50/35">
                            {(!clientForm.comentarios || clientForm.comentarios.length === 0) ? (
                              <div className="text-[10px] text-zinc-400 py-3 italic text-center">
                                No hay notas comerciales registradas
                              </div>
                            ) : (
                              <div className="relative border-l border-zinc-100 pl-3 ml-2.5 space-y-3">
                                {[...clientForm.comentarios].reverse().map((comment, idx) => {
                                  const isSystem = comment.id === "legacy" || comment.user_name === "Nota Histórica" || comment.user_name === "Sistema" || comment.user_name === "WhatsApp Log" || comment.user_name === "Sistema (Nota Histórica)";
                                  const initials = comment.user_name ? comment.user_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "U";
                                  
                                  let dateStr = "";
                                  try {
                                    dateStr = new Date(comment.timestamp).toLocaleString("es-ES", {
                                      day: "2-digit",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit"
                                    });
                                  } catch (e) {
                                    dateStr = comment.timestamp;
                                  }

                                  return (
                                    <div key={comment.id || idx} className="relative group">
                                      <div className={`absolute -left-[17.5px] top-1.5 w-2 h-2 rounded-full border ${isSystem ? "bg-amber-500 border-white" : "bg-zinc-950 border-white"} shadow-sm`} />
                                      
                                      <div className="bg-white border border-zinc-200 rounded p-2 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                                        <div className="flex items-center justify-between mb-1 gap-2">
                                          <div className="flex items-center gap-1">
                                            <div className={`w-3.5 h-3.5 rounded-full bg-zinc-100 flex items-center justify-center text-[6.5px] font-bold ${isSystem ? "bg-amber-100 text-amber-800" : "bg-zinc-900 text-white"}`}>
                                              {initials}
                                            </div>
                                            <span className="text-[10px] font-bold text-zinc-800 leading-none">{comment.user_name || "Usuario"}</span>
                                            {isSystem && (
                                              <span className="text-[7px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-0.5 rounded leading-none">
                                                Sistema
                                              </span>
                                            )}
                                          </div>
                                          <span className="text-[8px] text-zinc-400 font-mono leading-none">{dateStr}</span>
                                        </div>
                                        <p className="text-[10px] text-zinc-655 leading-normal whitespace-pre-wrap pl-0.5">{comment.text}</p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Add new comment */}
                          <div className="mt-2 flex gap-1.5 items-start">
                            <textarea
                              className="w-full min-h-[45px] rounded-md border border-zinc-200 px-2 py-1.5 text-xs focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-955"
                              placeholder="Añadir nota comercial..."
                              value={newCommentText}
                              onChange={(e) => setNewCommentText(e.target.value)}
                            />
                            <Button
                              type="button"
                              onClick={async () => {
                                if (!newCommentText.trim()) return;
                                try {
                                  const storedUser = JSON.parse(localStorage.getItem("aml_user") || "{}");
                                  const newCommentObj = {
                                    id: `comment-${Date.now()}`,
                                    timestamp: new Date().toISOString(),
                                    user_name: storedUser.name || "Usuario",
                                    text: newCommentText.trim()
                                  };
                                  const updatedComentarios = [...(clientForm.comentarios || []), newCommentObj];
                                  
                                  const response = await api.patch(`/clients/${selectedClient.id}`, { comentarios: updatedComentarios });
                                  toast.success("Nota añadida");
                                  setNewCommentText("");
                                  
                                  // Update local states
                                  setClientForm(prev => ({ ...prev, comentarios: updatedComentarios }));
                                  setSelectedClient(response.data);
                                  setClients(prev => prev.map(c => c.id === selectedClient.id ? response.data : c));
                                } catch (e) {
                                  toast.error("Error al añadir nota");
                                }
                              }}
                              disabled={!newCommentText.trim()}
                              className="h-8.5 bg-zinc-950 text-white hover:bg-zinc-800 text-xs font-semibold px-2.5 flex items-center justify-center gap-1"
                            >
                              <Send className="w-2.5 h-2.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-between items-center shrink-0">
                      <Button 
                        variant="outline"
                        onClick={handleDeleteClient}
                        className="h-8.5 text-xs font-bold border-2 border-red-200 text-red-600 hover:text-white hover:bg-red-600 hover:border-red-600 bg-red-50/30 transition-all duration-200 shadow-sm flex items-center gap-1.5 hover:scale-[1.03] active:scale-[0.98]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />Eliminar Cliente
                      </Button>
                      <Button 
                        onClick={handleSaveClient} 
                        disabled={savingClient} 
                        className="h-8.5 bg-zinc-950 text-white hover:bg-zinc-800 text-xs font-semibold rounded-md shadow flex items-center gap-1.5"
                      >
                        {savingClient ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Save className="w-3.5 h-3.5" />Guardar Datos</>}
                      </Button>
                    </div>

                  {/* Collaborator Portal Integration Bridge Console */}
                  <div className="space-y-4 border border-zinc-200 rounded-lg p-4 bg-white mt-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-orange-500" /> Puente de Portales Colaboradores
                      </h4>
                      {selectedClient.sync_status === "sincronizado" && (
                        <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          Sync Activo
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="text-[9px] text-zinc-400 font-bold uppercase">Seleccionar Portal</label>
                        <select 
                          className="mt-1 w-full h-8 rounded border border-zinc-200 text-xs px-2 focus:ring-1 focus:ring-zinc-950 bg-white"
                          value={syncCollaborator}
                          onChange={(e) => setSyncCollaborator(e.target.value)}
                          disabled={isSyncing}
                        >
                          {COLLABORATORS.map(c => (
                            <option key={c.value} value={c.value}>{c.label} {c.badge ? `(${c.badge})` : ""}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] text-zinc-400 font-bold uppercase block">Acceso Directo</label>
                        {COLLABORATORS.find(c => c.value === syncCollaborator)?.url ? (
                          <a 
                            href={COLLABORATORS.find(c => c.value === syncCollaborator)?.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="mt-1 h-8 w-full inline-flex items-center justify-center text-xs font-bold text-zinc-950 hover:bg-zinc-50 border border-zinc-200 rounded shadow-sm gap-1.5 transition-colors"
                          >
                            Tramitar en Portal <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <button 
                            disabled 
                            className="mt-1 h-8 w-full inline-flex items-center justify-center text-xs font-bold text-zinc-400 bg-zinc-50 border border-zinc-150 rounded cursor-not-allowed"
                          >
                            Portal no disponible
                          </button>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={handleStartSync}
                      disabled={isSyncing}
                      className="w-full h-8.5 inline-flex items-center justify-center bg-zinc-950 hover:bg-zinc-800 text-white font-semibold text-xs rounded transition-colors gap-2 shadow"
                    >
                      {isSyncing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Sincronizando con Intranet...</span>
                        </>
                      ) : (
                        <>
                          <RotateCw className="w-3.5 h-3.5 text-zinc-300" />
                          <span>Sincronizar Estado en Intranet</span>
                        </>
                      )}
                    </button>

                    {/* Stepper simulation */}
                    {isSyncing && (
                      <div className="space-y-3 bg-zinc-50/50 p-3 border border-zinc-200 rounded-md text-[11px]">
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-semibold">
                          <span>Procesando...</span>
                          <span>Paso {syncStep} de 5</span>
                        </div>
                        <div className="w-full bg-zinc-200 h-1 rounded-full overflow-hidden">
                          <div className="bg-zinc-950 h-full transition-all duration-300" style={{ width: `${syncStep * 20}%` }} />
                        </div>
                        <div className="space-y-1.5 text-[10px]">
                          {[
                            "Estableciendo handshake seguro SSL",
                            "Validando API tokens y credenciales",
                            "Buscando coincidencia por CUPS/NIF",
                            "Analizando estado de contrato en sistema externo",
                            "Confirmando sincronización de estado local"
                          ].map((stepDesc, idx) => {
                            const stepNum = idx + 1;
                            let icon = <div className="w-3.5 h-3.5 rounded-full border border-zinc-300 bg-white shrink-0" />;
                            let textClass = "text-zinc-400";
                            if (syncStep > stepNum) {
                              icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
                              textClass = "text-emerald-700 font-medium";
                            } else if (syncStep === stepNum) {
                              icon = <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F97316] shrink-0" />;
                              textClass = "text-zinc-900 font-semibold";
                            }
                            return (
                              <div key={idx} className="flex items-center gap-1.5">
                                {icon}
                                <span className={textClass}>{stepDesc}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Historical logs */}
                    {selectedClient.sync_logs && selectedClient.sync_logs.length > 0 && !isSyncing && (
                      <div className="space-y-1.5 pt-2 border-t border-zinc-100">
                        <div className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Historial Sync</div>
                        <div className="border border-zinc-150 rounded divide-y divide-zinc-100 max-h-24 overflow-y-auto bg-zinc-50 text-[10px]">
                          {selectedClient.sync_logs.map((hLog, i) => (
                            <div key={i} className="px-2 py-1 flex items-start justify-between gap-1.5">
                              <div className="text-zinc-650 leading-normal">{hLog.message}</div>
                              <div className="text-zinc-400 shrink-0 font-mono text-[9px]">{new Date(hLog.timestamp).toLocaleDateString()}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                </TabsContent>

                {/* 2. CONTRATOS TAB */}
                <TabsContent value="contratos" className="space-y-4 outline-none mt-0">
                  <div className="flex items-center justify-between border-b border-zinc-150 pb-2">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-950">Contratos energéticos</h4>
                      <p className="text-[10px] text-zinc-500">Gestión de comercializadoras y tarifas</p>
                    </div>
                    
                    {/* Radix Dialog for Contract Create/Edit inside Drawer */}
                    <Dialog open={contractOpen} onOpenChange={(o) => { setContractOpen(o); if(!o) setEditingContract(null); }}>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          className="h-7.5 bg-zinc-950 hover:bg-zinc-800 text-white text-[10px] px-2.5 rounded shadow flex items-center gap-1"
                          onClick={() => {
                            setEditingContract(null);
                            setNewContract({
                              comercializadora: "", tarifa: "2.0TD", potencia_contratada: 5.5,
                              fecha_inicio: new Date().toISOString().slice(0, 10),
                              fecha_renovacion: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
                              permanencia_meses: 12, importe_anual: 0, notas: "",
                              comercializadora_anterior: "", comercializadora_actual: "",
                              empresa_colaboradora: "", cups: selectedClient?.cups || "", consumo_anual: 0, estado: "pendiente_estudio",
                              tipo_servicio: selectedClient?.tipo_servicio || "luz",
                              direccion: selectedClient?.direccion || "",
                              provincia: selectedClient?.provincia || "",
                              comision: selectedClient?.comision || 0,
                              etiqueta: "",
                              fecha_fin_contrato: "",
                              fecha_alerta_personalizada: "",
                              motivo_alerta_personalizada: "",
                              relaciones: []
                            });
                          }}
                        >
                          <Plus className="w-3 h-3" /> Nuevo
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-xs sm:max-w-md md:max-w-3xl lg:max-w-5xl">
                        <DialogHeader>
                          <DialogTitle className="text-zinc-900 font-semibold tracking-tight text-lg">
                            {editingContract ? "Editar Contrato" : "Nuevo Contrato"}
                          </DialogTitle>
                        </DialogHeader>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 max-h-[75vh] lg:max-h-none overflow-y-auto px-1 py-1">
                          {/* Columna 1: Información Comercial */}
                          <div className="space-y-3 p-3.5 bg-zinc-50/50 rounded-xl border border-zinc-200/60">
                            <div className="flex items-center gap-2 border-b border-zinc-200/60 pb-2 mb-1">
                              <span className="w-2 h-2 rounded-full bg-indigo-500" />
                              <h4 className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">Datos Comerciales</h4>
                            </div>
                            
                            <div>
                              <Label className="text-[10px] uppercase font-bold text-zinc-500">Etiqueta (Casa, Local, Nave...)</Label>
                              <Input 
                                className="mt-1 h-8.5 text-xs border-zinc-200 bg-white" 
                                value={newContract.etiqueta || ""} 
                                onChange={(e) => setNewContract({ ...newContract, etiqueta: e.target.value })} 
                                placeholder="Ej: Casa, Oficina, Nave..." 
                              />
                            </div>
                            
                             <div>
                              <Label className="text-[10px] uppercase font-bold text-zinc-500">Comercializadora Anterior</Label>
                              <Input 
                                className="mt-1 h-8.5 text-xs border-zinc-200 bg-white" 
                                value={newContract.comercializadora_anterior || ""} 
                                onChange={(e) => setNewContract({ ...newContract, comercializadora_anterior: e.target.value })} 
                                placeholder="Ej: Iberdrola" 
                              />
                            </div>

                            <div>
                              <Label className="text-[10px] uppercase font-bold text-zinc-500">Nueva Comercializadora</Label>
                              <Select 
                                value={newContract.comercializadora_actual || newContract.comercializadora || ""} 
                                onValueChange={(v) => setNewContract({ ...newContract, comercializadora_actual: v, comercializadora: v })}
                              >
                                <SelectTrigger className="mt-1 h-8.5 text-xs border-zinc-200 bg-white">
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                  {options.comercializadoras?.map((c) => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label className="text-[10px] uppercase font-bold text-zinc-500">Empresa Colaboradora</Label>
                              <Select 
                                value={newContract.empresa_colaboradora || ""} 
                                onValueChange={(v) => setNewContract({ ...newContract, empresa_colaboradora: v })}
                              >
                                <SelectTrigger className="mt-1 h-8.5 text-xs border-zinc-200 bg-white">
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(() => {
                                    const baseOptions = ["AENERGETIC", "TELCO", "WIXER", "GANA ENERGÍA", "SIGA"];
                                    const currentVal = newContract.empresa_colaboradora;
                                    const showOptions = [...baseOptions];
                                    if (currentVal && !baseOptions.includes(currentVal.toUpperCase())) {
                                      showOptions.push(currentVal);
                                    }
                                    return showOptions.map((opt) => (
                                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ));
                                  })()}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label className="text-[10px] uppercase font-bold text-zinc-500">Estado del Contrato</Label>
                              <Select 
                                value={newContract.estado || "pendiente_estudio"} 
                                onValueChange={(v) => setNewContract({ ...newContract, estado: v })}
                              >
                                <SelectTrigger className="mt-1 h-8.5 text-xs border-zinc-200 bg-white">
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                  {CONTRACT_STATES.map((s) => (
                                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label className="text-[10px] uppercase font-bold text-zinc-500">Comisión (€)</Label>
                              <Input 
                                type="number" 
                                className="mt-1 h-8.5 text-xs border-zinc-200 bg-white" 
                                value={newContract.comision || 0} 
                                onChange={(e) => setNewContract({ ...newContract, comision: Number(e.target.value) })} 
                                placeholder="0" 
                              />
                            </div>
                          </div>

                          {/* Columna 2: Datos Técnicos y Ubicación */}
                          <div className="space-y-3 p-3.5 bg-zinc-50/50 rounded-xl border border-zinc-200/60">
                            <div className="flex items-center gap-2 border-b border-zinc-200/60 pb-2 mb-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <h4 className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">Datos Técnicos y Suministro</h4>
                            </div>
                            
                            <div>
                              <Label className="text-[10px] uppercase font-bold text-zinc-500">CUPS</Label>
                              <Input 
                                className="mt-1 h-8.5 text-xs font-mono border-zinc-200 bg-white" 
                                value={newContract.cups || ""} 
                                onChange={(e) => setNewContract({ ...newContract, cups: e.target.value })} 
                                placeholder="ES0021..." 
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-[10px] uppercase font-bold text-zinc-500">Suministro</Label>
                                <Select 
                                  value={newContract.tipo_servicio || "luz"} 
                                  onValueChange={(v) => setNewContract({ ...newContract, tipo_servicio: v })}
                                >
                                  <SelectTrigger className="mt-1 h-8.5 text-xs border-zinc-200 bg-white">
                                    <SelectValue placeholder="Seleccionar" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="luz">💡 Luz</SelectItem>
                                    <SelectItem value="gas">🔥 Gas</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-[10px] uppercase font-bold text-zinc-500">Tarifa</Label>
                                <Input 
                                  className="mt-1 h-8.5 text-xs border-zinc-200 bg-white" 
                                  value={newContract.tarifa} 
                                  onChange={(e) => setNewContract({ ...newContract, tarifa: e.target.value })} 
                                />
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-[10px] uppercase font-bold text-zinc-500">Potencia (kW)</Label>
                                <Input 
                                  type="number" 
                                  step="0.01" 
                                  className="mt-1 h-8.5 text-xs border-zinc-200 bg-white" 
                                  value={newContract.potencia_contratada} 
                                  onChange={(e) => setNewContract({ ...newContract, potencia_contratada: Number(e.target.value) })} 
                                />
                              </div>
                              <div>
                                <Label className="text-[10px] uppercase font-bold text-zinc-500">Consumo (kWh)</Label>
                                <Input 
                                  type="number" 
                                  className="mt-1 h-8.5 text-xs border-zinc-200 bg-white" 
                                  value={newContract.consumo_anual || 0} 
                                  onChange={(e) => setNewContract({ ...newContract, consumo_anual: Number(e.target.value) })} 
                                />
                              </div>
                            </div>
                            
                            <div>
                              <Label className="text-[10px] uppercase font-bold text-zinc-500">Dirección</Label>
                              <Input 
                                className="mt-1 h-8.5 text-xs border-zinc-200 bg-white" 
                                value={newContract.direccion || ""} 
                                onChange={(e) => setNewContract({ ...newContract, direccion: e.target.value })} 
                                placeholder="Dirección del suministro" 
                              />
                            </div>
                            
                            <div>
                              <Label className="text-[10px] uppercase font-bold text-zinc-500">Provincia</Label>
                              <Select 
                                value={newContract.provincia || ""} 
                                onValueChange={(v) => setNewContract({ ...newContract, provincia: v })}
                              >
                                <SelectTrigger className="mt-1 h-8.5 text-xs border-zinc-200 bg-white">
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                  {options.provincias?.map((p) => (
                                    <SelectItem key={p} value={p}>{p}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Columna 3: Fechas y Alertas */}
                          <div className="space-y-3 p-3.5 bg-zinc-50/50 rounded-xl border border-zinc-200/60">
                            <div className="flex items-center gap-2 border-b border-zinc-200/60 pb-2 mb-1">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              <h4 className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">Fechas y Alertas</h4>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-[10px] uppercase font-bold text-zinc-500">Inicio</Label>
                                <Input 
                                  type="date" 
                                  className="mt-1 h-8.5 text-xs border-zinc-200 bg-white" 
                                  value={newContract.fecha_inicio} 
                                  onChange={(e) => setNewContract({ ...newContract, fecha_inicio: e.target.value })} 
                                />
                              </div>
                              <div>
                                <Label className="text-[10px] uppercase font-bold text-zinc-500">Renovación</Label>
                                <Input 
                                  type="date" 
                                  className="mt-1 h-8.5 text-xs border-zinc-200 bg-white" 
                                  value={newContract.fecha_renovacion} 
                                  onChange={(e) => setNewContract({ ...newContract, fecha_renovacion: e.target.value })} 
                                />
                              </div>
                            </div>
                            
                            <div>
                              <Label className="text-[10px] uppercase font-bold text-zinc-500">Importe Anual (€)</Label>
                              <Input 
                                type="number" 
                                className="mt-1 h-8.5 text-xs border-zinc-200 bg-white" 
                                value={newContract.importe_anual} 
                                onChange={(e) => setNewContract({ ...newContract, importe_anual: Number(e.target.value) })} 
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-[10px] uppercase font-bold text-zinc-500">Fin Contrato</Label>
                                <Input 
                                  type="date" 
                                  className="mt-1 h-8.5 text-xs border-zinc-200 bg-white" 
                                  value={newContract.fecha_fin_contrato || ""} 
                                  onChange={(e) => setNewContract({ ...newContract, fecha_fin_contrato: e.target.value })} 
                                />
                              </div>
                              <div>
                                <Label className="text-[10px] uppercase font-bold text-zinc-500">📅 Alerta</Label>
                                <Input 
                                  type="date" 
                                  className="mt-1 h-8.5 text-xs border-zinc-200 bg-white" 
                                  value={newContract.fecha_alerta_personalizada || ""} 
                                  onChange={(e) => setNewContract({ ...newContract, fecha_alerta_personalizada: e.target.value })} 
                                />
                              </div>
                            </div>
                            
                            <div>
                              <Label className="text-[10px] uppercase font-bold text-zinc-500">Motivo / Notas de Alerta Seguimiento</Label>
                              <textarea 
                                rows={2}
                                className="mt-1 w-full rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                                value={newContract.motivo_alerta_personalizada || ""} 
                                onChange={(e) => setNewContract({ ...newContract, motivo_alerta_personalizada: e.target.value })} 
                                placeholder="Ej: Tiene permanencia 1 año, revisar..." 
                              />
                            </div>
                          </div>
                        </div>
                        
                        <DialogFooter className="mt-4 pt-2 border-t border-zinc-100 gap-2">
                          <Button variant="outline" className="h-8.5 text-xs" onClick={() => { setContractOpen(false); setEditingContract(null); }}>Cancelar</Button>
                          <Button className="h-8.5 bg-zinc-950 hover:bg-zinc-800 text-white text-xs" onClick={handleSaveContract}>
                            {editingContract ? "Guardar" : "Crear"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* List Contracts */}
                  {loadingContracts ? (
                    <div className="text-center py-6 text-xs text-zinc-500 flex items-center justify-center gap-1.5">
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-700" /> Cargando contratos...
                    </div>
                  ) : contracts.length === 0 ? (
                    <div className="text-center py-8 text-xs text-zinc-400 italic bg-zinc-50 border border-zinc-150 rounded-lg">
                      Sin contratos registrados. Registra el primero arriba.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {contracts.map((c) => (
                        <div key={c.id} className="bg-white border border-zinc-200 rounded-lg p-3.5 hover:border-zinc-300 transition-colors shadow-sm relative">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-xs font-bold text-zinc-950 flex items-center gap-1.5 flex-wrap">
                                <span>{c.tipo_servicio === "gas" ? "🔥" : "💡"}</span>
                                <span>{c.comercializadora_actual || c.comercializadora}</span>
                                {c.etiqueta && (
                                  <span className="px-2 py-0.5 text-[9px] font-bold bg-zinc-100 text-zinc-800 rounded-full border border-zinc-200">
                                    🏷️ {c.etiqueta}
                                  </span>
                                )}
                                {c.comercializadora_anterior && (
                                  <span className="text-[10px] text-zinc-400 font-normal">(Ant: {c.comercializadora_anterior})</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className="text-[9px] font-mono text-zinc-700 bg-zinc-100 border border-zinc-200/60 px-1.5 rounded uppercase">{c.tarifa}</span>
                                <span className="text-[9px] font-mono text-zinc-500">{c.potencia_contratada} kW</span>
                                {c.cups && (
                                  <span className="text-[9px] font-mono text-zinc-400 border-l border-zinc-200 pl-1.5">CUPS: {c.cups}</span>
                                )}
                              </div>
                              {c.direccion && (
                                <div className="text-[9px] text-zinc-500 mt-1.5 flex items-center gap-1">
                                  <span>📍</span>
                                  <span className="truncate max-w-[200px]">{c.direccion} {c.provincia ? `(${c.provincia})` : ""}</span>
                                </div>
                              )}
                              {c.comision > 0 && (
                                <div className="text-[9px] text-indigo-700 font-bold mt-0.5">
                                  Comisión: {formatEUR(c.comision)}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => {
                                  setEditingContract(c);
                                  setNewContract({
                                    comercializadora: c.comercializadora || "",
                                    tarifa: c.tarifa || "2.0TD",
                                    potencia_contratada: c.potencia_contratada || 5.5,
                                    fecha_inicio: c.fecha_inicio ? c.fecha_inicio.slice(0, 10) : "",
                                    fecha_renovacion: c.fecha_renovacion ? c.fecha_renovacion.slice(0, 10) : "",
                                    permanencia_meses: c.permanencia_meses || 12,
                                    importe_anual: c.importe_anual || 0,
                                    notas: c.notas || "",
                                    notes: c.notas || "",
                                    comercializadora_anterior: c.comercializadora_anterior || "",
                                    comercializadora_actual: c.comercializadora_actual || c.comercializadora || "",
                                    empresa_colaboradora: c.empresa_colaboradora || "",
                                    cups: c.cups || "",
                                    consumo_anual: c.consumo_anual || 0,
                                    estado: c.estado || "pendiente_estudio",
                                    tipo_servicio: c.tipo_servicio || "luz",
                                    direccion: c.direccion || "",
                                    provincia: c.provincia || "",
                                    comision: c.comision || 0,
                                    etiqueta: c.etiqueta || "",
                                    fecha_fin_contrato: c.fecha_fin_contrato ? c.fecha_fin_contrato.slice(0, 10) : "",
                                    fecha_alerta_personalizada: c.fecha_alerta_personalizada ? c.fecha_alerta_personalizada.slice(0, 10) : "",
                                    motivo_alerta_personalizada: c.motivo_alerta_personalizada || "",
                                    relaciones: c.relaciones || []
                                  });
                                  setContractOpen(true);
                                }}
                                className="p-1 rounded bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-950"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={() => handleDeleteContract(c.id)}
                                className="p-1 rounded bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 border-t border-zinc-100 mt-3 pt-2.5 text-[10px] text-zinc-500">
                            <div>
                              <span className="block text-[9px] font-semibold text-zinc-400 uppercase">Inicio</span>
                              <span className="font-mono mt-0.5 block">{formatDate(c.fecha_inicio)}</span>
                            </div>
                            <div>
                              <span className="block text-[9px] font-semibold text-zinc-400 uppercase">Vence</span>
                              <span className="font-mono mt-0.5 block text-zinc-800 font-bold">{formatDate(c.fecha_renovacion)}</span>
                            </div>
                            <div className="text-right">
                              <span className="block text-[9px] font-semibold text-zinc-400 uppercase">Importe</span>
                              <span className="font-mono mt-0.5 block text-emerald-700 font-bold">{formatEUR(c.importe_anual)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* 3. DOCUMENTOS TAB */}
                <TabsContent value="documentos" className="space-y-4 outline-none mt-0">
                  <div className="border-b border-zinc-150 pb-2">
                    <h4 className="text-xs font-bold text-zinc-950">Documentación y Facturas</h4>
                    <p className="text-[10px] text-zinc-500">Sube facturas para realizar OCR automatizado con Gemini</p>
                  </div>

                  {/* Dropzone */}
                  <label
                    htmlFor="invoice-upload-drawer"
                    className="block border border-dashed border-zinc-300 hover:border-zinc-550 rounded-lg bg-zinc-50 hover:bg-zinc-100 transition-colors cursor-pointer p-5 text-center shrink-0"
                    data-testid="upload-invoice-dropzone"
                  >
                    {uploadingDoc ? (
                      <div className="flex flex-col items-center gap-1.5 text-xs text-zinc-700">
                        <Loader2 className="w-5 h-5 animate-spin text-zinc-700" />
                        <div className="font-medium text-zinc-950">Gemini 3 Pro analizando factura...</div>
                        <div className="text-[10px] text-zinc-400">Extrayendo datos en 10s...</div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-xs">
                        <div className="w-8 h-8 rounded-md bg-white border border-zinc-150 flex items-center justify-center shadow-sm">
                          <UploadCloud className="w-4 h-4 text-zinc-650" />
                        </div>
                        <div className="font-medium text-zinc-900 mt-1">Cargar nueva factura</div>
                        <div className="text-[9px] text-zinc-400 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 text-orange-500" /> OCR automático · PDF, JPG, PNG
                        </div>
                      </div>
                    )}
                    <input
                      id="invoice-upload-drawer"
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadInvoice(f); e.target.value = ""; }}
                      data-testid="upload-invoice-input"
                    />
                  </label>

                  {/* Document List */}
                  {loadingDocuments ? (
                    <div className="text-center py-6 text-xs text-zinc-500 flex items-center justify-center gap-1.5">
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-700" /> Cargando documentos...
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="text-center py-8 text-xs text-zinc-400 italic bg-zinc-50 border border-zinc-150 rounded-lg">
                      Sin documentos cargados. Arrastra una factura arriba.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {documents.map((d) => (
                        <div key={d.id} className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-xs" data-testid={`document-card-${d.id}`}>
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <FileText className="w-4.5 h-4.5 text-zinc-500 shrink-0" />
                              <div className="min-w-0 leading-tight">
                                <div className="text-xs font-semibold text-zinc-950 truncate">{d.nombre}</div>
                                <div className="text-[9px] text-zinc-500 mt-0.5">
                                  {(d.size / 1024).toFixed(1)} KB · {formatDate(d.created_at)}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {d.ocr_status === "completed" && (
                                <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-250/50 px-1.5 rounded flex items-center gap-0.5">
                                  <Check className="w-2.5 h-2.5" /> OCR OK
                                </span>
                              )}
                              {d.ocr_status === "failed" && <span className="text-[9px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 rounded">Error</span>}
                              {d.ocr_status === "skipped" && <span className="text-[9px] text-zinc-650 bg-zinc-100 border border-zinc-200 px-1.5 rounded">Sube</span>}
                              
                              <button 
                                onClick={() => handleDeleteDocument(d.id)}
                                className="p-1 rounded bg-white hover:bg-rose-50 border border-zinc-200 hover:border-rose-200 text-zinc-500 hover:text-rose-600 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* OCR Extraction Result */}
                          {d.extracted_data && typeof d.extracted_data === "object" && !d.extracted_data.error && (
                            <div className="mt-2.5 pt-2.5 border-t border-zinc-200 grid grid-cols-2 gap-2 text-[10px] bg-white p-2.5 rounded border border-zinc-150">
                              {["cups", "comercializadora", "tarifa", "potencia_contratada_kw", "importe_total_eur"].map((k) => {
                                const val = d.extracted_data[k];
                                if (val == null || val === "") return null;
                                return (
                                  <div key={k} className="truncate">
                                    <div className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">{k.replace(/_/g, " ").replace(" kw", "").replace(" eur", "")}</div>
                                    <div className="font-mono text-zinc-900 mt-0.5 font-bold truncate">{String(val)}</div>
                                  </div>
                                );
                              })}
                              {d.extracted_data.resumen && (
                                <div className="col-span-2 text-[10px] text-zinc-600 italic border-l-2 border-orange-400 pl-2 mt-1">
                                  {d.extracted_data.resumen}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

              </div>
            </Tabs>

          </div>
        </div>
      )}

      {/* WHATSAPP PROPOSAL PREVIEW MODAL */}
      {whatsappModalOpen && whatsappClient && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl border border-zinc-200 w-full max-w-lg overflow-hidden anim-fadeup">
            {/* Modal Header */}
            <div className="bg-zinc-950 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-emerald-600 flex items-center justify-center">
                  <Send className="w-3.5 h-3.5 text-white" />
                </div>
                <h4 className="font-semibold text-sm">Disparar Automatización de WhatsApp</h4>
              </div>
              <button 
                onClick={() => setWhatsappModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div className="text-xs text-zinc-600 bg-zinc-50 border border-zinc-200 rounded p-3">
                🔔 <strong>Automatización de Fase:</strong> El cliente ha avanzado a <strong>Enviado a firma</strong>. Elige una plantilla rápida para notificar a Pepo o al cliente.
              </div>

              {/* Target Selector */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Enviar A:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => handleWhatsappTargetChange("pepo")}
                    className={`h-9 border text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-colors ${
                      whatsappTarget === "pepo" ? "bg-zinc-950 text-white border-zinc-950" : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    <span>Pepo (Responsable)</span>
                  </button>
                  <button 
                    onClick={() => handleWhatsappTargetChange("client")}
                    className={`h-9 border text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-colors ${
                      whatsappTarget === "client" ? "bg-zinc-950 text-white border-zinc-950" : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    <span>Cliente ({whatsappClient.nombre})</span>
                  </button>
                </div>
              </div>

              {/* Recipient Details Preview */}
              <div className="bg-zinc-50 p-3 rounded border border-zinc-200 space-y-1.5 text-xs text-zinc-700">
                <div>
                  <span className="font-bold text-zinc-400 text-[9px] uppercase">Contacto:</span>{" "}
                  <span className="font-medium text-zinc-900">
                    {whatsappTarget === "pepo" ? "Papa Pepo (+34 616 907 629)" : `${(whatsappClient.nombre || "").toUpperCase()} (${formatPhone(whatsappClient.telefono)})`}
                  </span>
                </div>
                {whatsappTarget === "client" && !whatsappClient.telefono && (
                  <div className="flex items-center gap-1.5 text-rose-600 bg-rose-50 border border-rose-100 p-2 rounded mt-1 font-semibold text-[11px]">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>¡Atención! Este cliente no tiene un teléfono configurado. Añádelo en su ficha para poder enviarle el WhatsApp.</span>
                  </div>
                )}
              </div>

              {/* Message text template */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Vista Previa del Mensaje:</label>
                <textarea 
                  className="w-full min-h-[100px] border border-zinc-200 rounded p-2.5 text-xs bg-zinc-50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-zinc-950"
                  value={whatsappText}
                  onChange={(e) => setWhatsappText(e.target.value)}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-zinc-50 border-t border-zinc-200 px-5 py-3.5 flex items-center justify-end gap-2">
              <button 
                onClick={() => setWhatsappModalOpen(false)}
                className="h-8.5 px-3.5 border border-zinc-200 hover:bg-zinc-100 rounded text-xs text-zinc-600 font-semibold transition-colors"
              >
                Omitir
              </button>
              <button 
                onClick={sendWhatsApp}
                disabled={whatsappTarget === "client" && !whatsappClient?.telefono}
                className="h-8.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed text-white rounded text-xs font-semibold transition-colors inline-flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar por WhatsApp Web ↗</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PENDING SIGNATURE VALIDATION DIALOG */}
      <Dialog open={pendingSignatureOpen} onOpenChange={setPendingSignatureOpen}>
        <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display font-bold tracking-tight text-lg text-zinc-900">
              Datos necesarios para el envío de firma
            </DialogTitle>
          </DialogHeader>

          {pendingSignatureClient && (
            <div className="space-y-4 py-2">
              <div className="text-xs text-zinc-600 bg-zinc-50 border border-zinc-150 p-3 rounded-md">
                ℹ️ Para mover a <strong>Pendiente de firma</strong> al cliente <strong>{(pendingSignatureClient.nombre || "").toUpperCase()}</strong>, debes completar la siguiente información requerida para el contrato y adjuntar un archivo.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="sig-client-email" className="text-[10px] uppercase font-bold text-zinc-500">Email del Cliente *</Label>
                    <Input 
                      id="sig-client-email" 
                      className="mt-1 h-8.5 text-xs border-zinc-200" 
                      value={pendingSignatureForm.email} 
                      onChange={(e) => setPendingSignatureForm({ ...pendingSignatureForm, email: e.target.value })} 
                      placeholder="correo@ejemplo.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="sig-client-iban" className="text-[10px] uppercase font-bold text-zinc-500">Número de Cuenta (IBAN) *</Label>
                    <Input 
                      id="sig-client-iban" 
                      className="mt-1 h-8.5 text-xs border-zinc-200" 
                      value={pendingSignatureForm.iban} 
                      onChange={(e) => setPendingSignatureForm({ ...pendingSignatureForm, iban: e.target.value })} 
                      placeholder="ES00 0000 0000 0000 0000 0000"
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] uppercase font-bold text-zinc-500">Tipo de Titular</Label>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-zinc-200 bg-white cursor-pointer text-xs text-zinc-700">
                        <input 
                          type="radio" 
                          name="sig_tipo_titular" 
                          checked={pendingSignatureForm.tipo_titular === "fisica"} 
                          onChange={() => setPendingSignatureForm({ ...pendingSignatureForm, tipo_titular: "fisica" })}
                          className="w-3 h-3 text-zinc-950 focus:ring-0"
                        />
                        <span>Persona física</span>
                      </label>
                      <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-zinc-200 bg-white cursor-pointer text-xs text-zinc-700">
                        <input 
                          type="radio" 
                          name="sig_tipo_titular" 
                          checked={pendingSignatureForm.tipo_titular === "juridica"} 
                          onChange={() => setPendingSignatureForm({ ...pendingSignatureForm, tipo_titular: "juridica" })}
                          className="w-3 h-3 text-zinc-950 focus:ring-0"
                        />
                        <span>Persona jurídica</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="sig-client-nif" className="text-[10px] uppercase font-bold text-zinc-500">
                      {pendingSignatureForm.tipo_titular === "juridica" ? "CIF del Titular *" : "DNI / NIF del Titular *"}
                    </Label>
                    {pendingSignatureForm.tipo_titular === "juridica" ? (
                      <Input 
                        id="sig-client-cif" 
                        className="mt-1 h-8.5 text-xs border-zinc-200" 
                        value={pendingSignatureForm.cif} 
                        onChange={(e) => setPendingSignatureForm({ ...pendingSignatureForm, cif: e.target.value })} 
                        placeholder="A00000000"
                      />
                    ) : (
                      <Input 
                        id="sig-client-nif" 
                        className="mt-1 h-8.5 text-xs border-zinc-200" 
                        value={pendingSignatureForm.nif} 
                        onChange={(e) => setPendingSignatureForm({ ...pendingSignatureForm, nif: e.target.value })} 
                        placeholder="12345678Z"
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-800">
                      <input 
                        type="checkbox" 
                        checked={pendingSignatureForm.titular_no_firmante} 
                        onChange={(e) => setPendingSignatureForm({ ...pendingSignatureForm, titular_no_firmante: e.target.checked })}
                        className="w-3.5 h-3.5 rounded border-zinc-300 text-zinc-950 focus:ring-0"
                      />
                      <span>La persona titular no es la firmante</span>
                    </label>
                  </div>

                  {pendingSignatureForm.titular_no_firmante && (
                    <div className="space-y-2.5 p-3 rounded-lg bg-zinc-50 border border-zinc-150 anim-fadeup">
                      <div>
                        <Label htmlFor="sig-firmante-nombre" className="text-[9px] uppercase font-bold text-zinc-500">Nombre del Firmante / Representante *</Label>
                        <Input 
                          id="sig-firmante-nombre" 
                          className="mt-1 h-8 text-xs border-zinc-200 bg-white" 
                          value={pendingSignatureForm.firmante_nombre} 
                          onChange={(e) => setPendingSignatureForm({ ...pendingSignatureForm, firmante_nombre: e.target.value })} 
                          placeholder="Nombre y apellidos"
                        />
                      </div>
                      <div>
                        <Label htmlFor="sig-firmante-dni" className="text-[9px] uppercase font-bold text-zinc-500">DNI / NIF del Firmante *</Label>
                        <Input 
                          id="sig-firmante-dni" 
                          className="mt-1 h-8 text-xs border-zinc-200 bg-white" 
                          value={pendingSignatureForm.firmante_dni} 
                          onChange={(e) => setPendingSignatureForm({ ...pendingSignatureForm, firmante_dni: e.target.value })} 
                          placeholder="12345678Z"
                        />
                      </div>
                    </div>
                  )}

                  {/* DOCUMENT UPLOAD (MANDATORY) */}
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-zinc-500">Adjuntar Contrato / DNI / Documento *</Label>
                    <div className="mt-1 border border-dashed border-zinc-300 rounded-lg p-3 bg-zinc-50/50 hover:bg-zinc-50 hover:border-zinc-400 transition-colors flex flex-col items-center justify-center text-center cursor-pointer relative min-h-[100px]">
                      <input 
                        type="file" 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                        onChange={(e) => setPendingSignatureFile(e.target.files[0] || null)}
                      />
                      <FileUp className="w-5 h-5 text-zinc-400 mb-1" />
                      <span className="text-[11px] font-semibold text-zinc-700">
                        {pendingSignatureFile ? pendingSignatureFile.name : "Seleccionar archivo"}
                      </span>
                      <span className="text-[9px] text-zinc-400 mt-0.5">
                        {pendingSignatureFile ? `${(pendingSignatureFile.size / 1024 / 1024).toFixed(2)} MB` : "PDF, Imagen, Word..."}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 pt-2 border-t border-zinc-100 gap-2">
            <Button 
              variant="outline" 
              onClick={() => setPendingSignatureOpen(false)}
              disabled={pendingSignatureUploading}
            >
              Cancelar
            </Button>
            <Button 
              className="bg-zinc-950 hover:bg-zinc-800 text-white font-semibold flex items-center gap-1.5"
              onClick={submitPendingSignature}
              disabled={pendingSignatureUploading}
            >
              {pendingSignatureUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                "Guardar y Enviar a Firma"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

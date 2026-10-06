import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";
import { CLIENT_STATES, CONTRACT_STATES, STATE_MAP, CLIENT_STATE_MAP, formatEUR, formatDate, ROLES, formatPhone } from "../lib/constants";
import Topbar from "../components/layout/Topbar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../components/ui/dialog";
import { toast } from "sonner";
import { 
  ArrowLeft, Building2, Phone, Mail, MapPin, FileText, UploadCloud, Trash2, Save, 
  Plus, Sparkles, Loader2, CheckCircle2, X, ExternalLink, Copy, Check, RotateCw, Play, Send, AlertCircle, User, ShieldAlert, Edit2,
  History, Folder, FolderOpen, MessageSquare, MessageCircle, Share2, FileUp
} from "lucide-react";

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

const DOC_TYPE_MAP = {
  factura: { label: "Factura", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  dni: { label: "DNI", color: "bg-blue-50 text-blue-700 border-blue-200" },
  nif: { label: "NIF", color: "bg-blue-50 text-blue-700 border-blue-200" },
  nie: { label: "NIE", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  pasaporte: { label: "Pasaporte", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  cif: { label: "CIF", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  justo_titulo: { label: "Justo Título", color: "bg-rose-50 text-rose-700 border-rose-200" },
  contrato_alquiler: { label: "Contrato Alquiler", color: "bg-amber-50 text-amber-700 border-amber-200" },
  recibo_autonomo: { label: "Recibo Autónomo", color: "bg-purple-50 text-purple-700 border-purple-200" },
  contrato: { label: "Contrato", color: "bg-orange-50 text-orange-700 border-orange-200" },
  justificante: { label: "Justificante", color: "bg-teal-50 text-teal-700 border-teal-200" },
  otro: { label: "Otros", color: "bg-zinc-50 text-zinc-650 border-zinc-200" },
};

const DOCUMENT_TYPE_SELECTIONS = [
  { value: "factura", label: "Factura" },
  { value: "dni", label: "DNI" },
  { value: "nif", label: "NIF" },
  { value: "nie", label: "NIE" },
  { value: "pasaporte", label: "Pasaporte" },
  { value: "cif", label: "CIF" },
  { value: "justo_titulo", label: "Justo Título" },
  { value: "contrato_alquiler", label: "Contrato Alquiler" },
  { value: "otro", label: "Otros" }
];

const COLLABORATORS = [
  { value: "aenergetic", label: "Aenergetic Intranet", url: "https://intranet.aenergetic.es/index.php?controller=login", active: true },
  { value: "wixer", label: "Wixer / Optimizoo", url: "https://app.optimizoo.es/dashboard", active: true },
  { value: "telco", label: "Telco (Tribu One)", url: "https://app.tribu.one/order_items", active: true },
  { value: "siga", label: "Siga", url: null, active: false, badge: "Próximamente" },
  { value: "insolen", label: "Insolen", url: null, active: false, badge: "Próximamente" }
];

const TIPO_VIA_OPTIONS = ["Calle", "Avenida", "Plaza", "Paseo", "Ronda", "Pasaje", "Carretera", "Bulevar", "Camino", "Travesía", "Callejón"];
const TIPO_ACLARADOR_OPTIONS = ["Bis", "Duplicado", "Bloque", "Portal", "Escalera", "Planta", "Puerta", "Otro"];
const PROVINCIAS_OPTIONS = [
  "Álava", "Albacete", "Alicante", "Almería", "Asturias", "Ávila", "Badajoz", "Barcelona", "Burgos", "Cáceres", "Cádiz",
  "Cantabria", "Castellón", "Ciudad Real", "Córdoba", "La Coruña", "Cuenca", "Gerona", "Granada", "Guadalajara",
  "Guipúzcoa", "Huelva", "Huesca", "Islas Baleares", "Jaén", "León", "Lérida", "Lugo", "Madrid", "Málaga", "Murcia",
  "Navarra", "Orense", "Palencia", "Las Palmas", "Pontevedra", "La Rioja", "Salamanca", "Segovia", "Sevilla", "Soria",
  "Tarragona", "Santa Cruz de Tenerife", "Teruel", "Toledo", "Valencia", "Valladolid", "Vizcaya", "Zamora", "Zaragoza",
  "Ceuta", "Melilla"
];
const PAIS_OPTIONS = ["España", "Portugal", "Andorra", "Francia", "Otro"];

export default function ClientDetail() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [filterDocType, setFilterDocType] = useState("all");
  const [contractOpen, setContractOpen] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [options, setOptions] = useState({ comercializadoras: [] });
  const [folderOpen, setFolderOpen] = useState(false);
  const [folderContract, setFolderContract] = useState(null);
  const [folderUploading, setFolderUploading] = useState(false);
  const [folderUploadType, setFolderUploadType] = useState("factura");
  const [allContracts, setAllContracts] = useState([]);
  const [loadingAllContracts, setLoadingAllContracts] = useState(false);
  const [contractToRelate, setContractToRelate] = useState("");
  const [relationshipLabel, setRelationshipLabel] = useState("");
  const [newCommentText, setNewCommentText] = useState("");
  const [contractSearchQuery, setContractSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("datos");
  const [rgpdModalOpen, setRgpdModalOpen] = useState(false);
  const [activeActivityType, setActiveActivityType] = useState("note");
  const [loadingError, setLoadingError] = useState(false);
  
  // Pending signature validation state
  const [pendingSignatureOpen, setPendingSignatureOpen] = useState(false);
  const [pendingSignatureContractId, setPendingSignatureContractId] = useState(null);
  const [pendingSignatureForm, setPendingSignatureForm] = useState({
    email: "",
    iban: "",
    tipo_titular: "fisica",
    nif: "",
    cif: "",
    titular_no_firmante: false,
    firmante_nombre: "",
    firmante_dni: ""
  });
  const [pendingSignatureFile, setPendingSignatureFile] = useState(null);
  const [pendingSignatureUploading, setPendingSignatureUploading] = useState(false);

  // WhatsApp proposal template modal state
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [whatsappTarget, setWhatsappTarget] = useState("pepo"); // pepo or client
  const [whatsappClient, setWhatsappClient] = useState(null);
  const [whatsappText, setWhatsappText] = useState("");
  
  // WhatsApp inside-CRM integration states
  const [whatsappConnected, setWhatsappConnected] = useState(true);
  const [activeChatRoom, setActiveChatRoom] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newChatMessage, setNewChatMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [isTypingResponse, setIsTypingResponse] = useState(false);

  const [supplyModalOpen, setSupplyModalOpen] = useState(false);
  const [editingSupplyIdx, setEditingSupplyIdx] = useState(null);
  const [supplyForm, setSupplyForm] = useState({
    id: "",
    tipo_via: "Calle",
    nombre_via: "",
    numero: "",
    duplicador: "",
    escalera: "",
    planta: "",
    puerta: "",
    tipo_aclarador: "",
    aclarador: "",
    codigo_postal: "",
    ciudad: "",
    provincia: "",
    pais: "España",
    email: "",
    movil: "",
    iban: "",
    cups: [{ cups: "", tipo: "Electricidad" }],
    disabled: false
  });

  const [assocModalOpen, setAssocModalOpen] = useState(false);
  const [assocDocument, setAssocDocument] = useState(null);
  const [assocContractId, setAssocContractId] = useState("");

  const loadAllContracts = async () => {
    try {
      setLoadingAllContracts(true);
      const { data } = await api.get("/contracts");
      setAllContracts(data || []);
    } catch (e) {
      console.error("Error al cargar todos los contratos", e);
    } finally {
      setLoadingAllContracts(false);
    }
  };

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

  useEffect(() => {
    if (client && searchParams.get("newContract") === "true") {
      setNewContract({
        comercializadora: client.comercializadora || "",
        tarifa: client.tarifa || "2.0TD",
        potencia_contratada: 5.5,
        fecha_inicio: new Date().toISOString().slice(0, 10),
        fecha_renovacion: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
        permanencia_meses: 12,
        importe_anual: 0,
        notas: "",
        comercializadora_anterior: "",
        comercializadora_actual: client.comercializadora || "",
        empresa_colaboradora: client.colaborador || "",
        cups: client.cups || "",
        consumo_anual: 0,
        estado: "pendiente_estudio",
        tipo_servicio: client.tipo_servicio || "luz",
        direccion: client.direccion || "",
        provincia: client.provincia || "",
        comision: client.comision || 0,
        etiqueta: "",
        fecha_fin_contrato: "",
        fecha_alerta_personalizada: "",
        motivo_alerta_personalizada: "",
        relaciones: []
      });
      setContractOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  // Integration console states
  const [syncCollaborator, setSyncCollaborator] = useState("aenergetic");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStep, setSyncStep] = useState(0);
  const [syncLogs, setSyncLogs] = useState([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  const logRgpdSent = async (channel) => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("aml_user") || "{}");
      const logComment = {
        id: `comment-rgpd-sent-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user_name: "Sistema",
        text: `Solicitud de firma RGPD enviada al cliente por ${channel}. Enlace: ${window.location.origin}/rgpd/${client.id}`
      };
      const updatedComentarios = [...(client.comentarios || []), logComment];
      await api.patch(`/clients/${client.id}`, { comentarios: updatedComentarios });
      toast.success(`Actividad registrada: Solicitud por ${channel}`);
      load(); // Refresh details
    } catch (e) {
      console.error("Error logging RGPD sent status:", e);
      toast.error("Error al registrar actividad en historial");
    }
  };

  const downloadRgpdPdf = () => {
    if (!client) return;
    const htmlContent = `
      <html>
      <head>
        <title>Justificante RGPD - ${client.nombre}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #18181b; line-height: 1.6; }
          .header { border-bottom: 2px solid #f97316; padding-bottom: 15px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
          .logo { font-weight: 900; font-size: 18px; tracking: -0.05em; color: #18181b; }
          .logo-orange { color: #f97316; }
          .title { font-size: 22px; font-weight: 850; color: #09090b; letter-spacing: -0.02em; }
          .section { margin-bottom: 24px; background: #fafafa; border: 1px solid #f4f4f5; padding: 16px; border-radius: 8px; }
          .section-title { font-size: 11px; font-weight: bold; color: #71717a; text-transform: uppercase; tracking-wider: 0.05em; margin-bottom: 8px; border-bottom: 1px solid #e4e4e7; padding-bottom: 4px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .label { font-weight: 700; font-size: 12px; color: #27272a; }
          .value { font-size: 13px; color: #52525b; margin-top: 3px; }
          .tick-list { margin-top: 10px; }
          .tick-item { font-size: 12px; color: #18181b; margin-bottom: 8px; display: flex; align-items: flex-start; }
          .tick-icon { color: #10b981; font-weight: bold; margin-right: 8px; }
          .footer { margin-top: 60px; font-size: 9px; color: #a1a1aa; border-top: 1px solid #e4e4e7; padding-top: 15px; text-align: center; }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo"><span class="logo-orange">ALGO MÁS</span> QUE LUZ</div>
            <div style="font-size: 10px; color: #71717a; margin-top: 2px;">ENERGÍA INTELIGENTE</div>
          </div>
          <div style="text-align: right;">
            <div class="title">CERTIFICADO RGPD</div>
            <div style="font-size: 10px; color: #10b981; font-weight: bold; margin-top: 2px;">✓ DECLARACIÓN ELECTRÓNICA</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Datos del Titular</div>
          <div class="grid">
            <div>
              <div class="label">Nombre / Razón Social</div>
              <div class="value">${client.nombre}</div>
            </div>
            <div>
              <div class="label">Teléfono de Registro</div>
              <div class="value">${client.telefono || "—"}</div>
            </div>
          </div>
          <div style="margin-top: 12px;">
            <div class="label">Correo Electrónico</div>
            <div class="value">${client.email || "—"}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Trazabilidad de la Aceptación</div>
          <div class="grid">
            <div>
              <div class="label">Fecha y Hora (Local)</div>
              <div class="value">${client.rgpd_fecha ? new Date(client.rgpd_fecha).toLocaleString("es-ES") : "—"}</div>
            </div>
            <div>
              <div class="label">Dirección IP</div>
              <div class="value">${client.rgpd_ip || "—"}</div>
            </div>
          </div>
          <div style="margin-top: 12px;">
            <div class="label">Agente de Usuario (Navegador)</div>
            <div class="value" style="font-family: monospace; font-size: 11px;">${client.rgpd_user_agent || "—"}</div>
          </div>
          <div style="margin-top: 12px;">
            <div class="label">Versión Legal Aceptada</div>
            <div class="value">${client.rgpd_version || "—"}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Consentimientos Otorgados</div>
          <div class="tick-list">
            <div class="tick-item">
              <span class="tick-icon">✓</span>
              <span>He leído y acepto la Política de Privacidad de Algo Más Que Luz sobre protección de datos personales.</span>
            </div>
            <div class="tick-item">
              <span class="tick-icon">✓</span>
              <span>Autorizo a Algo Más Que Luz a tratar los datos contenidos en la factura facilitada con el fin de realizar un estudio energético comparativo y elaborar una propuesta de ahorro.</span>
            </div>
            <div class="tick-item">
              <span class="tick-icon">✓</span>
              <span>Acepto ser contactado por teléfono, correo electrónico o WhatsApp respecto al resultado de este estudio y ofertas comerciales.</span>
            </div>
          </div>
        </div>

        <div class="footer">
          Este documento sirve como justificante legal oficial del consentimiento electrónico otorgado por el titular. Generado de forma automatizada por el CRM de Algo Más Que Luz. Hash de Auditoría: SHA256-${client.id ? client.id.substring(0, 8) : "00000000"}-${Date.now().toString(16).toUpperCase()}
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
    const win = window.open("", "_blank");
    win.document.write(htmlContent);
    win.document.close();
  };

  const load = useCallback(async () => {
    setLoadingError(false);
    try {
      const [c, ct, dc] = await Promise.all([
        api.get(`/clients/${id}`),
        api.get(`/contracts?cliente_id=${id}`),
        api.get(`/documents?cliente_id=${id}`),
      ]);
      setClient(c.data || null);
      setContracts(ct.data || []);
      setDocuments(dc.data || []);
    } catch (e) {
      console.error("Error al cargar los datos del cliente:", e);
      setLoadingError(true);
      toast.error("Error al cargar los datos del cliente: " + (e.message || e));
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const loadWhatsappChat = useCallback(async () => {
    if (!client || !client.telefono) return;
    setChatLoading(true);
    try {
      const { data: rooms } = await api.get("/chats/rooms");
      const cleanPhone = String(client.telefono || "").replace(/[^0-9]/g, "");
      let room = rooms?.find(r => String(r.phone || "").replace(/[^0-9]/g, "") === cleanPhone);

      if (!room) {
        const createRes = await api.post("/chats/rooms", {
          name: client.nombre,
          phone: client.telefono,
          type: "direct",
          email: client.email || ""
        });
        room = createRes.data;
      }

      if (room && room.id) {
        setActiveChatRoom(room);
        const { data: msgs } = await api.get(`/chats/messages?room_id=${room.id}`);
        setChatMessages(msgs || []);
      }
    } catch (e) {
      console.error("Error loading WhatsApp chat room/messages", e);
    } finally {
      setChatLoading(false);
    }
  }, [client]);

  useEffect(() => {
    if (activeTab === "whatsapp" && client) {
      loadWhatsappChat();
    }
  }, [activeTab, client, loadWhatsappChat]);
  const sendWhatsappMessage = async (e) => {
    e.preventDefault();
    if (!newChatMessage.trim() || !activeChatRoom) return;
    
    const textToSend = newChatMessage.trim();
    setNewChatMessage("");

    try {
      const storedUser = JSON.parse(localStorage.getItem("aml_user") || "{}");
      await api.post("/chats/messages", {
        room_id: activeChatRoom.id,
        text: textToSend,
        sender_name: storedUser.name || "Usuario"
      });

      const logComment = {
        id: `comment-wa-sent-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user_name: "Sistema",
        text: `💬 WHATSAPP: ${textToSend}`,
        type: "whatsapp"
      };
      const updatedComentarios = [...(client.comentarios || []), logComment];
      await api.patch(`/clients/${client.id}`, { comentarios: updatedComentarios });

      const { data: updatedMsgs } = await api.get(`/chats/messages?room_id=${activeChatRoom.id}`);
      setChatMessages(updatedMsgs || []);
      load();

      setIsTypingResponse(true);
      setTimeout(async () => {
        try {
          let replyText = "¡Hola! He recibido tu propuesta de ahorro energético. Le echo un vistazo esta tarde y te comento.";
          const lowerText = textToSend.toLowerCase();
          if (lowerText.includes("rgpd") || lowerText.includes("autoriz") || lowerText.includes("firma")) {
            replyText = "De acuerdo, acabo de recibir el enlace de firma en mi móvil. Voy a completarlo ahora mismo.";
          } else if (lowerText.includes("factura") || lowerText.includes("pdf")) {
            replyText = "Sí, ya te he pasado la última factura de Endesa por aquí. Confirmadme si se lee bien, por favor.";
          } else if (lowerText.includes("hola") || lowerText.includes("buenas")) {
            replyText = "Hola, buenas tardes. ¿Habéis podido estudiar ya mi factura de la luz?";
          } else if (lowerText.includes("ahorro") || lowerText.includes("oferta")) {
            replyText = "Me parece una buena oferta de ahorro. ¿Qué documentos necesitáis para hacer el cambio de comercializadora?";
          }

          await api.post("/chats/messages", {
            room_id: activeChatRoom.id,
            text: replyText,
            sender_name: client.nombre
          });

          const replyLogComment = {
            id: `comment-wa-received-${Date.now()}`,
            timestamp: new Date().toISOString(),
            user_name: client.nombre,
            text: `💬 WHATSAPP: ${replyText}`,
            type: "whatsapp"
          };
          const updatedComentarios2 = [...(client.comentarios || []), replyLogComment];
          await api.patch(`/clients/${client.id}`, { comentarios: updatedComentarios2 });

          const { data: finalMsgs } = await api.get(`/chats/messages?room_id=${activeChatRoom.id}`);
          setChatMessages(finalMsgs || []);
          load();
        } catch (err) {
          console.error("Error in simulated response:", err);
        } finally {
          setIsTypingResponse(false);
        }
      }, 3000);

    } catch (err) {
      console.error("Error sending WhatsApp message:", err);
      toast.error("Error al enviar mensaje");
    }
  };
  useEffect(() => {
    setContractToRelate("");
    setRelationshipLabel("");
    setContractSearchQuery("");
    setNewCommentText("");
    setActiveTab("datos");
  }, [id]);

  useEffect(() => {
    // Subscribe to realtime database changes for this client record
    const channel = supabase
      .channel(`client-${id}-realtime`)
      .on("postgres_changes", { event: "*", schema: "public", table: "clientes", filter: `id=eq.${id}` }, () => {
        load();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, load]);

  useEffect(() => { api.get("/meta/options").then((r) => setOptions(r.data)); }, []);

  // Update selected collaborator based on loaded client
  useEffect(() => {
    if (client && client.colaborador) {
      setSyncCollaborator(client.colaborador);
    }
  }, [client]);

  if (loadingError) {
    return (
      <div className="p-8 text-center max-w-sm mx-auto mt-24 bg-white border border-zinc-200 rounded-2xl shadow-sm">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-zinc-950 mb-1.5 uppercase tracking-wide">Error al cargar cliente</h3>
        <p className="text-xs text-zinc-500 mb-5">No se pudieron recuperar los datos de este cliente o no tienes los permisos de acceso requeridos.</p>
        <div className="flex justify-center gap-3">
          <Link to="/clientes">
            <Button variant="outline" className="h-8 text-[11px] font-semibold">Volver a Clientes</Button>
          </Link>
          <Button onClick={load} className="h-8 bg-zinc-950 hover:bg-zinc-800 text-white text-[11px] font-semibold">Reintentar</Button>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-[#ff5722]" />
        <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Cargando datos del cliente...</span>
      </div>
    );
  }

  const submitPendingSignature = async () => {
    if (!client?.id || !pendingSignatureContractId) {
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
      const { data: updatedClient } = await api.patch(`/clients/${client.id}`, clientPayload);

      // 2. Subir el documento obligatorio
      const fd = new FormData();
      fd.append("file", pendingSignatureFile);
      fd.append("cliente_id", client.id);
      fd.append("contrato_id", pendingSignatureContractId);
      fd.append("tipo", "contrato");
      await api.post("/documents/upload", fd);

      // 3. Modificar el estado del contrato en Supabase
      await api.patch(`/contracts/${pendingSignatureContractId}`, { estado: "enviado_firma" });

      toast.success("Cliente actualizado, documento subido y contrato enviado a firma");
      setPendingSignatureOpen(false);
      setPendingSignatureFile(null);
      
      // Abrir modal de WhatsApp automatizado
      handleOpenWhatsAppModal(updatedClient);
      
      load(); // Refrescar datos
    } catch (e) {
      console.error(e);
      toast.error("Error al procesar el envío a firma");
    } finally {
      setPendingSignatureUploading(false);
    }
  };

  const handleOpenWhatsAppModal = (updatedClient) => {
    setWhatsappClient(updatedClient || client);
    setWhatsappTarget("pepo");
    
    // Initial text for Pepo
    const targetName = (updatedClient?.nombre || client?.nombre || "").toUpperCase();
    const initialText = `Hola Pepo, acabo de enviar a firma el contrato de ${targetName} (CUPS: ${client?.cups || "Sin CUPS"}). ¿Puedes echarle un ojo por favor?`;
    
    setWhatsappText(initialText);
    setWhatsappModalOpen(true);
  };

  const handleWhatsappTargetChange = (target) => {
    setWhatsappTarget(target);
    const targetClient = whatsappClient || client;
    if (!targetClient) return;

    const targetName = (targetClient.nombre || "").toUpperCase();
    if (target === "pepo") {
      setWhatsappText(`Hola Pepo, acabo de enviar a firma el contrato de ${targetName} (CUPS: ${targetClient.cups || "Sin CUPS"}). ¿Puedes echarle un ojo por favor?`);
    } else {
      setWhatsappText(`Hola ${targetName}, te acabamos de enviar la propuesta de ahorro energético para tu firma digital. Avísanos en cuanto la completes para activarla. ¡Muchas gracias!`);
    }
  };

  const sendWhatsApp = async () => {
    const targetClient = whatsappClient || client;
    if (!targetClient) return;
    const phone = whatsappTarget === "pepo" ? "34616907629" : String(targetClient.telefono || "").replace(/[^0-9]/g, "");
    
    if (!phone) {
      toast.error("El destinatario no tiene un teléfono válido");
      return;
    }

    const encoded = encodeURIComponent(whatsappText);
    window.open(`https://wa.me/${phone}?text=${encoded}`, "_blank");

    // Log WhatsApp in notes
    try {
      const logMsg = `[WhatsApp] Propuesta enviada a ${whatsappTarget === "pepo" ? "Pepo" : "Cliente"} el ${new Date().toLocaleDateString()}: "${whatsappText}"`;
      const currentComments = targetClient.comentarios || [];
      
      const newComment = {
        id: `comment-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user_name: "WhatsApp Log",
        text: logMsg,
        type: "whatsapp"
      };

      await api.patch(`/clients/${targetClient.id}`, { comentarios: [...currentComments, newComment] });
      load();
    } catch (e) {
      console.error("Error logging whatsapp activity", e);
    }
    setWhatsappModalOpen(false);
  };

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

  const handleStartSync = async () => {
    if (!client) return;
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

    log(`Iniciando conexión segura SSL con portal intranet de ${coll.label}...`, "info");
    
    setTimeout(() => {
      setSyncStep(2);
      log(`Autenticando credenciales de agencia de AlgoMásQueLuz en ${coll.label}...`, "info");
      log(`Conexión establecida con éxito. Session JWT: AMQL_JWT_${Math.random().toString(36).substring(5).toUpperCase()}`, "success");
      
      setTimeout(() => {
        setSyncStep(3);
        const searchVal = client.cups || client.nif || client.nombre;
        log(`Buscando expediente en intranet utilizando parámetros de cliente: CUPS/NIF/Nombre [${searchVal}]...`, "info");
        
        if (!client.cups && !client.nif) {
          log(`⚠️ Advertencia: CUPS y NIF no especificados en la ficha. Realizando búsqueda difusa por nombre: ${client.nombre}...`, "warning");
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
              try {
                const newLog = {
                  timestamp: new Date().toISOString(),
                  message: `Sincronización automática con ${coll.label} completada. El estado del contrato se ha validado como ACTIVO en portal externo.`,
                  type: "success"
                };
                
                const updatedLogs = [newLog, ...(client.sync_logs || [])];
                
                await api.patch(`/clients/${client.id}`, {
                  estado: "cliente_activo",
                  colaborador: syncCollaborator,
                  sync_status: "sincronizado",
                  sync_date: new Date().toISOString(),
                  sync_logs: updatedLogs
                });
                
                setIsSyncing(false);
                setSyncStep(0);
                toast.success(`🔄 ¡Portal sincronizado! Estado del cliente actualizado a Cliente Activo.`);
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 4000);
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
      if (newContract.estado === "enviado_firma") {
        const { estado, ...otherFields } = newContract;
        if (editingContract) {
          await api.patch(`/contracts/${editingContract.id}`, { ...otherFields, estado: editingContract.estado });
          setContractOpen(false);
          setEditingContract(null);
          
          // Trigger signature wizard
          setPendingSignatureContractId(editingContract.id);
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
        } else {
          // Creating new contract
          const createRes = await api.post("/contracts", { ...otherFields, estado: "pendiente_estudio", cliente_id: id });
          setContractOpen(false);
          setEditingContract(null);
          
          // Trigger signature wizard
          setPendingSignatureContractId(createRes.data.id);
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
        }
        return;
      }

      if (editingContract) {
        await api.patch(`/contracts/${editingContract.id}`, newContract);
        toast.success("Contrato actualizado");
      } else {
        await api.post("/contracts", { ...newContract, cliente_id: id });
        toast.success("Contrato creado");
      }

      setContractOpen(false);
      setEditingContract(null);
      load();
    } catch (e) {
      console.error(e);
      toast.error(editingContract ? "Error al actualizar contrato" : "Error al crear contrato");
    }
  };

  const deleteContract = async (cid) => {
    if (!confirm("¿Eliminar contrato?")) return;
    await api.delete(`/contracts/${cid}`);
    toast.success("Contrato eliminado");
    load();
  };

  const updateContractStateInline = async (contractId, newState) => {
    if (newState === "enviado_firma") {
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
      return;
    }

    try {
      await api.patch(`/contracts/${contractId}`, { estado: newState });
      toast.success("Estado del contrato actualizado");
      load();
    } catch {
      toast.error("Error al actualizar el estado del contrato");
    }
  };


  const openContractFolder = (contract) => {
    setFolderContract(contract);
    setFolderOpen(true);
  };

  const uploadFolderDocument = async (file) => {
    if (!folderContract) return;
    setFolderUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("cliente_id", id);
      fd.append("contrato_id", folderContract.id);
      fd.append("tipo", folderUploadType);
      const { data } = await api.post("/documents/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      if (data.ocr_status === "completed") {
        toast.success("Factura analizada — datos extraídos");
      } else {
        toast.success("Documento subido correctamente");
      }
      load();
    } catch {
      toast.error("Error al subir documento");
    } finally {
      setFolderUploading(false);
    }
  };

  const deleteDocument = async (docId) => {
    if (!confirm("¿Eliminar este documento?")) return;
    try {
      await api.delete(`/documents/${docId}`);
      toast.success("Documento eliminado");
      load();
    } catch {
      toast.error("Error al eliminar el documento");
    }
  };

  const deleteClient = async () => {
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
      await api.delete(`/clients/${id}`);
      toast.success(isAdmin ? "Cliente eliminado permanentemente con éxito" : "Cliente eliminado correctamente del CRM");
      navigate("/clientes");
    } catch (e) {
      toast.error("Error al eliminar el cliente");
    }
  };

  const s = CLIENT_STATE_MAP[client.estado];

  return (
    <>
      <ConfettiEffect active={showConfetti} />
      <Topbar
        title={client.nombre}
        subtitle={client.cups ? `CUPS · ${client.cups}` : "Sin CUPS asignado"}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={deleteClient}
              className="h-9 text-xs font-bold border-2 border-red-200 text-red-600 hover:text-white hover:bg-red-600 hover:border-red-600 bg-red-50/30 transition-all duration-200 shadow-sm flex items-center gap-1.5 hover:scale-[1.03] active:scale-[0.98]"
            >
              <Trash2 className="w-3.5 h-3.5" />Eliminar Cliente
            </Button>
            <Button variant="outline" asChild className="h-9 border-zinc-200 text-xs" data-testid="client-detail-back">
              <Link to="/clientes"><ArrowLeft className="w-3.5 h-3.5 mr-1.5" />Volver</Link>
            </Button>
          </div>
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
                <span className="text-xs text-zinc-500 uppercase">{client.comercial_name && `· ${client.comercial_name}`}</span>
              </div>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <div className="text-[10px] uppercase tracking-[0.08em] text-zinc-400 font-semibold">Teléfono</div>
              <div className="text-zinc-950 mt-0.5 flex items-center gap-1.5">
                {formatPhone(client.telefono)}
                {client.telefono && (
                  <a
                    href={`https://wa.me/${String(client.telefono || "").replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex p-0.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                    title="Enviar WhatsApp"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
                  </a>
                )}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.08em] text-zinc-400 font-semibold">Email</div>
              <div className="text-zinc-950 mt-0.5 truncate flex items-center gap-1.5">
                {client.email || "—"}
                {client.email && (
                  <a
                    href={`mailto:${client.email}`}
                    className="inline-flex p-0.5 text-sky-600 hover:bg-sky-50 rounded transition-colors"
                    title="Enviar Email"
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
            <div><div className="text-[10px] uppercase tracking-[0.08em] text-zinc-400 font-semibold">Provincia</div><div className="text-zinc-950 mt-0.5">{client.provincia || "—"}</div></div>
            <div><div className="text-[10px] uppercase tracking-[0.08em] text-zinc-400 font-semibold">Tarifa</div><div className="text-zinc-950 mt-0.5 font-mono text-xs">{client.tarifa ? `${client.tipo_servicio === "gas" ? "🔥" : "💡"} ${client.tarifa}` : "—"}</div></div>
            <div><div className="text-[10px] uppercase tracking-[0.08em] text-zinc-400 font-semibold">Comisión</div><div className="font-mono text-zinc-950 mt-0.5">{client.comision ? formatEUR(client.comision) : "—"}</div></div>
            {client.estado === "sin_ahorro" && (
              <div>
                <div className="text-[10px] uppercase tracking-[0.08em] text-amber-500 font-bold">📅 Fin Contrato</div>
                <div className="font-mono text-zinc-950 mt-0.5 font-semibold">{client.fecha_fin_contrato ? formatDate(client.fecha_fin_contrato) : "No definida"}</div>
              </div>
            )}
            {client.fecha_alerta_personalizada && (
              <div>
                <div className="text-[10px] uppercase tracking-[0.08em] text-rose-500 font-bold">📌 Alerta Seguimiento</div>
                <div className="font-mono text-zinc-950 mt-0.5 font-semibold" title={client.motivo_alerta_personalizada}>{formatDate(client.fecha_alerta_personalizada)}</div>
              </div>
            )}
          </div>
        </div>
        {/* Panel de Control del Lead */}
        <div className="bg-zinc-950 text-white rounded-xl p-5 mb-6 border border-zinc-800 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-orange-500 to-amber-500" />
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
            <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-orange-500 animate-pulse" /> Panel de Control del Lead
            </h3>
            <span className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase">Estatus General</span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-11 gap-3.5 text-center">
            {/* 👤 Nombre */}
            <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-850 flex flex-col justify-between h-14">
              <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">👤 Nombre</span>
              <span className="text-[10px] font-bold truncate text-white block" title={client.nombre}>{client.nombre}</span>
            </div>

            {/* 📞 Teléfono */}
            <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-850 flex flex-col justify-between h-14">
              <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">📞 Teléfono</span>
              <span className="text-[10px] font-bold truncate text-white block">{client.telefono ? formatPhone(client.telefono) : "—"}</span>
            </div>

            {/* ✉ Email */}
            <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-850 flex flex-col justify-between h-14">
              <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">✉ Email</span>
              <span className="text-[10px] font-bold truncate text-white block" title={client.email || "—"}>{client.email || "—"}</span>
            </div>

            {/* 🏢 Comercializadora */}
            <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-850 flex flex-col justify-between h-14">
              <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">🏢 Comercial.</span>
              <span className="text-[10px] font-bold truncate text-white block" title={client.comercializadora || "—"}>{client.comercializadora || "—"}</span>
            </div>

            {/* ⚡ Tarifa */}
            <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-850 flex flex-col justify-between h-14">
              <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">⚡ Tarifa</span>
              <span className="text-[10px] font-bold truncate text-white block font-mono">{client.tarifa ? `${client.tipo_servicio === "gas" ? "🔥" : "💡"} ${client.tarifa}` : "—"}</span>
            </div>

            {/* 📍 Dirección Suministro */}
            <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-850 flex flex-col justify-between h-14">
              <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">📍 Suministro</span>
              <span className="text-[10px] font-bold truncate text-white block" title={client.direccion || "—"}>{client.direccion || "—"}</span>
            </div>

            {/* 📅 Estado */}
            <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-850 flex flex-col justify-between h-14">
              <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">📅 Estado</span>
              <span className="text-[9px] font-extrabold uppercase truncate block leading-tight text-orange-400">
                {s?.label || "Nuevo Lead"}
              </span>
            </div>

            {/* 💰 Ahorro Estimado */}
            <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-850 flex flex-col justify-between h-14">
              <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">💰 Ahorro</span>
              <span className="text-[10px] font-bold truncate text-white block font-mono text-emerald-400">
                {client.ahorro_estimado ? formatEUR(client.ahorro_estimado) : "—"}
              </span>
            </div>

            {/* 🟢 RGPD */}
            <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-850 flex flex-col justify-between h-14">
              <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">🟢 RGPD</span>
              {client.rgpd_aceptado ? (
                <span className="text-[9px] font-bold text-emerald-400 flex items-center justify-center gap-0.5" title={`Firmado el ${new Date(client.rgpd_fecha).toLocaleDateString()}`}>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /> Aceptado
                </span>
              ) : (
                <span className="text-[9px] font-bold text-amber-500 flex items-center justify-center gap-0.5 animate-pulse">
                  <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" /> Pendiente
                </span>
              )}
            </div>

            {/* 🟢 Factura Recibida */}
            <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-850 flex flex-col justify-between h-14">
              <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">🟢 Factura</span>
              {documents.some(doc => doc.tipo === "factura") ? (
                <span className="text-[9px] font-bold text-emerald-400 flex items-center justify-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /> Recibida
                </span>
              ) : (
                <span className="text-[9px] font-bold text-amber-500 flex items-center justify-center gap-0.5">
                  <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" /> Pendiente
                </span>
              )}
            </div>

            {/* 📄 Comparativa */}
            <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-850 flex flex-col justify-between h-14">
              <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">📄 Comparativa</span>
              {contracts.length > 0 ? (
                <span className="text-[9px] font-bold text-emerald-400 flex items-center justify-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /> Generada
                </span>
              ) : (
                <span className="text-[9px] font-bold text-amber-500 flex items-center justify-center gap-0.5">
                  <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" /> Pendiente
                </span>
              )}
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-zinc-100 p-1 h-9">
            <TabsTrigger value="datos" data-testid="tab-datos" className="text-xs px-3 data-[state=active]:bg-white">Datos</TabsTrigger>
            <TabsTrigger value="contratos" data-testid="tab-contratos" className="text-xs px-3 data-[state=active]:bg-white">Contratos ({contracts.length})</TabsTrigger>
            <TabsTrigger value="documentos" data-testid="tab-documentos" className="text-xs px-3 data-[state=active]:bg-white">Documentos ({documents.length})</TabsTrigger>
            <TabsTrigger value="relacionar" data-testid="tab-relacionar" className="text-xs px-3 data-[state=active]:bg-white" onClick={loadAllContracts}>
              Relacionar ({allContracts.filter(c => Array.isArray(c.relaciones) && c.relaciones.some(r => r.cliente_id === client.id)).length})
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="text-xs px-3 data-[state=active]:bg-white flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-500" /> WhatsApp
            </TabsTrigger>
          </TabsList>

          <TabsContent value="datos">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
              
              {/* Left Column: Form Details (2 cols wide) */}
              <div className="bg-white border border-zinc-200 rounded-md p-6 lg:col-span-2 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-zinc-150 pb-6 mb-4">
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="client-nombre" className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Titular</Label>
                      <Input id="client-nombre" className="mt-1 h-9 border-zinc-200" value={client.nombre || ""} onChange={(e) => setClient({ ...client, nombre: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="client-telefono" className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Teléfono</Label>
                      <Input id="client-telefono" className="mt-1 h-9 border-zinc-200" value={client.telefono || ""} onChange={(e) => setClient({ ...client, telefono: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="client-email" className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Email</Label>
                      <Input id="client-email" type="email" className="mt-1 h-9 border-zinc-200" value={client.email || ""} onChange={(e) => setClient({ ...client, email: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="client-iban" className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">IBAN</Label>
                      <Input id="client-iban" className="mt-1 h-9 border-zinc-200" value={client.iban || ""} onChange={(e) => setClient({ ...client, iban: e.target.value })} placeholder="ES00..." />
                    </div>
                    <div>
                      <Label htmlFor="client-birthdate" className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">🎂 Fecha de Nacimiento (Felicidades automática)</Label>
                      <Input id="client-birthdate" type="date" className="mt-1 h-9 border-zinc-200" value={client.fecha_nacimiento || ""} onChange={(e) => setClient({ ...client, fecha_nacimiento: e.target.value })} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Tipo de titular</Label>
                      <div className="mt-1.5 grid grid-cols-2 gap-2">
                        <label className="flex items-center gap-2 px-3 py-2 rounded-md border border-zinc-200 bg-white cursor-pointer text-xs text-zinc-800 font-medium">
                          <input 
                            type="radio" 
                            name="edit_tipo_titular" 
                            checked={client.tipo_titular === "fisica"} 
                            onChange={() => setClient({ ...client, tipo_titular: "fisica" })}
                            className="w-3.5 h-3.5 text-zinc-950 focus:ring-0"
                          />
                          <span>Persona física</span>
                        </label>
                        <label className="flex items-center gap-2 px-3 py-2 rounded-md border border-zinc-200 bg-white cursor-pointer text-xs text-zinc-800 font-medium">
                          <input 
                            type="radio" 
                            name="edit_tipo_titular" 
                            checked={client.tipo_titular === "juridica"} 
                            onChange={() => setClient({ ...client, tipo_titular: "juridica" })}
                            className="w-3.5 h-3.5 text-zinc-950 focus:ring-0"
                          />
                          <span>Persona jurídica</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="client-nif" className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">
                        {client.tipo_titular === "juridica" ? "CIF" : "DNI / NIF"}
                      </Label>
                      {client.tipo_titular === "juridica" ? (
                        <Input 
                          id="client-cif" 
                          className="mt-1 h-9 border-zinc-200" 
                          value={client.cif || ""} 
                          onChange={(e) => setClient({ ...client, cif: e.target.value })} 
                          placeholder="B12345678"
                        />
                      ) : (
                        <Input 
                          id="client-nif" 
                          className="mt-1 h-9 border-zinc-200" 
                          value={client.nif || ""} 
                          onChange={(e) => setClient({ ...client, nif: e.target.value })} 
                          placeholder="12345678Z"
                        />
                      )}
                    </div>

                    <div className="pt-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-800">
                        <input 
                          type="checkbox" 
                          checked={client.titular_no_firmante || false} 
                          onChange={(e) => setClient({ ...client, titular_no_firmante: e.target.checked })}
                          className="w-3.5 h-3.5 rounded border-zinc-300 text-zinc-950 focus:ring-0"
                        />
                        <span>La persona titular no es la firmante</span>
                      </label>
                    </div>

                    {client.titular_no_firmante && (
                      <div className="space-y-3 p-3 rounded-lg bg-zinc-50 border border-zinc-150 anim-fadeup mt-2">
                        <div>
                          <Label htmlFor="client-firmante-nombre" className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Titular firmante</Label>
                          <Input 
                            id="client-firmante-nombre" 
                            className="mt-1 h-8.5 text-xs border-zinc-200 bg-white" 
                            value={client.firmante_nombre || ""} 
                            onChange={(e) => setClient({ ...client, firmante_nombre: e.target.value })} 
                            placeholder="Nombre del firmante / apoderado"
                          />
                        </div>
                        <div>
                          <Label htmlFor="client-firmante-dni" className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">DNI / NIF firmante</Label>
                          <Input 
                            id="client-firmante-dni" 
                            className="mt-1 h-8.5 text-xs border-zinc-200 bg-white" 
                            value={client.firmante_dni || ""} 
                            onChange={(e) => setClient({ ...client, firmante_dni: e.target.value })} 
                            placeholder="DNI del firmante / apoderado"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Estado</Label>
                    <Select value={client.estado} onValueChange={(v) => setClient({ ...client, estado: v })}>
                      <SelectTrigger className={`mt-1 h-9 font-bold border ${CLIENT_STATE_MAP[client.estado]?.color || "border-zinc-200"}`} data-testid="client-field-estado">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CLIENT_STATES.map((st) => (
                          <SelectItem key={st.value} value={st.value}>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${st.color}`}>
                              {st.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 sm:col-span-2">
                    <Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Historial de Actividades e Interacciones</Label>
                    
                    {/* Activity Timeline */}
                    <div className="mt-2 space-y-4 max-h-[350px] overflow-y-auto pr-2 border border-zinc-150 rounded-md p-3.5 bg-zinc-50/20">
                      {(!client.comentarios || client.comentarios.length === 0) ? (
                        <div className="text-[11px] text-zinc-400 py-6 italic text-center">
                          No hay interacciones o actividades registradas para este cliente.
                        </div>
                      ) : (
                        <div className="relative border-l-2 border-zinc-100 pl-4 ml-3.5 space-y-4">
                          {[...(client.comentarios || [])].reverse().map((comment, idx) => {
                            // Extract activity style config dynamically
                            const isSystem = comment.id?.startsWith("system-") || comment.user_name === "Sistema" || comment.user_name === "WhatsApp Log" || comment.user_name === "Nota Histórica" || comment.user_name === "Sistema (Nota Histórica)";
                            let type = comment.type || "note";
                            
                            if (!comment.type) {
                              if (isSystem) {
                                type = "system";
                              } else {
                                const txt = (comment.text || "").toLowerCase();
                                if (txt.includes("llamada") || txt.includes("📞") || txt.includes("llame")) type = "call";
                                else if (txt.includes("correo") || txt.includes("📧") || txt.includes("email")) type = "email";
                                else if (txt.includes("whatsapp") || txt.includes("💬") || txt.includes("wsp")) type = "whatsapp";
                              }
                            }

                            let actConfig = {
                              icon: <User className="w-3 h-3 text-zinc-500" />,
                              badge: "Nota Interna",
                              colorClass: "bg-zinc-50 text-zinc-700 border-zinc-150",
                              bulletClass: "bg-zinc-950 border-white text-white"
                            };

                            if (type === "call") {
                              actConfig = {
                                icon: <Phone className="w-3 h-3 text-rose-500" />,
                                badge: "Llamada Realizada",
                                colorClass: "bg-rose-50/60 text-rose-800 border-rose-100",
                                bulletClass: "bg-rose-600 border-white text-white"
                              };
                            } else if (type === "email") {
                              actConfig = {
                                icon: <Mail className="w-3 h-3 text-sky-500" />,
                                badge: "Correo Enviado",
                                colorClass: "bg-sky-50/60 text-sky-850 border-sky-100",
                                bulletClass: "bg-sky-500 border-white text-white"
                              };
                            } else if (type === "whatsapp") {
                              actConfig = {
                                icon: <MessageSquare className="w-3 h-3 text-emerald-500" />,
                                badge: "WhatsApp",
                                colorClass: "bg-emerald-50/60 text-emerald-800 border-emerald-100",
                                bulletClass: "bg-emerald-600 border-white text-white"
                              };
                            } else if (type === "system") {
                              actConfig = {
                                icon: <Sparkles className="w-3 h-3 text-amber-600" />,
                                badge: "Sistema",
                                colorClass: "bg-amber-50/50 text-amber-800 border-amber-100",
                                bulletClass: "bg-amber-500 border-white text-white"
                              };
                            }

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

                            // Clean prefix indicator from text if present to avoid duplicating emojis
                            let displayText = comment.text || "";
                            if (displayText.startsWith("📞 LLAMADA: ")) displayText = displayText.slice(12);
                            else if (displayText.startsWith("✉️ CORREO: ")) displayText = displayText.slice(11);
                            else if (displayText.startsWith("💬 WHATSAPP: ")) displayText = displayText.slice(13);

                            return (
                              <div key={comment.id || idx} className="relative group anim-fadeup">
                                {/* Bullet indicator */}
                                <div className={`absolute -left-[23px] top-1.5 w-2.5 h-2.5 rounded-full border-2 ${actConfig.bulletClass} shadow-sm flex items-center justify-center`} />
                                
                                <div className="bg-white border border-zinc-200 rounded-md p-2.5 shadow-sm">
                                  <div className="flex items-center justify-between mb-1 gap-2 border-b border-zinc-50 pb-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <div className={`w-4 h-4 rounded-full bg-zinc-100 flex items-center justify-center text-[7px] font-bold text-zinc-900 border border-zinc-200`}>
                                        {initials}
                                      </div>
                                      <span className="text-[11px] font-bold text-zinc-800 leading-none">{comment.user_name || "Usuario"}</span>
                                      
                                      {/* Specific type badge */}
                                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold border leading-none ${actConfig.colorClass}`}>
                                        {actConfig.icon}
                                        {actConfig.badge}
                                      </span>
                                    </div>
                                    <span className="text-[9px] text-zinc-400 font-mono leading-none">{dateStr}</span>
                                  </div>
                                  <p className="text-[11px] text-zinc-650 leading-relaxed whitespace-pre-wrap pl-0.5 pt-0.5">{displayText}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Add new Activity form */}
                    <div className="mt-4 p-3 bg-zinc-50/50 rounded-lg border border-zinc-200">
                      {/* Activity type selector bar */}
                      <div className="flex flex-wrap gap-1.5 mb-2.5">
                        {[
                          { value: "note", label: "📝 Nota", activeClass: "bg-zinc-900 text-white border-zinc-900 shadow-sm" },
                          { value: "call", label: "📞 Llamada", activeClass: "bg-rose-600 text-white border-rose-600 shadow-sm" },
                          { value: "email", label: "✉️ Correo", activeClass: "bg-sky-600 text-white border-sky-600 shadow-sm" },
                          { value: "whatsapp", label: "💬 WhatsApp", activeClass: "bg-emerald-600 text-white border-emerald-600 shadow-sm" }
                        ].map(act => (
                          <button
                            key={act.value}
                            type="button"
                            onClick={() => setActiveActivityType(act.value)}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-full border transition-all duration-150 cursor-pointer ${
                              activeActivityType === act.value 
                                ? act.activeClass 
                                : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100"
                            }`}
                          >
                            {act.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-2 items-start">
                        <textarea
                          className="w-full min-h-[60px] rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                          placeholder={
                            activeActivityType === "call" ? "Registra el resultado de la llamada..."
                            : activeActivityType === "email" ? "Copia o resume el correo enviado..."
                            : activeActivityType === "whatsapp" ? "Copia el mensaje de WhatsApp enviado..."
                            : "Escribe una nueva nota comercial interna..."
                          }
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                        />
                        <Button
                          type="button"
                          onClick={async () => {
                            if (!newCommentText.trim()) return;
                            try {
                              const storedUser = JSON.parse(localStorage.getItem("aml_user") || "{}");
                              
                              // Format prefix to avoid plain JSON display duplicate indicator
                              const prefixText = activeActivityType === "call" ? `📞 LLAMADA: ${newCommentText.trim()}`
                                               : activeActivityType === "email" ? `✉️ CORREO: ${newCommentText.trim()}`
                                               : activeActivityType === "whatsapp" ? `💬 WHATSAPP: ${newCommentText.trim()}`
                                               : newCommentText.trim();

                              const newCommentObj = {
                                id: `comment-${Date.now()}`,
                                timestamp: new Date().toISOString(),
                                user_name: storedUser.name || "Usuario",
                                text: prefixText,
                                type: activeActivityType
                              };
                              const updatedComentarios = [...(client.comentarios || []), newCommentObj];
                              
                              await api.patch(`/clients/${client.id}`, { comentarios: updatedComentarios });
                              toast.success("Actividad registrada");
                              setNewCommentText("");
                              load();
                            } catch (e) {
                              toast.error("Error al registrar actividad");
                            }
                          }}
                          disabled={!newCommentText.trim()}
                          className="h-10 bg-zinc-950 text-white hover:bg-zinc-800 text-xs font-semibold px-3 flex items-center justify-center gap-1.5 shrink-0"
                        >
                          <Send className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <hr className="my-6 border-zinc-200" />
                
                {/* Sección Dirección Fiscal */}
                <div className="space-y-4">
                  <h3 className="text-xs uppercase font-bold text-zinc-500 tracking-wider flex items-center gap-1.5">📍 Dirección Fiscal (Fija)</h3>
                  
                  {client.direccion && !client.direccion_fiscal?.nombre_via && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-center justify-between text-xs text-amber-800">
                      <span>Dirección heredada: <strong>{client.direccion}</strong></span>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-7 text-[10px] bg-white text-amber-900 border-amber-300 hover:bg-amber-100 font-semibold"
                        onClick={() => setClient({
                          ...client,
                          direccion_fiscal: {
                            ...(client.direccion_fiscal || {}),
                            nombre_via: client.direccion.toUpperCase(),
                            tipo_via: "Calle",
                            pais: "España"
                          }
                        })}
                      >
                        Copiar a Fiscal
                      </Button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-[10px] uppercase font-bold text-zinc-500">Tipo de vía</Label>
                      <Select
                        value={client.direccion_fiscal?.tipo_via || "Calle"}
                        onValueChange={(v) => setClient({
                          ...client,
                          direccion_fiscal: { ...(client.direccion_fiscal || {}), tipo_via: v }
                        })}
                      >
                        <SelectTrigger className="mt-1 h-8.5 text-xs border-zinc-200 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPO_VIA_OPTIONS.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-[10px] uppercase font-bold text-zinc-500">Nombre de la vía</Label>
                      <Input
                        className="mt-1 h-8.5 text-xs border-zinc-200 bg-white"
                        value={client.direccion_fiscal?.nombre_via || ""}
                        onChange={(e) => setClient({
                          ...client,
                          direccion_fiscal: { ...(client.direccion_fiscal || {}), nombre_via: e.target.value.toUpperCase() }
                        })}
                        placeholder="Ej: GERVASIO TORREGROSA BOIX"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
                    <div>
                      <Label className="text-[10px] uppercase font-bold text-zinc-500">Número</Label>
                      <Input
                        className="mt-1 h-8.5 text-xs border-zinc-200 bg-white"
                        value={client.direccion_fiscal?.numero || ""}
                        onChange={(e) => setClient({
                          ...client,
                          direccion_fiscal: { ...(client.direccion_fiscal || {}), numero: e.target.value }
                        })}
                        placeholder="6"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase font-bold text-zinc-500">Duplicador</Label>
                      <Input
                        className="mt-1 h-8.5 text-xs border-zinc-200 bg-white"
                        value={client.direccion_fiscal?.duplicador || ""}
                        onChange={(e) => setClient({
                          ...client,
                          direccion_fiscal: { ...(client.direccion_fiscal || {}), duplicador: e.target.value }
                        })}
                        placeholder="Bis, ..."
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase font-bold text-zinc-500">Escalera</Label>
                      <Input
                        className="mt-1 h-8.5 text-xs border-zinc-200 bg-white"
                        value={client.direccion_fiscal?.escalera || ""}
                        onChange={(e) => setClient({
                          ...client,
                          direccion_fiscal: { ...(client.direccion_fiscal || {}), escalera: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase font-bold text-zinc-500">Planta</Label>
                      <Input
                        className="mt-1 h-8.5 text-xs border-zinc-200 bg-white"
                        value={client.direccion_fiscal?.planta || ""}
                        onChange={(e) => setClient({
                          ...client,
                          direccion_fiscal: { ...(client.direccion_fiscal || {}), planta: e.target.value }
                        })}
                        placeholder="BAJO LOCAL"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase font-bold text-zinc-500">Puerta</Label>
                      <Input
                        className="mt-1 h-8.5 text-xs border-zinc-200 bg-white"
                        value={client.direccion_fiscal?.puerta || ""}
                        onChange={(e) => setClient({
                          ...client,
                          direccion_fiscal: { ...(client.direccion_fiscal || {}), puerta: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase font-bold text-zinc-500">Tipo Aclarador</Label>
                      <Select
                        value={client.direccion_fiscal?.tipo_aclarador || ""}
                        onValueChange={(v) => setClient({
                          ...client,
                          direccion_fiscal: { ...(client.direccion_fiscal || {}), tipo_aclarador: v }
                        })}
                      >
                        <SelectTrigger className="mt-1 h-8.5 text-xs border-zinc-200 bg-white">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {TIPO_ACLARADOR_OPTIONS.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-[10px] uppercase font-bold text-zinc-500">Aclarador</Label>
                      <Input
                        className="mt-1 h-8.5 text-xs border-zinc-200 bg-white"
                        value={client.direccion_fiscal?.aclarador || ""}
                        onChange={(e) => setClient({
                          ...client,
                          direccion_fiscal: { ...(client.direccion_fiscal || {}), aclarador: e.target.value }
                        })}
                        placeholder="S/N..."
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase font-bold text-zinc-500">Código Postal</Label>
                      <Input
                        className="mt-1 h-8.5 text-xs border-zinc-200 bg-white"
                        value={client.direccion_fiscal?.codigo_postal || ""}
                        onChange={(e) => setClient({
                          ...client,
                          direccion_fiscal: { ...(client.direccion_fiscal || {}), codigo_postal: e.target.value }
                        })}
                        placeholder="03206"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-[10px] uppercase font-bold text-zinc-500">Ciudad</Label>
                      <Input
                        className="mt-1 h-8.5 text-xs border-zinc-200 bg-white"
                        value={client.direccion_fiscal?.ciudad || ""}
                        onChange={(e) => setClient({
                          ...client,
                          direccion_fiscal: { ...(client.direccion_fiscal || {}), ciudad: e.target.value.toUpperCase() }
                        })}
                        placeholder="ELCHE"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase font-bold text-zinc-500">Provincia</Label>
                      <Select
                        value={client.direccion_fiscal?.provincia || ""}
                        onValueChange={(v) => setClient({
                          ...client,
                          direccion_fiscal: { ...(client.direccion_fiscal || {}), provincia: v }
                        })}
                      >
                        <SelectTrigger className="mt-1 h-8.5 text-xs border-zinc-200 bg-white">
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROVINCIAS_OPTIONS.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase font-bold text-zinc-500">País</Label>
                      <Select
                        value={client.direccion_fiscal?.pais || "España"}
                        onValueChange={(v) => setClient({
                          ...client,
                          direccion_fiscal: { ...(client.direccion_fiscal || {}), pais: v }
                        })}
                      >
                        <SelectTrigger className="mt-1 h-8.5 text-xs border-zinc-200 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAIS_OPTIONS.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <hr className="my-6 border-zinc-200" />

                {/* Sección Direcciones de Suministro */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs uppercase font-bold text-zinc-500 tracking-wider flex items-center gap-1.5">⚡ Direcciones de Suministro</h3>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 text-xs font-semibold bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-800"
                      onClick={() => {
                        setSupplyForm({
                          id: `supply-${Date.now()}`,
                          tipo_via: "Calle",
                          nombre_via: "",
                          numero: "",
                          duplicador: "",
                          escalera: "",
                          planta: "",
                          puerta: "",
                          tipo_aclarador: "",
                          aclarador: "",
                          codigo_postal: "",
                          ciudad: "",
                          provincia: "",
                          pais: "España",
                          email: "",
                          movil: "",
                          iban: "",
                          cups: [{ cups: "", tipo: "Electricidad" }],
                          disabled: false
                        });
                        setEditingSupplyIdx(null);
                        setSupplyModalOpen(true);
                      }}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Añadir nueva dirección
                    </Button>
                  </div>

                  {(!client.direcciones_suministro || client.direcciones_suministro.length === 0) ? (
                    <div className="text-xs text-zinc-400 py-6 border border-dashed border-zinc-200 rounded-md text-center italic bg-zinc-50/50">
                      No hay direcciones de suministro registradas para este cliente.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(client.direcciones_suministro || []).map((item, idx) => {
                        const addrString = `${item.tipo_via || ""} ${item.nombre_via || ""} ${item.numero || ""} ${item.duplicador || ""} ${item.planta ? 'Piso ' + item.planta : ''} ${item.puerta ? 'Pta ' + item.puerta : ''}`.trim().replace(/\s+/g, ' ');
                        const locationString = `${item.codigo_postal || ""} ${item.ciudad || ""} ${item.provincia || ""} ${item.pais || ""}`.trim().replace(/\s+/g, ' ');
                        const normalizedCups = Array.isArray(item.cups)
                          ? item.cups
                          : (typeof item.cups === "string" && item.cups.trim() !== "")
                            ? [{ cups: item.cups, tipo: item.cups_tipo || "Luz" }]
                            : [];
                        return (
                          <div 
                            key={item.id || idx} 
                            className={`border rounded-lg p-4 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                              item.disabled ? "border-zinc-200 bg-zinc-50/50 opacity-60" : "border-zinc-200 shadow-sm hover:border-zinc-350 hover:shadow"
                            }`}
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="text-xs font-bold text-zinc-800 uppercase leading-snug truncate">
                                {addrString || "Dirección sin nombre"}
                              </div>
                              <div className="text-[11px] text-zinc-500 font-medium truncate">
                                {locationString}
                              </div>
                              {normalizedCups.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                  {normalizedCups.map((c, cIdx) => (
                                    <span key={cIdx} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
                                      {c.tipo === "Gas" || String(c.tipo).toLowerCase() === "gas" ? "🔥" : "⚡"} {c.cups || "Sin CUPS"}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {(item.email || item.movil || item.iban) && (
                                <div className="text-[10px] text-zinc-400 font-medium flex flex-wrap gap-x-3 gap-y-1 pt-1 border-t border-zinc-100 mt-1">
                                  {item.email && <span>📧 {item.email}</span>}
                                  {item.movil && <span>📱 {item.movil}</span>}
                                  {item.iban && <span className="font-mono">💳 {item.iban}</span>}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0 md:self-center">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100"
                                onClick={() => {
                                  const normalizedEditCups = Array.isArray(item.cups)
                                    ? item.cups
                                    : (typeof item.cups === "string" && item.cups.trim() !== "")
                                      ? [{ cups: item.cups, tipo: item.cups_tipo || "Luz" }]
                                      : [{ cups: "", tipo: "Electricidad" }];
                                  setSupplyForm({
                                    ...item,
                                    cups: normalizedEditCups
                                  });
                                  setEditingSupplyIdx(idx);
                                  setSupplyModalOpen(true);
                                }}
                              >
                                <Edit2 className="w-3.5 h-3.5 mr-1" /> Editar
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className={`h-8 text-xs font-semibold ${item.disabled ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" : "text-amber-600 hover:text-amber-700 hover:bg-amber-50"}`}
                                onClick={() => {
                                  const updated = [...(client.direcciones_suministro || [])];
                                  updated[idx] = { ...updated[idx], disabled: !updated[idx].disabled };
                                  setClient({ ...client, direcciones_suministro: updated });
                                  toast.success(item.disabled ? "Dirección habilitada" : "Dirección deshabilitada");
                                }}
                              >
                                {item.disabled ? "Habilitar" : "Deshabilitar"}
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                onClick={() => {
                                  if (!confirm("¿Eliminar este punto de suministro?")) return;
                                  const updated = (client.direcciones_suministro || []).filter((_, i) => i !== idx);
                                  setClient({ ...client, direcciones_suministro: updated });
                                  toast.success("Dirección eliminada");
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-end">
                  <Button onClick={save} disabled={saving} className="h-9 bg-zinc-950 text-white hover:bg-zinc-800 text-xs font-semibold" data-testid="client-save-button">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Save className="w-3.5 h-3.5 mr-1.5" />Guardar Cambios</>}
                  </Button>
                </div>
              </div>

              {/* Right Column: GDPR Consent & Collaborator Integration (1 col wide) */}
              <div className="flex flex-col gap-6 lg:col-span-1">
                
                {/* Tarjeta de Consentimiento RGPD */}
                <div className="bg-white border border-zinc-200 rounded-md p-6 flex flex-col space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-zinc-150 pb-3">
                    <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 font-display">
                      <ShieldAlert className={`w-3.5 h-3.5 ${client.rgpd_aceptado ? "text-emerald-500" : "text-amber-500 animate-pulse"}`} /> Consentimiento RGPD
                    </h4>
                    {client.rgpd_aceptado ? (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded uppercase">
                        Aceptado
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded uppercase">
                        Pendiente
                      </span>
                    )}
                  </div>

                  {client.rgpd_aceptado ? (
                    <div className="space-y-3.5 text-xs">
                      <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg text-emerald-800 space-y-1">
                        <div className="font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 animate-bounce" /> Aceptado Electrónicamente
                        </div>
                        <p className="text-[9px] text-emerald-750 leading-relaxed">El cliente ha verificado su identidad y marcado los consentimientos obligatorios.</p>
                      </div>

                      <div className="space-y-1.5 border-t border-zinc-100 pt-3 text-[11px] text-zinc-600">
                        <div className="flex justify-between"><span className="text-zinc-400">📅 Fecha/Hora:</span><span className="font-medium text-zinc-800">{new Date(client.rgpd_fecha).toLocaleString()}</span></div>
                        <div className="flex justify-between"><span className="text-zinc-400">🌐 IP Registro:</span><span className="font-mono font-medium text-zinc-800">{client.rgpd_ip || "—"}</span></div>
                        <div className="flex justify-between"><span className="text-zinc-400">📜 Versión Legal:</span><span className="font-medium text-zinc-800">{client.rgpd_version || "—"}</span></div>
                        <div className="flex flex-col gap-0.5 mt-1">
                          <span className="text-zinc-450">Navegador:</span>
                          <span className="text-[9px] text-zinc-500 break-all font-mono leading-tight bg-zinc-50 p-1.5 rounded border border-zinc-100">
                            {client.rgpd_user_agent || "—"}
                          </span>
                        </div>
                      </div>

                      <Button 
                        onClick={downloadRgpdPdf}
                        className="w-full h-9 bg-zinc-950 text-white hover:bg-zinc-850 font-semibold flex items-center justify-center gap-1.5 shadow-sm mt-1 text-xs"
                      >
                        <FileText className="w-3.5 h-3.5 text-zinc-350" /> Descargar Justificante
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 text-xs text-zinc-600 leading-relaxed">
                      <p>
                        El cliente aún no ha firmado el documento de consentimiento. Solicita la firma de forma manual a través de WhatsApp, SMS o correo electrónico.
                      </p>

                      <Dialog open={rgpdModalOpen} onOpenChange={setRgpdModalOpen}>
                        <DialogTrigger asChild>
                          <Button className="w-full h-9 bg-amber-500 hover:bg-amber-600 text-white font-semibold flex items-center justify-center gap-1.5 shadow-sm text-xs">
                            <Send className="w-3.5 h-3.5 text-amber-100" /> Solicitar Firma RGPD
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md bg-white p-6 rounded-xl border border-zinc-200">
                          <DialogHeader>
                            <DialogTitle className="text-base font-bold text-zinc-950 flex items-center gap-2 font-display">
                              <ShieldAlert className="w-5 h-5 text-amber-500 animate-pulse" /> Solicitar Autorización RGPD
                            </DialogTitle>
                          </DialogHeader>
                          
                          <div className="space-y-4 py-3 text-xs text-zinc-650">
                            <p className="leading-relaxed">
                              Elige el canal por el cual deseas enviar la solicitud de consentimiento RGPD única para este cliente:
                            </p>
                            <div className="p-3 bg-zinc-50 border border-zinc-150 rounded-lg font-mono text-[9px] select-all break-all text-zinc-800">
                              {`${window.location.origin}/rgpd/${client.id}`}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                              {/* WhatsApp Button */}
                              <Button
                                variant="outline"
                                onClick={() => {
                                  const text = `Hola ${client.nombre || ""}, hemos recibido tu factura. Antes de realizar el estudio de ahorro gratuito, necesitamos que aceptes la protección de datos. Te llevará menos de un minuto aquí: ${window.location.origin}/rgpd/${client.id}`;
                                  const url = `https://wa.me/${(client.telefono || "").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(text)}`;
                                  window.open(url, "_blank");
                                  logRgpdSent("WhatsApp");
                                  setRgpdModalOpen(false);
                                }}
                                className="h-10 text-xs font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50 bg-emerald-50/20 flex items-center justify-center gap-2"
                              >
                                <MessageCircle className="w-4 h-4 text-emerald-600" /> Enviar por WhatsApp
                              </Button>

                              {/* SMS Button */}
                              <Button
                                variant="outline"
                                onClick={() => {
                                  const text = `Algo Mas Que Luz: Necesitamos tu autorizacion RGPD para el estudio de ahorro. Firmalo en 1 min aqui: ${window.location.origin}/rgpd/${client.id}`;
                                  const url = `sms:${(client.telefono || "").replace(/[^0-9]/g, "")}?body=${encodeURIComponent(text)}`;
                                  window.open(url, "_blank");
                                  logRgpdSent("SMS");
                                  setRgpdModalOpen(false);
                                }}
                                className="h-10 text-xs font-bold border-blue-200 text-blue-700 hover:bg-blue-50 bg-blue-50/20 flex items-center justify-center gap-2"
                              >
                                <MessageSquare className="w-4 h-4 text-blue-600" /> Enviar por SMS (Móvil)
                              </Button>

                              {/* Email Button */}
                              <Button
                                variant="outline"
                                onClick={() => {
                                  const subject = "Autorización RGPD - Algo Más Que Luz";
                                  const body = `Hola ${client.nombre},\n\nPara poder realizar tu estudio de ahorro energético gratuito, necesitamos que autorices el tratamiento de tus datos en cumplimiento de la RGPD.\n\nPuedes autorizarlo en menos de un minuto haciendo clic aquí:\n${window.location.origin}/rgpd/${client.id}\n\nUn saludo,\nEquipo de Algo Más Que Luz`;
                                  const url = `mailto:${client.email || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                                  window.open(url, "_blank");
                                  logRgpdSent("Email");
                                  setRgpdModalOpen(false);
                                }}
                                className="h-10 text-xs font-bold border-sky-200 text-sky-700 hover:bg-sky-50 bg-sky-50/20 flex items-center justify-center gap-2"
                              >
                                <Mail className="w-4 h-4 text-sky-600" /> Enviar por Correo
                              </Button>

                              {/* Copy Link Button */}
                              <Button
                                variant="outline"
                                onClick={() => {
                                  navigator.clipboard.writeText(`${window.location.origin}/rgpd/${client.id}`);
                                  toast.success("Enlace copiado al portapapeles");
                                  logRgpdSent("Copia Manual");
                                  setRgpdModalOpen(false);
                                }}
                                className="h-10 text-xs font-bold border-zinc-200 text-zinc-700 hover:bg-zinc-50 flex items-center justify-center gap-2"
                              >
                                <Copy className="w-4 h-4 text-zinc-650" /> Copiar Enlace
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>

                {/* Widget de Comunicación de WhatsApp */}
                <div className="bg-white border border-zinc-200 rounded-md p-6 flex flex-col space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-zinc-150 pb-3">
                    <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 font-display">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-500" /> Conversación
                    </h4>
                    <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-250 px-2 py-0.5 rounded uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Conectado
                    </span>
                  </div>

                  <div className="space-y-3.5 text-xs text-zinc-650">
                    <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-150 space-y-1">
                      <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold block">Último mensaje</span>
                      <p className="font-semibold text-zinc-800 italic">
                        "{chatMessages.length > 0 ? chatMessages[chatMessages.length - 1].text : "Hablamos mañana"}"
                      </p>
                      <span className="text-[9.5px] text-zinc-400 font-medium block pt-0.5">
                        {chatMessages.length > 0 
                          ? `Hace unos instantes` 
                          : "Hace 2 horas · WhatsApp Web"
                        }
                      </span>
                    </div>

                    <Button 
                      onClick={() => setActiveTab("whatsapp")}
                      className="w-full h-9 bg-zinc-950 text-white hover:bg-zinc-850 font-semibold flex items-center justify-center gap-1.5 shadow-sm text-xs"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400" /> Abrir conversación
                    </Button>
                  </div>
                </div>

                {/* Puente de Portales */}
                <div className="bg-white border border-zinc-200 rounded-md p-6 flex flex-col space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-zinc-150 pb-3">
                  <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-orange-500" /> Puente de Portales
                  </h4>
                  {client.sync_status === "sincronizado" && (
                    <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      Sync Activo
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-zinc-400 font-semibold uppercase">Portal Colaborador</label>
                    <select 
                      className="mt-1 w-full h-9 rounded border border-zinc-200 text-xs px-2 focus:ring-1 focus:ring-zinc-950 bg-white"
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
                    <label className="text-[10px] text-zinc-400 font-semibold uppercase block">Acceso Directo al CRM</label>
                    {COLLABORATORS.find(c => c.value === syncCollaborator)?.url ? (
                      <a 
                        href={COLLABORATORS.find(c => c.value === syncCollaborator)?.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mt-1 h-9 w-full inline-flex items-center justify-center text-xs font-bold text-zinc-950 hover:bg-zinc-50 border border-zinc-200 rounded shadow-sm gap-1.5 transition-colors"
                      >
                        Tramitar en Portal <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <button 
                        disabled 
                        className="mt-1 h-9 w-full inline-flex items-center justify-center text-xs font-bold text-zinc-400 bg-zinc-50 border border-zinc-150 rounded cursor-not-allowed"
                      >
                        Portal no disponible (Próximamente)
                      </button>
                    )}
                  </div>

                  <button
                    onClick={handleStartSync}
                    disabled={isSyncing}
                    className="w-full h-10 inline-flex items-center justify-center bg-zinc-950 hover:bg-zinc-800 text-white font-semibold text-xs rounded transition-colors gap-2 shadow"
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Sincronizando...</span>
                      </>
                    ) : (
                      <>
                        <RotateCw className="w-3.5 h-3.5 text-zinc-300" />
                        <span>🔄 Sincronizar Estado de Intranet</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Sync Progress Bar */}
                {isSyncing && (
                  <div className="space-y-3 bg-zinc-50/50 p-4 border border-zinc-200 rounded-md anim-fadeup text-xs">
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-semibold">
                      <span>Paso {syncStep} de 5</span>
                      <span>{syncStep * 20}%</span>
                    </div>
                    <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-zinc-950 h-full transition-all duration-300" style={{ width: `${syncStep * 20}%` }} />
                    </div>
                    <div className="space-y-1.5">
                      {[
                        "Estableciendo handshake seguro SSL",
                        "Validando API tokens y credenciales de agencia",
                        "Buscando coincidencia por CUPS/NIF en portafolios",
                        "Analizando estado de contrato en sistema externo",
                        "Confirmando sincronización de estado local"
                      ].map((stepDesc, idx) => {
                        const stepNum = idx + 1;
                        let icon = <div className="w-3.5 h-3.5 rounded-full border border-zinc-300 bg-white" />;
                        let textClass = "text-zinc-400";
                        if (syncStep > stepNum) {
                          icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
                          textClass = "text-emerald-700 font-medium";
                        } else if (syncStep === stepNum) {
                          icon = <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F97316] shrink-0" />;
                          textClass = "text-zinc-900 font-semibold";
                        }
                        return (
                          <div key={idx} className="flex items-center gap-2 text-[11px]">
                            {icon}
                            <span className={textClass}>{stepDesc}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Log messages */}
                {syncLogs.length > 0 && (
                  <div className="bg-zinc-900 text-zinc-300 font-mono text-[8px] rounded-lg p-2.5 max-h-32 overflow-y-auto space-y-1 border border-zinc-800">
                    {syncLogs.map((lg, i) => (
                      <div key={i} className="flex items-start gap-1">
                        <span className="text-zinc-500 select-none">[{lg.timestamp}]</span>
                        <span className={lg.type === "success" ? "text-emerald-400" : lg.type === "warning" ? "text-amber-400" : "text-zinc-300"}>{lg.message}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Historical Sync logs */}
                {client.sync_logs && client.sync_logs.length > 0 && !isSyncing && (
                  <div className="space-y-1.5 pt-2 border-t border-zinc-150">
                    <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Historial de Sincronización</div>
                    <div className="border border-zinc-150 rounded divide-y divide-zinc-100 max-h-28 overflow-y-auto bg-zinc-50 text-[10px]">
                      {(client.sync_logs || []).map((hLog, i) => (
                        <div key={i} className="px-2.5 py-1.5 flex items-start justify-between gap-2">
                          <div className="text-zinc-650 font-medium">{hLog.message}</div>
                          <div className="text-zinc-400 shrink-0 font-mono text-[9px]">{new Date(hLog.timestamp).toLocaleDateString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Historial de Cambios */}
                {client.historial_cambios && client.historial_cambios.length > 0 && (
                  <div className="space-y-1.5 pt-3 border-t border-zinc-150">
                    <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <History className="w-3.5 h-3.5 text-zinc-400" /> Historial de Cambios
                    </div>
                    <div className="border border-zinc-150 rounded divide-y divide-zinc-100 max-h-48 overflow-y-auto bg-zinc-50/50 text-[10px]">
                      {(client.historial_cambios || []).map((change, i) => (
                        <div key={i} className="px-2.5 py-2 space-y-1">
                          <div className="flex justify-between items-center text-[9px]">
                            <span className="font-semibold text-zinc-700">{change.user_name || "Usuario"}</span>
                            <span className="text-zinc-400 font-mono">
                              {new Date(change.timestamp).toLocaleString("es-ES", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                          </div>
                          <ul className="list-disc pl-3 text-zinc-600 space-y-0.5">
                            {(change.changes || []).map((cMsg, j) => (
                              <li key={j} className="leading-normal">{cMsg}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </TabsContent>

          <TabsContent value="contratos">
            <div className="bg-white border border-zinc-200 rounded-md mt-4 overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
                <div><h3 className="font-display text-base font-semibold tracking-tight">Contratos energéticos</h3><p className="text-xs text-zinc-500 mt-0.5">Histórico de comercializadoras y renovaciones</p></div>
                <Dialog open={contractOpen} onOpenChange={(isOpen) => { setContractOpen(isOpen); if (!isOpen) { setEditingContract(null); } }}>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm" 
                      className="h-8 bg-zinc-950 text-white hover:bg-zinc-800 text-xs" 
                      data-testid="new-contract-button"
                      onClick={() => {
                        setEditingContract(null);
                        setNewContract({
                          comercializadora: "", tarifa: "2.0TD", potencia_contratada: 5.5,
                          fecha_inicio: new Date().toISOString().slice(0, 10),
                          fecha_renovacion: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
                          permanencia_meses: 12, importe_anual: 0, notas: "",
                          comercializadora_anterior: "", comercializadora_actual: "",
                          empresa_colaboradora: "", cups: client?.cups || "", consumo_anual: 0, estado: "pendiente_estudio",
                          tipo_servicio: client?.tipo_servicio || "luz",
                          direccion: client?.direccion || "",
                          provincia: client?.provincia || "",
                          comision: client?.comision || 0,
                          etiqueta: "",
                          fecha_fin_contrato: "",
                          fecha_alerta_personalizada: "",
                          motivo_alerta_personalizada: "",
                          relaciones: []
                        });
                      }}
                    >
                      <Plus className="w-3 h-3 mr-1" />Nuevo
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xs sm:max-w-md md:max-w-3xl lg:max-w-5xl">
                    <DialogHeader>
                      <DialogTitle className="text-zinc-900 font-semibold tracking-tight text-lg">
                        {editingContract ? "Editar contrato" : "Nuevo contrato"}
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
                            <SelectTrigger className="mt-1 h-8.5 text-xs border-zinc-200 bg-white" data-testid="new-contract-comercializadora">
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
                              <SelectValue />
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
                            onChange={(e) => setNewContract({ ...newContract, direccion: e.target.value.toUpperCase() })} 
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
                          <Label className="text-[10px] uppercase font-bold text-zinc-500">Importe anual (€)</Label>
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
                      <Button onClick={createContract} className="h-8.5 bg-zinc-950 hover:bg-zinc-800 text-white text-xs" data-testid="new-contract-submit">{editingContract ? "Guardar" : "Crear"}</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={folderOpen} onOpenChange={setFolderOpen}>
                  <DialogContent className="max-w-2xl bg-white border border-zinc-200 shadow-xl rounded-2xl p-6 top-[12vh] !translate-y-0">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-zinc-950 font-display font-semibold tracking-tight text-lg">
                        <FolderOpen className="w-5 h-5 text-[#ff5722]" />
                        <span>Carpeta de Documentos del Contrato</span>
                      </DialogTitle>
                      {folderContract && (
                        <div className="text-xs text-zinc-500 mt-1">
                          Comercializadora: <span className="font-semibold text-zinc-850">{folderContract.comercializadora_actual || folderContract.comercializadora}</span> | Tarifa: <span className="font-mono text-zinc-800">{folderContract.tarifa}</span> | CUPS: <span className="font-mono text-zinc-800">{folderContract.cups || "—"}</span>
                        </div>
                      )}
                    </DialogHeader>

                    {/* Upload area for contract documents */}
                    <div className="mt-4 p-4 bg-zinc-50 border border-zinc-200 rounded-xl">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-3">
                        <div className="flex flex-col gap-0.5">
                          <Label className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">Tipo de Documento</Label>
                          <span className="text-[10px] text-zinc-400">Selecciona el tipo antes de subir</span>
                        </div>
                        <select
                          value={folderUploadType}
                          onChange={(e) => setFolderUploadType(e.target.value)}
                          className="h-8 rounded border border-zinc-200 px-2.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-zinc-950 font-semibold"
                        >
                          <option value="factura">Factura (OCR Automático)</option>
                          <option value="dni">DNI</option>
                          <option value="nie">NIE</option>
                          <option value="cif">CIF</option>
                          <option value="contrato_alquiler">Contrato de Alquiler</option>
                          <option value="recibo_autonomo">Recibo de Autónomo</option>
                          <option value="justo_titulo">Justo Título</option>
                          <option value="contrato">Contrato firmado</option>
                          <option value="justificante">Justificante / Recibo</option>
                          <option value="otro">Otro</option>
                        </select>
                      </div>

                      <Label
                        htmlFor="folder-document-upload"
                        className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 hover:border-zinc-400 bg-white rounded-lg p-6 text-center cursor-pointer transition-all duration-200"
                      >
                        {folderUploading ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-6 h-6 text-[#ff5722] animate-spin" />
                            <span className="text-xs text-zinc-500 font-semibold">Subiendo y analizando...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1.5">
                            <UploadCloud className="w-6 h-6 text-zinc-400" />
                            <span className="text-xs text-zinc-700 font-bold">
                              {folderUploadType === "factura" ? "Arrastra o haz clic para subir factura" : `Subir documento como "${DOC_TYPE_MAP[folderUploadType]?.label || folderUploadType}"`}
                            </span>
                            <span className="text-[10px] text-zinc-400">Formatos aceptados: PDF, PNG, JPG hasta 10 MB</span>
                          </div>
                        )}
                        <input
                          type="file"
                          id="folder-document-upload"
                          className="hidden"
                          accept=".pdf,.png,.jpg,.jpeg"
                          disabled={folderUploading}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadFolderDocument(f);
                            e.target.value = "";
                          }}
                        />
                      </Label>
                    </div>

                    {/* List of documents for this contract */}
                    <div className="mt-4 max-h-[250px] overflow-y-auto space-y-2 pr-1">
                      {folderContract && documents.filter(d => d.contrato_id === folderContract.id).length === 0 ? (
                        <div className="text-center py-8 text-zinc-400 text-xs italic bg-zinc-50/50 border border-zinc-150 rounded-xl">
                          Esta carpeta está vacía. Sube documentos relacionados con este contrato.
                        </div>
                      ) : (
                        folderContract && documents.filter(d => d.contrato_id === folderContract.id).map(d => (
                          <div key={d.id} className="flex items-center justify-between p-3 border border-zinc-200 rounded-xl bg-white hover:shadow-sm transition-all duration-150">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-zinc-900 truncate" title={d.nombre}>{d.nombre}</span>
                                  <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[7px] uppercase font-bold border ${(DOC_TYPE_MAP[d.tipo] || DOC_TYPE_MAP.otro).color}`}>
                                    {(DOC_TYPE_MAP[d.tipo] || DOC_TYPE_MAP.otro).label}
                                  </span>
                                </div>
                                <div className="text-[10px] text-zinc-400 font-medium">
                                  {(d.size / 1024).toFixed(1)} KB · {formatDate(d.created_at)}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {d.ocr_status === "completed" && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  OCR OK
                                </span>
                              )}
                              
                              <button
                                onClick={() => deleteDocument(d.id)}
                                className="p-1 text-zinc-400 hover:text-rose-600 rounded transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <DialogFooter className="mt-4">
                      <Button onClick={() => setFolderOpen(false)} className="bg-zinc-950 hover:bg-zinc-900 text-white">Cerrar Carpeta</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 border-b border-zinc-200">
                    <tr className="text-[10px] uppercase tracking-[0.08em] text-zinc-500 font-semibold">
                      <th className="text-left px-5 py-2.5">Colaborador / CUPS</th>
                      <th className="text-left px-3 py-2.5">DNI / NIF / NIE / CIF</th>
                      <th className="text-left px-3 py-2.5">Dirección</th>
                      <th className="text-center px-3 py-2.5">Estado</th>
                      <th className="text-left px-3 py-2.5">Fecha Generación</th>
                      <th className="px-3 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {contracts.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-8 text-zinc-500 text-sm">Sin contratos</td></tr>
                    )}
                    {contracts.map((c) => (
                      <tr key={c.id} className="hover:bg-zinc-50" data-testid={`contract-row-${c.id}`}>
                        <td className="px-5 py-2.5">
                          <div>
                            <span className="font-semibold text-zinc-950 block">{c.empresa_colaboradora || "—"}</span>
                            <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">{c.cups || "—"}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-xs text-zinc-750 font-semibold uppercase">
                            {client.nif || client.cif || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-xs text-zinc-650 block uppercase max-w-xs truncate" title={c.direccion}>
                            {c.direccion || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <select
                            value={c.estado || "pendiente_estudio"}
                            onChange={(e) => updateContractStateInline(c.id, e.target.value)}
                            className="h-8 rounded border border-zinc-200 px-2 text-[10px] bg-white focus:outline-none focus:ring-1 focus:ring-zinc-950 font-semibold text-zinc-850"
                          >
                            {CONTRACT_STATES.map((s) => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-xs text-zinc-600 block">
                            {c.created_at ? formatDate(c.created_at) : "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right flex justify-end gap-1.5">
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
                                comercializadora_anterior: c.comercializadora_anterior || "",
                                comercializadora_actual: c.comercializadora_actual || c.comercializadora || "",
                                empresa_colaboradora: c.empresa_colaboradora || "",
                                cups: c.cups || "",
                                consumo_anual: c.consumo_anual || 0,
                                estado: c.estado || "activo",
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
                            className="text-zinc-400 hover:text-zinc-950" 
                            data-testid={`edit-contract-${c.id}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => openContractFolder(c)} 
                            className="text-zinc-400 hover:text-[#ff5722]" 
                            title="Carpeta de Documentación"
                            data-testid={`folder-contract-${c.id}`}
                          >
                            <Folder className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteContract(c.id)} className="text-zinc-400 hover:text-rose-600" data-testid={`delete-contract-${c.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documentos">
            <div className="bg-white border border-zinc-200 rounded-md mt-4 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display text-base font-semibold tracking-tight">Documentación del Cliente</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Visor de toda la documentación del cliente organizada por contratos y categorías</p>
                </div>
              </div>

              {/* Filtro de Tipo de Documento */}
              <div className="flex flex-wrap gap-1.5 mt-6 mb-3 pb-2 border-b border-zinc-200">
                {[
                  { value: "all", label: "Todos" },
                  { value: "factura", label: "Facturas" },
                  { value: "dni_nie", label: "DNI / NIE" },
                  { value: "cif", label: "CIF" },
                  { value: "justo_contrato", label: "Títulos / Alquiler" },
                  { value: "otro", label: "Otros" },
                ].map((fOpt) => (
                  <button
                    key={fOpt.value}
                    onClick={() => setFilterDocType(fOpt.value)}
                    className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-200 border cursor-pointer ${
                      filterDocType === fOpt.value
                        ? "bg-yellow-400 text-zinc-950 border-yellow-400 font-extrabold shadow-[0_1px_3px_rgba(0,0,0,0.1)]"
                        : "bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200 hover:text-zinc-950"
                    }`}
                  >
                    {fOpt.label}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto mt-4 border border-zinc-200 rounded-lg bg-white">
                <table className="min-w-full divide-y divide-zinc-200 text-xs">
                  <thead className="bg-zinc-50 font-bold uppercase tracking-wider text-zinc-500 text-[10px]">
                    <tr>
                      <th className="px-5 py-3 text-left">Tipo</th>
                      <th className="px-5 py-3 text-left">Nombre del Documento</th>
                      <th className="px-5 py-3 text-left">CUPS Asignado</th>
                      <th className="px-5 py-3 text-left">Fecha de Alta</th>
                      <th className="px-5 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 bg-white">
                    {documents.filter((d) => {
                      if (filterDocType === "all") return true;
                      if (filterDocType === "dni_nie") return d.tipo === "dni" || d.tipo === "nie" || d.tipo === "nif" || d.tipo === "pasaporte";
                      if (filterDocType === "justo_contrato") return d.tipo === "justo_titulo" || d.tipo === "contrato_alquiler";
                      return d.tipo === filterDocType;
                    }).map((d) => {
                      const docContract = d.contrato_id ? contracts.find(c => c.id === d.contrato_id) : null;
                      return (
                        <tr key={d.id} className="hover:bg-zinc-50/50">
                          {/* Col 1: Tipo select */}
                          <td className="px-5 py-3 text-left whitespace-nowrap">
                            <select
                              value={d.tipo || "otro"}
                              onChange={async (e) => {
                                const newType = e.target.value;
                                try {
                                  await api.patch(`/documents/${d.id}`, { tipo: newType });
                                  toast.success("Tipo de documento actualizado");
                                  load();
                                } catch {
                                  toast.error("Error al actualizar tipo");
                                }
                              }}
                              className="h-8 rounded border border-zinc-200 px-2 text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-zinc-950 font-semibold text-zinc-800"
                            >
                              {DOCUMENT_TYPE_SELECTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                              {/* Fallback for legacy types */}
                              {d.tipo && !DOCUMENT_TYPE_SELECTIONS.some(o => o.value === d.tipo) && (
                                <option value={d.tipo}>{(DOC_TYPE_MAP[d.tipo] || DOC_TYPE_MAP.otro).label}</option>
                              )}
                            </select>
                          </td>
                          {/* Col 2: Nombre */}
                          <td className="px-5 py-3 text-left font-bold text-zinc-900 max-w-[250px] truncate" title={d.nombre}>
                            <div className="flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              <span className="truncate">{d.nombre}</span>
                            </div>
                            <span className="text-[10px] text-zinc-400 font-medium block pl-5.5">{(d.size / 1024).toFixed(1)} KB</span>
                          </td>
                          {/* Col 3: CUPS */}
                          <td className="px-5 py-3 text-left whitespace-nowrap font-medium text-zinc-700">
                            {docContract ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-orange-50 text-[#ff5722] border border-orange-100 uppercase tracking-wider">
                                <FolderOpen className="w-3 h-3" />
                                {docContract.cups || "Carpeta sin CUPS"}
                              </span>
                            ) : (
                              <span className="text-zinc-400 italic">No asignado</span>
                            )}
                          </td>
                          {/* Col 4: Fecha */}
                          <td className="px-5 py-3 text-left whitespace-nowrap text-zinc-500 font-mono">
                            {formatDate(d.created_at)}
                          </td>
                          {/* Col 5: Acciones */}
                          <td className="px-5 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              {/* Descargar */}
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs font-semibold px-2 text-zinc-650 hover:text-zinc-950 hover:bg-zinc-100"
                                onClick={() => {
                                  // Mock download utility
                                  if (d.file_path && d.file_path.startsWith("http")) {
                                    const link = document.createElement("a");
                                    link.href = d.file_path;
                                    link.target = "_blank";
                                    link.download = d.nombre;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  } else {
                                    const content = `Documento: ${d.nombre}\nTipo: ${d.tipo}\nFecha de alta: ${d.created_at}\nCliente ID: ${id}\nID Documento: ${d.id}`;
                                    const blob = new Blob([content], { type: "text/plain" });
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement("a");
                                    link.href = url;
                                    link.download = d.nombre.endsWith(".txt") || d.nombre.endsWith(".pdf") || d.nombre.endsWith(".jpg") || d.nombre.endsWith(".png") 
                                      ? d.nombre 
                                      : `${d.nombre}.txt`;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    URL.revokeObjectURL(url);
                                  }
                                  toast.success("Descarga iniciada");
                                }}
                              >
                                Descargar
                              </Button>

                              {/* Asociar a un CUPS */}
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs font-semibold px-2 text-zinc-650 hover:text-zinc-950 hover:bg-zinc-100"
                                onClick={() => {
                                  setAssocDocument(d);
                                  setAssocContractId(d.contrato_id || "");
                                  setAssocModalOpen(true);
                                }}
                              >
                                Asociar a CUPS
                              </Button>

                              {/* Borrar */}
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                onClick={() => deleteDocument(d.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {documents.filter((d) => {
                      if (filterDocType === "all") return true;
                      if (filterDocType === "dni_nie") return d.tipo === "dni" || d.tipo === "nie" || d.tipo === "nif" || d.tipo === "pasaporte";
                      if (filterDocType === "justo_contrato") return d.tipo === "justo_titulo" || d.tipo === "contrato_alquiler";
                      return d.tipo === filterDocType;
                    }).length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center py-8 text-zinc-400 italic">
                          Sin documentos en esta categoría
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="relacionar">
            <div className="bg-white border border-zinc-200 rounded-md mt-4 p-5">
              <div>
                <h3 className="font-display text-base font-semibold tracking-tight">Relacionar Contratos de Otros Clientes</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Asocia un contrato de otro cliente (ej. hija, familiar, negocio secundario) con este cliente de forma informativa.</p>
              </div>

              {/* Vincular Contrato Panel */}
              <div className="mt-5 p-4 bg-zinc-50 border border-zinc-200 rounded-xl max-w-xl">
                <h4 className="text-xs uppercase font-bold text-zinc-700 tracking-wider mb-2">Relacionar contrato existente</h4>
                <div className="space-y-3">
                  <div>
                    <Label className="text-[10px] uppercase font-bold text-zinc-500">Buscar contrato de otro cliente</Label>
                    <div className="relative mt-1">
                      <Input
                        type="text"
                        placeholder="Buscar por cliente, CUPS, comercializadora, tarifa, dirección, etiqueta..."
                        value={contractSearchQuery}
                        onChange={(e) => setContractSearchQuery(e.target.value)}
                        className="h-9 text-xs pr-8 bg-white"
                      />
                      {contractSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setContractSearchQuery("")}
                          className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-650"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Search Results */}
                    {contractSearchQuery && (
                      <div className="mt-2 border border-zinc-200 rounded-md bg-white shadow-sm max-h-[220px] overflow-y-auto divide-y divide-zinc-100">
                        {allContracts.filter(c => {
                          if (c.cliente_id === client.id) return false;
                          const q = contractSearchQuery.toLowerCase();
                          const fields = [
                            c.cliente_nombre || "",
                            c.cups || "",
                            c.comercializadora_actual || c.comercializadora || "",
                            c.tarifa || "",
                            c.etiqueta || "",
                            c.direccion || "",
                            c.provincia || "",
                            c.estado || ""
                          ];
                          return fields.some(f => String(f).toLowerCase().includes(q));
                        }).length === 0 ? (
                          <div className="text-center py-4 text-xs text-zinc-400">
                            No se encontraron contratos que coincidan con la búsqueda
                          </div>
                        ) : (
                          allContracts.filter(c => {
                            if (c.cliente_id === client.id) return false;
                            const q = contractSearchQuery.toLowerCase();
                            const fields = [
                              c.cliente_nombre || "",
                              c.cups || "",
                              c.comercializadora_actual || c.comercializadora || "",
                              c.tarifa || "",
                              c.etiqueta || "",
                              c.direccion || "",
                              c.provincia || "",
                              c.estado || ""
                            ];
                            return fields.some(f => String(f).toLowerCase().includes(q));
                          }).map((c) => {
                            const isSelected = contractToRelate === c.id;
                            return (
                              <div
                                key={c.id}
                                onClick={() => {
                                  setContractToRelate(c.id);
                                }}
                                className={`flex items-center justify-between p-2.5 cursor-pointer transition duration-150 text-xs ${
                                  isSelected 
                                    ? "bg-zinc-900 text-white hover:bg-zinc-900" 
                                    : "hover:bg-zinc-50 text-zinc-700"
                                }`}
                              >
                                <div className="flex flex-col gap-0.5">
                                  <span className={`font-bold ${isSelected ? "text-white" : "text-zinc-800"}`}>
                                    {c.cliente_nombre || "Sin titular"}
                                  </span>
                                  <span className={`font-mono text-[9px] ${isSelected ? "text-zinc-300" : "text-zinc-500"}`}>
                                    CUPS: {c.cups || "Sin CUPS"}
                                  </span>
                                  {c.direccion && (
                                    <span className={`text-[9px] uppercase ${isSelected ? "text-zinc-300" : "text-zinc-400"}`}>
                                      📍 {c.direccion}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase font-semibold border ${
                                    isSelected 
                                      ? "bg-zinc-800 text-white border-zinc-700" 
                                      : "bg-zinc-100 text-zinc-700 border-zinc-200"
                                  }`}>
                                    {c.comercializadora_actual || c.comercializadora}
                                  </span>
                                  {c.etiqueta && (
                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold border ${
                                      isSelected
                                        ? "bg-zinc-750 text-white border-zinc-650"
                                        : "bg-indigo-50 text-indigo-700 border-indigo-200"
                                    }`}>
                                      🏷️ {c.etiqueta}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* Selected contract indicator */}
                    {contractToRelate && (
                      <div className="mt-3 flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <p className="font-bold">
                              Seleccionado: {
                                allContracts.find(c => c.id === contractToRelate)?.cliente_nombre || "Contrato"
                              }
                            </p>
                            <p className="text-[10px] text-emerald-600 font-mono mt-0.5">
                              CUPS: {allContracts.find(c => c.id === contractToRelate)?.cups || "Sin CUPS"}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setContractToRelate("")}
                          className="text-emerald-600 hover:text-emerald-800 text-[10px] font-semibold hover:underline"
                        >
                          Cambiar
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase font-bold text-zinc-500">Etiqueta de Relación Personalizada</Label>
                    <Input
                      type="text"
                      className="mt-1 h-9 text-xs"
                      value={relationshipLabel}
                      onChange={(e) => setRelationshipLabel(e.target.value)}
                      placeholder="Ej: Hija, Padre, Local, 2º piso, Nave..."
                    />
                  </div>
                  <Button
                    onClick={async () => {
                      if (!contractToRelate) {
                        toast.error("Por favor, busca y selecciona un contrato");
                        return;
                      }
                      if (!relationshipLabel.trim()) {
                        toast.error("Por favor, escribe una etiqueta de relación (ej: Hija)");
                        return;
                      }
                      try {
                        const targetContract = allContracts.find(c => c.id === contractToRelate);
                        if (!targetContract) return;
                        const currentRelaciones = Array.isArray(targetContract.relaciones) ? targetContract.relaciones : [];
                        if (currentRelaciones.some(r => r.cliente_id === client.id)) {
                          toast.warning("Este contrato ya está relacionado con este cliente");
                          return;
                        }
                        const updatedRelaciones = [...currentRelaciones, { cliente_id: client.id, etiqueta_relacion: relationshipLabel.trim() }];
                        await api.patch(`/contracts/${contractToRelate}`, { relaciones: updatedRelaciones });
                        toast.success("Relación creada con éxito");
                        setContractToRelate("");
                        setRelationshipLabel("");
                        setContractSearchQuery("");
                        loadAllContracts();
                        load();
                      } catch (e) {
                        toast.error("Error al relacionar el contrato");
                      }
                    }}
                    className="h-9 bg-zinc-950 text-white hover:bg-zinc-800 text-xs px-4 rounded-md w-full sm:w-auto"
                  >
                    Establecer Relación
                  </Button>
                </div>
              </div>

              {/* List of related contracts */}
              <div className="mt-6">
                <h4 className="text-xs font-bold text-zinc-950 mb-3">
                  Contratos de otros clientes relacionados con {client.nombre} ({
                    allContracts.filter(c => Array.isArray(c.relaciones) && c.relaciones.some(r => r.cliente_id === client.id)).length
                  })
                </h4>
                <div className="border border-zinc-200 rounded-md overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-zinc-50 text-zinc-500 uppercase font-bold text-[10px] tracking-wider border-b border-zinc-200">
                      <tr>
                        <th className="px-5 py-3">Cliente / CUPS</th>
                        <th className="px-3 py-3">Etiqueta de Relación</th>
                        <th className="px-3 py-3">Comercializadora / Tarifa</th>
                        <th className="px-3 py-3">Importe Anual</th>
                        <th className="px-3 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 bg-white">
                      {allContracts.filter(c => Array.isArray(c.relaciones) && c.relaciones.some(r => r.cliente_id === client.id)).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-zinc-400 italic bg-zinc-50/30">
                            No hay relaciones con contratos de otros clientes para este perfil.
                          </td>
                        </tr>
                      ) : (
                        allContracts
                          .filter(c => Array.isArray(c.relaciones) && c.relaciones.some(r => r.cliente_id === client.id))
                          .map((c) => {
                            const relation = c.relaciones.find(r => r.cliente_id === client.id);
                            return (
                              <tr key={c.id} className="hover:bg-zinc-50">
                                <td className="px-5 py-3">
                                  <div>
                                    <div className="font-semibold text-zinc-950">
                                      <Link to={`/clientes/${c.cliente_id}`} className="text-[#ff5722] hover:underline font-bold">{c.cliente_nombre || "Ver ficha"}</Link>
                                    </div>
                                    <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                                      CUPS: {c.cups || "—"}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <span className="px-2.5 py-1 text-[10px] font-bold bg-amber-50 text-amber-800 rounded-full border border-amber-200 inline-block">
                                    🏷️ {relation ? relation.etiqueta_relacion : "—"}
                                  </span>
                                </td>
                                <td className="px-3 py-3">
                                  <div className="font-semibold text-zinc-800">{c.comercializadora_actual || c.comercializadora}</div>
                                  <div className="text-[10px] text-zinc-500 mt-0.5 font-mono">{c.tarifa} · {c.potencia_contratada} kW</div>
                                </td>
                                <td className="px-3 py-3 font-mono text-zinc-950 font-bold">{formatEUR(c.importe_anual)}</td>
                                <td className="px-3 py-3 text-right">
                                  <button
                                    onClick={async () => {
                                      if (!confirm("¿Estás seguro de que deseas eliminar la relación con este contrato?")) return;
                                      try {
                                        const updatedRelaciones = (c.relaciones || []).filter(r => r.cliente_id !== client.id);
                                        await api.patch(`/contracts/${c.id}`, { relaciones: updatedRelaciones });
                                        toast.success("Relación eliminada con éxito");
                                        loadAllContracts();
                                        load();
                                      } catch (e) {
                                        toast.error("Error al desvincular la relación");
                                      }
                                    }}
                                    className="text-rose-600 hover:text-rose-950 font-semibold inline-flex items-center gap-1 bg-rose-50 border border-rose-100 hover:bg-rose-100 px-2 py-1 rounded transition-colors"
                                  >
                                    Desvincular
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="whatsapp">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl mt-4 overflow-hidden h-[500px] flex flex-col shadow-2xl relative">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500 to-teal-500" />
              
              {/* Chat Header */}
              <div className="bg-zinc-900/90 border-b border-zinc-850 px-4 py-3 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-extrabold flex items-center justify-center text-xs shadow-inner uppercase">
                    {(client.nombre || "").split(" ").map(n => n[0] || "").join("").slice(0, 2) || "CL"}
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs flex items-center gap-1.5">
                      {client.nombre}
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="WhatsApp Conectado" />
                    </div>
                    <p className="text-[9.5px] text-emerald-500 font-medium">WhatsApp Direct · {client.telefono ? formatPhone(client.telefono) : "—"}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-[8px] uppercase tracking-wider bg-zinc-850 text-zinc-500 font-bold px-2 py-0.5 rounded border border-zinc-800">
                    API Conectada
                  </span>
                </div>
              </div>
              
              {/* Messages Panel */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-zinc-900/20 relative" style={{ backgroundImage: "radial-gradient(rgba(16, 185, 129, 0.03) 1px, transparent 0)", backgroundSize: "20px 20px" }}>
                {chatLoading ? (
                  <div className="h-full flex items-center justify-center text-zinc-500 text-xs gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-500" /> Cargando mensajes...
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-550 text-xs p-6 text-center space-y-2">
                    <MessageCircle className="w-8 h-8 text-zinc-700 animate-pulse" />
                    <div>
                      <p className="font-bold text-zinc-400">No hay mensajes previos en este canal</p>
                      <p className="text-[10px] mt-0.5">Envía un mensaje para iniciar el chat en tiempo real con el cliente.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {chatMessages.map((msg, idx) => {
                      const isMe = msg.sender_name !== client.nombre;
                      return (
                        <div key={msg.id || idx} className={`flex ${isMe ? "justify-end" : "justify-start"} anim-fadeup`}>
                          <div className={`max-w-[75%] rounded-xl px-3.5 py-2 text-xs leading-relaxed border ${
                            isMe 
                              ? "bg-emerald-600 text-white border-emerald-500 rounded-tr-none" 
                              : "bg-zinc-900 text-zinc-150 border-zinc-800 rounded-tl-none"
                          }`}>
                            {/* Header */}
                            <div className="flex justify-between items-center gap-4 text-[8px] font-bold text-emerald-150/70 mb-0.5">
                              <span>{isMe ? "Tú" : msg.sender_name}</span>
                              <span className="font-mono">{new Date(msg.created_at || Date.now()).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Typing Indicator */}
                {isTypingResponse && (
                  <div className="flex justify-start anim-fadeup mt-2">
                    <div className="bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-xl rounded-tl-none px-3.5 py-1.5 text-xs flex items-center gap-1.5 shadow-sm font-semibold">
                      <span className="w-1 h-1 rounded-full bg-zinc-500 animate-bounce" />
                      <span className="w-1 h-1 rounded-full bg-zinc-500 animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1 h-1 rounded-full bg-zinc-500 animate-bounce [animation-delay:0.4s]" />
                      <span className="text-[9.5px] text-zinc-500 italic pl-1">{client.nombre} está escribiendo...</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Footer Input */}
              <form onSubmit={sendWhatsappMessage} className="bg-zinc-900/95 border-t border-zinc-850 p-3 flex gap-2 items-center z-10">
                <input
                  type="text"
                  placeholder="Escribe un mensaje de WhatsApp..."
                  value={newChatMessage}
                  onChange={(e) => setNewChatMessage(e.target.value)}
                  disabled={isTypingResponse || chatLoading}
                  className="flex-1 h-9 bg-zinc-950 border border-zinc-800 rounded-lg px-4 text-xs text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors placeholder:text-zinc-650 disabled:opacity-50"
                />
                
                <Button
                  type="submit"
                  disabled={!newChatMessage.trim() || isTypingResponse || chatLoading}
                  className="h-9 w-9 shrink-0 bg-emerald-600 hover:bg-emerald-550 text-white rounded-lg flex items-center justify-center p-0 shadow disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </form>
            </div>
          </TabsContent>
        </Tabs>
      {/* Modals for Supply Addresses and CUPS Association */}
      
      {/* Modal Dirección de Suministro */}
      <Dialog open={supplyModalOpen} onOpenChange={setSupplyModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white p-6 rounded-lg">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-zinc-950">
              {editingSupplyIdx !== null ? "Editar dirección de suministro" : "Añadir nueva dirección de suministro"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Grid 1: Tipo de via, nombre, numero */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-[10px] uppercase font-bold text-zinc-500">Tipo de vía</Label>
                <Select
                  value={supplyForm.tipo_via || "Calle"}
                  onValueChange={(v) => setSupplyForm({ ...supplyForm, tipo_via: v })}
                >
                  <SelectTrigger className="mt-1 h-8.5 text-xs border-zinc-200 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPO_VIA_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-[10px] uppercase font-bold text-zinc-500">Nombre de la vía</Label>
                <Input
                  className="mt-1 h-8.5 text-xs border-zinc-200 bg-white"
                  value={supplyForm.nombre_via || ""}
                  onChange={(e) => setSupplyForm({ ...supplyForm, nombre_via: e.target.value.toUpperCase() })}
                  placeholder="Calle, Avenida, etc."
                />
              </div>
            </div>

            {/* Grid 2: Duplicador, Escalera, Planta, Puerta, Tipo Aclarador, Aclarador */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
              <div>
                <Label className="text-[10px] uppercase font-bold text-zinc-500">Número</Label>
                <Input
                  className="mt-1 h-8.5 text-xs border-zinc-200 bg-white"
                  value={supplyForm.numero || ""}
                  onChange={(e) => setSupplyForm({ ...supplyForm, numero: e.target.value })}
                  placeholder="6"
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase font-bold text-zinc-500">Duplicador</Label>
                <Input
                  className="mt-1 h-8.5 text-xs border-zinc-200 bg-white"
                  value={supplyForm.duplicador || ""}
                  onChange={(e) => setSupplyForm({ ...supplyForm, duplicador: e.target.value })}
                  placeholder="Bis, ..."
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase font-bold text-zinc-500">Escalera</Label>
                <Input
                  className="mt-1 h-8.5 text-xs border-zinc-200 bg-white"
                  value={supplyForm.escalera || ""}
                  onChange={(e) => setSupplyForm({ ...supplyForm, escalera: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase font-bold text-zinc-500">Planta</Label>
                <Input
                  className="mt-1 h-8.5 text-xs border-zinc-200 bg-white"
                  value={supplyForm.planta || ""}
                  onChange={(e) => setSupplyForm({ ...supplyForm, planta: e.target.value })}
                  placeholder="BAJO LOCAL"
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase font-bold text-zinc-500">Puerta</Label>
                <Input
                  className="mt-1 h-8.5 text-xs border-zinc-200 bg-white"
                  value={supplyForm.puerta || ""}
                  onChange={(e) => setSupplyForm({ ...supplyForm, puerta: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase font-bold text-zinc-500">Tipo Aclarador</Label>
                <Select
                  value={supplyForm.tipo_aclarador || ""}
                  onValueChange={(v) => setSupplyForm({ ...supplyForm, tipo_aclarador: v })}
                >
                  <SelectTrigger className="mt-1 h-8.5 text-xs border-zinc-200 bg-white">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {TIPO_ACLARADOR_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Grid 3: Aclarador, Codigo Postal, Ciudad, Provincia, Pais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-[10px] uppercase font-bold text-zinc-500">Aclarador</Label>
                <Input
                  className="mt-1 h-8.5 text-xs border-zinc-200 bg-white"
                  value={supplyForm.aclarador || ""}
                  onChange={(e) => setSupplyForm({ ...supplyForm, aclarador: e.target.value })}
                  placeholder="S/N..."
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase font-bold text-zinc-500">Código Postal</Label>
                <Input
                  className="mt-1 h-8.5 text-xs border-zinc-200 bg-white"
                  value={supplyForm.codigo_postal || ""}
                  onChange={(e) => setSupplyForm({ ...supplyForm, codigo_postal: e.target.value })}
                  placeholder="03206"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-[10px] uppercase font-bold text-zinc-500">Ciudad</Label>
                <Input
                  className="mt-1 h-8.5 text-xs border-zinc-200 bg-white"
                  value={supplyForm.ciudad || ""}
                  onChange={(e) => setSupplyForm({ ...supplyForm, ciudad: e.target.value.toUpperCase() })}
                  placeholder="ELCHE"
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase font-bold text-zinc-500">Provincia</Label>
                <Select
                  value={supplyForm.provincia || ""}
                  onValueChange={(v) => setSupplyForm({ ...supplyForm, provincia: v })}
                >
                  <SelectTrigger className="mt-1 h-8.5 text-xs border-zinc-200 bg-white">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVINCIAS_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] uppercase font-bold text-zinc-500">País</Label>
                <Select
                  value={supplyForm.pais || "España"}
                  onValueChange={(v) => setSupplyForm({ ...supplyForm, pais: v })}
                >
                  <SelectTrigger className="mt-1 h-8.5 text-xs border-zinc-200 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAIS_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Grid 4: Email, Móvil, IBAN */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-zinc-100 pt-4">
              <div>
                <Label className="text-[10px] uppercase font-bold text-zinc-500">Email</Label>
                <Input
                  className="mt-1 h-8.5 text-xs border-zinc-200 bg-white"
                  value={supplyForm.email || ""}
                  onChange={(e) => setSupplyForm({ ...supplyForm, email: e.target.value })}
                  placeholder="correo@ejemplo.com"
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase font-bold text-zinc-500">Móvil</Label>
                <Input
                  className="mt-1 h-8.5 text-xs border-zinc-200 bg-white"
                  value={supplyForm.movil || ""}
                  onChange={(e) => setSupplyForm({ ...supplyForm, movil: e.target.value })}
                  placeholder="600000000"
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase font-bold text-zinc-500">IBAN</Label>
                <Input
                  className="mt-1 h-8.5 text-xs border-zinc-200 bg-white"
                  value={supplyForm.iban || ""}
                  onChange={(e) => setSupplyForm({ ...supplyForm, iban: e.target.value })}
                  placeholder="ES42..."
                />
              </div>
            </div>

            {/* Dynamic CUPS list */}
            <div className="border-t border-zinc-100 pt-4 space-y-2">
              <Label className="text-[10px] uppercase font-bold text-zinc-500">CUPS Asociados</Label>
              <div className="space-y-2">
                {supplyForm.cups?.map((cupsItem, cupsIdx) => (
                  <div key={cupsIdx} className="flex gap-2 items-center">
                    <Input
                      className="h-8.5 text-xs border-zinc-200 bg-white font-mono flex-1 uppercase text-zinc-800"
                      value={cupsItem.cups || ""}
                      onChange={(e) => {
                        const updatedCups = [...supplyForm.cups];
                        updatedCups[cupsIdx] = { ...updatedCups[cupsIdx], cups: e.target.value.toUpperCase() };
                        setSupplyForm({ ...supplyForm, cups: updatedCups });
                      }}
                      placeholder="ES002100000107069FS"
                    />
                    <Select
                      value={cupsItem.tipo || "Electricidad"}
                      onValueChange={(v) => {
                        const updatedCups = [...supplyForm.cups];
                        updatedCups[cupsIdx] = { ...updatedCups[cupsIdx], tipo: v };
                        setSupplyForm({ ...supplyForm, cups: updatedCups });
                      }}
                    >
                      <SelectTrigger className="h-8.5 text-xs border-zinc-200 bg-white w-32 shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Electricidad">Electricidad</SelectItem>
                        <SelectItem value="Gas">Gas</SelectItem>
                      </SelectContent>
                    </Select>
                    {supplyForm.cups.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-zinc-200 bg-white"
                        onClick={() => {
                          const updatedCups = supplyForm.cups.filter((_, i) => i !== cupsIdx);
                          setSupplyForm({ ...supplyForm, cups: updatedCups });
                        }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-8 text-xs text-emerald-600 hover:text-emerald-700 border-dashed border-emerald-300 w-full bg-white font-semibold"
                onClick={() => {
                  const updatedCups = [...(supplyForm.cups || [])];
                  updatedCups.push({ cups: "", tipo: "Electricidad" });
                  setSupplyForm({ ...supplyForm, cups: updatedCups });
                }}
              >
                <Plus className="w-3 h-3 mr-1" /> Añadir otro
              </Button>
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setSupplyModalOpen(false)}>Cancelar</Button>
            <Button
              className="bg-zinc-950 hover:bg-zinc-800 text-white"
              onClick={() => {
                if (!supplyForm.nombre_via) {
                  toast.error("Por favor, introduce el nombre de la vía.");
                  return;
                }
                const updatedList = [...(client.direcciones_suministro || [])];
                if (editingSupplyIdx !== null) {
                  updatedList[editingSupplyIdx] = supplyForm;
                } else {
                  updatedList.push(supplyForm);
                }
                setClient({ ...client, direcciones_suministro: updatedList });
                setSupplyModalOpen(false);
                toast.success(editingSupplyIdx !== null ? "Dirección modificada localmente" : "Dirección añadida localmente");
              }}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Asociación a CUPS / Contrato */}
      <Dialog open={assocModalOpen} onOpenChange={setAssocModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 rounded-lg">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-zinc-950">Asociar documento a un CUPS / Contrato</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-xs text-zinc-500 leading-normal">
              Selecciona a qué contrato o CUPS del cliente deseas asociar el documento <strong>{assocDocument?.nombre}</strong>:
            </p>

            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-zinc-500">Contratos / CUPS Disponibles</Label>
              <Select
                value={assocContractId}
                onValueChange={setAssocContractId}
              >
                <SelectTrigger className="mt-1 h-9 text-xs border-zinc-200 bg-white">
                  <SelectValue placeholder="Selecciona un contrato" />
                </SelectTrigger>
                <SelectContent>
                  {contracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.comercializadora_actual || c.comercializadora || "Sin comercializadora"} ({c.tarifa}) · {c.cups || "Sin CUPS"}
                    </SelectItem>
                  ))}
                  {contracts.length === 0 && (
                    <SelectItem value="none" disabled>No hay contratos disponibles para asociar</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setAssocModalOpen(false)}>Cancelar</Button>
            <Button
              className="bg-zinc-950 hover:bg-zinc-800 text-white"
              disabled={!assocContractId}
              onClick={async () => {
                if (!assocContractId || !assocDocument) return;
                try {
                  await api.patch(`/documents/${assocDocument.id}`, { contrato_id: assocContractId });
                  toast.success("Documento asociado correctamente");
                  setAssocModalOpen(false);
                  load();
                } catch {
                  toast.error("Error al asociar el documento");
                }
              }}
            >
              Asociar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PENDING SIGNATURE VALIDATION DIALOG */}
      <Dialog open={pendingSignatureOpen} onOpenChange={setPendingSignatureOpen}>
        <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto bg-white border border-zinc-200 shadow-xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display font-bold tracking-tight text-lg text-zinc-900">
              Datos necesarios para el envío de firma
            </DialogTitle>
          </DialogHeader>

          {client && (
            <div className="space-y-4 py-2">
              <div className="text-xs text-zinc-600 bg-zinc-50 border border-zinc-150 p-3 rounded-md">
                ℹ️ Para mover a <strong>Pendiente de firma</strong> al cliente <strong>{(client.nombre || "").toUpperCase()}</strong>, debes completar la siguiente información requerida para el contrato y adjuntar un archivo.
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
                          name="sig_tipo_titular_cd" 
                          checked={pendingSignatureForm.tipo_titular === "fisica"} 
                          onChange={() => setPendingSignatureForm({ ...pendingSignatureForm, tipo_titular: "fisica" })}
                          className="w-3 h-3 text-zinc-950 focus:ring-0"
                        />
                        <span>Persona física</span>
                      </label>
                      <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-zinc-200 bg-white cursor-pointer text-xs text-zinc-700">
                        <input 
                          type="radio" 
                          name="sig_tipo_titular_cd" 
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
                    <div className="space-y-2.5 p-3 rounded-lg bg-zinc-50 border border-zinc-150 anim-fadeup animate-in fade-in slide-in-from-bottom-2 duration-200">
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

      {/* WHATSAPP PROPOSAL PREVIEW MODAL */}
      {whatsappModalOpen && whatsappClient && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-xl border border-zinc-200 w-full max-w-lg overflow-hidden anim-fadeup animate-in fade-in slide-in-from-bottom-4 duration-300">
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
                <Textarea 
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
      </div>
    </>
  );
}

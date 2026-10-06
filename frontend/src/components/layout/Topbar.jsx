import { useEffect, useState, useRef } from "react";
import { Bell, Search, Plus, Zap, Menu, ChevronDown, X, ExternalLink, Link2, Sparkles } from "lucide-react";
import { api } from "../../lib/api";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import Sidebar from "./Sidebar";
import { useAuth } from "../../context/AuthContext";

export default function Topbar({ title, subtitle, action, hideMenu }) {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState([]);
  
  // Interactive WhatsApp Pepo widget states
  const [pepoOpen, setPepoOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [pepoStatus, setPepoStatus] = useState("Online");
  const [chatHistory, setChatHistory] = useState([
    { id: 1, sender: "pepo", text: "Hola Hugo, ¿cómo van los estudios de ahorro de hoy?", time: "10:30", checks: 2 },
    { id: 2, sender: "me", text: "Hola papá, he cargado varios clientes y optimizado las comparativas de tarifas. Va todo genial con el mapa de España.", time: "10:32", checks: 3 },
    { id: 3, sender: "pepo", text: "Perfecto. Avísame por aquí si sale alguna firma o necesitas que revise algún contrato grande.", time: "10:33", checks: 2 }
  ]);

  const chatBottomRef = useRef(null);

  const loadNotifs = async () => {
    try {
      const { data } = await api.get("/notifications");
      setNotifs(data);
    } catch {}
  };

  useEffect(() => {
    loadNotifs();
    const id = setInterval(loadNotifs, 60_000);
    return () => clearInterval(id);
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (pepoOpen && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, pepoOpen]);

  const runRenewalCheck = async () => {
    try {
      const { data } = await api.post("/automations/run-renewal-check");
      const emailMsg = data.email_provider === "resend"
        ? ` · ${data.emails_sent} emails enviados${data.emails_failed ? `, ${data.emails_failed} fallidos` : ""}`
        : " · email stubbed";
      toast.success(`Automatización ejecutada — ${data.notifications_created} notificaciones${emailMsg}`);
      loadNotifs();
    } catch {
      toast.error("Error ejecutando la automatización");
    }
  };

  const markRead = async (id) => {
    await api.post(`/notifications/${id}/read`);
    loadNotifs();
  };

  const unread = notifs.filter((n) => !n.read).length;

  // Open the real WhatsApp conversation in a dedicated floating popup window next to the CRM
  const openRealWhatsAppPopup = () => {
    const url = "https://web.whatsapp.com/send?phone=34616907629";
    const width = 580;
    const height = 780;
    const left = window.screen.width - width - 40;
    const top = 90;
    
    // Open secure floating window
    const newWindow = window.open(
      url,
      "WhatsAppPepoReal",
      `width=${width},height=${height},left=${left},top=${top},menubar=no,status=no,toolbar=no,location=no,scrollbars=yes,resizable=yes`
    );
    
    if (newWindow) {
      toast.success("Conectando chat real en ventana flotante");
    } else {
      toast.error("El navegador bloqueó la ventana flotante. Por favor, permite popups para crm.algomasqueluz.com");
    }
  };

  // Launch the real chat instantly when clicking the Topbar quick button
  const handleOpenPepoChat = () => {
    setPepoOpen(true);
    openRealWhatsAppPopup();
  };

  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMsg = inputMessage;
    setInputMessage("");

    // 1. Add user's message (single grey check)
    const newId = Date.now();
    const newUserMsg = {
      id: newId,
      sender: "me",
      text: userMsg,
      time: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
      checks: 1
    };

    setChatHistory((prev) => [...prev, newUserMsg]);

    // 2. Animate checks (Single -> Double grey -> Double blue)
    setTimeout(() => {
      setChatHistory((prev) => prev.map((m) => m.id === newId ? { ...m, checks: 2 } : m));
    }, 400);

    setTimeout(() => {
      setChatHistory((prev) => prev.map((m) => m.id === newId ? { ...m, checks: 3 } : m));
    }, 1000);

    // 3. Simulated typing reply from father Pepo
    setTimeout(() => {
      setPepoStatus("Escribiendo...");
    }, 1800);

    setTimeout(() => {
      setPepoStatus("Online");
      
      const lowerText = userMsg.toLowerCase();
      let replyText = "Perfecto Hugo, bien recibido. Sigue dándole caña al CRM, va quedando espectacular.";
      
      if (lowerText.includes("contrato") || lowerText.includes("firma")) {
        replyText = "¡Excelente noticia! Pásame el número de contrato o el CUPS por aquí para que el backoffice lo active de inmediato.";
      } else if (lowerText.includes("estudio") || lowerText.includes("ahorro") || lowerText.includes("tarifa")) {
        replyText = "Genial, acuérdate de presentarlo con el logo de AlgoMásQueLuz y destacar el ahorro anual neto, eso nunca falla.";
      } else if (lowerText.includes("hugo") || lowerText.includes("asistente")) {
        replyText = "El Asistente Hugo nos va a ahorrar horas de trabajo. Dile que redacte la propuesta y la revisamos.";
      } else if (lowerText.includes("hola") || lowerText.includes("buenos dias") || lowerText.includes("buenas noches")) {
        replyText = "Hola Hugo, ¿cómo va el día en la oficina? ¿Alguna novedad importante?";
      } else if (lowerText.includes("cups") || lowerText.includes("cliente")) {
        replyText = "Revisa bien que la dirección y el CUPS coincidan exactamente con la distribuidora para evitar rechazos.";
      } else {
        replyText = `Entendido, hijo. Estoy en una visita con un cliente ahora mismo, pero lo voy revisando en cuanto salga. ¡Dale caña! 💪`;
      }

      setChatHistory((prev) => [...prev, {
        id: Date.now() + 1,
        sender: "pepo",
        text: replyText,
        time: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
        checks: 2
      }]);
    }, 3200);
  };

  return (
    <header className="h-16 sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-zinc-200 px-4 md:px-8 flex items-center justify-between">
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        {/* Mobile Menu Drawer Trigger */}
        <div className="md:hidden shrink-0">
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent("toggle-sidebar"))}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 border-none outline-none bg-transparent cursor-pointer"
            title="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <div className="min-w-0">
          <h1 className="font-display text-base md:text-xl font-bold text-zinc-950 tracking-tight truncate" data-testid="page-title">{title}</h1>
          {subtitle && <p className="text-[10px] md:text-xs text-zinc-500 mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Enlace directo interactivo: Whatsapp Pepo */}
        <button
          onClick={handleOpenPepoChat}
          className="flex items-center justify-center h-9 w-9 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 hover:text-zinc-950 font-bold text-sm shadow-sm transition-all cursor-pointer outline-none"
          title="WhatsApp Pepo"
        >
          <span className="text-emerald-500 font-semibold">💬</span>
        </button>

        {/* Desplegable: Colaboradores */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center justify-center h-9 w-9 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 hover:text-zinc-950 font-bold text-sm shadow-sm transition-all cursor-pointer outline-none"
              title="Colaboradores"
            >
              <span>🤝</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 mt-1 font-sans bg-white border border-zinc-200 rounded-lg shadow-lg">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.1em] text-zinc-400">
              Enlaces Externos
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem asChild className="cursor-pointer font-medium text-xs py-2 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-50">
              <a href="https://intranet.aenergetic.es/index.php?controller=login" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between w-full">
                <span>Aenergetic</span>
                <span className="text-[10px] text-zinc-400">intranet ↗</span>
              </a>
            </DropdownMenuItem>
            
            <DropdownMenuItem disabled className="font-medium text-xs py-2 text-zinc-400 bg-zinc-50/50">
              <span className="flex items-center justify-between w-full">
                <span>Siga</span>
                <span className="text-[9px] uppercase tracking-wider text-zinc-300 font-bold">Próximamente</span>
              </span>
            </DropdownMenuItem>
            
            <DropdownMenuItem asChild className="cursor-pointer font-medium text-xs py-2 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-50">
              <a href="https://app.optimizoo.es/dashboard" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between w-full">
                <span>Wixer / Optimizoo</span>
                <span className="text-[10px] text-zinc-400">dashboard ↗</span>
              </a>
            </DropdownMenuItem>
            
            <DropdownMenuItem asChild className="cursor-pointer font-medium text-xs py-2 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-50">
              <a href="https://app.tribu.one/order_items" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between w-full">
                <span>Telco</span>
                <span className="text-[10px] text-zinc-400">orders ↗</span>
              </a>
            </DropdownMenuItem>
            
            <DropdownMenuItem disabled className="font-medium text-xs py-2 text-zinc-400 bg-zinc-50/50">
              <span className="flex items-center justify-between w-full">
                <span>Insolen</span>
                <span className="text-[9px] uppercase tracking-wider text-zinc-300 font-bold">Próximamente</span>
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Enlace directo destacado: Correo de Estudios */}
        <a
          href="https://webmail.algomasqueluz.com/?_task=mail&_mbox=INBOX"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center h-9 w-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all scale-100 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          title="Correo de Estudios"
        >
          <span className="text-white font-semibold">✉️</span>
        </a>

        <Button
          onClick={runRenewalCheck}
          variant="outline"
          size="sm"
          className="hidden md:flex h-9 border-zinc-200 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-50"
          data-testid="topbar-run-automation"
        >
          <Zap className="w-3.5 h-3.5 mr-1.5 text-[#F97316]" />
          <span className="text-xs font-medium">Escanear renovaciones</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="relative h-9 w-9 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 flex items-center justify-center transition-colors text-sm shrink-0 outline-none"
              data-testid="topbar-notifications-button"
            >
              🔔
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#ff5722] text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.1em] text-zinc-400">
              Notificaciones
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifs.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-zinc-500">
                Sin notificaciones. Pulsa <span className="font-semibold">Escanear renovaciones</span>.
              </div>
            )}
            {notifs.slice(0, 8).map((n) => (
              <DropdownMenuItem
                key={n.id}
                onClick={() => markRead(n.id)}
                className="flex flex-col items-start gap-0.5 py-2"
                data-testid={`notif-item-${n.id}`}
              >
                <div className="flex items-start gap-2 w-full">
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                    n.level === "urgent" ? "bg-rose-500" : n.level === "warning" ? "bg-amber-500" : "bg-zinc-300"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-medium ${n.read ? "text-zinc-500" : "text-zinc-950"}`}>{n.title}</div>
                    <div className="text-[11px] text-zinc-500 line-clamp-2">{n.body}</div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {action}

        {/* User profile block matching screenshot, clickable to toggle sidebar */}
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent("toggle-sidebar"))}
          className="flex items-center gap-2.5 pl-3 border-l border-zinc-200/60 ml-2 hover:opacity-80 active:scale-95 transition-all outline-none bg-transparent border-none cursor-pointer"
          title="Ver Menú / Navegación"
        >
          <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center overflow-hidden border border-zinc-200 shrink-0 shadow-sm">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] font-bold text-zinc-650">
                {user?.name?.split(" ").map((s) => s[0]).slice(0, 2).join("")}
              </span>
            )}
          </div>
          <div className="hidden sm:flex flex-col text-left leading-tight">
            <span className="text-xs font-bold text-zinc-900 leading-none truncate max-w-[125px]">{user?.name || "Hugo"}</span>
            <span className="text-[9px] text-zinc-500 font-semibold tracking-wide mt-0.5 truncate max-w-[125px]">
              {user?.email || "hugo@algomasqueluz.com"}
            </span>
          </div>
        </button>
      </div>

      {/* WHATSAPP PEPO PREMIUM CHAT DRAWER */}
      {pepoOpen && (
        <div className="fixed inset-0 z-[99999] flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setPepoOpen(false)} />

          <div className="relative w-full max-w-md bg-[#09090c] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-zinc-800">
            {/* Header */}
            <div className="bg-[#12121a] px-4 py-3 flex items-center justify-between border-b border-zinc-800 text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm shadow-md shrink-0">
                  👨‍💼
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-[#12121a] bg-emerald-500" />
                </div>
                
                <div className="text-left leading-tight">
                  <h4 className="font-bold text-sm text-zinc-100">
                    Papa Pepo ⚡
                  </h4>
                  <span className="text-[10px] font-semibold text-emerald-400 animate-pulse tracking-wide">
                    Conexión Directa Real
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={openRealWhatsAppPopup}
                  className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/5 transition-all cursor-pointer"
                  title="Reabrir ventana flotante del chat real"
                >
                  <ExternalLink className="w-4 h-4 text-emerald-400 animate-bounce" style={{ animationDuration: '2s' }} />
                </button>
                <button 
                  onClick={() => setPepoOpen(false)}
                  className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/5 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Line Connection Info Panel */}
            <div className="bg-[#161622] border-b border-zinc-800 px-4 py-3 flex flex-col gap-2 font-sans select-none shrink-0 text-left">
              <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-300">
                <span className="flex items-center gap-1">
                  <span className="text-emerald-500">📞</span> Pepo: <strong>+34 616 907 629</strong>
                </span>
                <span className="text-zinc-600">⇄</span>
                <span className="flex items-center gap-1">
                  <span className="text-violet-400">👤</span> Tú: <strong>+34 624 476 295</strong>
                </span>
              </div>
              <div className="h-px bg-zinc-800/80 my-1" />
              <div className="flex items-start gap-2 text-[10px] text-zinc-400 leading-normal font-medium bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800/60">
                <span className="text-emerald-500">🔌</span>
                <div>
                  <p className="font-semibold text-zinc-300">¿Cómo chatear de forma 100% REAL?</p>
                  <p className="mt-0.5">Hemos abierto un **chat real flotante** a la derecha de tu pantalla. Puedes interactuar, hablar y enviar mensajes reales directamente desde allí sin salir de tu CRM.</p>
                </div>
              </div>
            </div>

            {/* Simulated Preview History */}
            <div 
              className="flex-1 overflow-y-auto p-4 space-y-3 relative flex flex-col"
              style={{
                backgroundImage: 'radial-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
                backgroundColor: '#09090c'
              }}
            >
              <div className="self-center bg-[#161622] text-zinc-400 text-[10px] px-2.5 py-1 rounded-md font-semibold shadow-sm uppercase tracking-wider border border-zinc-800">
                Historial de Conversación
              </div>

              {chatHistory.map((msg) => {
                const isMe = msg.sender === "me";
                return (
                  <div 
                    key={msg.id}
                    className={`max-w-[80%] rounded-2xl p-3 flex flex-col shadow-md relative ${
                      isMe 
                        ? "bg-[#005c4b] text-white rounded-tr-none self-end" 
                        : "bg-[#202c33] text-zinc-100 rounded-tl-none self-start"
                    }`}
                  >
                    <p className="text-xs leading-relaxed break-words font-sans text-left pr-4 whitespace-pre-wrap">{msg.text}</p>
                    <div className="flex items-center justify-end gap-1.5 self-end mt-1 text-[9px] text-zinc-500 font-medium">
                      <span>{msg.time}</span>
                      {isMe && (
                        <span>
                          {msg.checks === 1 && <span className="text-zinc-400">✓</span>}
                          {msg.checks === 2 && <span className="text-zinc-400">✓✓</span>}
                          {msg.checks === 3 && <span className="text-[#53bdeb] font-bold">✓✓</span>}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              <div ref={chatBottomRef} />
            </div>

            {/* Quick launch / Sincronizar Button */}
            <div className="p-4 bg-[#12121a] border-t border-zinc-800 shrink-0 text-center">
              <button
                type="button"
                onClick={openRealWhatsAppPopup}
                className="w-full h-11 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
              >
                <Sparkles className="w-4 h-4 text-white animate-pulse" />
                <span>REABRIR CHAT REAL FLOTANTE</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

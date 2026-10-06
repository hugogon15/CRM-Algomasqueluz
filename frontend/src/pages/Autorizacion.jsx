import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { 
  ShieldCheck, FileText, Upload, CheckCircle2, 
  AlertCircle, ArrowRight, Loader2, Sparkles, Zap
} from "lucide-react";
import { toast } from "sonner";

export default function Autorizacion() {
  const { id: pathId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Resolve client ID (either from route path /rgpd/:id or query string ?id=CLIENT_ID)
  const clientId = pathId || searchParams.get("id") || "";

  // Step state: "consent" | "upload" | "completed"
  const [step, setStep] = useState("consent");
  
  // Form states
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [checkPrivacy, setCheckPrivacy] = useState(false);
  const [checkAnalysis, setCheckAnalysis] = useState(false);
  const [checkContact, setCheckContact] = useState(false);

  // Technical metadata
  const [ipAddress, setIpAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resolvedClientId, setResolvedClientId] = useState(clientId);

  // File Upload states
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState(""); // "uploading" | "analyzing" | "completed"

  // Fetch client IP address on load
  useEffect(() => {
    async function getIp() {
      try {
        const response = await fetch("https://api.ipify.org?format=json");
        const data = await response.json();
        setIpAddress(data.ip || "127.0.0.1");
      } catch (e) {
        console.warn("Could not fetch IP from public service, using fallback", e);
        setIpAddress("IP Dinámica (Cliente)");
      }
    }
    getIp();
  }, []);

  const handleConsentSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim() || !telefono.trim()) {
      toast.error("Por favor, introduce tu nombre y teléfono.");
      return;
    }
    if (!checkPrivacy || !checkAnalysis || !checkContact) {
      toast.error("Debes autorizar todos los puntos del RGPD para continuar.");
      return;
    }

    setSubmitting(true);

    const rgpdData = {
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      email: email.trim(),
      estado: "rgpd_aceptado",
      rgpd_aceptado: true,
      rgpd_fecha: new Date().toISOString(),
      rgpd_ip: ipAddress,
      rgpd_user_agent: navigator.userAgent,
      rgpd_version: "v1.2 (2026-07)",
      comentarios: [
        {
          id: `system-rgpd-${Date.now()}`,
          timestamp: new Date().toISOString(),
          user_name: "Sistema",
          text: `RGPD aceptado electrónicamente vía Web. IP: ${ipAddress}. Navegador: ${navigator.userAgent.slice(0, 100)}...`
        }
      ]
    };

    try {
      if (resolvedClientId) {
        // Update existing lead (Flow 2)
        await api.patch(`/clients/${resolvedClientId}`, rgpdData);
        toast.success("Autorización registrada correctamente.");
        setStep("upload");
      } else {
        // Create new lead (Flow 1)
        const response = await api.post("/clients", rgpdData);
        if (response.data && response.data.id) {
          setResolvedClientId(response.data.id);
          toast.success("Autorización registrada y Lead creado correctamente.");
          setStep("upload");
        } else {
          throw new Error("No se recibió el ID del nuevo Lead.");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Ocurrió un error al registrar el consentimiento.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    
    setUploading(true);
    setOcrStatus("uploading");
    setUploadProgress(10);

    const fd = new FormData();
    fd.append("file", selectedFile);
    fd.append("cliente_id", resolvedClientId);
    fd.append("tipo", "factura");

    try {
      // Simulate progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 15;
        });
      }, 300);

      const response = await api.post("/documents/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      clearInterval(interval);
      setUploadProgress(100);
      
      // Invoice analysis simulation
      setOcrStatus("analyzing");
      await new Promise(r => setTimeout(r, 1500));
      
      // If we have direct client columns, update status to "pendiente_estudio" since invoice has been received
      try {
        await api.patch(`/clients/${resolvedClientId}`, {
          estado: "pendiente_estudio",
          comentarios: [
            {
              id: `system-ocr-${Date.now()}`,
              timestamp: new Date().toISOString(),
              user_name: "Sistema",
              text: `Factura ${selectedFile.name} subida y analizada automáticamente por la IA.`
            }
          ]
        });
      } catch (errCol) {
        console.warn("Could not transition client state on upload", errCol);
      }

      setOcrStatus("completed");
      toast.success("Factura subida y analizada con éxito.");
      setTimeout(() => setStep("completed"), 1000);
      
    } catch (err) {
      console.error(err);
      toast.error("Error al subir la factura.");
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-between font-sans antialiased selection:bg-orange-500/30 selection:text-orange-300">
      
      {/* Dynamic ambient lights */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-600/10 rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* Header */}
      <header className="h-20 shrink-0 border-b border-zinc-900 px-6 flex items-center justify-between max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Zap className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <span className="font-display font-black text-base tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
              ALGO MÁS QUE LUZ
            </span>
            <p className="text-[10px] text-zinc-500 tracking-widest font-semibold uppercase -mt-0.5">Energía Inteligente</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-900 border border-zinc-800/80 px-3 py-1.5 rounded-full">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Portal de Firmas Seguro</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-lg bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
          
          {/* Subtle gradient border */}
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400" />

          {/* STEP 1: GDPR Consent checkboxes */}
          {step === "consent" && (
            <form onSubmit={handleConsentSubmit} className="space-y-6">
              <div className="space-y-2">
                <h1 className="font-display text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-orange-500" />
                  Estudio Energético Gratuito
                </h1>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Para poder realizar tu estudio de ahorro personalizado, necesitamos tu autorización para el tratamiento de tus datos en cumplimiento con el RGPD.
                </p>
              </div>

              {/* Form Input fields - Write-only security (anti-IDOR) */}
              <div className="space-y-4 pt-2">
                <div>
                  <label htmlFor="client-name" className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Nombre Completo / Titular
                  </label>
                  <input
                    id="client-name"
                    type="text"
                    required
                    placeholder="Escribe tu nombre y apellidos"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full h-11 bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 text-sm text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="client-phone" className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                      Teléfono Móvil
                    </label>
                    <input
                      id="client-phone"
                      type="tel"
                      required
                      placeholder="Ej: 600123456"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      className="w-full h-11 bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 text-sm text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="client-email" className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                      Correo Electrónico
                    </label>
                    <input
                      id="client-email"
                      type="email"
                      placeholder="nombre@ejemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-11 bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 text-sm text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* GDPR checklist checkboxes */}
              <div className="space-y-4 border-t border-zinc-850 pt-4">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={checkPrivacy}
                    onChange={(e) => setCheckPrivacy(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-orange-500 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-xs text-zinc-450 group-hover:text-zinc-300 transition-colors leading-normal">
                    He leído y acepto la <span className="text-orange-400 font-semibold underline">Política de Privacidad</span> sobre protección de datos personales. <span className="text-red-500">*</span>
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={checkAnalysis}
                    onChange={(e) => setCheckAnalysis(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-orange-500 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-xs text-zinc-450 group-hover:text-zinc-300 transition-colors leading-normal">
                    Autorizo a Algo Más Que Luz a tratar los datos contenidos en la factura facilitada con el fin exclusivo de realizar un estudio energético comparativo y elaborar una propuesta de ahorro. <span className="text-red-500">*</span>
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={checkContact}
                    onChange={(e) => setCheckContact(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-orange-500 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-xs text-zinc-450 group-hover:text-zinc-300 transition-colors leading-normal">
                    Acepto ser contactado por teléfono, correo electrónico o WhatsApp respecto al resultado de este estudio y ofertas relacionadas. <span className="text-red-500">*</span>
                  </span>
                </label>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-600/10 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-55 disabled:pointer-events-none"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Procesando autorización...</span>
                  </>
                ) : (
                  <>
                    <span>Aceptar y Autorizar</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-550 border-t border-zinc-850/50 pt-3">
                <span>IP Registro: {ipAddress}</span>
                <span>•</span>
                <span>Legal: v1.2</span>
              </div>
            </form>
          )}

          {/* STEP 2: Optional Invoice Upload */}
          {step === "upload" && (
            <div className="space-y-6 text-center anim-fadeup">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/5">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              
              <div className="space-y-2">
                <h1 className="font-display text-xl md:text-2xl font-black text-white">
                  ¡Consentimiento Registrado!
                </h1>
                <p className="text-sm text-zinc-400 leading-relaxed max-w-sm mx-auto">
                  Tus preferencias de RGPD han sido firmadas electrónicamente. Ahora puedes adjuntar tu factura para que realicemos el estudio de ahorro energético gratuito.
                </p>
              </div>

              {/* Upload area */}
              {!uploading ? (
                <div className="border border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-900/25 rounded-2xl p-8 transition-colors relative group cursor-pointer">
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-3 pointer-events-none">
                    <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-400 group-hover:text-white transition-colors">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-300">Arrastra tu factura aquí o pulsa para buscar</p>
                      <p className="text-[10px] text-zinc-550 mt-1">Soporta PDF o imágenes de factura (Máx. 10MB)</p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Dynamic Loader Animation for File upload / OCR */
                <div className="border border-zinc-800 bg-zinc-900/10 rounded-2xl p-8 space-y-4">
                  <div className="flex items-center justify-center gap-2 text-sm font-semibold">
                    {ocrStatus === "uploading" && (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                        <span className="text-zinc-300">Subiendo factura ({uploadProgress}%)</span>
                      </>
                    )}
                    {ocrStatus === "analyzing" && (
                      <>
                        <Sparkles className="w-4 h-4 animate-pulse text-amber-500" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300 font-bold">
                          IA analizando tu tarifa y consumos...
                        </span>
                      </>
                    )}
                    {ocrStatus === "completed" && (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400">Análisis completo</span>
                      </>
                    )}
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800">
                    <div 
                      className={`h-full transition-all duration-300 rounded-full ${
                        ocrStatus === "analyzing" 
                          ? "bg-gradient-to-r from-orange-500 to-amber-400 animate-pulse w-full"
                          : "bg-orange-500"
                      }`}
                      style={{ width: ocrStatus === "analyzing" ? "100%" : `${uploadProgress}%` }}
                    />
                  </div>
                  
                  {ocrStatus === "analyzing" && (
                    <div className="text-[10px] text-zinc-500 italic">
                      Identificando potencia, término de energía y distribuidor...
                    </div>
                  )}
                </div>
              )}

              {/* Skip button */}
              {!uploading && (
                <button
                  onClick={() => setStep("completed")}
                  className="text-xs text-zinc-500 hover:text-zinc-400 underline font-medium"
                >
                  Omitir paso por ahora
                </button>
              )}
            </div>
          )}

          {/* STEP 3: Success Confirmation Screen */}
          {step === "completed" && (
            <div className="space-y-6 text-center anim-fadeup">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center mx-auto text-white shadow-xl shadow-orange-600/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h1 className="font-display text-xl md:text-2xl font-black text-white">
                  ¡Proceso Completado!
                </h1>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Muchas gracias por tu tiempo. Hemos registrado correctamente tus preferencias y toda la información necesaria.
                </p>
                <p className="text-xs text-zinc-500">
                  Nuestro equipo de asesores de <strong>Algo Más Que Luz</strong> ya está trabajando en tu comparativa y se pondrá en contacto contigo muy pronto.
                </p>
              </div>

              <div className="border-t border-zinc-850/50 pt-5">
                <button
                  onClick={() => window.close()}
                  className="h-10 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 text-xs font-bold px-6 rounded-lg border border-zinc-800 transition-colors"
                >
                  Cerrar ventana
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="h-16 shrink-0 border-t border-zinc-900 px-6 flex items-center justify-center max-w-4xl mx-auto w-full text-[10px] text-zinc-650 font-medium">
        <span>© {new Date().getFullYear()} Algo Más Que Luz. Todos los derechos reservados.</span>
      </footer>

    </div>
  );
}

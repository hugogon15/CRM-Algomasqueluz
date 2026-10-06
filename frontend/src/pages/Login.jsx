import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  Eye, 
  EyeOff, 
  Loader2, 
  Mail, 
  Lock, 
  Shield, 
  Award, 
  ChevronRight
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export default function Login() {
  const { user, login } = useAuth();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  if (user && user !== false) {
    const to = loc.state?.from?.pathname || "/dashboard";
    return <Navigate to={to} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const r = await login(email, password);
    setLoading(false);
    if (!r.ok) setErr(r.error);
  };

  return (
    <div className="min-h-screen grid md:grid-cols-12 bg-zinc-50/50 font-sans overflow-hidden">
      
      {/* LEFT SIDE: Authentic and elegant Login Area (cols 1 to 5) */}
      <div className="md:col-span-5 flex flex-col justify-between p-8 md:p-12 lg:p-16 bg-white relative z-10 shadow-2xl shadow-zinc-200/50 border-r border-zinc-200/40">
        
        {/* Subtle decorative glow for the login side */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-[-1]">
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-gradient-to-br from-amber-500/5 to-orange-500/5 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-gradient-to-tr from-zinc-100 to-amber-500/5 blur-3xl" />
        </div>

        {/* Top brand identity with the official LOGO */}
        <div className="flex flex-col gap-4 animate-fade-in">
          <div className="inline-flex items-center gap-3">
            <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100 shadow-sm hover:shadow-md transition-all duration-300 group">
              <img
                src="https://customer-assets.emergentagent.com/job_solar-savings-9/artifacts/vvtwx4ly_LOGO_algomasqueluz_NEW.jpg"
                alt="AlgoMásQueLuz"
                className="h-10 w-auto object-contain transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="h-8 w-px bg-zinc-200" />
            <div className="leading-tight">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 block">SISTEMA</span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 block">OPERATIVO</span>
            </div>
          </div>
        </div>

        {/* Form container */}
        <div className="my-auto py-8 max-w-md w-full mx-auto animate-fade-in-up">
          <div className="mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-zinc-100 bg-zinc-50 text-[10px] uppercase tracking-wider font-bold text-zinc-500 mb-4 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Acceso Corporativo Exclusivo
            </div>
            <h1 className="font-display text-3xl font-extrabold text-zinc-900 tracking-tight leading-none">
              Bienvenido al CRM
            </h1>
            <p className="text-sm text-zinc-500 mt-2">
              Inicia sesión para gestionar clientes, automatizar renovaciones e impulsar el ahorro energético.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" data-testid="login-form">
            
            {/* Email Field */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[11px] uppercase tracking-[0.08em] font-bold text-zinc-500">
                Email Profesional
              </Label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-zinc-400 group-focus-within:text-amber-500 transition-colors duration-200" />
                </div>
                <Input
                  id="email"
                  type="email"
                  placeholder="nombre@algomasqueluz.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 h-11 rounded-xl border-zinc-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all duration-200 shadow-sm"
                  data-testid="login-email-input"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-[11px] uppercase tracking-[0.08em] font-bold text-zinc-500">
                  Contraseña
                </Label>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-zinc-400 group-focus-within:text-amber-500 transition-colors duration-200" />
                </div>
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10 pr-10 h-11 rounded-xl border-zinc-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all duration-200 shadow-sm"
                  data-testid="login-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-1 rounded-md hover:bg-zinc-50 transition-colors duration-200"
                  data-testid="login-toggle-password"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {err && (
              <div className="text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-start gap-2.5 animate-shake" data-testid="login-error">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                <span>{err}</span>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-zinc-950 text-white hover:bg-zinc-800 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all duration-300 relative overflow-hidden group/btn"
              data-testid="login-submit-button"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 opacity-0 group-hover/btn:opacity-10 transition-opacity duration-300" />
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                  <span>Autenticando...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span>Acceder al Sistema</span>
                  <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </div>
              )}
            </Button>
          </form>
        </div>

        {/* Footer corporate notes */}
        <div className="text-xs text-zinc-400 border-t border-zinc-100 pt-6 flex justify-between items-center">
          <span>&copy; {new Date().getFullYear()} AlgoMásQueLuz S.L.</span>
          <span className="flex items-center gap-1.5 font-semibold text-zinc-500">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            Servidores Seguros SSL
          </span>
        </div>

      </div>

      {/* RIGHT SIDE: Immersive and prestigious Enterprise Solid Panel (cols 6 to 12) */}
      <div className="hidden md:col-span-7 md:flex flex-col justify-between p-12 lg:p-16 bg-gradient-to-br from-zinc-950 via-neutral-900 to-zinc-950 relative overflow-hidden text-white border-l border-zinc-800">
        
        {/* Deep background solar grid pattern & golden glowing orbs */}
        <div className="absolute inset-0 opacity-15 mix-blend-overlay">
          <div className="absolute inset-0 bg-grid-zinc" style={{ backgroundSize: "40px 40px" }} />
        </div>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Main Solar Glow representation */}
          <div className="absolute -top-20 -right-20 w-[600px] h-[600px] rounded-full" 
               style={{
                 background: "radial-gradient(circle, rgba(249, 115, 22, 0.12) 0%, rgba(234, 179, 8, 0.04) 40%, transparent 70%)"
               }} 
           />
          {/* Bottom ambient glow */}
          <div className="absolute -bottom-40 left-1/4 w-[500px] h-[500px] rounded-full" 
               style={{
                 background: "radial-gradient(circle, rgba(249, 115, 22, 0.08) 0%, rgba(255, 255, 255, 0.01) 50%, transparent 80%)"
               }} 
           />
        </div>

        {/* Top right indicator */}
        <div className="flex justify-end relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md text-xs font-semibold text-zinc-300 shadow-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            CRM Activo &middot; Versión 3.2.0
          </div>
        </div>

        {/* Middle contents: Prestige messaging and core cards */}
        <div className="my-auto max-w-2xl relative z-10">
          
          {/* Market Position Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/25 text-amber-400 font-bold uppercase tracking-wider text-xs mb-6 shadow-md shadow-amber-950/20">
            <Award className="w-4 h-4 text-amber-400" />
            Empresa Líder en Soluciones y Ahorro Energético
          </div>

          <h2 className="font-display text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1] text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-100 to-zinc-300">
            Liderando la revolución solar con solidez empresarial.
          </h2>
          <p className="text-base text-zinc-400 mt-6 leading-relaxed max-w-xl">
            La plataforma de gestión definitiva para asesores energéticos y solares de alto rendimiento. Controla la cartera completa de tus clientes, optimiza contratos de luz y gestiona renovaciones automáticas mediante inteligencia artificial en una interfaz robusta e intuitiva.
          </p>

        </div>

        {/* Corporate Trust Badge */}
        <div className="flex justify-between items-center border-t border-zinc-800/60 pt-6 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-medium">Respaldado por el sistema de energía AlgoMásQueLuz</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-zinc-400 font-bold tracking-wider uppercase">Nº1 EN GESTIÓN ENERGÉTICA</span>
          </div>
        </div>

      </div>

    </div>
  );
}

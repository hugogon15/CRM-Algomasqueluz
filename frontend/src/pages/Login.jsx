import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Sparkles, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export default function Login() {
  const { user, login } = useAuth();
  const loc = useLocation();
  const [email, setEmail] = useState("admin@algomasqueluz.com");
  const [password, setPassword] = useState("Admin123!");
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
    <div className="min-h-screen grid md:grid-cols-2 bg-[#FAFAFA]">
      {/* Left: form */}
      <div className="flex flex-col justify-center px-8 md:px-16 py-12">
        <div className="max-w-sm w-full mx-auto">
          <div className="flex items-center gap-2.5 mb-12">
            <div className="w-9 h-9 rounded-md bg-zinc-950 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#F97316]" strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <div className="font-display text-base font-bold text-zinc-950 tracking-tight">AlgoMásQueLuz</div>
              <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-400 font-medium">Sistema Operativo</div>
            </div>
          </div>

          <h1 className="font-display text-3xl font-bold text-zinc-950 tracking-tight">Bienvenido de vuelta.</h1>
          <p className="text-sm text-zinc-500 mt-2 mb-10">Inicia sesión para gestionar tu cartera energética.</p>

          <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
            <div>
              <Label htmlFor="email" className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1.5 h-10 rounded-md border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                data-testid="login-email-input"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Contraseña</Label>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-10 rounded-md border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 pr-10"
                  data-testid="login-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-1"
                  data-testid="login-toggle-password"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {err && (
              <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-3 py-2" data-testid="login-error">
                {err}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-zinc-950 text-white hover:bg-zinc-800 rounded-md text-sm font-semibold"
              data-testid="login-submit-button"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Acceder"}
            </Button>
          </form>

          <div className="mt-10 pt-6 border-t border-zinc-200">
            <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-400 font-semibold mb-2">Cuentas de prueba</div>
            <div className="space-y-1 text-[11px] text-zinc-600 font-mono">
              <div>admin@algomasqueluz.com / Admin123!</div>
              <div>carlos.comercial@algomasqueluz.com / Demo123!</div>
              <div>lucia.gestor@algomasqueluz.com / Demo123!</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: brand panel */}
      <div className="hidden md:flex relative brand-glow border-l border-zinc-200 overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-grid-zinc opacity-60" />
        <div className="relative z-10 max-w-md px-12 text-center">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-zinc-200 bg-white/80 backdrop-blur text-[10px] uppercase tracking-[0.12em] font-semibold text-zinc-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Plataforma activa
          </div>
          <h2 className="font-display text-4xl font-bold text-zinc-950 tracking-tight mt-6 leading-tight">
            Tu cartera energética,<br/>en un solo cerebro.
          </h2>
          <p className="text-sm text-zinc-600 mt-4 leading-relaxed">
            CRM, renovaciones automáticas y análisis OCR con IA en una plataforma diseñada para
            consultores energéticos.
          </p>
          <div className="grid grid-cols-3 gap-3 mt-10 text-left">
            <div className="rounded-md border border-zinc-200 bg-white/70 backdrop-blur px-3 py-2.5">
              <div className="text-[10px] uppercase tracking-[0.1em] text-zinc-400 font-semibold">Renovaciones</div>
              <div className="font-display font-bold text-lg text-zinc-950">Auto</div>
            </div>
            <div className="rounded-md border border-zinc-200 bg-white/70 backdrop-blur px-3 py-2.5">
              <div className="text-[10px] uppercase tracking-[0.1em] text-zinc-400 font-semibold">OCR</div>
              <div className="font-display font-bold text-lg text-zinc-950">Gemini 3</div>
            </div>
            <div className="rounded-md border border-zinc-200 bg-white/70 backdrop-blur px-3 py-2.5">
              <div className="text-[10px] uppercase tracking-[0.1em] text-zinc-400 font-semibold">Pipeline</div>
              <div className="font-display font-bold text-lg text-zinc-950">Kanban</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

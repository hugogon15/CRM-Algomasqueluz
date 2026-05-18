export const CRM_STATES = [
  { value: "nuevo_lead", label: "Nuevo Lead", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "pendiente_estudio", label: "Pendiente Estudio", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "enviado", label: "Enviado", color: "bg-violet-50 text-violet-700 border-violet-200" },
  { value: "renovacion", label: "Renovación", color: "bg-rose-50 text-rose-700 border-rose-200" },
  { value: "cliente_activo", label: "Cliente Activo", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "sin_ahorro", label: "Sin Ahorro", color: "bg-zinc-100 text-zinc-600 border-zinc-200" },
];

export const STATE_MAP = Object.fromEntries(CRM_STATES.map((s) => [s.value, s]));

export const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "comercial", label: "Comercial" },
  { value: "gestor", label: "Gestor" },
  { value: "backoffice", label: "Backoffice" },
];

export const ROLE_MAP = Object.fromEntries(ROLES.map((r) => [r.value, r]));

export function formatEUR(n) {
  if (n == null || isNaN(n)) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return d;
  }
}

export function daysUntil(d) {
  if (!d) return null;
  const t = new Date(d).getTime();
  return Math.floor((t - Date.now()) / 86400000);
}

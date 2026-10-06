export const CLIENT_STATES = [
  { value: "nuevo_lead", label: "Nuevo lead", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "cliente_activo", label: "Activo", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "baja", label: "Baja", color: "bg-red-50 text-red-700 border-red-200" },
  { value: "eliminado", label: "Eliminado", color: "bg-zinc-200 text-zinc-700 border-zinc-300" },
];

export const CONTRACT_STATES = [
  { value: "nuevo_lead", label: "Nuevo lead", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "pendiente_estudio", label: "Pendiente de estudio", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "sin_ahorro", label: "Sin ahorro", color: "bg-zinc-100 text-zinc-600 border-zinc-200" },
  { value: "incompleto", label: "Incompleto", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "enviado_firma", label: "Enviado a firma", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { value: "incidencia", label: "Incidencia", color: "bg-pink-50 text-pink-700 border-pink-200" },
  { value: "pendiente_activacion", label: "Pendiente activación", color: "bg-violet-50 text-violet-700 border-violet-200" },
  { value: "cliente_activo", label: "Contrato Activo", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "renovacion", label: "Pendiente Renovación", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { value: "no_renovado", label: "No Renovado", color: "bg-rose-50 text-rose-700 border-rose-200" },
  { value: "baja", label: "Baja", color: "bg-red-50 text-red-700 border-red-200" },
  { value: "eliminado", label: "Eliminado", color: "bg-zinc-200 text-zinc-700 border-zinc-300" },
];

export const STATE_MAP = {
  ...Object.fromEntries(CONTRACT_STATES.map((s) => [s.value, s])),
  enviado: { value: "enviado_firma", label: "Enviado a firma", color: "bg-indigo-50 text-indigo-700 border-indigo-200" }
};

export const ALL_STATES_MAP = {
  ...STATE_MAP,
  cliente_activo: { value: "cliente_activo", label: "Activo", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export const CLIENT_STATE_MAP = {
  ...ALL_STATES_MAP,
  ...Object.fromEntries(CLIENT_STATES.map((s) => [s.value, s])),
};

export const CRM_STATES = CONTRACT_STATES;


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

export function formatPhone(tel) {
  if (!tel) return "—";
  let clean = String(tel).replace(/[\s\-_]/g, "");
  if (!clean) return "—";
  
  let prefix = "";
  let number = clean;
  
  if (clean.startsWith("+")) {
    if (clean.startsWith("+34")) {
      prefix = "+34";
      number = clean.slice(3);
    } else {
      if (clean.length > 9) {
        prefix = clean.slice(0, clean.length - 9);
        number = clean.slice(clean.length - 9);
      }
    }
  } else {
    if (clean.length === 9) {
      prefix = "+34";
      number = clean;
    } else if (clean.startsWith("34") && clean.length === 11) {
      prefix = "+34";
      number = clean.slice(2);
    }
  }
  
  if (number.length === 9) {
    number = `${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`;
  }
  
  return prefix ? `${prefix} ${number}` : number;
}

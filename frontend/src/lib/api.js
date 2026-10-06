import { supabase } from "./supabase";

export const API_BASE = "supabase-serverless";

// Helper to format dates correctly
export function formatDate(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Algo ha ido mal. Inténtalo de nuevo.";
  return String(detail);
}

export function extractContractMetadata(contract) {
  if (!contract) return {
    notas_limpias: "",
    comercializadora_anterior: "",
    empresa_colaboradora: "",
    cups: "",
    consumo_anual: 0,
    estado: "pendiente_estudio",
    comercializadora_actual: "",
    tipo_servicio: "luz",
    direccion: "",
    provincia: "",
    comision: 0,
    etiqueta: "",
    fecha_fin_contrato: "",
    fecha_alerta_personalizada: "",
    motivo_alerta_personalizada: "",
    relaciones: []
  };
  const delimiter = "\n\n--- AMQL_CONTRACT_METADATA ---\n";
  const notas = contract.notas || "";
  const parts = notas.split(delimiter);
  const notas_limpias = parts[0] || "";
  let meta = {
    comercializadora_anterior: "",
    empresa_colaboradora: "",
    cups: "",
    consumo_anual: 0,
    estado: "pendiente_estudio",
    comercializadora_actual: "",
    tipo_servicio: "luz",
    direccion: "",
    provincia: "",
    comision: 0,
    etiqueta: "",
    fecha_fin_contrato: "",
    fecha_alerta_personalizada: "",
    motivo_alerta_personalizada: "",
    relaciones: []
  };
  if (parts.length > 1) {
    try {
      meta = { ...meta, ...JSON.parse(parts[1]) };
    } catch (e) {
      console.error("Error parsing contract metadata JSON", e);
    }
  }
  return {
    ...contract,
    notas_limpias,
    comercializadora_anterior: meta.comercializadora_anterior || "",
    empresa_colaboradora: meta.empresa_colaboradora || "",
    cups: meta.cups || "",
    consumo_anual: Number(meta.consumo_anual || 0),
    estado: contract.estado || meta.estado || "pendiente_estudio",
    comercializadora_actual: meta.comercializadora_actual || contract.comercializadora || "",
    tipo_servicio: meta.tipo_servicio || "luz",
    direccion: meta.direccion || "",
    provincia: meta.provincia || "",
    comision: Number(meta.comision || 0),
    etiqueta: meta.etiqueta || "",
    fecha_fin_contrato: meta.fecha_fin_contrato || "",
    fecha_alerta_personalizada: meta.fecha_alerta_personalizada || "",
    motivo_alerta_personalizada: meta.motivo_alerta_personalizada || "",
    relaciones: Array.isArray(meta.relaciones) ? meta.relaciones : []
  };
}


export function extractClientMetadata(client) {
  if (!client) return { 
    notas_limpias: "", comentarios: [], colaborador: "", sync_status: "pendiente", sync_date: null, sync_logs: [], tarifa: "2.0TD",
    fecha_nacimiento: "", tipo_titular: "fisica", cif: "", titular_no_firmante: false, firmante_nombre: "", firmante_dni: "", iban: "",
    comision: 0, tipo_servicio: "luz", real_estado: "", historial_cambios: [], fecha_fin_contrato: "",
    fecha_alerta_personalizada: "", motivo_alerta_personalizada: "",
    direccion_fiscal: {}, direcciones_suministro: [],
    rgpd_aceptado: false, rgpd_fecha: null, rgpd_ip: "", rgpd_user_agent: "", rgpd_version: ""
  };

  const hasDirectColumns = client.tipo_titular !== undefined;
  const commentsDelimiter = "\n\n--- AMQL_CLIENT_COMMENTS ---\n";
  const metaDelimiter = "\n\n--- AMQL_INTEGRATION_METADATA ---\n";

  if (hasDirectColumns) {
    const dbState = client.estado === "enviado" ? "enviado_firma" : client.estado;
    const real_estado = client.real_estado || dbState;
    const rawNotas = client.notas || "";
    const commentsParts = rawNotas.split(commentsDelimiter);
    let notas_limpias = commentsParts[0] || "";
    let comentarios = [];
    
    if (commentsParts.length > 1) {
      try {
        comentarios = JSON.parse(commentsParts[1]);
      } catch (e) {
        console.error("Error parsing client comments JSON in direct columns mode", e);
      }
    }
    if (!Array.isArray(comentarios)) comentarios = [];
    
    if (comentarios.length === 0 && notas_limpias.trim() !== "") {
      comentarios = [{
        id: "legacy",
        timestamp: client.created_at || new Date().toISOString(),
        user_name: "Nota Histórica",
        text: notas_limpias.trim()
      }];
      notas_limpias = "";
    }

    return {
      ...client,
      notas_limpias,
      comentarios,
      colaborador: client.colaborador || "",
      sync_status: client.sync_status || "pendiente",
      sync_date: client.sync_date || null,
      sync_logs: Array.isArray(client.sync_logs) ? client.sync_logs : [],
      tarifa: client.tarifa || "2.0TD",
      fecha_nacimiento: client.fecha_nacimiento || "",
      tipo_titular: client.tipo_titular || "fisica",
      cif: client.cif || "",
      titular_no_firmante: client.titular_no_firmante || false,
      firmante_nombre: client.firmante_nombre || "",
      firmante_dni: client.firmante_dni || "",
      iban: client.iban || "",
      comision: Number(client.comision) || 0,
      tipo_servicio: client.tipo_servicio || "luz",
      estado: real_estado,
      historial_cambios: Array.isArray(client.historial_cambios) ? client.historial_cambios : [],
      fecha_fin_contrato: client.fecha_fin_contrato || "",
      fecha_alerta_personalizada: client.fecha_alerta_personalizada || "",
      motivo_alerta_personalizada: client.motivo_alerta_personalizada || "",
      direccion_fiscal: client.direccion_fiscal || {},
      direcciones_suministro: client.direcciones_suministro || [],
      rgpd_aceptado: client.rgpd_aceptado !== undefined ? client.rgpd_aceptado : false,
      rgpd_fecha: client.rgpd_fecha || null,
      rgpd_ip: client.rgpd_ip || "",
      rgpd_user_agent: client.rgpd_user_agent || "",
      rgpd_version: client.rgpd_version || ""
    };
  }

  const rawNotas = client.notas || "";
  const parts = rawNotas.split(metaDelimiter);
  const mainPart = parts[0] || "";
  
  let meta = { 
    colaborador: "", sync_status: "pendiente", sync_date: null, sync_logs: [], tarifa: "2.0TD",
    fecha_nacimiento: "", tipo_titular: "fisica", cif: "", titular_no_firmante: false, firmante_nombre: "", firmante_dni: "", iban: "",
    comision: 0, tipo_servicio: "luz", real_estado: "", historial_cambios: [], fecha_fin_contrato: "",
    fecha_alerta_personalizada: "", motivo_alerta_personalizada: "",
    rgpd_aceptado: false, rgpd_fecha: null, rgpd_ip: "", rgpd_user_agent: "", rgpd_version: ""
  };
  
  if (parts.length > 1) {
    try {
      meta = { ...meta, ...JSON.parse(parts[1]) };
    } catch (e) {
      console.error("Error parsing client metadata JSON", e);
    }
  }

  const commentsParts = mainPart.split(commentsDelimiter);
  let notas_limpias = commentsParts[0] || "";
  let comentarios = [];
  
  if (commentsParts.length > 1) {
    try {
      comentarios = JSON.parse(commentsParts[1]);
    } catch (e) {
      console.error("Error parsing client comments JSON", e);
    }
  }
  if (!Array.isArray(comentarios)) comentarios = [];
  
  if (comentarios.length === 0 && notas_limpias.trim() !== "") {
    comentarios = [{
      id: "legacy",
      timestamp: client.created_at || new Date().toISOString(),
      user_name: "Nota Histórica",
      text: notas_limpias.trim()
    }];
    notas_limpias = "";
  }
  
  const dbState = client.estado === "enviado" ? "enviado_firma" : client.estado;
  const real_estado = meta.real_estado || dbState;
  
  return {
    ...client,
    notas_limpias,
    comentarios,
    colaborador: meta.colaborador || "",
    sync_status: meta.sync_status || "pendiente",
    sync_date: meta.sync_date || null,
    sync_logs: meta.sync_logs || [],
    tarifa: meta.tarifa || "2.0TD",
    fecha_nacimiento: meta.fecha_nacimiento || "",
    tipo_titular: meta.tipo_titular || "fisica",
    cif: meta.cif || "",
    titular_no_firmante: meta.titular_no_firmante || false,
    firmante_nombre: meta.firmante_nombre || "",
    firmante_dni: meta.firmante_dni || "",
    iban: meta.iban || "",
    comision: Number(meta.comision) || 0,
    tipo_servicio: meta.tipo_servicio || "luz",
    estado: real_estado,
    historial_cambios: meta.historial_cambios || [],
    fecha_fin_contrato: meta.fecha_fin_contrato || "",
    fecha_alerta_personalizada: meta.fecha_alerta_personalizada || "",
    motivo_alerta_personalizada: meta.motivo_alerta_personalizada || "",
    direccion_fiscal: client.direccion_fiscal || {},
    direcciones_suministro: client.direcciones_suministro || [],
    rgpd_aceptado: client.rgpd_aceptado !== undefined ? client.rgpd_aceptado : (meta.rgpd_aceptado || false),
    rgpd_fecha: client.rgpd_fecha !== undefined ? client.rgpd_fecha : (meta.rgpd_fecha || null),
    rgpd_ip: client.rgpd_ip !== undefined ? client.rgpd_ip : (meta.rgpd_ip || ""),
    rgpd_user_agent: client.rgpd_user_agent !== undefined ? client.rgpd_user_agent : (meta.rgpd_user_agent || ""),
    rgpd_version: client.rgpd_version !== undefined ? client.rgpd_version : (meta.rgpd_version || "")
  };
}

// Secure serverless login helper
async function handleLogin(email, password) {
  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const resData = await response.json();
    if (!response.ok || !resData.success) {
      throw new Error(resData.error || "Email o contraseña incorrectos");
    }

    const { user, token } = resData;

    localStorage.setItem("aml_user", JSON.stringify(user));
    localStorage.setItem("aml_session_token", token);
    return { data: { user } };
  } catch (e) {
    throw new Error(e.message || "Email o contraseña incorrectos");
  }
}


const resolveUserId = (id) => {
  if (id === "00000000-0000-0000-0000-000000000000") {
    return "416ed828-80c0-49a1-9788-d996104e5ef3";
  }
  return id;
};

export const cleanUuid = (id) => {
  if (!id || id === "null" || id === "undefined" || id === "00000000-0000-0000-0000-000000000000") {
    return null;
  }
  return id;
};

export const getValidUserId = async (id) => {
  const cleanId = cleanUuid(id);
  if (!cleanId) return await getFallbackAdminId();
  try {
    const { data } = await supabase.from("usuarios").select("id").eq("id", cleanId).maybeSingle();
    if (data) return data.id;
  } catch (e) {
    console.error("Error checking user ID in database:", e);
  }
  return await getFallbackAdminId();
};

export const getFallbackAdminId = async () => {
  try {
    const { data } = await supabase.from("usuarios").select("id").eq("email", "hugo@algomasqueluz.com").maybeSingle();
    if (data) return data.id;
    const { data: anyUser } = await supabase.from("usuarios").select("id").limit(1);
    if (anyUser && anyUser.length > 0) return anyUser[0].id;
  } catch (e) {
    console.error("Error fetching fallback admin ID:", e);
  }
  return null;
};

// Custom Supabase Serverless API Adapter
export const api = {
  get: async (url, config = {}) => {
    console.log(`[Supabase GET] ${url}`, config);
    
    // 1. Auth Me
    if (url === "/auth/me") {
      const stored = localStorage.getItem("aml_user");
      if (stored) {
        const u = JSON.parse(stored);
        if (u.email === "hugo@algomasqueluz.com") {
          u.avatar_url = "/hugo_profile.png";
          u.id = "416ed828-80c0-49a1-9788-d996104e5ef3";
          if (!u.permissions || u.permissions.length === 0) {
            u.permissions = ["/dashboard", "/clientes", "/pipeline", "/mapa", "/contratos", "/renovaciones", "/documentos", "/documentacion", "/mensajes", "/usuarios"];
          }
          localStorage.setItem("aml_user", JSON.stringify(u));
        }
        return { data: u };
      }
      throw new Error("No autenticado");
    }

    // 2. Meta Options
    if (url === "/meta/options") {
      return {
        data: {
          provincias: ["Madrid", "Barcelona", "Valencia", "Sevilla", "Zaragoza", "Málaga", "Murcia", "Palma", "Las Palmas", "Bilbao", "Alicante", "Córdoba", "Valladolid", "Vigo", "Gijón", "Granada", "A Coruña", "Vitoria", "Elche", "Oviedo", "Pamplona", "Cartagena", "Almería", "Santander"],
          comercializadoras: ["Endesa", "Iberdrola", "Naturgy", "Repsol", "TotalEnergies", "EDP", "Holaluz", "Audax", "Acciona Energía", "Octopus Energy"],
          estados: [
            { value: "nuevo_lead", label: "Nuevo lead" },
            { value: "pendiente_estudio", label: "Pendiente de estudio" },
            { value: "sin_ahorro", label: "Sin ahorro" },
            { value: "incompleto", label: "Incompleto" },
            { value: "enviado_firma", label: "Enviado a firma" },
            { value: "incidencia", label: "Incidencia" },
            { value: "pendiente_activacion", label: "Pendiente activación" },
            { value: "cliente_activo", label: "Contrato Activo" },
            { value: "renovacion", label: "Pendiente Renovación" },
            { value: "no_renovado", label: "No Renovado" },
            { value: "baja", label: "Baja" }
          ],
          roles: ["admin", "comercial", "gestor", "backoffice"]
        }
      };
    }

    // 3. Dashboard Stats
    if (url === "/dashboard/stats") {
      const { data: rawClients } = await supabase.from("clientes").select("*");
      const { data: contracts } = await supabase.from("contratos").select("*");
      
      const clients = (rawClients || []).map(extractClientMetadata).filter(c => c.estado !== "eliminado");
      
      const total_clients = clients.length;
      const active_clients = clients.filter(c => c.estado === "cliente_activo").length;
      const nuevos_leads = clients.filter(c => c.estado === "nuevo_lead").length;
      const sin_ahorro = clients.filter(c => c.estado === "sin_ahorro").length;
      const renovaciones = clients.filter(c => c.estado === "renovacion").length;
      const con_ahorro = clients.filter(c => c.tiene_ahorro).length;
      
      const total_ahorro = clients.reduce((acc, c) => acc + (c.tiene_ahorro ? Number(c.ahorro_estimado || 0) : 0), 0);
      const conversion_rate = total_clients ? Math.round((active_clients / total_clients) * 100) : 0;
      
      // Filter upcoming renewals in 30 days
      const upcoming_renewals_30d = contracts?.filter(c => {
        const diff = (new Date(c.fecha_renovacion) - new Date()) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 30;
      }).length || 0;

      const state_distribution = [
        "nuevo_lead",
        "pendiente_estudio",
        "sin_ahorro",
        "incompleto",
        "enviado_firma",
        "incidencia",
        "pendiente_activacion",
        "cliente_activo",
        "renovacion",
        "no_renovado",
        "baja"
      ].map(s => ({
        estado: s,
        count: clients.filter(c => c.estado === s).length
      }));

      return {
        data: {
          total_clients,
          active_clients,
          nuevos_leads,
          sin_ahorro,
          renovaciones,
          con_ahorro,
          total_ahorro,
          conversion_rate,
          upcoming_renewals_30d,
          state_distribution
        }
      };
    }

    // 4. Dashboard Alerts
    if (url === "/dashboard/alerts") {
      const { data: contracts } = await supabase.from("contratos").select("*, clientes(nombre)");
      const alerts = (contracts || []).map(c => {
        const days = Math.ceil((new Date(c.fecha_renovacion) - new Date()) / (1000 * 60 * 60 * 24));
        return {
          client_id: c.cliente_id,
          client_name: c.clientes?.nombre || "Cliente",
          contract_id: c.id,
          comercializadora: c.comercializadora,
          fecha_renovacion: c.fecha_renovacion,
          days_until: days,
          level: days <= 30 ? "urgent" : "normal"
        };
      }).filter(a => a.days_until >= -10 && a.days_until <= 60)
        .sort((a, b) => a.days_until - b.days_until);

      return { data: { alerts } };
    }

    // 5. Renovations Upcoming
    if (url.startsWith("/renovations/upcoming")) {
      const urlObj = new URL(url, "http://dummy.com");
      const daysParam = urlObj.searchParams.get("days") || 180;
      const { data: contracts } = await supabase.from("contratos").select("*, clientes(nombre, telefono, email, direccion)");
      
      const list = (contracts || []).map(c => {
        const days = Math.ceil((new Date(c.fecha_renovacion) - new Date()) / (1000 * 60 * 60 * 24));
        return {
          client_id: c.cliente_id,
          client_name: c.clientes?.nombre || "Cliente",
          client_phone: c.clientes?.telefono || "",
          client_email: c.clientes?.email || "",
          client_address: c.clientes?.direccion || "",
          contract_id: c.id,
          comercializadora: c.comercializadora,
          tarifa: c.tarifa,
          importe_anual: c.importe_anual,
          fecha_renovacion: c.fecha_renovacion,
          days_until: days
        };
      }).filter(a => a.days_until >= -10 && a.days_until <= Number(daysParam))
        .sort((a, b) => a.days_until - b.days_until);

      return { data: list };
    }
    // 6. Clients List
    if (url === "/clients" || url.startsWith("/clients?")) {
      const urlObj = new URL(url, "http://dummy.com");
      const searchQ = urlObj.searchParams.get("q") || config.params?.q || "";
      const estadoFilter = urlObj.searchParams.get("estado") || config.params?.estado || "";
      const comercialIdFilter = urlObj.searchParams.get("comercial_id") || config.params?.comercial_id || "";

      let query = supabase.from("clientes").select("*, usuarios(name)").order("created_at", { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;

      let list = (data || []).map(c => ({
        ...extractClientMetadata(c),
        comercial_name: c.usuarios?.name || "Asignar..."
      }));

      // Filter by status if provided and not __all__
      if (estadoFilter && estadoFilter !== "__all__") {
        list = list.filter(c => c.estado === estadoFilter);
      } else {
        list = list.filter(c => c.estado !== "eliminado");
      }

      // Filter by comercial_id if provided
      if (comercialIdFilter) {
        list = list.filter(c => c.comercial_id === comercialIdFilter);
      }

      // If user is comercial, restrict to their own clients
      const storedUser = JSON.parse(localStorage.getItem("aml_user") || "{}");
      if (storedUser.role === "comercial") {
        const validatedComercialId = resolveUserId(storedUser.id);
        list = list.filter(c => c.comercial_id === validatedComercialId);
      }

      if (searchQ) {
        const normalizeStr = (s) => {
          if (!s) return "";
          return String(s)
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[\s\-_]+/g, "");
        };
        const q = normalizeStr(searchQ);
        list = list.filter(c => {
          const fields = [
            c.nombre,
            c.cups,
            c.email,
            c.telefono,
            c.nif,
            c.cif,
            c.provincia,
            c.direccion,
            c.comercial_name
          ];
          return fields.some(f => normalizeStr(f).includes(q));
        });
      }

      return { data: list };
    }

    // 7. Client Detail Single
    if (url.startsWith("/clients/")) {
      const id = url.split("/")[2];
      const { data, error } = await supabase.from("clientes").select("*, usuarios(name)").eq("id", id).single();
      if (error) throw error;
      return {
        data: {
          ...extractClientMetadata(data),
          comercial_name: data.usuarios?.name || ""
        }
      };
    }
    // 8. Contracts List
    if (url.startsWith("/contracts")) {
      const urlObj = new URL(url, "http://dummy.com");
      const client_id = urlObj.searchParams.get("cliente_id") || config.params?.cliente_id;
      
      let query = supabase.from("contratos").select("*, clientes(nombre, created_at, estado, direccion, nif, telefono, email)").order("fecha_renovacion", { ascending: true });
      if (client_id) {
        query = query.eq("cliente_id", client_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return {
        data: (data || []).map(c => ({
          ...extractContractMetadata(c),
          cliente_nombre: c.clientes?.nombre || "",
          cliente_created_at: c.clientes?.created_at || "",
          cliente_estado: c.clientes?.estado || "nuevo_lead",
          cliente_direccion: c.clientes?.direccion || "",
          cliente_nif: c.clientes?.nif || "",
          cliente_telefono: c.clientes?.telefono || "",
          cliente_email: c.clientes?.email || ""
        })).filter(c => c.cliente_estado !== "eliminado")
      };
    }

    // 9. Documents List
    if (url.startsWith("/documents")) {
      const urlObj = new URL(url, "http://dummy.com");
      const client_id = urlObj.searchParams.get("cliente_id") || config.params?.cliente_id;
      const contrato_id = urlObj.searchParams.get("contrato_id") || config.params?.contrato_id;
      
      let query = supabase.from("documentos").select("*, clientes(nombre, cups, nif, telefono, email)").order("created_at", { ascending: false });
      if (client_id) {
        query = query.eq("cliente_id", client_id);
      }
      if (contrato_id) {
        query = query.eq("contrato_id", contrato_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { data: data || [] };
    }

    // 10. Users List
    if (url === "/users") {
      const { data, error } = await supabase.from("usuarios").select("*");
      if (error) throw error;
      return { data: data || [] };
    }

    // 11. Notifications List
    if (url === "/notifications") {
      const storedUser = JSON.parse(localStorage.getItem("aml_user") || "{}");
      storedUser.id = resolveUserId(storedUser.id);
      let query = supabase.from("notificaciones").select("*").order("created_at", { ascending: false });
      if (storedUser.role !== "admin") {
        query = query.eq("user_id", storedUser.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return { data: data || [] };
    }

    // 12. Chat Rooms
    if (url === "/chats/rooms") {
      try {
        const { data, error } = await supabase.from("chat_rooms").select("*").order("created_at", { ascending: true });
        if (error) throw error;
        
        // Seeding database dynamically if empty
        if (!data || data.length === 0) {
          console.log("Database chat_rooms is empty. Seeding defaults...");
          const defaultRooms = [
            { name: "general", type: "channel", email: "", phone: "" },
            { name: "desarrollo", type: "channel", email: "", phone: "" },
            { name: "diseño", type: "channel", email: "", phone: "" },
            { name: "Hugo Gonzalvez", type: "direct", email: "hugo.gonzalvez@kairos.com", phone: "600123456" },
            { name: "Alejandro Kairos", type: "direct", email: "ale.kairos@kairos.com", phone: "600987654" }
          ];
          
          const { data: seeded, error: seedError } = await supabase
            .from("chat_rooms")
            .insert(defaultRooms)
            .select();
            
          if (seedError) {
            console.error("Error seeding chat_rooms to Supabase:", seedError);
            throw seedError;
          }
          
          // Seed initial messages for "general"
          const generalRoom = (seeded || []).find(r => r.name === "general");
          if (generalRoom) {
            const initialMsgs = [
              {
                room_id: generalRoom.id,
                sender_name: "Alejandro Kairos",
                text: "¡Hola equipo! Bienvenidos al nuevo CRM.",
                created_at: new Date(Date.now() - 3600000).toISOString()
              },
              {
                room_id: generalRoom.id,
                sender_name: "Ana García",
                text: "Todo configurado y listo para empezar.",
                created_at: new Date(Date.now() - 3300000).toISOString()
              }
            ];
            await supabase.from("chat_messages").insert(initialMsgs);
          }
          
          return { data: seeded || [] };
        }
        
        return { data: data || [] };
      } catch (e) {
        console.warn("Using localStorage fallback for rooms due to error:", e.message);
        const localRooms = localStorage.getItem("aml_chat_rooms");
        if (localRooms) {
          return { data: JSON.parse(localRooms) };
        }
        const defaultRooms = [
          { id: "room-gen", name: "general", type: "channel", email: "", phone: "", created_at: new Date().toISOString() },
          { id: "room-dev", name: "desarrollo", type: "channel", email: "", phone: "", created_at: new Date().toISOString() },
          { id: "room-des", name: "diseño", type: "channel", email: "", phone: "", created_at: new Date().toISOString() },
          { id: "room-dm-hugo", name: "Hugo Gonzalvez", type: "direct", email: "hugo.gonzalvez@kairos.com", phone: "600123456", created_at: new Date().toISOString() },
          { id: "room-dm-ale", name: "Alejandro Kairos", type: "direct", email: "ale.kairos@kairos.com", phone: "600987654", created_at: new Date().toISOString() }
        ];
        localStorage.setItem("aml_chat_rooms", JSON.stringify(defaultRooms));
        return { data: defaultRooms };
      }
    }

    // 13. Chat Messages
    if (url.startsWith("/chats/messages")) {
      const urlObj = new URL(url, "http://dummy.com");
      const room_id = urlObj.searchParams.get("room_id") || config.params?.room_id;
      try {
        const { data, error } = await supabase.from("chat_messages").select("*").eq("room_id", room_id).order("created_at", { ascending: true });
        if (error) throw error;
        return { data: data || [] };
      } catch (e) {
        const localMsgs = localStorage.getItem(`aml_chat_msgs_${room_id}`);
        if (localMsgs) {
          return { data: JSON.parse(localMsgs) };
        }
        if (room_id === "room-gen") {
          const defaultGenMsgs = [
            { id: "msg-1", room_id: "room-gen", sender_id: "user-ale", sender_name: "Alejandro Kairos", text: "¡Hola equipo! Bienvenidos al nuevo CRM.", attachment_url: "", attachment_name: "", attachment_type: "", created_at: new Date(Date.now() - 3600000).toISOString() },
            { id: "msg-2", room_id: "room-gen", sender_id: "user-ana", sender_name: "Ana García", text: "Todo configurado y listo para empezar.", attachment_url: "", attachment_name: "", attachment_type: "", created_at: new Date(Date.now() - 3300000).toISOString() }
          ];
          localStorage.setItem(`aml_chat_msgs_${room_id}`, JSON.stringify(defaultGenMsgs));
          return { data: defaultGenMsgs };
        }
        return { data: [] };
      }
    }

    throw new Error(`Endpoint GET [${url}] no implementado`);
  },

  post: async (url, payload, config = {}) => {
    console.log(`[Supabase POST] ${url}`, payload, config);

    // 1. Auth Login
    if (url === "/auth/login") {
      return handleLogin(payload.email, payload.password);
    }

    // 2. Auth Logout
    if (url === "/auth/logout") {
      localStorage.removeItem("aml_user");
      return { data: { ok: true } };
    }

    // 3. Register User
    if (url === "/auth/register") {
      const { data, error } = await supabase.from("usuarios").insert({
        email: payload.email.toLowerCase().trim(),
        name: payload.name,
        role: payload.role || "comercial",
        password_hash: payload.password || "Demo123!",
        phone: "",
        avatar_url: "",
        permissions: payload.permissions || []
      }).select().single();
      if (error) throw error;
      return { data };
    }

    // 4. Create Client
    if (url === "/clients") {
      const storedUser = JSON.parse(localStorage.getItem("aml_user") || "{}");
      storedUser.id = resolveUserId(storedUser.id);
      const validatedComercialId = await getValidUserId(payload.comercial_id || storedUser.id);

      let hasDirectColumns = false;
      try {
        const { data: firstClient } = await supabase.from("clientes").select("*").limit(1);
        if (firstClient && firstClient.length > 0) {
          hasDirectColumns = firstClient[0].tipo_titular !== undefined;
        }
      } catch (e) {
        console.error("Error detecting client table columns:", e);
      }
      
      const commentsDelimiter = "\n\n--- AMQL_CLIENT_COMMENTS ---\n";
      const metaDelimiter = "\n\n--- AMQL_INTEGRATION_METADATA ---\n";
      
      const initialCommentText = payload.notas || payload.notas_limpias || "";
      let comentarios = Array.isArray(payload.comentarios) ? payload.comentarios : [];
      if (comentarios.length === 0 && initialCommentText.trim() !== "") {
        comentarios = [{
          id: `comment-${Date.now()}`,
          timestamp: new Date().toISOString(),
          user_name: storedUser.name || "Usuario",
          text: initialCommentText.trim()
        }];
      }

      const metaToStore = {
        colaborador: payload.colaborador || "",
        sync_status: payload.sync_status || "pendiente",
        sync_date: payload.sync_date || null,
        sync_logs: payload.sync_logs || [],
        tarifa: payload.tarifa || "2.0TD",
        fecha_nacimiento: payload.fecha_nacimiento || "",
        tipo_titular: payload.tipo_titular || "fisica",
        cif: payload.cif || "",
        titular_no_firmante: payload.titular_no_firmante || false,
        firmante_nombre: payload.firmante_nombre || "",
        firmante_dni: payload.firmante_dni || "",
        iban: payload.iban || "",
        comision: Number(payload.comision) || 0,
        tipo_servicio: payload.tipo_servicio || "luz",
        real_estado: payload.estado || "nuevo_lead",
        fecha_fin_contrato: payload.fecha_fin_contrato || "",
        fecha_alerta_personalizada: payload.fecha_alerta_personalizada || "",
        motivo_alerta_personalizada: payload.motivo_alerta_personalizada || "",
        rgpd_aceptado: payload.rgpd_aceptado || false,
        rgpd_fecha: payload.rgpd_fecha || null,
        rgpd_ip: payload.rgpd_ip || "",
        rgpd_user_agent: payload.rgpd_user_agent || "",
        rgpd_version: payload.rgpd_version || "",
        historial_cambios: [{
          timestamp: new Date().toISOString(),
          user_name: storedUser.name || "Usuario",
          changes: ["Cliente creado"]
        }]
      };
      
      const serializedNotas = `${commentsDelimiter}${JSON.stringify(comentarios)}`;

      const dbPayload = {
        nombre: payload.nombre,
        telefono: payload.telefono || "",
        email: payload.email || "",
        cups: payload.cups || "",
        provincia: payload.provincia || "",
        direccion: payload.direccion || "",
        nif: payload.tipo_titular === "juridica" ? (payload.cif || "") : (payload.nif || ""),
        estado: payload.estado || "nuevo_lead",
        comercial_id: validatedComercialId,
        tiene_ahorro: payload.tiene_ahorro || false,
        ahorro_estimado: payload.ahorro_estimado || 0.0,
        ultimo_contacto: new Date().toISOString(),
        fecha_fin_contrato: payload.fecha_fin_contrato ? payload.fecha_fin_contrato : null,
        fecha_alerta_personalizada: payload.fecha_alerta_personalizada ? payload.fecha_alerta_personalizada : null,
        motivo_alerta_personalizada: payload.motivo_alerta_personalizada || null,
        direccion_fiscal: payload.direccion_fiscal || {},
        direcciones_suministro: payload.direcciones_suministro || []
      };

      if (hasDirectColumns) {
        dbPayload.colaborador = metaToStore.colaborador;
        dbPayload.sync_status = metaToStore.sync_status;
        dbPayload.sync_date = metaToStore.sync_date;
        dbPayload.sync_logs = metaToStore.sync_logs;
        dbPayload.tarifa = metaToStore.tarifa;
        dbPayload.fecha_nacimiento = metaToStore.fecha_nacimiento ? metaToStore.fecha_nacimiento : null;
        dbPayload.tipo_titular = metaToStore.tipo_titular;
        dbPayload.cif = metaToStore.cif;
        dbPayload.titular_no_firmante = metaToStore.titular_no_firmante;
        dbPayload.firmante_nombre = metaToStore.firmante_nombre;
        dbPayload.firmante_dni = metaToStore.firmante_dni;
        dbPayload.iban = metaToStore.iban;
        dbPayload.comision = metaToStore.comision;
        dbPayload.tipo_servicio = metaToStore.tipo_servicio;
        dbPayload.historial_cambios = metaToStore.historial_cambios;
        dbPayload.fecha_fin_contrato = metaToStore.fecha_fin_contrato ? metaToStore.fecha_fin_contrato : null;
        dbPayload.fecha_alerta_personalizada = metaToStore.fecha_alerta_personalizada ? metaToStore.fecha_alerta_personalizada : null;
        dbPayload.motivo_alerta_personalizada = metaToStore.motivo_alerta_personalizada || null;
        dbPayload.rgpd_aceptado = metaToStore.rgpd_aceptado;
        dbPayload.rgpd_fecha = metaToStore.rgpd_fecha;
        dbPayload.rgpd_ip = metaToStore.rgpd_ip;
        dbPayload.rgpd_user_agent = metaToStore.rgpd_user_agent;
        dbPayload.rgpd_version = metaToStore.rgpd_version;
        dbPayload.notas = serializedNotas;
      } else {
        dbPayload.notas = `${serializedNotas}${metaDelimiter}${JSON.stringify(metaToStore)}`;
      }

      const { data, error } = await supabase.from("clientes").insert(dbPayload).select("*, usuarios(name)").single();

      if (error) throw error;
      const cleaned = extractClientMetadata(data);
      return {
        data: {
          ...cleaned,
          comercial_name: data.usuarios?.name || "Asignar..."
        }
      };
    }

    // 5. Create Contract
    if (url === "/contracts") {
      const delimiter = "\n\n--- AMQL_CONTRACT_METADATA ---\n";
      let estadoToUse = payload.estado || "pendiente_estudio";
      if (estadoToUse === "activo") {
        estadoToUse = "cliente_activo";
      }
      const meta = {
        comercializadora_anterior: payload.comercializadora_anterior || "",
        empresa_colaboradora: payload.empresa_colaboradora || "",
        cups: payload.cups || "",
        consumo_anual: Number(payload.consumo_anual || 0),
        estado: estadoToUse,
        comercializadora_actual: payload.comercializadora_actual || payload.comercializadora || "",
        tipo_servicio: payload.tipo_servicio || "luz",
        direccion: payload.direccion || "",
        provincia: payload.provincia || "",
        comision: Number(payload.comision || 0),
        etiqueta: payload.etiqueta || "",
        fecha_fin_contrato: payload.fecha_fin_contrato || "",
        fecha_alerta_personalizada: payload.fecha_alerta_personalizada || "",
        motivo_alerta_personalizada: payload.motivo_alerta_personalizada || "",
        relaciones: payload.relaciones || []
      };
      const dbNotas = (payload.notas_limpias || payload.notes || payload.notas || "") + delimiter + JSON.stringify(meta);

      const { data, error } = await supabase.from("contratos").insert({
        cliente_id: cleanUuid(payload.cliente_id),
        comercializadora: meta.comercializadora_actual,
        tarifa: payload.tarifa || "",
        potencia_contratada: Number(payload.potencia_contratada || 0),
        fecha_inicio: payload.fecha_inicio,
        fecha_renovacion: payload.fecha_renovacion,
        permanencia_meses: Number(payload.permanencia_meses || 12),
        importe_anual: Number(payload.importe_anual || 0),
        estado: estadoToUse,
        notas: dbNotas
      }).select().single();
      if (error) throw error;
      return { data: extractContractMetadata(data) };
    }

    // 6. Upload / OCR Document Mock
    if (url === "/documents/upload") {
      const docName = payload.get("file")?.name || "Factura.pdf";
      const clientId = cleanUuid(payload.get("cliente_id"));
      const contratoId = cleanUuid(payload.get("contrato_id"));
      const type = payload.get("tipo") || "factura";
      
      const storedUser = JSON.parse(localStorage.getItem("aml_user") || "{}");
      const validatedUploadedBy = await getValidUserId(storedUser.id);

      // Auto-fill mock OCR data
      const mockOcrData = {
        cups: "ES0021000000" + Math.floor(10000000 + Math.random() * 90000000) + "AB",
        titular: "Titular Comercial S.L.",
        nif: "B" + Math.floor(10000000 + Math.random() * 90000000),
        direccion_suministro: "Av. de la Constitución 14",
        comercializadora: "Endesa",
        tarifa: "2.0TD",
        potencia_contratada_kw: 6.9,
        consumo_kwh: 4520,
        importe_total_eur: 580.40,
        resumen: "Factura de luz analizada con IA. Ahorro potencial detectado del 12% optimizando tarifa."
      };

      const { data, error } = await supabase.from("documentos").insert({
        cliente_id: clientId,
        contrato_id: contratoId,
        nombre: docName,
        tipo: type,
        mime_type: "application/pdf",
        size: 1450201,
        file_path: "",
        ocr_status: type === "factura" ? "completed" : "skipped",
        extracted_data: type === "factura" ? mockOcrData : { description: payload.get("description") || "" },
        uploaded_by: validatedUploadedBy
      }).select().single();

      if (error) throw error;

      // Auto-fill client CUPS in database
      if (clientId && type === "factura") {
        await supabase.from("clientes").update({
          cups: mockOcrData.cups
        }).eq("id", clientId);
      }

      return { data };
    }

    // 7. Run Renewal Check Automation
    if (url === "/automations/run-renewal-check") {
      const { data: contracts, error: errC } = await supabase.from("contratos").select("*");
      if (errC) throw errC;

      const today = new Date();
      const in60Days = new Date();
      in60Days.setDate(today.getDate() + 60);

      const todayStr = today.toISOString().split("T")[0];
      const in60DaysStr = in60Days.toISOString().split("T")[0];

      const upcomingContracts = (contracts || []).filter(c => {
        return c.fecha_renovacion >= todayStr && c.fecha_renovacion <= in60DaysStr;
      });

      let notifications_created = 0;
      let emails_sent = 0;
      let whatsapps_sent = 0;
      const sessionToken = localStorage.getItem("aml_session_token");

      for (const c of upcomingContracts) {
        const { data: cli } = await supabase.from("clientes").select("*").eq("id", c.cliente_id).single();
        if (!cli || !cli.comercial_id) continue;

        const diffTime = Math.abs(new Date(c.fecha_renovacion) - today);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Create notification in Supabase
        const { error: errN } = await supabase.from("notificaciones").insert({
          user_id: cli.comercial_id,
          title: `Renovación próxima: ${cli.nombre}`,
          message: `Contrato con ${c.comercializadora || "?"} vence el ${c.fecha_renovacion} (${diffDays} días).`,
          read: false
        });

        if (!errN) {
          notifications_created++;
        }

        // Email & WhatsApp alerts for renewals at 30, 15, 3, 1 days
        if ([30, 15, 3, 1].includes(diffDays)) {
          if (sessionToken) {
            // Send SMTP email
            fetch("/api/send-email", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${sessionToken}`
              },
              body: JSON.stringify({
                cliente_nombre: cli.nombre,
                fecha_vencimiento: formatDate(c.fecha_renovacion),
                is_captacion: false
              })
            }).catch(err => console.error("Error sending renewal alert email:", err));

            // Send WhatsApp
            fetch("/api/send-whatsapp", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${sessionToken}`
              },
              body: JSON.stringify({
                message: `⚡ *Alerta de Renovación CRM* ⚡\nEl contrato del cliente *${cli.nombre}* con la comercializadora *${c.comercializadora || "?"}* vence el *${formatDate(c.fecha_renovacion)}* (${diffDays} días).`
              })
            }).catch(err => console.error("Error sending WhatsApp renewal alert:", err));
            
            whatsapps_sent++;
          }
          emails_sent++;
        }
      }

      // Check contracts with "sin_ahorro" for Future Captures and personalized alerts
      const extractedContracts = (contracts || []).map(extractContractMetadata);

      for (const c of extractedContracts) {
        if (!c.cliente_id) continue;
        const { data: cli, error: errCli } = await supabase.from("clientes").select("*").eq("id", c.cliente_id).maybeSingle();
        if (errCli || !cli) continue;

        // 1. Regular Future Captures Alerts (sin_ahorro state with fecha_fin_contrato)
        if (c.estado === "sin_ahorro" && c.fecha_fin_contrato) {
          // Calculate time difference
          const diffTime = new Date(c.fecha_fin_contrato) - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          // Alert at exactly 30, 15, 3, and 1 days before vencimiento
          if ([30, 15, 3, 1].includes(diffDays)) {
            // Create notification in Supabase
            const { error: errN } = await supabase.from("notificaciones").insert({
              user_id: cli.comercial_id,
              title: `Alerta Captación: ${cli.nombre}`,
              message: `El contrato (${c.etiqueta || c.comercializadora_actual || "Luz"}) del cliente sin ahorro vence el ${c.fecha_fin_contrato} (${diffDays} días). Solicitar factura actual para revisar ahorro.`,
              read: false
            });

            if (!errN) {
              notifications_created++;
            }

            if (sessionToken) {
              // Send email
              fetch("/api/send-email", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${sessionToken}`
                },
                body: JSON.stringify({
                  cliente_nombre: cli.nombre,
                  fecha_vencimiento: formatDate(c.fecha_fin_contrato),
                  is_captacion: true,
                  dias_restantes: diffDays
                })
              }).catch(err => console.error("Error sending SMTP capture alert email:", err));

              // Send WhatsApp
              fetch("/api/send-whatsapp", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${sessionToken}`
                },
                body: JSON.stringify({
                  message: `⚠️ *Alerta de Captación CRM* ⚠️\nEl contrato (${c.etiqueta || c.comercializadora_actual || "Luz"}) del cliente sin ahorro *${cli.nombre}* vence el *${formatDate(c.fecha_fin_contrato)}* (${diffDays} días). Solicitar factura actual para ver si podemos conseguir ahorro.`
                })
              }).catch(err => console.error("Error sending WhatsApp capture alert:", err));

              whatsapps_sent++;
            }
            emails_sent++;
          }
        }

        // 2. Customized / Personalized follow-up alerts (matches today's date)
        if (c.fecha_alerta_personalizada) {
          const alertDateStr = new Date(c.fecha_alerta_personalizada).toISOString().split("T")[0];
          if (alertDateStr === todayStr) {
            // Create notification in Supabase
            const { error: errN } = await supabase.from("notificaciones").insert({
              user_id: cli.comercial_id,
              title: `Seguimiento: ${cli.nombre}`,
              message: `Alerta personalizada hoy para contrato (${c.etiqueta || c.comercializadora_actual || "Luz"}): ${c.motivo_alerta_personalizada || "Revisar permanencia / estado del cliente"}`,
              read: false
            });

            if (!errN) {
              notifications_created++;
            }

            if (sessionToken) {
              // Send email
              fetch("/api/send-email", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${sessionToken}`
                },
                body: JSON.stringify({
                  cliente_nombre: cli.nombre,
                  fecha_vencimiento: formatDate(c.fecha_alerta_personalizada),
                  is_captacion: true,
                  dias_restantes: 0 // Indicates customized follow-up alert
                })
              }).catch(err => console.error("Error sending SMTP personalized alert email:", err));

              // Send WhatsApp
              fetch("/api/send-whatsapp", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${sessionToken}`
                },
                body: JSON.stringify({
                  message: `📌 *Alerta de Seguimiento CRM* 📌\nAlerta personalizada para el contrato (${c.etiqueta || c.comercializadora_actual || "Luz"}) del cliente *${cli.nombre}*.\n*Motivo:* ${c.motivo_alerta_personalizada || "Revisar permanencia / estado del cliente"}\n*Fecha Fin Contrato:* ${c.fecha_fin_contrato ? formatDate(c.fecha_fin_contrato) : "No definida"}`
                })
              }).catch(err => console.error("Error sending WhatsApp personalized alert:", err));

              whatsapps_sent++;
            }
            emails_sent++;
          }
        }
      }

      return {
        data: {
          notifications_created,
          emails_sent,
          whatsapps_sent,
          emails_failed: 0,
          email_provider: "smtp"
        }
      };
    }

    // 8. Mark Notification as Read
    if (url.startsWith("/notifications/") && url.endsWith("/read")) {
      const id = url.split("/")[2];
      const { data, error } = await supabase.from("notificaciones").update({ read: true }).eq("id", id).select().single();
      if (error) throw error;
      return { data };
    }

    // 9. Create Chat Room
    if (url === "/chats/rooms") {
      try {
        const { data, error } = await supabase.from("chat_rooms").insert({
          name: payload.name,
          type: payload.type,
          email: payload.email || "",
          phone: payload.phone || ""
        }).select().single();
        if (error) throw error;
        return { data };
      } catch (e) {
        const localRooms = JSON.parse(localStorage.getItem("aml_chat_rooms") || "[]");
        const newRoom = {
          id: `room-${Date.now()}`,
          name: payload.name,
          type: payload.type,
          email: payload.email || "",
          phone: payload.phone || "",
          created_at: new Date().toISOString()
        };
        localRooms.push(newRoom);
        localStorage.setItem("aml_chat_rooms", JSON.stringify(localRooms));
        return { data: newRoom };
      }
    }

    // 10. Create Chat Message
    if (url === "/chats/messages") {
      const storedUser = JSON.parse(localStorage.getItem("aml_user") || "{}");
      const senderName = storedUser.name || payload.sender_name || "Usuario";
      const senderId = cleanUuid(storedUser.id);
      
      try {
        const { data, error } = await supabase.from("chat_messages").insert({
          room_id: payload.room_id,
          sender_id: senderId,
          sender_name: senderName,
          text: payload.text || "",
          attachment_url: payload.attachment_url || "",
          attachment_name: payload.attachment_name || "",
          attachment_type: payload.attachment_type || ""
        }).select().single();
        if (error) throw error;
        return { data };
      } catch (e) {
        const roomId = payload.room_id;
        const localMsgs = JSON.parse(localStorage.getItem(`aml_chat_msgs_${roomId}`) || "[]");
        const newMsg = {
          id: `msg-${Date.now()}`,
          room_id: roomId,
          sender_id: senderId,
          sender_name: senderName,
          text: payload.text || "",
          attachment_url: payload.attachment_url || "",
          attachment_name: payload.attachment_name || "",
          attachment_type: payload.attachment_type || "",
          created_at: new Date().toISOString()
        };
        localMsgs.push(newMsg);
        localStorage.setItem(`aml_chat_msgs_${roomId}`, JSON.stringify(localMsgs));
        return { data: newMsg };
      }
    }

    throw new Error(`Endpoint POST [${url}] no implementado`);
  },

  patch: async (url, payload, config = {}) => {
    console.log(`[Supabase PATCH] ${url}`, payload, config);

    // 1. Update Client
    if (url.startsWith("/clients/")) {
      const id = url.split("/")[2];
      
      // Fetch the current client state to safely preserve current notes / metadata
      const { data: currentClient, error: fetchError } = await supabase.from("clientes").select("*").eq("id", id).single();
      if (fetchError) throw fetchError;
      
      const currentMeta = extractClientMetadata(currentClient);
      
      // Detect changes and generate change log entries
      const changes = [];
      const fieldsToTrack = {
        nombre: "Titular",
        telefono: "Teléfono",
        email: "Email",
        cups: "CUPS",
        provincia: "Provincia",
        direccion: "Dirección",
        estado: "Estado",
        colaborador: "Colaborador",
        sync_status: "Estado Sincronización",
        tarifa: "Tarifa",
        fecha_nacimiento: "Fecha de Nacimiento",
        tipo_titular: "Tipo de Titular",
        cif: "CIF",
        titular_no_firmante: "Titular no es firmante",
        firmante_nombre: "Nombre del Firmante",
        firmante_dni: "DNI del Firmante",
        iban: "IBAN",
        comision: "Comisión",
        tipo_servicio: "Tipo de Servicio",
        fecha_fin_contrato: "Fecha Fin Contrato"
      };

      for (const [key, label] of Object.entries(fieldsToTrack)) {
        if (payload[key] !== undefined) {
          let currentVal = currentMeta[key];
          let newVal = payload[key];
          
          if (key === "comision") {
            currentVal = Number(currentVal) || 0;
            newVal = Number(newVal) || 0;
          } else if (key === "titular_no_firmante") {
            currentVal = !!currentVal;
            newVal = !!newVal;
          } else {
            currentVal = currentVal ? String(currentVal).trim() : "";
            newVal = newVal ? String(newVal).trim() : "";
          }

          if (currentVal !== newVal) {
            let fromStr = currentVal === "" || currentVal === false ? "vacío" : String(currentVal);
            let toStr = newVal === "" || newVal === false ? "vacío" : String(newVal);
            if (key === "titular_no_firmante") {
              fromStr = currentVal ? "Sí" : "No";
              toStr = newVal ? "Sí" : "No";
            }
            changes.push(`Campo '${label}' cambiado de '${fromStr}' a '${toStr}'`);
          }
        }
      }

      let updatedHistory = [...(currentMeta.historial_cambios || [])];
      if (changes.length > 0) {
        const storedUser = JSON.parse(localStorage.getItem("aml_user") || "{}");
        const changeEntry = {
          timestamp: new Date().toISOString(),
          user_name: storedUser.name || "Usuario",
          changes: changes
        };
        updatedHistory = [changeEntry, ...updatedHistory];
      }

      let comentarios = payload.comentarios !== undefined ? payload.comentarios : currentMeta.comentarios;
      
      // Detect changes and parse/append to comments for backward compatibility if only notas_limpias is provided
      if (payload.comentarios === undefined && (payload.notas_limpias !== undefined || payload.notas !== undefined)) {
        const incomingNotesText = (payload.notas_limpias !== undefined ? payload.notas_limpias : payload.notas || "").trim();
        const currentNotesText = (currentMeta.notas_limpias || "").trim();
        
        if (incomingNotesText !== currentNotesText && incomingNotesText !== "") {
          let textToAppend = incomingNotesText;
          if (currentNotesText !== "" && incomingNotesText.startsWith(currentNotesText)) {
            textToAppend = incomingNotesText.slice(currentNotesText.length).trim();
          }
          
          if (textToAppend !== "") {
            const storedUser = JSON.parse(localStorage.getItem("aml_user") || "{}");
            const newComment = {
              id: `comment-${Date.now()}`,
              timestamp: new Date().toISOString(),
              user_name: storedUser.name || "Usuario",
              text: textToAppend
            };
            comentarios = [...(comentarios || []), newComment];
          }
        }
      }

      // Merge current metadata properties with any incoming updates
      const mergedMeta = {
        colaborador: payload.colaborador !== undefined ? payload.colaborador : currentMeta.colaborador,
        sync_status: payload.sync_status !== undefined ? payload.sync_status : currentMeta.sync_status,
        sync_date: payload.sync_date !== undefined ? payload.sync_date : currentMeta.sync_date,
        sync_logs: payload.sync_logs !== undefined ? payload.sync_logs : currentMeta.sync_logs,
        tarifa: payload.tarifa !== undefined ? payload.tarifa : currentMeta.tarifa,
        fecha_nacimiento: payload.fecha_nacimiento !== undefined ? payload.fecha_nacimiento : currentMeta.fecha_nacimiento,
        tipo_titular: payload.tipo_titular !== undefined ? payload.tipo_titular : currentMeta.tipo_titular,
        cif: payload.cif !== undefined ? payload.cif : currentMeta.cif,
        titular_no_firmante: payload.titular_no_firmante !== undefined ? payload.titular_no_firmante : currentMeta.titular_no_firmante,
        firmante_nombre: payload.firmante_nombre !== undefined ? payload.firmante_nombre : currentMeta.firmante_nombre,
        firmante_dni: payload.firmante_dni !== undefined ? payload.firmante_dni : currentMeta.firmante_dni,
        iban: payload.iban !== undefined ? payload.iban : currentMeta.iban,
        comision: payload.comision !== undefined ? Number(payload.comision) : currentMeta.comision,
        tipo_servicio: payload.tipo_servicio !== undefined ? payload.tipo_servicio : currentMeta.tipo_servicio,
        real_estado: payload.estado !== undefined ? payload.estado : (currentMeta.real_estado || currentMeta.estado),
        notas_limpias: payload.notas_limpias !== undefined ? payload.notas_limpias : (payload.notas !== undefined ? payload.notas : currentMeta.notas_limpias),
        fecha_fin_contrato: payload.fecha_fin_contrato !== undefined ? payload.fecha_fin_contrato : currentMeta.fecha_fin_contrato,
        fecha_alerta_personalizada: payload.fecha_alerta_personalizada !== undefined ? payload.fecha_alerta_personalizada : currentMeta.fecha_alerta_personalizada,
        motivo_alerta_personalizada: payload.motivo_alerta_personalizada !== undefined ? payload.motivo_alerta_personalizada : currentMeta.motivo_alerta_personalizada,
        rgpd_aceptado: payload.rgpd_aceptado !== undefined ? payload.rgpd_aceptado : currentMeta.rgpd_aceptado,
        rgpd_fecha: payload.rgpd_fecha !== undefined ? payload.rgpd_fecha : currentMeta.rgpd_fecha,
        rgpd_ip: payload.rgpd_ip !== undefined ? payload.rgpd_ip : currentMeta.rgpd_ip,
        rgpd_user_agent: payload.rgpd_user_agent !== undefined ? payload.rgpd_user_agent : currentMeta.rgpd_user_agent,
        rgpd_version: payload.rgpd_version !== undefined ? payload.rgpd_version : currentMeta.rgpd_version,
        comentarios: comentarios,
        historial_cambios: updatedHistory
      };
      
      // Form clean database payload containing ONLY valid column fields
      const dbPayload = {};
      if (payload.nombre !== undefined) dbPayload.nombre = payload.nombre;
      if (payload.telefono !== undefined) dbPayload.telefono = payload.telefono;
      if (payload.email !== undefined) dbPayload.email = payload.email;
      if (payload.cups !== undefined) dbPayload.cups = payload.cups;
      if (payload.provincia !== undefined) dbPayload.provincia = payload.provincia;
      if (payload.direccion !== undefined) dbPayload.direccion = payload.direccion;
      if (payload.comercial_id !== undefined) dbPayload.comercial_id = payload.comercial_id || null;
      if (payload.tiene_ahorro !== undefined) dbPayload.tiene_ahorro = payload.tiene_ahorro;
      if (payload.ahorro_estimado !== undefined) dbPayload.ahorro_estimado = Number(payload.ahorro_estimado) || 0.0;
      if (payload.fecha_fin_contrato !== undefined) dbPayload.fecha_fin_contrato = payload.fecha_fin_contrato ? payload.fecha_fin_contrato : null;
      if (payload.fecha_alerta_personalizada !== undefined) dbPayload.fecha_alerta_personalizada = payload.fecha_alerta_personalizada ? payload.fecha_alerta_personalizada : null;
      if (payload.motivo_alerta_personalizada !== undefined) dbPayload.motivo_alerta_personalizada = payload.motivo_alerta_personalizada || null;
      if (payload.rgpd_aceptado !== undefined) dbPayload.rgpd_aceptado = payload.rgpd_aceptado;
      if (payload.rgpd_fecha !== undefined) dbPayload.rgpd_fecha = payload.rgpd_fecha;
      if (payload.rgpd_ip !== undefined) dbPayload.rgpd_ip = payload.rgpd_ip;
      if (payload.rgpd_user_agent !== undefined) dbPayload.rgpd_user_agent = payload.rgpd_user_agent;
      if (payload.rgpd_version !== undefined) dbPayload.rgpd_version = payload.rgpd_version;
      if (payload.direccion_fiscal !== undefined) dbPayload.direccion_fiscal = payload.direccion_fiscal;
      if (payload.direcciones_suministro !== undefined) dbPayload.direcciones_suministro = payload.direcciones_suministro;
      
      if (payload.estado !== undefined) {
        dbPayload.estado = payload.estado;
      }
      
      // Sync DB nif column with CIF/NIF based on tipo_titular
      dbPayload.nif = mergedMeta.tipo_titular === "juridica" ? mergedMeta.cif : (payload.nif !== undefined ? payload.nif : currentClient.nif);
      
      const hasDirectColumns = currentClient.tipo_titular !== undefined;
      const commentsDelimiter = "\n\n--- AMQL_CLIENT_COMMENTS ---\n";
      const metaDelimiter = "\n\n--- AMQL_INTEGRATION_METADATA ---\n";
      const serializedNotas = `${commentsDelimiter}${JSON.stringify(comentarios)}`;
      
      if (hasDirectColumns) {
        dbPayload.colaborador = mergedMeta.colaborador;
        dbPayload.sync_status = mergedMeta.sync_status;
        dbPayload.sync_date = mergedMeta.sync_date;
        dbPayload.sync_logs = mergedMeta.sync_logs;
        dbPayload.tarifa = mergedMeta.tarifa;
        dbPayload.fecha_nacimiento = mergedMeta.fecha_nacimiento ? mergedMeta.fecha_nacimiento : null;
        dbPayload.tipo_titular = mergedMeta.tipo_titular;
        dbPayload.cif = mergedMeta.cif;
        dbPayload.titular_no_firmante = mergedMeta.titular_no_firmante;
        dbPayload.firmante_nombre = mergedMeta.firmante_nombre;
        dbPayload.firmante_dni = mergedMeta.firmante_dni;
        dbPayload.iban = mergedMeta.iban;
        dbPayload.comision = mergedMeta.comision;
        dbPayload.tipo_servicio = mergedMeta.tipo_servicio;
        dbPayload.historial_cambios = mergedMeta.historial_cambios;
        dbPayload.fecha_fin_contrato = mergedMeta.fecha_fin_contrato ? mergedMeta.fecha_fin_contrato : null;
        dbPayload.fecha_alerta_personalizada = mergedMeta.fecha_alerta_personalizada ? mergedMeta.fecha_alerta_personalizada : null;
        dbPayload.motivo_alerta_personalizada = mergedMeta.motivo_alerta_personalizada || null;
        dbPayload.rgpd_aceptado = mergedMeta.rgpd_aceptado;
        dbPayload.rgpd_fecha = mergedMeta.rgpd_fecha;
        dbPayload.rgpd_ip = mergedMeta.rgpd_ip;
        dbPayload.rgpd_user_agent = mergedMeta.rgpd_user_agent;
        dbPayload.rgpd_version = mergedMeta.rgpd_version;
        dbPayload.notas = serializedNotas;
      } else {
        dbPayload.notas = `${serializedNotas}${metaDelimiter}${JSON.stringify(mergedMeta)}`;
      }
      
      let updateData = null;
      let updateError = null;
      
      try {
        const res = await supabase.from("clientes").update({
          ...dbPayload,
          ultimo_contacto: new Date().toISOString()
        }).eq("id", id).select("*, usuarios(name)").single();
        updateData = res.data;
        updateError = res.error;
      } catch (e) {
        console.warn("SELECT inside UPDATE failed (likely due to RLS). Retrying blind update.");
      }

      if (updateError || !updateData) {
        // Fallback blind update without select() for public write-only portal
        const { error: blindError } = await supabase.from("clientes").update({
          ...dbPayload,
          ultimo_contacto: new Date().toISOString()
        }).eq("id", id);
        
        if (blindError) throw blindError;
        
        return {
          data: {
            id,
            estado: payload.estado || currentMeta.estado,
            rgpd_aceptado: payload.rgpd_aceptado !== undefined ? payload.rgpd_aceptado : currentMeta.rgpd_aceptado,
            status: "success",
            message: "RGPD updated successfully (write-only fallback)"
          }
        };
      }

      const cleaned = extractClientMetadata(updateData);
      return {
        data: {
          ...cleaned,
          comercial_name: updateData.usuarios?.name || ""
        }
      };
    }

    // 2. Update Document
    if (url.startsWith("/documents/")) {
      const id = url.split("/")[2];
      const { data, error } = await supabase.from("documentos").update(payload).eq("id", id).select().single();
      if (error) throw error;
      return { data };
    }

    // 2b. Update Contract
    if (url.startsWith("/contracts/")) {
      const id = url.split("/")[2];
      
      const { data: currentContract, error: getErr } = await supabase.from("contratos").select("*").eq("id", id).single();
      if (getErr) throw getErr;

      const currentMeta = extractContractMetadata(currentContract);
      let estadoToUse = payload.estado !== undefined ? payload.estado : currentMeta.estado;
      if (estadoToUse === "activo") {
        estadoToUse = "cliente_activo";
      }

      const mergedMeta = {
        comercializadora_anterior: payload.comercializadora_anterior !== undefined ? payload.comercializadora_anterior : currentMeta.comercializadora_anterior,
        empresa_colaboradora: payload.empresa_colaboradora !== undefined ? payload.empresa_colaboradora : currentMeta.empresa_colaboradora,
        cups: payload.cups !== undefined ? payload.cups : currentMeta.cups,
        consumo_anual: payload.consumo_anual !== undefined ? Number(payload.consumo_anual || 0) : currentMeta.consumo_anual,
        estado: estadoToUse,
        comercializadora_actual: payload.comercializadora_actual !== undefined ? payload.comercializadora_actual : (payload.comercializadora !== undefined ? payload.comercializadora : currentMeta.comercializadora_actual),
        tipo_servicio: payload.tipo_servicio !== undefined ? payload.tipo_servicio : currentMeta.tipo_servicio,
        direccion: payload.direccion !== undefined ? payload.direccion : currentMeta.direccion,
        provincia: payload.provincia !== undefined ? payload.provincia : currentMeta.provincia,
        comision: payload.comision !== undefined ? Number(payload.comision || 0) : currentMeta.comision,
        etiqueta: payload.etiqueta !== undefined ? payload.etiqueta : currentMeta.etiqueta,
        fecha_fin_contrato: payload.fecha_fin_contrato !== undefined ? payload.fecha_fin_contrato : currentMeta.fecha_fin_contrato,
        fecha_alerta_personalizada: payload.fecha_alerta_personalizada !== undefined ? payload.fecha_alerta_personalizada : currentMeta.fecha_alerta_personalizada,
        motivo_alerta_personalizada: payload.motivo_alerta_personalizada !== undefined ? payload.motivo_alerta_personalizada : currentMeta.motivo_alerta_personalizada,
        relaciones: payload.relaciones !== undefined ? payload.relaciones : currentMeta.relaciones
      };

      const delimiter = "\n\n--- AMQL_CONTRACT_METADATA ---\n";
      const notas_limpias = payload.notes_limpias !== undefined ? payload.notes_limpias : (payload.notas_limpias !== undefined ? payload.notas_limpias : (payload.notas !== undefined ? payload.notas : currentMeta.notas_limpias));
      const dbNotas = notas_limpias + delimiter + JSON.stringify(mergedMeta);

      const dbPayload = {};
      dbPayload.comercializadora = mergedMeta.comercializadora_actual;
      if (payload.tarifa !== undefined) dbPayload.tarifa = payload.tarifa;
      if (payload.potencia_contratada !== undefined) dbPayload.potencia_contratada = Number(payload.potencia_contratada || 0);
      if (payload.fecha_inicio !== undefined) dbPayload.fecha_inicio = payload.fecha_inicio;
      if (payload.fecha_renovacion !== undefined) dbPayload.fecha_renovacion = payload.fecha_renovacion;
      if (payload.permanencia_meses !== undefined) dbPayload.permanencia_meses = Number(payload.permanencia_meses || 12);
      if (payload.importe_anual !== undefined) dbPayload.importe_anual = Number(payload.importe_anual || 0);
      dbPayload.estado = estadoToUse;
      dbPayload.notas = dbNotas;

      const { data, error } = await supabase.from("contratos").update(dbPayload).eq("id", id).select().single();
      if (error) throw error;
      return { data: extractContractMetadata(data) };
    }

    // 3. Update User
    if (url.startsWith("/users/")) {
      const id = url.split("/")[2];
      const updateData = { ...payload };
      if (payload.password) {
        updateData.password_hash = payload.password;
        delete updateData.password;
      }
      const { data, error } = await supabase.from("usuarios").update(updateData).eq("id", id).select().single();
      if (error) throw error;
      return { data };
    }

    // 4. Update Chat Room (e.g. members list)
    if (url.startsWith("/chats/rooms/")) {
      const id = url.split("/")[2];
      try {
        const { data, error } = await supabase.from("chat_rooms").update(payload).eq("id", id).select().single();
        if (error) throw error;
        return { data };
      } catch (e) {
        const localRooms = JSON.parse(localStorage.getItem("aml_chat_rooms") || "[]");
        const idx = localRooms.findIndex(r => r.id === id);
        if (idx !== -1) {
          localRooms[idx] = { ...localRooms[idx], ...payload };
          localStorage.setItem("aml_chat_rooms", JSON.stringify(localRooms));
          return { data: localRooms[idx] };
        }
        throw e;
      }
    }

    throw new Error(`Endpoint PATCH [${url}] no implementado`);
  },

  delete: async (url, config = {}) => {
    console.log(`[Supabase DELETE] ${url}`, config);

    // 1b. Delete Client
    if (url.startsWith("/clients/")) {
      const id = url.split("/")[2];
      
      const stored = localStorage.getItem("aml_user");
      const user = stored ? JSON.parse(stored) : null;
      const isAdmin = user && user.role === "admin";
      
      if (isAdmin) {
        const { error } = await supabase.from("clientes").delete().eq("id", id);
        if (error) throw error;
        return { data: { ok: true } };
      } else {
        // Fetch current client to append a deletion comment to notes
        const { data: currentClient, error: fetchError } = await supabase.from("clientes").select("*").eq("id", id).single();
        if (fetchError) throw fetchError;
        
        const currentMeta = extractClientMetadata(currentClient);
        const storedUser = user || { name: "Usuario", role: "comercial" };
        
        // Audit log comment
        const deletionComment = {
          id: `comment-${Date.now()}`,
          timestamp: new Date().toISOString(),
          user_name: "CRM Auditoría",
          text: `[ELIMINACIÓN] EL CLIENTE FUE ELIMINADO DEL CRM POR ${storedUser.name.toUpperCase()} (${storedUser.role.toUpperCase()})`
        };
        
        const comentarios = [...(currentMeta.comentarios || []), deletionComment];
        
        // Update comments and status in database format
        const hasDirectColumns = currentClient.tipo_titular !== undefined;
        const commentsDelimiter = "\n\n--- AMQL_CLIENT_COMMENTS ---\n";
        const metaDelimiter = "\n\n--- AMQL_INTEGRATION_METADATA ---\n";
        const serializedNotas = `${commentsDelimiter}${JSON.stringify(comentarios)}`;
        
        const dbPayload = {
          estado: "eliminado",
          ultimo_contacto: new Date().toISOString()
        };
        
        if (hasDirectColumns) {
          dbPayload.notas = serializedNotas;
        } else {
          // Merge current metadata properties
          const mergedMeta = {
            ...currentMeta,
            estado: "eliminado",
            comentarios: comentarios
          };
          dbPayload.notas = `${serializedNotas}${metaDelimiter}${JSON.stringify(mergedMeta)}`;
        }
        
        const { error: updateError } = await supabase.from("clientes").update(dbPayload).eq("id", id);
        if (updateError) throw updateError;
        
        return { data: { ok: true } };
      }
    }

    // 1. Delete Contract
    if (url.startsWith("/contracts/")) {
      const id = url.split("/")[2];
      const { error } = await supabase.from("contratos").delete().eq("id", id);
      if (error) throw error;
      return { data: { ok: true } };
    }

    // 2. Delete Document
    if (url.startsWith("/documents/")) {
      const id = url.split("/")[2];
      const { error } = await supabase.from("documentos").delete().eq("id", id);
      if (error) throw error;
      return { data: { ok: true } };
    }

    // 3. Delete User
    if (url.startsWith("/users/")) {
      const id = url.split("/")[2];
      const { error } = await supabase.from("usuarios").delete().eq("id", id);
      if (error) throw error;
      return { data: { ok: true } };
    }

    // 4. Delete Chat Room
    if (url.startsWith("/chats/rooms/")) {
      const id = url.split("/")[2];
      try {
        const { error } = await supabase.from("chat_rooms").delete().eq("id", id);
        if (error) throw error;
        return { data: { ok: true } };
      } catch (e) {
        const localRooms = JSON.parse(localStorage.getItem("aml_chat_rooms") || "[]");
        const filtered = localRooms.filter(r => r.id !== id);
        localStorage.setItem("aml_chat_rooms", JSON.stringify(filtered));
        localStorage.removeItem(`aml_chat_msgs_${id}`);
        return { data: { ok: true } };
      }
    }

    throw new Error(`Endpoint DELETE [${url}] no implementado`);
  }
};

export async function getClients() {
  const response = await api.get("/clients");
  return response.data;
}


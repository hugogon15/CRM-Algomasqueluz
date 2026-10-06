-- Cloudflare D1 SQL Schema for AlgoMásQueLuz CRM

CREATE TABLE IF NOT EXISTS usuarios (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'comercial',
    phone TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    permissions TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clientes (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    telefono TEXT DEFAULT '',
    email TEXT DEFAULT '',
    cups TEXT DEFAULT '',
    provincia TEXT DEFAULT '',
    direccion TEXT DEFAULT '',
    nif TEXT DEFAULT '',
    cif TEXT DEFAULT '',
    estado TEXT DEFAULT 'nuevo_lead',
    comercial_id TEXT,
    tiene_ahorro INTEGER DEFAULT 0,
    ahorro_estimado REAL DEFAULT 0.0,
    notas TEXT DEFAULT '',
    tarifa TEXT DEFAULT '2.0TD',
    tipo_titular TEXT DEFAULT 'fisica',
    colaborador TEXT DEFAULT '',
    iban TEXT DEFAULT '',
    tipo_servicio TEXT DEFAULT 'luz',
    fecha_fin_contrato TEXT DEFAULT '',
    fecha_alerta_personalizada TEXT DEFAULT '',
    motivo_alerta_personalizada TEXT DEFAULT '',
    comentarios TEXT DEFAULT '[]',
    direcciones_suministro TEXT DEFAULT '[]',
    direccion_fiscal TEXT DEFAULT '{}',
    historial_cambios TEXT DEFAULT '[]',
    sync_status TEXT DEFAULT 'pendiente',
    sync_logs TEXT DEFAULT '[]',
    rgpd_aceptado INTEGER DEFAULT 0,
    rgpd_fecha TEXT DEFAULT NULL,
    rgpd_ip TEXT DEFAULT '',
    rgpd_user_agent TEXT DEFAULT '',
    rgpd_version TEXT DEFAULT '',
    ultimo_contacto TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (comercial_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS contratos (
    id TEXT PRIMARY KEY,
    cliente_id TEXT NOT NULL,
    comercializadora TEXT NOT NULL,
    tarifa TEXT DEFAULT '',
    potencia_contratada REAL DEFAULT 0.0,
    fecha_inicio TEXT NOT NULL,
    fecha_renovacion TEXT NOT NULL,
    permanencia_meses INTEGER DEFAULT 12,
    importe_anual REAL DEFAULT 0.0,
    notas TEXT DEFAULT '',
    tipo_servicio TEXT DEFAULT 'luz',
    comision REAL DEFAULT 0.0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS documentos (
    id TEXT PRIMARY KEY,
    cliente_id TEXT,
    contrato_id TEXT,
    nombre TEXT NOT NULL,
    tipo TEXT DEFAULT 'factura',
    mime_type TEXT DEFAULT '',
    size INTEGER DEFAULT 0,
    file_path TEXT DEFAULT '',
    extracted_data TEXT DEFAULT '{}',
    ocr_status TEXT DEFAULT 'pending',
    uploaded_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
    FOREIGN KEY (contrato_id) REFERENCES contratos(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notificaciones (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'channel',
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    sender_id TEXT DEFAULT '',
    sender_name TEXT NOT NULL,
    text TEXT DEFAULT '',
    attachment_url TEXT DEFAULT '',
    attachment_name TEXT DEFAULT '',
    attachment_type TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE
);

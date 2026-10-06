-- Schema for AlgoMásQueLuz CRM (Supabase / PostgreSQL)

-- 1. USUARIOS
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'comercial', 'gestor', 'backoffice')),
    phone TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on usuarios
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- Simple policies for usuarios (allow authenticated read)
CREATE POLICY "Permitir lectura a usuarios autenticados" 
    ON public.usuarios FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Permitir actualización de perfil propio" 
    ON public.usuarios FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = id);

-- 2. CLIENTES
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    telefono TEXT DEFAULT '',
    email TEXT DEFAULT '',
    cups TEXT DEFAULT '',
    provincia TEXT DEFAULT '',
    direccion TEXT DEFAULT '',
    nif TEXT DEFAULT '',
    estado TEXT NOT NULL CHECK (estado IN ('nuevo_lead', 'pendiente_estudio', 'sin_ahorro', 'enviado', 'enviado_firma', 'pendiente_activacion', 'cliente_activo', 'baja', 'renovacion')) DEFAULT 'nuevo_lead',
    comercial_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    tiene_ahorro BOOLEAN DEFAULT FALSE,
    ahorro_estimado NUMERIC(12, 2) DEFAULT 0.0,
    notas TEXT DEFAULT '',
    ultimo_contacto TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on clientes
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- RLS policies for clientes
CREATE POLICY "Usuarios pueden ver clientes según su rol"
    ON public.clientes FOR SELECT
    TO authenticated
    USING (
        -- Admin, Gestor y Backoffice ven todo
        EXISTS (
            SELECT 1 FROM public.usuarios 
            WHERE usuarios.id = auth.uid() 
            AND usuarios.role IN ('admin', 'gestor', 'backoffice')
        )
        -- Comerciales ven solo los suyos
        OR comercial_id = auth.uid()
    );

CREATE POLICY "Permitir inserción de clientes a autenticados"
    ON public.clientes FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Permitir modificación de clientes a autenticados"
    ON public.clientes FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Permitir borrado de clientes a Admin o Gestor"
    ON public.clientes FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.usuarios 
            WHERE usuarios.id = auth.uid() 
            AND usuarios.role IN ('admin', 'gestor')
        )
    );

-- 3. CONTRATOS
CREATE TABLE IF NOT EXISTS public.contratos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    comercializadora TEXT NOT NULL,
    tarifa TEXT DEFAULT '',
    potencia_contratada NUMERIC(10, 2) DEFAULT 0.0,
    fecha_inicio DATE NOT NULL,
    fecha_renovacion DATE NOT NULL,
    permanencia_meses INTEGER DEFAULT 12,
    importe_anual NUMERIC(12, 2) DEFAULT 0.0,
    notas TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on contratos
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

-- RLS policies for contratos
CREATE POLICY "Permitir lectura de contratos según acceso a clientes"
    ON public.contratos FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.clientes
            WHERE clientes.id = contratos.cliente_id
        )
    );

CREATE POLICY "Permitir inserción de contratos a autenticados"
    ON public.contratos FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Permitir modificación de contratos a autenticados"
    ON public.contratos FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Permitir borrado de contratos a autenticados"
    ON public.contratos FOR DELETE
    TO authenticated
    USING (true);

-- 4. DOCUMENTOS
CREATE TABLE IF NOT EXISTS public.documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    tipo TEXT DEFAULT 'factura',
    mime_type TEXT DEFAULT '',
    size INTEGER DEFAULT 0,
    file_path TEXT DEFAULT '',
    extracted_data JSONB DEFAULT '{}',
    ocr_status TEXT DEFAULT 'pending' CHECK (ocr_status IN ('pending', 'processing', 'completed', 'failed', 'partial', 'skipped')),
    uploaded_by UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on documentos
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura de documentos según acceso a clientes"
    ON public.documentos FOR SELECT
    TO authenticated
    USING (
        cliente_id IS NULL OR EXISTS (
            SELECT 1 FROM public.clientes
            WHERE clientes.id = documentos.cliente_id
        )
    );

CREATE POLICY "Permitir inserción de documentos a autenticados"
    ON public.documentos FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Permitir borrado de documentos a autenticados"
    ON public.documentos FOR DELETE
    TO authenticated
    USING (true);

-- 5. NOTIFICACIONES
CREATE TABLE IF NOT EXISTS public.notificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on notificaciones
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura de notificaciones propias"
    ON public.notificaciones FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Permitir actualización de notificaciones propias"
    ON public.notificaciones FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

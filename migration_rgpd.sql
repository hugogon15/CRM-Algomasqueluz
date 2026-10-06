-- Migration to add GDPR columns to public.clientes
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS rgpd_aceptado BOOLEAN DEFAULT FALSE;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS rgpd_fecha TIMESTAMPTZ;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS rgpd_ip TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS rgpd_user_agent TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS rgpd_version TEXT;

-- Update clientes state check constraint to allow all commercial funnel states
ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_estado_check;
ALTER TABLE public.clientes ADD CONSTRAINT clientes_estado_check 
    CHECK (estado IN ('nuevo_lead', 'rgpd_aceptado', 'pendiente_estudio', 'sin_ahorro', 'incompleto', 'enviado_firma', 'incidencia', 'pendiente_activacion', 'cliente_activo', 'renovacion', 'no_renovado', 'baja', 'eliminado'));

-- Enable RLS on clientes and documentos
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

-- Drop conflicting policies if any
DROP POLICY IF EXISTS "Permitir inserción de clientes a autenticados" ON public.clientes;
DROP POLICY IF EXISTS "Permitir modificación de clientes a autenticados" ON public.clientes;
DROP POLICY IF EXISTS "Permitir inserción de documentos a autenticados" ON public.documentos;

-- Re-create policies allowing both anonymous and authenticated roles
CREATE POLICY "Permitir inserción de clientes a anonimos y autenticados"
    ON public.clientes FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Permitir modificación de clientes a anonimos y autenticados"
    ON public.clientes FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Permitir inserción de documentos a anonimos y autenticados"
    ON public.documentos FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Re-create SELECT policies allowing both anonymous and authenticated roles (required because the frontend queries Supabase directly via the anon key)
DROP POLICY IF EXISTS "Permitir lectura de clientes a anonimos y autenticados" ON public.clientes;
CREATE POLICY "Permitir lectura de clientes a anonimos y autenticados"
    ON public.clientes FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Permitir lectura de contratos a anonimos y autenticados" ON public.contratos;
CREATE POLICY "Permitir lectura de contratos a anonimos y autenticados"
    ON public.contratos FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Permitir lectura de documentos a anonimos y autenticados" ON public.documentos;
CREATE POLICY "Permitir lectura de documentos a anonimos y autenticados"
    ON public.documentos FOR SELECT
    TO anon, authenticated
    USING (true);


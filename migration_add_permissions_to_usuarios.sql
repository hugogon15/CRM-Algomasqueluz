-- Migration to add permissions column to usuarios table
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]';

-- Update existing users to have default permissions based on their role
-- Non-admin users get all tools except /usuarios (Equipo)
UPDATE public.usuarios 
SET permissions = '["/dashboard", "/clientes", "/pipeline", "/mapa", "/contratos", "/renovaciones", "/documentos", "/documentacion", "/mensajes"]'::jsonb 
WHERE role != 'admin';

-- Admin users get all tools including /usuarios (Equipo)
UPDATE public.usuarios 
SET permissions = '["/dashboard", "/clientes", "/pipeline", "/mapa", "/contratos", "/renovaciones", "/documentos", "/documentacion", "/mensajes", "/usuarios"]'::jsonb 
WHERE role = 'admin';

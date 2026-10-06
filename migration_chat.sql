-- Migration script to add Chat / Internal Messaging tables to AlgoMásQueLuz CRM (Supabase)

-- 1. SALAS DE CHAT (CANALES Y CHATS DIRECTOS CON DATOS DE CONTACTO)
CREATE TABLE IF NOT EXISTS public.chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('channel', 'direct')),
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para chat_rooms (modificadas para permitir acceso a público/anon)
DROP POLICY IF EXISTS "Permitir lectura de salas a usuarios autenticados" ON public.chat_rooms;
DROP POLICY IF EXISTS "Permitir inserción de salas a usuarios autenticados" ON public.chat_rooms;
DROP POLICY IF EXISTS "Permitir lectura de salas a todos" ON public.chat_rooms;
DROP POLICY IF EXISTS "Permitir inserción de salas a todos" ON public.chat_rooms;

CREATE POLICY "Permitir lectura de salas a todos"
    ON public.chat_rooms FOR SELECT
    USING (true);

CREATE POLICY "Permitir inserción de salas a todos"
    ON public.chat_rooms FOR INSERT
    WITH CHECK (true);


-- 2. MENSAJES DE CHAT (SOPORTE PARA TEXTO Y ARCHIVOS ADJUNTOS DE CUALQUIER FORMATO)
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    sender_name TEXT NOT NULL,
    text TEXT DEFAULT '',
    attachment_url TEXT DEFAULT '',
    attachment_name TEXT DEFAULT '',
    attachment_type TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para chat_messages (modificadas para permitir acceso a público/anon)
DROP POLICY IF EXISTS "Permitir lectura de mensajes a usuarios autenticados" ON public.chat_messages;
DROP POLICY IF EXISTS "Permitir inserción de mensajes a usuarios autenticados" ON public.chat_messages;
DROP POLICY IF EXISTS "Permitir lectura de mensajes a todos" ON public.chat_messages;
DROP POLICY IF EXISTS "Permitir inserción de mensajes a todos" ON public.chat_messages;

CREATE POLICY "Permitir lectura de mensajes a todos"
    ON public.chat_messages FOR SELECT
    USING (true);

CREATE POLICY "Permitir inserción de mensajes a todos"
    ON public.chat_messages FOR INSERT
    WITH CHECK (true);

-- 3. HABILITAR TIEMPO REAL (SUPABASE REALTIME) PARA CHATS Y MENSAJES
-- Nota: Si ya están añadidas, esto podría dar aviso. Puedes agregarlas manualmente si no se han agregado.
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;


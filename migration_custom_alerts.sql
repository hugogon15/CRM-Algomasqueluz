-- Migration to add custom alert fields to public.clientes
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS fecha_alerta_personalizada DATE;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS motivo_alerta_personalizada TEXT;

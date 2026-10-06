-- Migration to add structured address columns to clientes table
-- Run this in the Supabase SQL Editor

-- 1. Add direccion_fiscal column to store structured fiscal address data
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS direccion_fiscal JSONB DEFAULT '{}';

-- 2. Add direcciones_suministro column to store structured supply address points with CUPS
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS direcciones_suministro JSONB DEFAULT '[]';

-- Comment describing the structure
COMMENT ON COLUMN public.clientes.direccion_fiscal IS 'Structured fiscal address containing fields: tipo_via, nombre_via, numero, duplicador, escalera, planta, puerta, tipo_aclarador, aclarador, codigo_postal, ciudad, provincia, pais';
COMMENT ON COLUMN public.clientes.direcciones_suministro IS 'Array of structured supply address objects with CUPS list and enable/disable state';

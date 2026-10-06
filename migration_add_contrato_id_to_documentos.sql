-- Migration to add contrato_id relation to documentos table

-- 1. Add column 'contrato_id' to public.documentos referencing public.contratos
ALTER TABLE public.documentos 
ADD COLUMN IF NOT EXISTS contrato_id UUID REFERENCES public.contratos(id) ON DELETE CASCADE;

-- 2. Create index on contrato_id for faster lookups
CREATE INDEX IF NOT EXISTS documentos_contrato_id_idx ON public.documentos(contrato_id);

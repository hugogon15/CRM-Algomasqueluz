-- Migration to add fecha_fin_contrato to public.clientes for Future Captures (Futuras Captaciones)
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS fecha_fin_contrato DATE;

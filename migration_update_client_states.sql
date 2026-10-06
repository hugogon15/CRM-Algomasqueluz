-- Migration to update public.clientes.estado check constraint to support all 11 states

-- 1. Drop the current CHECK constraint on clientes.estado
ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_estado_check;

-- 2. Add the updated CHECK constraint
ALTER TABLE public.clientes ADD CONSTRAINT clientes_estado_check 
    CHECK (estado IN (
        'nuevo_lead',
        'pendiente_estudio',
        'sin_ahorro',
        'incompleto',
        'enviado_firma',
        'incidencia',
        'pendiente_activacion',
        'cliente_activo',
        'renovacion',
        'no_renovado',
        'baja'
    ));

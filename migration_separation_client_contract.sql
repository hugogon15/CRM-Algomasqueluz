-- Migration script to separate client and contract states (CORRECTED)

-- 1. Add column 'estado' to public.contratos
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'pendiente_estudio';

-- 2. Copy current client state to the new contract state for existing contracts with proper mapping
-- (nuevo_lead is mapped to pendiente_estudio as it's not a contract state)
UPDATE public.contratos
SET estado = CASE 
    WHEN c.estado = 'nuevo_lead' THEN 'pendiente_estudio'
    ELSE c.estado 
END
FROM public.clientes c
WHERE contratos.cliente_id = c.id;

-- 3. Add CHECK constraint on contratos.estado
ALTER TABLE public.contratos DROP CONSTRAINT IF EXISTS contratos_estado_check;
ALTER TABLE public.contratos ADD CONSTRAINT contratos_estado_check 
    CHECK (estado IN ('pendiente_estudio', 'sin_ahorro', 'enviado', 'enviado_firma', 'pendiente_activacion', 'cliente_activo', 'baja', 'renovacion', 'no_renovado'));

-- 4. Clean up clientes.estado check constraint
DO $$
DECLARE
    constraint_name_var text;
BEGIN
    SELECT tc.constraint_name INTO constraint_name_var
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'clientes' AND ccu.column_name = 'estado' AND tc.constraint_type = 'CHECK'
    LIMIT 1;

    IF constraint_name_var IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.clientes DROP CONSTRAINT ' || constraint_name_var;
    END IF;
END $$;

-- 5. Migrate client states to the simplified states ('nuevo_lead', 'cliente_activo', 'baja')
-- If the client is 'cliente_activo' or 'baja', they stay that way.
-- If they are in any other state, they become 'nuevo_lead' (their contracts now hold the sales funnel stages).
UPDATE public.clientes 
SET estado = 'nuevo_lead' 
WHERE estado NOT IN ('cliente_activo', 'baja');

-- 6. Add new CHECK constraint on clientes.estado
ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_estado_check;
ALTER TABLE public.clientes ADD CONSTRAINT clientes_estado_check 
    CHECK (estado IN ('nuevo_lead', 'cliente_activo', 'baja'));

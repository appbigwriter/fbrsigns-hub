-- 1. Adiciona as colunas 'has_sizes' e 'has_colors' à tabela 'categories' caso não existam
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS has_sizes BOOLEAN DEFAULT FALSE;

ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS has_colors BOOLEAN DEFAULT FALSE;

-- 2. Força o recarregamento do cache do schema do Supabase (PostgREST)
-- Isso é crucial para que a API reconheça as novas colunas imediatamente
NOTIFY pgrst, 'reload schema';

-- 3. Confirmação (Retorna as colunas criadas para você verificar)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'categories' 
AND column_name IN ('has_sizes', 'has_colors');

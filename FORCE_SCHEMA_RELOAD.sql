-- Força o recarregamento do cache do schema através de um comentário na tabela
-- Isso é uma técnica alternativa para forçar o PostgREST a atualizar sua definição
COMMENT ON TABLE public.categories IS 'Categories for products - Schema Reloaded';

-- Garante novamente que as colunas existem
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS has_sizes BOOLEAN DEFAULT FALSE;

ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS has_colors BOOLEAN DEFAULT FALSE;

-- Notifica novamente
NOTIFY pgrst, 'reload schema';

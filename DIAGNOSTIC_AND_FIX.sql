-- ==============================================================================
-- CHECKLIST COMPLETO DE DIAGNÓSTICO E CORREÇÃO (DIAGNOSTIC_AND_FIX.sql)
-- ==============================================================================

-- 1. VERIFICAÇÃO E CRIAÇÃO DAS COLUNAS
-- Verifica se as colunas realmente existem no schema 'public'. Se não, cria.
DO $$
DECLARE
    v_count integer;
BEGIN
    SELECT count(*) INTO v_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'categories'
    AND column_name IN ('has_sizes', 'has_colors');

    IF v_count < 2 THEN
        RAISE NOTICE '>>> DIAGNÓSTICO: Colunas faltando. Criando agora...';
        
        ALTER TABLE public.categories 
        ADD COLUMN IF NOT EXISTS has_sizes BOOLEAN DEFAULT FALSE;
        
        ALTER TABLE public.categories 
        ADD COLUMN IF NOT EXISTS has_colors BOOLEAN DEFAULT FALSE;
    ELSE
        RAISE NOTICE '>>> DIAGNÓSTICO: Colunas JÁ EXISTEM no banco de dados.';
    END IF;
END $$;

-- 2. VERIFICAÇÃO DE PERMISSÕES (GRANTS)
-- As vezes a coluna existe mas o usuário 'authenticated' não tem permissão para vê-la.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO service_role;

-- 3. FORÇAR RECARREGAMENTO DO CACHE (MÉTODO AGRESSIVO)
-- O erro PGRST204 é especificamente sobre o cache do PostgREST.
-- Vamos usar múltiplas técnicas para obrigar o Supabase a atualizar.

-- Técnica A: Alterar um comentário na tabela (Isso invalida o cache de metadados)
COMMENT ON TABLE public.categories IS 'Categories table - Cache Reloaded';

-- Técnica B: Toggle RLS (Desativar e Ativar RLS força refresh interno)
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Técnica C: O comando padrão de reload
NOTIFY pgrst, 'reload schema';

-- 4. VALIDAÇÃO FINAL (RESULTADO)
-- Execute isso e veja se 'has_sizes' e 'has_colors' aparecem na saída abaixo.
SELECT 
    table_schema, 
    table_name, 
    column_name, 
    data_type, 
    ordinal_position
FROM 
    information_schema.columns 
WHERE 
    table_name = 'categories' 
    AND column_name IN ('has_sizes', 'has_colors');

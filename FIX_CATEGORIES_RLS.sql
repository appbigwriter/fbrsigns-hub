-- ==============================================================================
-- CORREÇÃO DEFINITIVA DE PERMISSÕES (RLS) PARA CATEGORIAS
-- ==============================================================================

-- 1. Garante que RLS está ativo (para segurança)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- 2. Limpa políticas antigas (se existirem, para evitar duplicidade/conflitos)
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Public can view subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Admins can manage subcategories" ON public.subcategories;

-- 3. Cria políticas para CATEGORIES
-- Permitir leitura pública (para que a loja funcione)
CREATE POLICY "Public can view categories"
ON public.categories
FOR SELECT
USING (true);

-- Permitir que usuários autenticados (Admins) gerenciem categorias (Insert/Update/Delete)
-- Nota: Usando 'authenticated' para simplificar e desbloquear. 
-- Se quiser restringir estritamente a admins, mude para USING (public.is_admin())
CREATE POLICY "Admins can manage categories"
ON public.categories
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Cria políticas para SUBCATEGORIES
-- Permitir leitura pública
CREATE POLICY "Public can view subcategories"
ON public.subcategories
FOR SELECT
USING (true);

-- Permitir gestão por autenticados
CREATE POLICY "Admins can manage subcategories"
ON public.subcategories
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. Confirmação
SELECT tablename, policyname, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('categories', 'subcategories');

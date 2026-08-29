-- ==============================================================================
-- LIMPEZA DE POLÍTICAS DUPLICADAS EM CATEGORIES E SUBCATEGORIES
-- ==============================================================================

-- 1. Remover TODAS as políticas existentes para garantir um estado limpo
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can view all categories" ON public.categories;
DROP POLICY IF EXISTS "Only authenticated users can modify categories" ON public.categories;
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
DROP POLICY IF EXISTS "categories_delete_policy" ON public.categories;
DROP POLICY IF EXISTS "categories_insert_policy" ON public.categories;
DROP POLICY IF EXISTS "categories_public_select" ON public.categories;
DROP POLICY IF EXISTS "categories_select_policy" ON public.categories;
DROP POLICY IF EXISTS "categories_update_policy" ON public.categories;

DROP POLICY IF EXISTS "Admins can manage subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Anyone can view subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Authenticated users can view all subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Only authenticated users can modify subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Public can view subcategories" ON public.subcategories;

-- 2. Recriar APENAS as políticas necessárias e corretas
-- CATEGORIES
CREATE POLICY "Public can view categories"
ON public.categories FOR SELECT
USING (true);

CREATE POLICY "Admins can manage categories"
ON public.categories FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- SUBCATEGORIES
CREATE POLICY "Public can view subcategories"
ON public.subcategories FOR SELECT
USING (true);

CREATE POLICY "Admins can manage subcategories"
ON public.subcategories FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 3. Confirmação Final (Deve mostrar apenas 2 políticas por tabela)
SELECT tablename, policyname
FROM pg_policies 
WHERE tablename IN ('categories', 'subcategories')
ORDER BY tablename, policyname;

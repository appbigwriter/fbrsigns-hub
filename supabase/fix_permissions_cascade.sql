-- 1. Drop the old function with CASCADE to automatically remove all dependent policies
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- 2. Recreate the correct is_admin() function (no arguments)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.admins
    WHERE user_id = auth.uid()
    AND (active IS NULL OR active = true)
  );
END;
$$;

-- 3. Grant permissions immediately
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon, service_role;

-- 4. Recreate all the policies that were dropped by CASCADE
-- We need to recreate them using the NEW function signature is_admin() instead of is_admin(auth.uid())

-- Policies for 'admins' table
CREATE POLICY "admins_select_admin_only" ON public.admins FOR SELECT USING (is_admin());
CREATE POLICY "admins_insert_admin_only" ON public.admins FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "admins_update_admin_only" ON public.admins FOR UPDATE USING (is_admin());
CREATE POLICY "admins_delete_admin_only" ON public.admins FOR DELETE USING (is_admin());

-- Policies for 'suppliers'
CREATE POLICY "Admins can manage suppliers" ON public.suppliers FOR ALL USING (is_admin());

-- Policies for 'raw_materials'
CREATE POLICY "Admins can manage raw materials" ON public.raw_materials FOR ALL USING (is_admin());

-- Policies for 'raw_material_transactions'
CREATE POLICY "Admins can manage raw material transactions" ON public.raw_material_transactions FOR ALL USING (is_admin());

-- Policies for 'expenses'
CREATE POLICY "Admins can manage expenses" ON public.expenses FOR ALL USING (is_admin());

-- Policies for 'quickbooks_settings'
CREATE POLICY "Admins can manage quickbooks settings" ON public.quickbooks_settings FOR ALL USING (is_admin());

-- Policies for 'settings'
CREATE POLICY "Admins can manage settings" ON public.settings FOR ALL USING (is_admin());
-- Re-add public read policy for settings since it might not have been dropped but good to ensure
DROP POLICY IF EXISTS "Public settings viewable by everyone" ON public.settings;
CREATE POLICY "Public settings viewable by everyone" ON public.settings FOR SELECT USING (is_public = true);

-- Policies for 'integrations'
CREATE POLICY "Admins can manage integrations" ON public.integrations FOR ALL USING (is_admin());

-- Policies for 'notifications'
CREATE POLICY "Admins can manage all notifications" ON public.notifications FOR ALL USING (is_admin());

-- Recreate complex notification policy
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (
  target_user_id = auth.uid() OR 
  (target_role IS NULL) OR 
  (target_role = 'customer' AND EXISTS(SELECT 1 FROM customers WHERE user_id = auth.uid())) OR
  (target_role = 'admin' AND is_admin())
);

-- Recreate RPC for Stripe (if it was dropped or just to be safe)
CREATE OR REPLACE FUNCTION public.get_stripe_publishable_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  key_val TEXT;
BEGIN
  SELECT config->>'publishable_key' INTO key_val
  FROM public.integrations
  WHERE provider = 'stripe' AND is_active = true
  LIMIT 1;
  
  RETURN key_val;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_stripe_publishable_key() TO authenticated, anon, service_role;

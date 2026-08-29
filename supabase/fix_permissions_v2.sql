-- Drop all potential variations of is_admin to resolve ambiguity
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_admin(uuid);

-- Recreate the correct version (no arguments, uses auth.uid())
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

-- Recreate the RPC for Stripe Key
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_stripe_publishable_key() TO authenticated, anon, service_role;

-- Re-apply RLS policy using the new function
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage integrations" ON public.integrations;

CREATE POLICY "Admins can manage integrations"
ON public.integrations
FOR ALL
USING (public.is_admin());

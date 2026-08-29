-- 1. Ensure is_admin function exists and is secure
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS to check admins table
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.admins
    WHERE user_id = auth.uid()
    AND (active IS NULL OR active = true) -- Handle null active as true or check your schema
  );
END;
$$;

-- 2. Create RPC to get public key safely (accessible by anyone)
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

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_stripe_publishable_key() TO authenticated, anon, service_role;

-- 4. Fix Integrations RLS
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage integrations" ON public.integrations;

CREATE POLICY "Admins can manage integrations"
ON public.integrations
FOR ALL
USING (is_admin());

-- 5. Optional: Allow authenticated users to READ integrations (if you prefer not to use RPC)
-- But RPC is safer.

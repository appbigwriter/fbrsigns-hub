
-- Drop the policy if it exists (to avoid "already exists" error)
DROP POLICY IF EXISTS "Allow authenticated users to create orders" ON public.orders;
DROP POLICY IF EXISTS "Controlled order creation" ON public.orders;

-- Create the permissive policy
CREATE POLICY "Allow authenticated users to create orders"
ON public.orders
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
);

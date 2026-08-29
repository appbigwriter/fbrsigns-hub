-- Fix Security Definer functions where SECURITY DEFINER is not needed
-- 
-- Analysis of current SECURITY DEFINER functions:
-- 1. Trigger functions (update_updated_at_column, update_invoice_totals, etc.) - NEED SECURITY DEFINER
-- 2. is_admin function - NEEDS SECURITY DEFINER (used in RLS policies to avoid recursion)
-- 3. generate_approval_token - DOESN'T NEED SECURITY DEFINER (just generates UUID)
-- 4. log_user_activity - NEEDS SECURITY DEFINER (logs activity regardless of user permissions)
-- 5. generate_invoice_number - NEEDS SECURITY DEFINER (accesses invoice data)

-- Only modify generate_approval_token as it doesn't need elevated privileges
CREATE OR REPLACE FUNCTION public.generate_approval_token()
RETURNS text
LANGUAGE sql
SECURITY INVOKER  -- Changed from SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT replace(gen_random_uuid()::text, '-', '');
$$;

-- Add comments to document why other functions need SECURITY DEFINER
COMMENT ON FUNCTION public.is_admin(uuid) IS 'SECURITY DEFINER required: Used in RLS policies to prevent infinite recursion when checking admin status';
COMMENT ON FUNCTION public.update_updated_at_column() IS 'SECURITY DEFINER required: Trigger function needs elevated privileges to update timestamps';
COMMENT ON FUNCTION public.update_invoice_totals() IS 'SECURITY DEFINER required: Trigger function needs elevated privileges to calculate totals';
COMMENT ON FUNCTION public.update_invoice_payment_status() IS 'SECURITY DEFINER required: Trigger function needs elevated privileges to update payment status';
COMMENT ON FUNCTION public.handle_new_user() IS 'SECURITY DEFINER required: Trigger function needs elevated privileges to create user profiles';
COMMENT ON FUNCTION public.update_last_login() IS 'SECURITY DEFINER required: Trigger function needs elevated privileges to update login timestamps';
COMMENT ON FUNCTION public.log_user_activity(uuid, text, text, uuid, jsonb) IS 'SECURITY DEFINER required: Needs elevated privileges to log activity regardless of user permissions';
COMMENT ON FUNCTION public.generate_invoice_number() IS 'SECURITY DEFINER required: Needs access to invoice data to generate unique sequential numbers';
COMMENT ON FUNCTION public.auto_generate_invoice() IS 'SECURITY DEFINER required: Trigger function needs elevated privileges to generate invoice numbers';
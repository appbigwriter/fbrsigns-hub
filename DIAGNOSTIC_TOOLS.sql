-- 1. Create or Replace the helper function for Stripe Publishable Key
-- This ensures customers (and admins) can retrieve the key securely
CREATE OR REPLACE FUNCTION public.get_stripe_publishable_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pub_key text;
BEGIN
  SELECT config->>'publishable_key' INTO pub_key
  FROM public.integrations
  WHERE provider = 'stripe' AND is_active = true
  LIMIT 1;
  
  RETURN pub_key;
END;
$$;

-- 2. Check Stripe Configuration (Run this and check the output)
SELECT 
    id, 
    provider, 
    is_active, 
    CASE 
        WHEN api_key LIKE 'sk_%' THEN 'Secret Key Valid Format (Starts with sk_)' 
        WHEN api_key IS NULL THEN 'Secret Key MISSING'
        ELSE 'Secret Key INVALID Format' 
    END as secret_key_status,
    CASE 
        WHEN config->>'publishable_key' LIKE 'pk_%' THEN 'Public Key Valid Format (Starts with pk_)' 
        WHEN config->>'publishable_key' IS NULL THEN 'Public Key MISSING'
        ELSE 'Public Key INVALID Format' 
    END as public_key_status
FROM integrations 
WHERE provider = 'stripe';

-- 3. Fix Invoice Number Generation (to prevent collisions)
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_number text;
  year_month text;
  sequence_part int;
BEGIN
  year_month := to_char(now(), 'YYYYMM');
  
  SELECT 
    COALESCE(MAX(SUBSTRING(invoice_number FROM 12)::int), 0) + 1
  INTO sequence_part
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || year_month || '-%';
  
  new_number := 'INV-' || year_month || '-' || LPAD(sequence_part::text, 4, '0');
  
  RETURN new_number;
END;
$$;

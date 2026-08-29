-- Fix function search path mutable issues
-- Functions should have a set search_path to ensure security and predictability

-- 1. update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 2. update_raw_material_stock
CREATE OR REPLACE FUNCTION public.update_raw_material_stock()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.raw_materials 
    SET current_stock = current_stock + 
      CASE 
        WHEN NEW.transaction_type = 'in' THEN NEW.quantity
        WHEN NEW.transaction_type = 'out' THEN -NEW.quantity
        WHEN NEW.transaction_type = 'adjustment' THEN NEW.quantity - current_stock
        ELSE 0
      END
    WHERE id = NEW.raw_material_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- 3. auto_generate_invoice
CREATE OR REPLACE FUNCTION public.auto_generate_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    IF NEW.status = 'Confirmado' AND (OLD.invoice_number IS NULL OR OLD.invoice_number = '') THEN
        NEW.invoice_number := generate_invoice_number();
        NEW.invoice_generated_at := NOW();
    END IF;
    
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

-- 4. generate_invoice_number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    current_year TEXT;
    current_month TEXT;
    sequence_num INTEGER;
    invoice_num TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM NOW())::TEXT;
    current_month := LPAD(EXTRACT(MONTH FROM NOW())::TEXT, 2, '0');
    
    SELECT COALESCE(MAX(
        CASE 
            WHEN invoice_number ~ ('^INV-' || current_year || current_month || '-[0-9]+$')
            THEN SUBSTRING(invoice_number FROM LENGTH('INV-' || current_year || current_month || '-') + 1)::INTEGER
            ELSE 0
        END
    ), 0) + 1
    INTO sequence_num
    FROM orders
    WHERE invoice_number IS NOT NULL;
    
    invoice_num := 'INV-' || current_year || current_month || '-' || LPAD(sequence_num::TEXT, 4, '0');
    
    RETURN invoice_num;
END;
$$;

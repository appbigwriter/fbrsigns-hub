-- Fix function security issues by setting proper search paths
CREATE OR REPLACE FUNCTION public.update_invoice_totals()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.invoices 
  SET 
    subtotal = (
      SELECT COALESCE(SUM(total), 0) 
      FROM public.invoice_items 
      WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
    ),
    total_amount = (
      SELECT 
        COALESCE(SUM(total), 0) + COALESCE(invoices.tax_amount, 0) - COALESCE(invoices.discount_amount, 0)
      FROM public.invoice_items 
      WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
    )
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_invoice_payment_status()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_paid NUMERIC;
  invoice_total NUMERIC;
BEGIN
  SELECT 
    COALESCE(SUM(amount), 0),
    (SELECT total_amount FROM invoices WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id))
  INTO total_paid, invoice_total
  FROM payments 
  WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  UPDATE invoices 
  SET 
    payment_status = CASE 
      WHEN total_paid = 0 THEN 'Unpaid'
      WHEN total_paid < invoice_total THEN 'Partially Paid'
      WHEN total_paid >= invoice_total THEN 'Paid'
    END,
    paid_date = CASE 
      WHEN total_paid >= invoice_total THEN CURRENT_DATE
      ELSE NULL
    END
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;
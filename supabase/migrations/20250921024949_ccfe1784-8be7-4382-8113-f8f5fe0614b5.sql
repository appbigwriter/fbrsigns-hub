-- Fix the view security issue by recreating without SECURITY DEFINER
DROP VIEW IF EXISTS public.invoices_with_payment_summary;

CREATE VIEW public.invoices_with_payment_summary AS
SELECT 
  i.*,
  COALESCE(p.total_payments, 0) as total_payments,
  COALESCE(p.payment_count, 0) as payment_count,
  (i.total_amount - COALESCE(p.total_payments, 0)) as balance_due
FROM invoices i
LEFT JOIN (
  SELECT 
    invoice_id,
    SUM(amount) as total_payments,
    COUNT(*) as payment_count
  FROM payments
  GROUP BY invoice_id
) p ON i.id = p.invoice_id;
-- Fix security definer views by adding WITH (security_invoker = on)

-- 1. user_management
DROP VIEW IF EXISTS public.user_management;
CREATE VIEW public.user_management WITH (security_invoker = on) AS
SELECT 
  p.id,
  p.user_id,
  p.full_name,
  p.avatar_url,
  p.role,
  p.department,
  p.phone,
  p.is_active,
  p.last_login,
  p.created_at,
  p.updated_at,
  u.email,
  u.email_confirmed_at,
  u.created_at as user_created_at,
  COALESCE(session_count.active_sessions, 0) as active_sessions
FROM profiles p
JOIN auth.users u ON p.user_id = u.id
LEFT JOIN (
  SELECT 
    user_id,
    COUNT(*) as active_sessions
  FROM user_sessions
  WHERE is_active = true AND expires_at > NOW()
  GROUP BY user_id
) session_count ON p.user_id = session_count.user_id;

-- 2. invoices_with_payment_summary
DROP VIEW IF EXISTS public.invoices_with_payment_summary;
CREATE VIEW public.invoices_with_payment_summary WITH (security_invoker = on) AS
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

-- 3. customer_stats
DROP VIEW IF EXISTS public.customer_stats;
CREATE VIEW public.customer_stats WITH (security_invoker = on) AS
SELECT 
  c.id,
  c.full_name,
  c.email,
  COALESCE(order_stats.total_orders, 0) as total_orders,
  COALESCE(order_stats.total_spent, 0) as total_spent,
  order_stats.last_order_date,
  COALESCE(quote_stats.total_quotes, 0) as total_quotes,
  COALESCE(invoice_stats.total_invoices, 0) as total_invoices,
  COALESCE(invoice_stats.total_invoice_amount, 0) as total_invoice_amount
FROM customers c
LEFT JOIN (
  SELECT 
    customer_id,
    COUNT(*) as total_orders,
    SUM(total) as total_spent,
    MAX(created_at) as last_order_date
  FROM orders 
  WHERE customer_id IS NOT NULL
  GROUP BY customer_id
) order_stats ON c.id = order_stats.customer_id
LEFT JOIN (
  SELECT 
    email,
    COUNT(*) as total_quotes
  FROM orcamentos
  GROUP BY email
) quote_stats ON c.email = quote_stats.email
LEFT JOIN (
  SELECT 
    customer_id,
    COUNT(*) as total_invoices,
    SUM(total_amount) as total_invoice_amount
  FROM invoices
  WHERE customer_id IS NOT NULL
  GROUP BY customer_id
) invoice_stats ON c.id = invoice_stats.customer_id;

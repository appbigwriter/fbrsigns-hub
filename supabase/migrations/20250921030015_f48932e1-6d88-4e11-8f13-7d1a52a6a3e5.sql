-- Create comprehensive customer communication and CRM tables

-- Customer notes and tags
CREATE TABLE public.customer_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Customer tags
CREATE TABLE public.customer_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Customer tag assignments
CREATE TABLE public.customer_tag_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.customer_tags(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(customer_id, tag_id)
);

-- Customer communication history
CREATE TABLE public.customer_communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email', 'whatsapp', 'phone', 'meeting', 'note')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Quote templates (create this BEFORE referencing it)
CREATE TABLE public.quote_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Now enhance quotes with templates and workflow
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.quote_templates(id);
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS converted_to_order_id UUID REFERENCES public.orders(id);
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS approval_token TEXT UNIQUE;

-- Quote items for detailed specifications
CREATE TABLE public.quote_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  specifications JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Customer statistics view
CREATE VIEW public.customer_stats AS
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
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

-- Enhanced quotes with templates and workflow
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.quote_templates(id);
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS converted_to_order_id UUID REFERENCES public.orders(id);
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS approval_token TEXT UNIQUE;

-- Quote templates
CREATE TABLE public.quote_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

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

-- Enable RLS on new tables
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer notes
CREATE POLICY "Admins can manage customer notes" ON public.customer_notes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid() AND active = true)
  );

CREATE POLICY "Customers can view their own notes" ON public.customer_notes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM customers WHERE id = customer_notes.customer_id AND user_id = auth.uid())
    AND is_internal = false
  );

-- RLS Policies for customer tags
CREATE POLICY "Admins can manage customer tags" ON public.customer_tags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid() AND active = true)
  );

CREATE POLICY "Admins can manage tag assignments" ON public.customer_tag_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid() AND active = true)
  );

-- RLS Policies for communications
CREATE POLICY "Admins can manage communications" ON public.customer_communications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid() AND active = true)
  );

CREATE POLICY "Customers can view their communications" ON public.customer_communications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM customers WHERE id = customer_communications.customer_id AND user_id = auth.uid())
  );

-- RLS Policies for quote templates
CREATE POLICY "Admins can manage quote templates" ON public.quote_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid() AND active = true)
  );

-- RLS Policies for quote items
CREATE POLICY "Admins can manage quote items" ON public.quote_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid() AND active = true)
  );

-- Add triggers for updated_at
CREATE TRIGGER update_customer_notes_updated_at
  BEFORE UPDATE ON public.customer_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quote_templates_updated_at
  BEFORE UPDATE ON public.quote_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate approval token for quotes
CREATE OR REPLACE FUNCTION public.generate_approval_token()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT encode(gen_random_bytes(32), 'base64url');
$$;
-- Complete the remaining setup for CRM system

-- Enable RLS on new tables (some may already be enabled, but this is safe)
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

-- Function to generate approval token for quotes (using UUID instead)
CREATE OR REPLACE FUNCTION public.generate_approval_token()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT replace(gen_random_uuid()::text, '-', '');
$$;
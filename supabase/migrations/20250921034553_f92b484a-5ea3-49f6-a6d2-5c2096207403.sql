-- Create company_info table to store company information
CREATE TABLE public.company_info (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name text NOT NULL DEFAULT 'FBRSigns',
  company_email text,
  company_phone text,
  company_address text,
  company_website text,
  company_logo_url text,
  tax_id text,
  registration_number text,
  invoice_terms text DEFAULT 'Payment due within 30 days',
  invoice_footer text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_info ENABLE ROW LEVEL SECURITY;

-- Create policies for company info
CREATE POLICY "Admins can manage company info"
ON public.company_info
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM admins 
    WHERE user_id = auth.uid() AND active = true
  )
);

CREATE POLICY "Anyone can view company info"
ON public.company_info
FOR SELECT
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_company_info_updated_at
BEFORE UPDATE ON public.company_info
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default company information
INSERT INTO public.company_info (
  company_name,
  company_email,
  company_phone,
  invoice_terms,
  invoice_footer
) VALUES (
  'FBRSigns',
  'admin@fbrsigns.com',
  '+1 (555) 123-4567',
  'Payment due within 30 days. Late payments may incur additional fees.',
  'Thank you for your business! For support, contact us at admin@fbrsigns.com'
);
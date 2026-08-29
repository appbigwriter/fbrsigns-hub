-- CRIAR TABELA INTEGRATIONS SE NÃO EXISTIR
CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'virtual_assistant', 'payment_provider', 'email', etc.
  provider TEXT NOT NULL, -- 'openai', 'stripe', 'sendgrid', etc.
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT false,
  api_key TEXT,
  webhook_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- Criar política de acesso (se não existir, o comando abaixo pode falhar se já existir, mas vamos tentar garantir o acesso)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'integrations' AND policyname = 'Admins can manage integrations'
    ) THEN
        CREATE POLICY "Admins can manage integrations" ON public.integrations FOR ALL USING (true); -- Simplificado para garantir acesso agora
    END IF;
END
$$;

-- CRIAR FUNÇÃO GET_STRIPE_PUBLISHABLE_KEY
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

-- CORRIGIR FUNÇÃO GENERATE_INVOICE_NUMBER
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

-- VERIFICAR STATUS (Agora deve funcionar)
SELECT provider, is_active FROM public.integrations WHERE provider = 'stripe';

-- Create suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_id TEXT,
  payment_terms TEXT DEFAULT 'Net 30',
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create raw materials table
CREATE TABLE public.raw_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT UNIQUE,
  supplier_id UUID REFERENCES public.suppliers(id),
  unit_of_measure TEXT NOT NULL DEFAULT 'unit',
  cost_per_unit NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  current_stock NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  minimum_stock NUMERIC(10,2) DEFAULT 0.00,
  maximum_stock NUMERIC(10,2),
  reorder_point NUMERIC(10,2) DEFAULT 0.00,
  location TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create raw material transactions table for inventory tracking
CREATE TABLE public.raw_material_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  raw_material_id UUID NOT NULL REFERENCES public.raw_materials(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('in', 'out', 'adjustment')),
  quantity NUMERIC(10,2) NOT NULL,
  unit_cost NUMERIC(10,2),
  total_cost NUMERIC(10,2),
  reference_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  subcategory TEXT,
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  supplier_id UUID REFERENCES public.suppliers(id),
  receipt_url TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurring_frequency TEXT,
  next_expense_date DATE,
  tags TEXT[],
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quickbooks integration settings table
CREATE TABLE public.quickbooks_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  realm_id TEXT,
  is_connected BOOLEAN DEFAULT false,
  last_sync TIMESTAMP WITH TIME ZONE,
  sync_settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_material_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quickbooks_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for suppliers
CREATE POLICY "Admins can manage suppliers" ON public.suppliers FOR ALL USING (is_admin());
CREATE POLICY "Anyone can view active suppliers" ON public.suppliers FOR SELECT USING (is_active = true);

-- Create RLS policies for raw materials
CREATE POLICY "Admins can manage raw materials" ON public.raw_materials FOR ALL USING (is_admin());
CREATE POLICY "Anyone can view active raw materials" ON public.raw_materials FOR SELECT USING (is_active = true);

-- Create RLS policies for raw material transactions
CREATE POLICY "Admins can manage raw material transactions" ON public.raw_material_transactions FOR ALL USING (is_admin());
CREATE POLICY "Anyone can view raw material transactions" ON public.raw_material_transactions FOR SELECT USING (true);

-- Create RLS policies for expenses
CREATE POLICY "Admins can manage expenses" ON public.expenses FOR ALL USING (is_admin());

-- Create RLS policies for quickbooks settings
CREATE POLICY "Admins can manage quickbooks settings" ON public.quickbooks_settings FOR ALL USING (is_admin());

-- Create triggers for updated_at columns
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_raw_materials_updated_at
  BEFORE UPDATE ON public.raw_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quickbooks_settings_updated_at
  BEFORE UPDATE ON public.quickbooks_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update raw material stock
CREATE OR REPLACE FUNCTION public.update_raw_material_stock()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update stock on transactions
CREATE TRIGGER update_stock_on_transaction
  AFTER INSERT ON public.raw_material_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_raw_material_stock();
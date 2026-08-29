-- Create invoices table with comprehensive tracking
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  order_id UUID REFERENCES public.orders(id),
  customer_id UUID REFERENCES public.customers(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  customer_address JSONB,
  
  -- Invoice details
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  tax_rate NUMERIC(5,2) DEFAULT 0.00,
  tax_amount NUMERIC(10,2) DEFAULT 0.00,
  discount_amount NUMERIC(10,2) DEFAULT 0.00,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  
  -- Status and tracking
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Sent', 'Paid', 'Overdue', 'Cancelled', 'Refunded')),
  payment_status TEXT NOT NULL DEFAULT 'Unpaid' CHECK (payment_status IN ('Unpaid', 'Partially Paid', 'Paid', 'Overdue', 'Refunded')),
  payment_method TEXT,
  payment_date TIMESTAMP WITH TIME ZONE,
  
  -- Dates
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  paid_date DATE,
  
  -- Additional info
  notes TEXT,
  terms_conditions TEXT,
  
  -- Recurring invoice info
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_frequency TEXT CHECK (recurring_frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  next_invoice_date DATE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create invoice items table
CREATE TABLE public.invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create payments table to track invoice payments
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  transaction_id TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoices
CREATE POLICY "Admins can view all invoices" ON public.invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE user_id = auth.uid() AND active = true
    )
  );

CREATE POLICY "Customers can view their invoices" ON public.invoices
  FOR SELECT USING (
    customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
    OR (customer_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM customers 
      WHERE id = invoices.customer_id AND user_id = auth.uid()
    ))
  );

CREATE POLICY "Admins can manage invoices" ON public.invoices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE user_id = auth.uid() AND active = true
    )
  );

-- RLS Policies for invoice_items
CREATE POLICY "View invoice items" ON public.invoice_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE id = invoice_items.invoice_id 
      AND (
        EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid() AND active = true)
        OR customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
        OR (customer_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM customers 
          WHERE id = invoices.customer_id AND user_id = auth.uid()
        ))
      )
    )
  );

CREATE POLICY "Admins can manage invoice items" ON public.invoice_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE user_id = auth.uid() AND active = true
    )
  );

-- RLS Policies for payments
CREATE POLICY "View payments" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE id = payments.invoice_id 
      AND (
        EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid() AND active = true)
        OR customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
        OR (customer_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM customers 
          WHERE id = invoices.customer_id AND user_id = auth.uid()
        ))
      )
    )
  );

CREATE POLICY "Admins can manage payments" ON public.payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE user_id = auth.uid() AND active = true
    )
  );

-- Create updated_at trigger for invoices
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update invoice totals when items change
CREATE OR REPLACE FUNCTION public.update_invoice_totals()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create triggers for invoice totals
CREATE TRIGGER update_invoice_totals_on_item_change
  AFTER INSERT OR UPDATE OR DELETE ON public.invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoice_totals();

-- Create function to update payment status
CREATE OR REPLACE FUNCTION public.update_invoice_payment_status()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger for payment status updates
CREATE TRIGGER update_payment_status_on_payment_change
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoice_payment_status();

-- Create view for invoices with payment summary
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
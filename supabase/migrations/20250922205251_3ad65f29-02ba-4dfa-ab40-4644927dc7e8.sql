-- Fix security warnings by setting search_path for the new notification functions
CREATE OR REPLACE FUNCTION notify_new_order()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (
    title,
    message,
    type,
    category,
    target_role,
    metadata,
    created_by
  ) VALUES (
    'New Order Created',
    'Order #' || COALESCE(NEW.id::text, 'Unknown') || ' from ' || NEW.customer_name || ' has been created.',
    'info',
    'orders',
    'admin',
    jsonb_build_object(
      'order_id', NEW.id,
      'customer_name', NEW.customer_name,
      'customer_email', NEW.customer_email,
      'total', NEW.total,
      'status', NEW.status
    ),
    NULL
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_new_quote()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (
    title,
    message,
    type,
    category,
    target_role,
    metadata,
    created_by
  ) VALUES (
    'New Quote Request',
    'Quote request from ' || NEW.nome || ' for ' || NEW.servico || ' has been submitted.',
    'info',
    'quotes',
    'admin',
    jsonb_build_object(
      'quote_id', NEW.id,
      'customer_name', NEW.nome,
      'customer_email', NEW.email,
      'service', NEW.servico,
      'priority', NEW.prioridade,
      'status', NEW.status
    ),
    NULL
  );
  RETURN NEW;
END;
$$;
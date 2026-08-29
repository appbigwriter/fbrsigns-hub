-- Create settings table for general application settings
CREATE TABLE public.settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create integrations table for third-party service configurations
CREATE TABLE public.integrations (
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

-- Create notifications table for system notifications and settings
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'error', 'success'
  category TEXT NOT NULL DEFAULT 'system', -- 'system', 'order', 'payment', 'user'
  target_user_id UUID REFERENCES auth.users(id),
  target_role TEXT, -- 'admin', 'customer', null for all
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_system BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on all tables
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for settings
CREATE POLICY "Admins can manage settings"
ON public.settings FOR ALL
USING (is_admin());

CREATE POLICY "Public settings viewable by everyone"
ON public.settings FOR SELECT
USING (is_public = true);

-- RLS Policies for integrations
CREATE POLICY "Admins can manage integrations"
ON public.integrations FOR ALL
USING (is_admin());

-- RLS Policies for notifications
CREATE POLICY "Admins can manage all notifications"
ON public.notifications FOR ALL
USING (is_admin());

CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (
  target_user_id = auth.uid() OR 
  (target_role IS NULL) OR 
  (target_role = 'customer' AND EXISTS(SELECT 1 FROM customers WHERE user_id = auth.uid())) OR
  (target_role = 'admin' AND is_admin())
);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (target_user_id = auth.uid())
WITH CHECK (target_user_id = auth.uid());

-- Add triggers for updated_at
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
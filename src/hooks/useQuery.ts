import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DashboardMetrics } from '@/types';

// Dashboard metrics
export const useDashboardMetrics = () => {
  return useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async (): Promise<DashboardMetrics> => {
      const [
        { count: totalOrders },
        { data: orders },
        { count: totalCustomers },
        { count: totalProducts }
      ] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('total'),
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true })
      ]);

      const totalRevenue = orders?.reduce((sum, order) => sum + Number(order.total), 0) || 0;
      const pendingOrders = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pendente');

      // Calculate monthly revenue (current month)
      const currentMonth = new Date();
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const monthlyData = await supabase
        .from('orders')
        .select('total')
        .gte('created_at', monthStart.toISOString());
      
      const monthlyRevenue = monthlyData.data?.reduce((sum, order) => sum + Number(order.total), 0) || 0;

      return {
        totalOrders: totalOrders || 0,
        totalRevenue,
        totalCustomers: totalCustomers || 0,
        totalProducts: totalProducts || 0,
        pendingOrders: pendingOrders.count || 0,
        monthlyRevenue,
        newCustomers: 0, // Will implement proper calculation later
        conversionRate: 0, // Will implement proper calculation later
      };
    },
  });
};

// Recent orders
export const useRecentOrders = () => {
  return useQuery({
    queryKey: ['recent-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });
};

// All orders
export const useOrders = () => {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

// All products
export const useProducts = () => {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

// All customers
export const useCustomers = () => {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

// Order status stats
export const useOrderStats = () => {
  return useQuery({
    queryKey: ['order-stats'],
    queryFn: async () => {
      const [pending, inProduction, ready] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'Pendente'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'Em Produção'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'Concluído'),
      ]);

      return {
        pending: pending.count || 0,
        inProduction: inProduction.count || 0,
        ready: ready.count || 0,
      };
    },
  });
};

// All categories
export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

// All subcategories
export const useSubcategories = () => {
  return useQuery({
    queryKey: ["subcategories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subcategories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },
  });
};

// Subcategories by category
export const useSubcategoriesByCategory = (categoryId: string | null) => {
  return useQuery({
    queryKey: ["subcategories", "by-category", categoryId],
    queryFn: async () => {
      if (!categoryId) return [];
      
      const { data, error } = await supabase
        .from("subcategories")
        .select("*")
        .eq("category_id", categoryId)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!categoryId,
  });
};

// All invoices
export const useInvoices = () => {
  return useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices_with_payment_summary")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
};

// Single invoice with items and payments
export const useInvoice = (id: string) => {
  return useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          invoice_items (*),
          payments (*)
        `)
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
};

// Payments for an invoice
export const usePayments = (invoiceId: string) => {
  return useQuery({
    queryKey: ["payments", invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("payment_date", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!invoiceId,
  });
};

// Customer statistics with detailed info
export const useCustomerStats = () => {
  return useQuery({
    queryKey: ["customer-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_stats")
        .select("*")
        .order("total_spent", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
};

// Single customer with full details
export const useCustomer = (id: string) => {
  return useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select(`
          *,
          customer_tag_assignments (
            customer_tags (*)
          )
        `)
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
};

// Customer notes
export const useCustomerNotes = (customerId: string) => {
  return useQuery({
    queryKey: ["customer-notes", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_notes")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });
};

// Customer communications
export const useCustomerCommunications = (customerId: string) => {
  return useQuery({
    queryKey: ["customer-communications", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_communications")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });
};

// Customer tags
export const useCustomerTags = () => {
  return useQuery({
    queryKey: ["customer-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_tags")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });
};

// Quotes (orcamentos)
export const useQuotes = () => {
  return useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamentos")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
};

// Quote templates
export const useQuoteTemplates = () => {
  return useQuery({
    queryKey: ["quote-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_templates")
        .select("*")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });
};

// Enhanced quotes with items
export const useQuoteWithItems = (id: string) => {
  return useQuery({
    queryKey: ["quote-with-items", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamentos")
        .select(`
          *,
          quote_items (*)
        `)
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
};
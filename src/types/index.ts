// FBRSigns Admin Dashboard Types

export interface Admin {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  updated_at: string;
  permissions: Record<string, any>;
}

export interface Customer {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  phone?: string;
  company_name?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  has_sizes?: boolean;
  has_colors?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subcategory {
  id: string;
  name: string;
  description?: string;
  category_id: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  image_url?: string;
  category_id?: string;
  subcategory_id?: string;
  created_at: string;
  updated_at: string;
}

export type OrderStatus = 
  | 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled'
  | 'Pendente' | 'Processando' | 'Enviado' | 'Entregue' | 'Cancelado'
  | 'Novo' | 'Confirmado' | 'Aguardando Pagamento' | 'Em Produção' | 'Concluído';

export interface Order {
  id: string;
  customer_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  status: OrderStatus;
  total: number;
  shipping_address?: Record<string, any>;
  payment_method?: string;
  notes?: string;
  invoice_number?: string;
  invoice_generated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  name: string;
  description?: string;
  quantity: number;
  price: number;
  total?: number;
  created_at: string;
}

export type QuoteStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'converted';
export type QuotePriority = 'low' | 'medium' | 'high';

export interface Quote {
  id: string;
  customer_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  company_name?: string;
  service_type: string;
  description: string;
  priority: QuotePriority;
  status: QuoteStatus;
  estimated_value?: number;
  admin_notes?: string;
  expiration_date?: string;
  created_at: string;
  updated_at: string;
}

export type InvoiceStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  order_id?: string;
  customer_id?: string;
  invoice_number: string;
  status: InvoiceStatus;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  due_date?: string;
  paid_date?: string;
  payment_method?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type ActivityType = 'email' | 'whatsapp' | 'call' | 'meeting' | 'order' | 'invoice' | 'quote' | 'note';

export interface CustomerActivity {
  id: string;
  customer_id: string;
  activity_type: ActivityType;
  title: string;
  description?: string;
  metadata: Record<string, any>;
  created_by?: string;
  created_at: string;
}

export interface DashboardMetrics {
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  totalProducts: number;
  pendingOrders: number;
  monthlyRevenue: number;
  newCustomers: number;
  conversionRate: number;
}
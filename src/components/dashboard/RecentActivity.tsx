import { useState } from "react";
import { Clock, User, ShoppingCart, FileText, DollarSign, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useOrders, useInvoices, useQuotes, useCustomers } from "@/hooks/useQuery";

interface ActivityItem {
  id: string;
  type: 'order' | 'invoice' | 'quote' | 'customer';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
  amount?: number;
  priority?: string;
}

export function RecentActivity() {
  const [showAll, setShowAll] = useState(false);
  
  const { data: orders } = useOrders();
  const { data: invoices } = useInvoices();
  const { data: quotes } = useQuotes();
  const { data: customers } = useCustomers();

  const generateActivityItems = (): ActivityItem[] => {
    const activities: ActivityItem[] = [];

    // Recent orders
    orders?.slice(0, 5).forEach(order => {
      activities.push({
        id: `order-${order.id}`,
        type: 'order',
        title: `New Order #${order.id.slice(0, 8)}`,
        description: `Order from ${order.customer_name}`,
        timestamp: order.created_at,
        status: order.status,
        amount: Number(order.total),
      });
    });

    // Recent invoices
    invoices?.slice(0, 3).forEach(invoice => {
      activities.push({
        id: `invoice-${invoice.id}`,
        type: 'invoice',
        title: `Invoice ${invoice.invoice_number}`,
        description: `Invoice for ${invoice.customer_name}`,
        timestamp: invoice.created_at,
        status: invoice.payment_status,
        amount: Number(invoice.total_amount),
      });
    });

    // Recent quotes
    quotes?.slice(0, 3).forEach(quote => {
      activities.push({
        id: `quote-${quote.id}`,
        type: 'quote',
        title: `Quote Request: ${quote.servico}`,
        description: `Request from ${quote.nome}`,
        timestamp: quote.created_at,
        status: quote.status,
        amount: Number(quote.orcamento_estimado || 0),
        priority: quote.prioridade,
      });
    });

    // Recent customers
    customers?.slice(0, 2).forEach(customer => {
      activities.push({
        id: `customer-${customer.id}`,
        type: 'customer',
        title: `New Customer: ${customer.full_name}`,
        description: `Customer registered`,
        timestamp: customer.created_at,
      });
    });

    return activities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  };

  const activityItems = generateActivityItems();
  const displayItems = showAll ? activityItems : activityItems.slice(0, 8);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order':
        return ShoppingCart;
      case 'invoice':
        return FileText;
      case 'quote':
        return DollarSign;
      case 'customer':
        return User;
      default:
        return Clock;
    }
  };

  const getStatusColor = (type: string, status?: string) => {
    if (type === 'order') {
      switch (status) {
        case 'Pendente': return 'bg-yellow-100 text-yellow-800';
        case 'Confirmado': return 'bg-blue-100 text-blue-800';
        case 'Entregue': return 'bg-green-100 text-green-800';
        case 'Cancelado': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    }
    
    if (type === 'invoice') {
      switch (status) {
        case 'Paid': return 'bg-green-100 text-green-800';
        case 'Unpaid': return 'bg-red-100 text-red-800';
        case 'Partially Paid': return 'bg-yellow-100 text-yellow-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    }
    
    if (type === 'quote') {
      switch (status) {
        case 'pendente': return 'bg-yellow-100 text-yellow-800';
        case 'aprovado': return 'bg-green-100 text-green-800';
        case 'rejeitado': return 'bg-red-100 text-red-800';
        case 'convertido': return 'bg-purple-100 text-purple-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    }
    
    return 'bg-blue-100 text-blue-800';
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return time.toLocaleDateString('en-US');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-medium">Recent Activity</CardTitle>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayItems.length > 0 ? (
            displayItems.map((item) => {
              const Icon = getActivityIcon(item.type);
              
              return (
                <div key={item.id} className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-8 h-8 bg-muted rounded-full">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimeAgo(item.timestamp)}
                      </p>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-2">
                        {item.status && (
                          <Badge className={getStatusColor(item.type, item.status)}>
                            {item.status}
                          </Badge>
                        )}
                        
                        {item.priority === 'alta' && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            High Priority
                          </Badge>
                        )}
                      </div>
                      
                      {item.amount && item.amount > 0 && (
                        <span className="text-sm font-medium">
                          $ {item.amount.toLocaleString('en-US', { 
                            minimumFractionDigits: 2 
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-6">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No recent activity</p>
            </div>
          )}
          
          {activityItems.length > 8 && (
            <Button
              variant="ghost"
              onClick={() => setShowAll(!showAll)}
              className="w-full"
            >
              {showAll ? 'Show Less' : `Show All (${activityItems.length - 8} more)`}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
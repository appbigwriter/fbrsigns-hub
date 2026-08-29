import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, 
  Receipt, 
  MessageSquare, 
  FileText, 
  Calendar,
  DollarSign,
  TrendingUp
} from "lucide-react";
import { useOrders, useInvoices, useCustomerCommunications, useQuotes } from "@/hooks/useQuery";

interface CustomerActivityProps {
  customer: any;
}

export function CustomerActivity({ customer }: CustomerActivityProps) {
  const { data: allOrders } = useOrders();
  const { data: allInvoices } = useInvoices();
  const { data: customerCommunications } = useCustomerCommunications(customer.id);
  const { data: allQuotes } = useQuotes();

  // Filter data for this customer
  const customerOrders = allOrders?.filter(order => 
    order.customer_id === customer.id || order.customer_email === customer.email
  ) || [];

  const customerInvoices = allInvoices?.filter(invoice => 
    invoice.customer_id === customer.id || invoice.customer_email === customer.email
  ) || [];

  const customerQuotes = allQuotes?.filter(quote => 
    quote.email === customer.email
  ) || [];

  // Create combined activity timeline
  const activities = [
    ...customerOrders.map(order => ({
      id: order.id,
      type: 'order',
      title: `Order #${order.invoice_number || order.id.slice(0, 8)}`,
      description: `Order placed for $${Number(order.total).toFixed(2)}`,
      status: order.status,
      date: order.created_at,
      amount: Number(order.total),
    })),
    ...customerInvoices.map(invoice => ({
      id: invoice.id,
      type: 'invoice',
      title: `Invoice ${invoice.invoice_number}`,
      description: `Invoice generated for $${Number(invoice.total_amount).toFixed(2)}`,
      status: invoice.payment_status,
      date: invoice.created_at,
      amount: Number(invoice.total_amount),
    })),
    ...customerCommunications?.map(comm => ({
      id: comm.id,
      type: 'communication',
      title: `${comm.type.charAt(0).toUpperCase() + comm.type.slice(1)} ${comm.direction}`,
      description: comm.subject || comm.message?.slice(0, 50) + (comm.message?.length > 50 ? '...' : ''),
      status: comm.status || 'sent',
      date: comm.created_at,
      amount: 0,
    })) || [],
    ...customerQuotes.map(quote => ({
      id: quote.id,
      type: 'quote',
      title: `Quote Request - ${quote.servico}`,
      description: quote.descricao?.slice(0, 50) + (quote.descricao?.length > 50 ? '...' : ''),
      status: quote.status,
      date: quote.created_at,
      amount: Number(quote.orcamento_estimado || 0),
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order': return <ShoppingCart className="h-4 w-4" />;
      case 'invoice': return <Receipt className="h-4 w-4" />;
      case 'communication': return <MessageSquare className="h-4 w-4" />;
      case 'quote': return <FileText className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (type: string, status: string) => {
    if (type === 'order') {
      return (
        <Badge variant={status === 'Confirmado' ? 'default' : 'secondary'}>
          {status}
        </Badge>
      );
    }
    if (type === 'invoice') {
      const variants: Record<string, string> = {
        'Paid': 'bg-green-100 text-green-800',
        'Unpaid': 'bg-red-100 text-red-800',
        'Partially Paid': 'bg-yellow-100 text-yellow-800',
      };
      return (
        <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>
          {status}
        </Badge>
      );
    }
    if (type === 'communication') {
      const variants: Record<string, string> = {
        'sent': 'bg-blue-100 text-blue-800',
        'received': 'bg-green-100 text-green-800',
        'pending': 'bg-yellow-100 text-yellow-800',
      };
      return (
        <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>
          {status}
        </Badge>
      );
    }
    if (type === 'quote') {
      const variants: Record<string, string> = {
        'pendente': 'bg-yellow-100 text-yellow-800',
        'aprovado': 'bg-green-100 text-green-800',
        'rejeitado': 'bg-red-100 text-red-800',
        'convertido': 'bg-purple-100 text-purple-800',
      };
      return (
        <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>
          {status}
        </Badge>
      );
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  // Calculate customer metrics
  const totalValue = activities.reduce((sum, activity) => sum + activity.amount, 0);
  const averageOrderValue = activities.length > 0 ? totalValue / activities.length : 0;
  const lastActivityDays = activities.length > 0 
    ? Math.floor((new Date().getTime() - new Date(activities[0].date).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-6">
      {/* Activity Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Activities</p>
                <p className="text-2xl font-bold">{activities.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Order Value</p>
                <p className="text-2xl font-bold">${averageOrderValue.toFixed(2)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Activity</p>
                <p className="text-2xl font-bold">
                  {lastActivityDays !== null ? `${lastActivityDays}d` : 'Never'}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={`${activity.type}-${activity.id}`} className="flex items-start gap-4 p-4 border rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.date).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {activity.description}
                    </p>
                     <div className="flex items-center justify-between">
                       {getStatusBadge(activity.type, activity.status)}
                       {activity.amount > 0 && (
                         <p className="text-sm font-medium">
                           ${activity.amount.toFixed(2)}
                         </p>
                       )}
                     </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No activity recorded yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
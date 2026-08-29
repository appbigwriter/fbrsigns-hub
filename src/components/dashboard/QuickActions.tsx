import { useState } from "react";
import { Plus, FileText, Users, ShoppingCart, Calculator, Settings, Download, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useOrders, useQuotes, useInvoices } from "@/hooks/useQuery";

export function QuickActions() {
  const navigate = useNavigate();
  const { data: orders } = useOrders();
  const { data: quotes } = useQuotes();
  const { data: invoices } = useInvoices();

  // Calculate pending items counts
  const pendingOrders = orders?.filter(order => order.status === 'Pendente').length || 0;
  const pendingQuotes = quotes?.filter(quote => quote.status === 'pendente').length || 0;
  const unpaidInvoices = invoices?.filter(invoice => invoice.payment_status === 'Unpaid').length || 0;

  const quickActions = [
    {
      id: 'new-order',
      title: 'New Order',
      description: 'Create a new customer order',
      icon: ShoppingCart,
      color: 'bg-blue-500 hover:bg-blue-600',
      action: () => navigate('/orders'),
      badge: pendingOrders > 0 ? pendingOrders : null,
      badgeColor: 'bg-yellow-500',
    },
    {
      id: 'new-quote',
      title: 'New Quote',
      description: 'Create a new quote request',
      icon: Calculator,
      color: 'bg-green-500 hover:bg-green-600',
      action: () => navigate('/quotes'),
      badge: pendingQuotes > 0 ? pendingQuotes : null,
      badgeColor: 'bg-orange-500',
    },
    {
      id: 'new-invoice',
      title: 'New Invoice',
      description: 'Generate a new invoice',
      icon: FileText,
      color: 'bg-purple-500 hover:bg-purple-600',
      action: () => navigate('/invoices'),
      badge: unpaidInvoices > 0 ? unpaidInvoices : null,
      badgeColor: 'bg-red-500',
    },
    {
      id: 'new-customer',
      title: 'Add Customer',
      description: 'Add a new customer',
      icon: Users,
      color: 'bg-indigo-500 hover:bg-indigo-600',
      action: () => navigate('/customers'),
    },
    {
      id: 'new-product',
      title: 'Add Product',
      description: 'Add product to catalog',
      icon: Plus,
      color: 'bg-teal-500 hover:bg-teal-600',
      action: () => navigate('/products'),
    },
    {
      id: 'analytics',
      title: 'View Analytics',
      description: 'Check business metrics',
      icon: Download,
      color: 'bg-orange-500 hover:bg-orange-600',
      action: () => {
        // Navigate to a specific analytics route or open a modal
        console.log('Open analytics view');
      },
    },
  ];

  const handleExportData = () => {
    // Create a simple export functionality
    const exportData = {
      orders: orders?.length || 0,
      quotes: quotes?.length || 0,
      invoices: invoices?.length || 0,
      exportDate: new Date().toISOString(),
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `business_summary_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-medium">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            
            return (
              <Button
                key={action.id}
                variant="ghost"
                className="h-auto p-4 flex flex-col items-start space-y-2 hover:bg-muted/50 relative"
                onClick={action.action}
              >
                <div className="flex items-center justify-between w-full">
                  <div className={`p-2 rounded-md text-white ${action.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  
                  {action.badge && (
                    <Badge 
                      className={`${action.badgeColor} text-white text-xs px-2 py-1 min-w-[20px] h-5 flex items-center justify-center`}
                    >
                      {action.badge}
                    </Badge>
                  )}
                </div>
                
                <div className="text-left">
                  <h4 className="text-sm font-medium">{action.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    {action.description}
                  </p>
                </div>
              </Button>
            );
          })}
        </div>
        
        {/* Additional Actions */}
        <div className="mt-6 pt-4 border-t">
          <h4 className="text-sm font-medium mb-3">Data Management</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportData}
              className="gap-2"
            >
              <Download className="h-3 w-3" />
              Export Data
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/users')}
              className="gap-2"
            >
              <Settings className="h-3 w-3" />
              Manage Users
            </Button>
          </div>
        </div>
        
        {/* Status Summary */}
        <div className="mt-4 p-3 bg-muted/30 rounded-lg">
          <h5 className="text-xs font-medium text-muted-foreground mb-2">System Status</h5>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-yellow-600">{pendingOrders}</div>
              <div className="text-xs text-muted-foreground">Pending Orders</div>
            </div>
            <div>
              <div className="text-lg font-bold text-orange-600">{pendingQuotes}</div>
              <div className="text-xs text-muted-foreground">Pending Quotes</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-600">{unpaidInvoices}</div>
              <div className="text-xs text-muted-foreground">Unpaid Invoices</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
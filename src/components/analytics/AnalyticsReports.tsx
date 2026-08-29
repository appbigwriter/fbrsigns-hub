import { useState } from "react";
import { Download, Calendar, TrendingUp, Users, ShoppingCart, DollarSign, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCustomerStats, useOrders, useInvoices, useQuotes } from "@/hooks/useQuery";

export function AnalyticsReports() {
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [reportType, setReportType] = useState("sales");

  const { data: customerStats } = useCustomerStats();
  const { data: orders } = useOrders();
  const { data: invoices } = useInvoices();
  const { data: quotes } = useQuotes();

  const exportToCSV = (data: any[], filename: string, headers: string[]) => {
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header.toLowerCase().replace(/\s+/g, '_')];
          return typeof value === 'string' ? `"${value}"` : value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const exportCustomerReport = () => {
    if (!customerStats) return;
    
    const headers = ['Full Name', 'Email', 'Total Orders', 'Total Spent', 'Total Invoices', 'Last Order Date'];
    exportToCSV(customerStats, 'customer_analytics', headers);
  };

  const exportSalesReport = () => {
    if (!orders) return;
    
    const headers = ['Order ID', 'Customer Name', 'Customer Email', 'Status', 'Total', 'Created At'];
    const salesData = orders.map(order => ({
      order_id: order.id,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      status: order.status,
      total: order.total,
      created_at: order.created_at,
    }));
    
    exportToCSV(salesData, 'sales_report', headers);
  };

  const exportInvoiceReport = () => {
    if (!invoices) return;
    
    const headers = ['Invoice Number', 'Customer Name', 'Status', 'Total Amount', 'Payment Status', 'Due Date'];
    const invoiceData = invoices.map(invoice => ({
      invoice_number: invoice.invoice_number,
      customer_name: invoice.customer_name,
      status: invoice.status,
      total_amount: invoice.total_amount,
      payment_status: invoice.payment_status,
      due_date: invoice.due_date,
    }));
    
    exportToCSV(invoiceData, 'invoice_report', headers);
  };

  const exportQuoteReport = () => {
    if (!quotes) return;
    
    const headers = ['Quote ID', 'Customer Name', 'Service', 'Status', 'Priority', 'Estimated Amount', 'Created At'];
    const quoteData = quotes.map(quote => ({
      quote_id: quote.id,
      customer_name: quote.nome,
      service: quote.servico,
      status: quote.status,
      priority: quote.prioridade,
      estimated_amount: quote.orcamento_estimado || 0,
      created_at: quote.created_at,
    }));
    
    exportToCSV(quoteData, 'quote_report', headers);
  };

  const getSalesMetrics = () => {
    if (!orders) return { totalSales: 0, avgOrderValue: 0, totalOrders: 0 };
    
    const totalSales = orders.reduce((sum, order) => sum + Number(order.total), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    
    return { totalSales, avgOrderValue, totalOrders };
  };

  const getTopCustomers = () => {
    if (!customerStats) return [];
    
    return customerStats
      .sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0))
      .slice(0, 10);
  };

  const { totalSales, avgOrderValue, totalOrders } = getSalesMetrics();
  const topCustomers = getTopCustomers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics & Reports</h2>
          <p className="text-muted-foreground">
            Comprehensive business analytics and export functionality
          </p>
        </div>
        
        <div className="flex gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $ {totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              From {totalOrders} orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $ {avgOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Per order average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerStats?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Quotes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {quotes?.filter(q => q.status === 'pendente').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting response
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={reportType} onValueChange={setReportType}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sales">Sales Report</TabsTrigger>
          <TabsTrigger value="customers">Customer Report</TabsTrigger>
          <TabsTrigger value="invoices">Invoice Report</TabsTrigger>
          <TabsTrigger value="quotes">Quote Report</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sales Report</CardTitle>
              <Button onClick={exportSalesReport} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders?.slice(0, 10).map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">
                        {order.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.customer_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {order.customer_email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{order.status}</Badge>
                      </TableCell>
                      <TableCell>
                        $ {Number(order.total).toLocaleString('en-US', { 
                          minimumFractionDigits: 2 
                        })}
                      </TableCell>
                      <TableCell>
                        {new Date(order.created_at).toLocaleDateString('en-US')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Customer Analytics</CardTitle>
              <Button onClick={exportCustomerReport} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Total Spent</TableHead>
                    <TableHead>Invoices</TableHead>
                    <TableHead>Last Order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{customer.full_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {customer.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{customer.total_orders}</TableCell>
                      <TableCell>
                        $ {Number(customer.total_spent).toLocaleString('en-US', { 
                          minimumFractionDigits: 2 
                        })}
                      </TableCell>
                      <TableCell>{customer.total_invoices}</TableCell>
                      <TableCell>
                        {customer.last_order_date 
                          ? new Date(customer.last_order_date).toLocaleDateString('en-US')
                          : 'Never'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Invoice Report</CardTitle>
              <Button onClick={exportInvoiceReport} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices?.slice(0, 10).map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell>{invoice.customer_name}</TableCell>
                      <TableCell>
                        $ {Number(invoice.total_amount).toLocaleString('en-US', { 
                          minimumFractionDigits: 2 
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          invoice.payment_status === 'Paid' ? 'default' : 'secondary'
                        }>
                          {invoice.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(invoice.due_date).toLocaleDateString('en-US')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotes" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Quote Report</CardTitle>
              <Button onClick={exportQuoteReport} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Estimate</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes?.slice(0, 10).map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{quote.nome}</div>
                          <div className="text-sm text-muted-foreground">
                            {quote.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{quote.servico}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{quote.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          quote.prioridade === 'alta' ? 'destructive' : 'secondary'
                        }>
                          {quote.prioridade}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {quote.orcamento_estimado ? (
                          <span>$ {Number(quote.orcamento_estimado).toLocaleString('en-US', { 
                            minimumFractionDigits: 2 
                          })}</span>
                        ) : (
                          <span className="text-muted-foreground">Pending</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(quote.created_at).toLocaleDateString('en-US')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
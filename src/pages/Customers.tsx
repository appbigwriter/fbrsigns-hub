import { useState } from "react";
import { Plus, Edit, Trash2, Filter, Search, Eye, MessageSquare, Phone, Mail, Tag, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCustomerStats } from "@/hooks/useQuery";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { CustomerProfile } from "@/components/customers/CustomerProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<any>(null);

  const { data: customers, isLoading } = useCustomerStats();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch cart data for all customers
  const { data: cartData } = useQuery({
    queryKey: ['customer-carts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('carts_with_customer_info')
        .select('*');
      if (error) throw error;
      return data as any[];
    },
  });

  const filteredCustomers = customers?.filter(customer => {
    const matchesSearch =
      customer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const handleEdit = (customer: any) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const handleViewProfile = (customer: any) => {
    setSelectedCustomer(customer);
    setShowProfile(true);
  };

  const handleWhatsApp = (customer: any) => {
    const message = `Hello ${customer.full_name}, this is FBRSigns reaching out to you.`;
    const phoneNumber = customer.phone_number?.replace(/\D/g, '') || '';
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleEmail = (customer: any) => {
    const subject = 'Message from FBRSigns';
    const body = `Dear ${customer.full_name},\n\nWe hope this message finds you well.\n\nBest regards,\nFBRSigns Team`;
    const emailUrl = `mailto:${customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(emailUrl, '_blank');
  };

  const handleDelete = async (customer: any) => {
    try {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", customer.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Customer deleted successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["customer-stats"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete customer",
        variant: "destructive",
      });
    }
    setDeletingCustomer(null);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingCustomer(null);
  };

  const handleProfileClose = () => {
    setShowProfile(false);
    setSelectedCustomer(null);
  };

  const getCustomerStatusBadge = (customer: any) => {
    if (customer.total_orders === 0) {
      return <Badge variant="secondary">New</Badge>;
    }

    const daysSinceLastOrder = customer.last_order_date
      ? Math.floor((new Date().getTime() - new Date(customer.last_order_date).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    if (daysSinceLastOrder && daysSinceLastOrder > 90) {
      return <Badge variant="destructive">Inactive</Badge>;
    } else if (daysSinceLastOrder && daysSinceLastOrder > 30) {
      return <Badge variant="outline">At Risk</Badge>;
    } else {
      return <Badge variant="default">Active</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Management</h1>
          <p className="text-muted-foreground">
            Manage customer relationships, communications, and analytics
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Customer Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customers?.filter(c => c.total_orders > 0).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${customers?.reduce((sum, c) => sum + Number(c.total_spent || 0), 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Order Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${customers?.length
                ? (customers.reduce((sum, c) => sum + Number(c.total_spent || 0), 0) /
                  customers.filter(c => c.total_orders > 0).length || 1).toFixed(2)
                : '0.00'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="new">New</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customers</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Cart</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Last Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers?.length ? (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{customer.full_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {(customer as any).company_name || 'Individual'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>
                        {(() => {
                          const cart = cartData?.find(c => c.user_id === (customer as any).user_id);
                          if (cart && cart.item_count > 0) {
                            return (
                              <div className="flex items-center gap-2" title={`${cart.item_count} items - $${Number(cart.total_amount).toFixed(2)}`}>
                                <ShoppingCart className="h-4 w-4 text-orange-500" />
                                <Badge variant="secondary" className="text-xs">
                                  {cart.item_count}
                                </Badge>
                              </div>
                            );
                          }
                          return <span className="text-muted-foreground text-xs">-</span>;
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <div className="font-medium">{customer.total_orders}</div>
                          <div className="text-xs text-muted-foreground">
                            {customer.total_quotes} quotes
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          ${Number(customer.total_spent || 0).toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {customer.last_order_date
                          ? new Date(customer.last_order_date).toLocaleDateString()
                          : 'Never'}
                      </TableCell>
                      <TableCell>{getCustomerStatusBadge(customer)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewProfile(customer)}
                            title="View Profile"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEmail(customer)}
                            title="Send Email"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleWhatsApp(customer)}
                            title="WhatsApp"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(customer)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingCustomer(customer)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      No customers found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Customer Form Dialog */}
      <CustomerForm
        open={showForm}
        onOpenChange={handleFormClose}
        customer={editingCustomer}
      />

      {/* Customer Profile Dialog */}
      {selectedCustomer && (
        <CustomerProfile
          open={showProfile}
          onOpenChange={handleProfileClose}
          customer={selectedCustomer}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingCustomer}
        onOpenChange={() => setDeletingCustomer(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingCustomer?.full_name}"? This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(deletingCustomer)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
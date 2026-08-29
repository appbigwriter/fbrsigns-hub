import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  MapPin, 
  ShoppingCart, 
  Receipt, 
  MessageSquare,
  Plus,
  Calendar,
  DollarSign
} from "lucide-react";
import { useCustomerNotes, useCustomerCommunications, useOrders } from "@/hooks/useQuery";
import { CustomerNotes } from "./CustomerNotes";
import { CustomerCommunications } from "./CustomerCommunications";
import { CustomerActivity } from "./CustomerActivity";

interface CustomerProfileProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: any;
}

export function CustomerProfile({ open, onOpenChange, customer }: CustomerProfileProps) {
  const { data: notes } = useCustomerNotes(customer?.id);
  const { data: communications } = useCustomerCommunications(customer?.id);
  const { data: orders } = useOrders();

  const customerOrders = orders?.filter(order => 
    order.customer_id === customer?.id || order.customer_email === customer?.email
  );

  const handleWhatsApp = () => {
    const message = `Hello ${customer.full_name}, this is FBRSigns reaching out to you.`;
    const phoneNumber = customer.phone_number?.replace(/\D/g, '') || '';
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleEmail = () => {
    const subject = 'Message from FBRSigns';
    const body = `Dear ${customer.full_name},\n\nWe hope this message finds you well.\n\nBest regards,\nFBRSigns Team`;
    const emailUrl = `mailto:${customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(emailUrl, '_blank');
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {customer.full_name}
          </DialogTitle>
          <DialogDescription>
            Complete customer profile and interaction history
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold">{customer.total_orders || 0}</p>
                  </div>
                  <ShoppingCart className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Spent</p>
                    <p className="text-2xl font-bold">${Number(customer.total_spent || 0).toFixed(2)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Quotes</p>
                    <p className="text-2xl font-bold">{customer.total_quotes || 0}</p>
                  </div>
                  <Receipt className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.email}</span>
                    <Button size="sm" variant="outline" onClick={handleEmail}>
                      Send Email
                    </Button>
                  </div>
                  
                  {customer.phone_number && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{customer.phone_number}</span>
                      <Button size="sm" variant="outline" onClick={handleWhatsApp}>
                        WhatsApp
                      </Button>
                    </div>
                  )}
                  
                  {customer.company_name && (
                    <div className="flex items-center gap-3">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span>{customer.company_name}</span>
                    </div>
                  )}
                </div>
                
                <div>
                  {customer.address && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                      <span className="text-sm">{customer.address}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 mt-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Customer since {new Date(customer.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs for detailed info */}
          <Tabs defaultValue="activity" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="orders">Orders ({customerOrders?.length || 0})</TabsTrigger>
              <TabsTrigger value="communications">Communications</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="activity" className="space-y-4">
              <CustomerActivity customer={customer} />
            </TabsContent>

            <TabsContent value="orders" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Order History</CardTitle>
                </CardHeader>
                <CardContent>
                  {customerOrders?.length ? (
                    <div className="space-y-4">
                      {customerOrders.map((order) => (
                        <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">Order #{order.invoice_number || order.id.slice(0, 8)}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">${Number(order.total).toFixed(2)}</p>
                            <Badge variant={order.status === 'Confirmado' ? 'default' : 'secondary'}>
                              {order.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No orders found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="communications" className="space-y-4">
              <CustomerCommunications customerId={customer.id} />
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <CustomerNotes customerId={customer.id} />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
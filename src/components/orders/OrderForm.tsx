import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Package, DollarSign, FileText, Truck } from "lucide-react";

const orderSchema = z.object({
  status: z.string(),
  payment_method: z.string().optional(),
  notes: z.string().optional(),
  shipping_address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
});

interface OrderFormProps {
  order: any;
  open: boolean;
  onClose: () => void;
  onUpdate: (data: any) => void;
  onCreate: (data: any) => void;
}

export function OrderForm({ 
  order, 
  open, 
  onClose, 
  onUpdate,
  onCreate
}: OrderFormProps) {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof orderSchema>>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      status: order?.status || 'Pendente',
      payment_method: order?.payment_method || '',
      notes: order?.notes || '',
      shipping_address: order?.shipping_address || {
        street: '',
        city: '',
        state: '',
        zip: '',
        country: 'Brazil'
      },
    },
  });

  useEffect(() => {
    if (order) {
      form.reset({
        status: order.status,
        payment_method: order.payment_method || '',
        notes: order.notes || '',
        shipping_address: order.shipping_address || {
          street: '',
          city: '',
          state: '',
          zip: '',
          country: 'Brazil'
        },
      });
    } else {
      // Reset to default values for creation
      form.reset({
        status: 'Pendente',
        payment_method: '',
        notes: '',
        shipping_address: {
          street: '',
          city: '',
          state: '',
          zip: '',
          country: 'Brazil'
        },
      });
    }
  }, [order, form, open]); // Added open to dependency to reset when dialog opens/closes

  const onSubmit = (data: z.infer<typeof orderSchema>) => {
    if (order) {
      onUpdate({ ...order, ...data });
    } else {
      onCreate(data);
    }
    onClose();
    // Toast is handled by mutation in parent
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pendente': return 'bg-yellow-100 text-yellow-800';
      case 'Confirmado': return 'bg-blue-100 text-blue-800';
      case 'Em Produção': return 'bg-purple-100 text-purple-800';
      case 'Pronto': return 'bg-green-100 text-green-800';
      case 'Entregue': return 'bg-green-200 text-green-900';
      case 'Cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {order ? `Order Details - ${order.id?.slice(0, 8)}` : "Create New Order"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Info */}
          {order && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                <p className="font-medium">{order.customer_name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                <p>{order.customer_email}</p>
              </div>
              {order.customer_phone && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                  <p>{order.customer_phone}</p>
                </div>
              )}
            </CardContent>
          </Card>
          )}

          {/* Order Details */}
          {order && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <Badge className={getStatusColor(order.status)}>
                    {order.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Total</Label>
                  <p className="font-semibold text-green-600">
                    $ {Number(order.total || order.order_items?.reduce((sum: number, item: any) => sum + (Number(item.price) * Number(item.quantity)), 0) || 0).toLocaleString('en-US', { 
                      minimumFractionDigits: 2 
                    })}
                  </p>
                </div>
              </div>
              
              {/* Order Items List */}
              {order.order_items && order.order_items.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground mb-2 block">Items</Label>
                  <div className="border rounded-md divide-y">
                    {order.order_items.map((item: any) => (
                      <div key={item.id} className="p-3 flex justify-between items-center text-sm">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-muted-foreground">{item.quantity} x $ {Number(item.price).toFixed(2)}</p>
                        </div>
                        <p className="font-medium">$ {(Number(item.quantity) * Number(item.price)).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                <p className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(order.created_at).toLocaleDateString()}
                </p>
              </div>

              {order.invoice_number && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Invoice</Label>
                  <Badge variant="outline" className="text-green-600">
                    {order.invoice_number}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
          )}
        </div>

        {/* Order Management Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Management</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Pendente">Pending</SelectItem>
                            <SelectItem value="Novo">New</SelectItem>
                            <SelectItem value="Aguardando Pagamento">Awaiting Payment</SelectItem>
                            <SelectItem value="Confirmado">Confirmed</SelectItem>
                            <SelectItem value="Processando">Processing</SelectItem>
                            <SelectItem value="Em Produção">In Production</SelectItem>
                            <SelectItem value="Concluído">Completed</SelectItem>
                            <SelectItem value="Enviado">Shipped</SelectItem>
                            <SelectItem value="Entregue">Delivered</SelectItem>
                            <SelectItem value="Cancelado">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="payment_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Credit Card">Credit Card</SelectItem>
                            <SelectItem value="Debit Card">Debit Card</SelectItem>
                            <SelectItem value="PIX">PIX</SelectItem>
                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="Check">Check</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add notes about this order..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Shipping Address */}
                <div className="space-y-4">
                  <Label className="text-lg font-medium">Shipping Address</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="shipping_address.street"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter street address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="shipping_address.city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter city" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="shipping_address.state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter state" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="shipping_address.zip"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP Code</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter ZIP code" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button type="submit">
                    {order ? "Update Order" : "Create Order"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={onClose}>
                    Close
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
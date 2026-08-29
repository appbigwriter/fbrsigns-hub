import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useProducts } from "@/hooks/useQuery";
import { useCustomers } from "@/hooks/useQuery";

const invoiceItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unit_price: z.number().min(0, "Unit price must be positive"),
  total: z.number().min(0, "Total must be positive"),
  is_taxable: z.boolean().default(true),
});

const invoiceSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required"),
  customer_email: z.string().email("Valid email is required"),
  customer_phone: z.string().optional(),
  customer_address: z.string().optional(),
  due_date: z.date({
    required_error: "Due date is required",
  }),
  tax_rate: z.number().min(0).max(100).default(0),
  discount_amount: z.number().min(0).default(0),
  notes: z.string().optional(),
  terms_conditions: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: any;
}

export function InvoiceForm({ open, onOpenChange, invoice }: InvoiceFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [openProductCombobox, setOpenProductCombobox] = useState<Record<number, boolean>>({});
  const [openCustomerCombobox, setOpenCustomerCombobox] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: products = [] } = useProducts();
  const { data: customers = [] } = useCustomers();

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customer_name: "",
      customer_email: "",
      customer_phone: "",
      customer_address: "",
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      tax_rate: 6.5, // Florida Sales Tax
      discount_amount: 0,
      notes: "",
      terms_conditions: "",
      items: [{ name: "", description: "", quantity: 1, unit_price: 0, total: 0, is_taxable: true }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Update totals when items change
  const watchedItems = form.watch("items");
  const taxRate = form.watch("tax_rate");
  const discountAmount = form.watch("discount_amount");

  useEffect(() => {
    // Update item totals
    watchedItems.forEach((item, index) => {
      const total = item.quantity * item.unit_price;
      if (item.total !== total) {
        form.setValue(`items.${index}.total`, total);
      }
    });
  }, [watchedItems, form]);

  const subtotal = watchedItems.reduce((sum, item) => sum + (item.total || 0), 0);
  const taxableAmount = watchedItems.reduce((sum, item) => 
    sum + (item.is_taxable ? (item.total || 0) : 0), 0);
  const taxAmount = (taxableAmount * (taxRate || 0)) / 100;
  const totalAmount = subtotal + taxAmount - (discountAmount || 0);

  // Reset form when invoice changes
  useEffect(() => {
    if (invoice) {
      form.reset({
        customer_name: invoice.customer_name || "",
        customer_email: invoice.customer_email || "",
        customer_phone: invoice.customer_phone || "",
        customer_address: invoice.customer_address ? 
          (typeof invoice.customer_address === 'string' ? invoice.customer_address : 
           `${invoice.customer_address.street || ''}, ${invoice.customer_address.city || ''}, ${invoice.customer_address.state || ''} ${invoice.customer_address.zipCode || ''}`.trim()) : "",
        due_date: new Date(invoice.due_date),
        tax_rate: Number(invoice.tax_rate) || 0,
        discount_amount: Number(invoice.discount_amount) || 0,
        notes: invoice.notes || "",
        terms_conditions: invoice.terms_conditions || "",
        items: invoice.invoice_items?.length ? invoice.invoice_items.map((item: any) => ({
          name: item.name,
          description: item.description || "",
          quantity: item.quantity,
          unit_price: Number(item.unit_price),
          total: Number(item.total),
          is_taxable: item.is_taxable ?? true,
        })) : [{ name: "", description: "", quantity: 1, unit_price: 0, total: 0, is_taxable: true }],
      });
    } else {
      form.reset({
        customer_name: "",
        customer_email: "",
        customer_phone: "",
        customer_address: "",
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        tax_rate: 6.5, // Florida Sales Tax
        discount_amount: 0,
        notes: "",
        terms_conditions: "",
        items: [{ name: "", description: "", quantity: 1, unit_price: 0, total: 0, is_taxable: true }],
      });
    }
  }, [invoice, form]);

  const generateInvoiceNumber = async () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    
    // Get the next sequence number
    const { data: existingInvoices } = await supabase
      .from("invoices")
      .select("invoice_number")
      .like("invoice_number", `INV-${currentYear}${currentMonth}-%`);
    
    const sequenceNumber = (existingInvoices?.length || 0) + 1;
    return `INV-${currentYear}${currentMonth}-${String(sequenceNumber).padStart(4, '0')}`;
  };

  const onSubmit = async (data: InvoiceFormData) => {
    setIsLoading(true);
    try {
      const invoiceData = {
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone || null,
        due_date: data.due_date.toISOString().split('T')[0],
        tax_rate: data.tax_rate,
        tax_amount: taxAmount,
        discount_amount: data.discount_amount,
        subtotal,
        total_amount: totalAmount,
        notes: data.notes || null,
        terms_conditions: data.terms_conditions || null,
      };

      if (invoice) {
        // Update existing invoice
        const { error: invoiceError } = await supabase
          .from("invoices")
          .update(invoiceData)
          .eq("id", invoice.id);

        if (invoiceError) throw invoiceError;

        // Delete existing items and insert new ones
        await supabase.from("invoice_items").delete().eq("invoice_id", invoice.id);
        
        const { error: itemsError } = await supabase
          .from("invoice_items")
          .insert(data.items.map(item => ({
            invoice_id: invoice.id,
            name: item.name,
            description: item.description || null,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total,
            is_taxable: item.is_taxable,
          })));

        if (itemsError) throw itemsError;

        toast({
          title: "Success",
          description: "Invoice updated successfully",
        });
      } else {
        // Create new invoice
        const invoiceNumber = await generateInvoiceNumber();
        
        const { data: newInvoice, error: invoiceError } = await supabase
          .from("invoices")
          .insert([{ ...invoiceData, invoice_number: invoiceNumber }])
          .select()
          .single();

        if (invoiceError) throw invoiceError;

        const { error: itemsError } = await supabase
          .from("invoice_items")
          .insert(data.items.map(item => ({
            invoice_id: newInvoice.id,
            name: item.name,
            description: item.description || null,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total,
            is_taxable: item.is_taxable,
          })));

        if (itemsError) throw itemsError;

        toast({
          title: "Success",
          description: "Invoice created successfully",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save invoice",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {invoice ? "Edit Invoice" : "Create New Invoice"}
          </DialogTitle>
          <DialogDescription>
            {invoice 
              ? "Update the invoice information below."
              : "Create a new invoice for your customer."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Customer Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Customer Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="customer_name"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Customer Name</FormLabel>
                      <Popover open={openCustomerCombobox} onOpenChange={setOpenCustomerCombobox}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value || "Select customer..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0 z-[100]" align="start">
                          <Command>
                            <CommandInput placeholder="Search customer..." />
                            <CommandList>
                              <CommandEmpty>No customer found.</CommandEmpty>
                              <CommandGroup>
                                {customers.map((customer) => (
                                  <CommandItem
                                    key={customer.id}
                                    value={customer.full_name}
                                    onSelect={() => {
                                      form.setValue("customer_name", customer.full_name);
                                      form.setValue("customer_email", customer.email);
                                      form.setValue("customer_phone", customer.phone || customer.phone_number || "");
                                      form.setValue("customer_address", customer.address || "");
                                      setOpenCustomerCombobox(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === customer.full_name ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span>{customer.full_name}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {customer.email}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customer_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter customer email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customer_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter customer phone" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customer_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Address</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter customer address" 
                          {...field} 
                          rows={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Due Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[100]" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date()
                            }
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Invoice Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Invoice Items</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ name: "", description: "", quantity: 1, unit_price: 0, total: 0, is_taxable: true })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  {/* Primeira linha: Item Name e Description */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`items.${index}.name`}
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Item Name</FormLabel>
                          <Popover 
                            open={openProductCombobox[index]} 
                            onOpenChange={(open) => setOpenProductCombobox(prev => ({ ...prev, [index]: open }))}
                          >
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className={cn(
                                    "w-full justify-between bg-background",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value || "Select product..."}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0 z-[100] bg-background" align="start">
                              <Command>
                                <CommandInput placeholder="Search product..." />
                                <CommandList>
                                  <CommandEmpty>No product found.</CommandEmpty>
                                  <CommandGroup>
                                    {products.map((product) => (
                                      <CommandItem
                                        key={product.id}
                                        value={product.name}
                                        onSelect={() => {
                                          form.setValue(`items.${index}.name`, product.name);
                                          form.setValue(`items.${index}.description`, product.description || "");
                                          form.setValue(`items.${index}.unit_price`, Number(product.price));
                                          const quantity = form.getValues(`items.${index}.quantity`);
                                          form.setValue(`items.${index}.total`, quantity * Number(product.price));
                                          setOpenProductCombobox(prev => ({ ...prev, [index]: false }));
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            field.value === product.name ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <div className="flex flex-col">
                                          <span>{product.name}</span>
                                          <span className="text-xs text-muted-foreground">
                                            ${Number(product.price).toFixed(2)}
                                          </span>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`items.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input placeholder="Description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Segunda linha: Quantity, Price, Total, Taxable, Delete */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-end">
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="1" 
                              {...field}
                              onChange={(e) => {
                                const quantity = Number(e.target.value);
                                field.onChange(quantity);
                                const unitPrice = form.getValues(`items.${index}.unit_price`);
                                form.setValue(`items.${index}.total`, quantity * unitPrice);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`items.${index}.unit_price`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit Price</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="0.00" 
                              {...field}
                              onChange={(e) => {
                                const unitPrice = Number(e.target.value);
                                field.onChange(unitPrice);
                                const quantity = form.getValues(`items.${index}.quantity`);
                                form.setValue(`items.${index}.total`, quantity * unitPrice);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div>
                      <FormLabel>Total</FormLabel>
                      <div className="text-sm font-medium p-2 bg-background rounded border">
                        ${(watchedItems[index]?.total || 0).toFixed(2)}
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name={`items.${index}.is_taxable`}
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Taxable</FormLabel>
                          <FormControl>
                            <div className="flex items-center h-10">
                              <Checkbox 
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="col-span-2 md:col-span-2 flex justify-end">
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals and Additional Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="tax_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Florida Sales Tax Rate (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="7" 
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="discount_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Amount</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="0.00" 
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional notes" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-3">Invoice Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax ({taxRate}%):</span>
                      <span>${taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Discount:</span>
                      <span>-${(discountAmount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-medium text-base border-t pt-2">
                      <span>Total:</span>
                      <span>${totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="terms_conditions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Terms & Conditions</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Payment terms and conditions" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : invoice ? "Update" : "Create"} Invoice
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
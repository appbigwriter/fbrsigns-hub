import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Quote Management Mutations
export const useUpdateQuote = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ quoteId, data }: { quoteId: string; data: any }) => {
      const { data: updatedQuote, error } = await supabase
        .from('orcamentos')
        .update(data)
        .eq('id', quoteId)
        .select()
        .single();

      if (error) throw error;
      return updatedQuote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast({
        title: "Success",
        description: "Quote updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update quote.",
        variant: "destructive",
      });
    },
  });
};

export const useApproveQuote = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ quoteId, estimate, notes }: { quoteId: string; estimate: number; notes?: string }) => {
      const { data, error } = await supabase
        .from('orcamentos')
        .update({
          status: 'aprovado',
          orcamento_estimado: estimate,
          observacoes_admin: notes,
        })
        .eq('id', quoteId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast({
        title: "Quote Approved",
        description: "Quote has been approved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve quote.",
        variant: "destructive",
      });
    },
  });
};

export const useRejectQuote = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ quoteId, reason }: { quoteId: string; reason: string }) => {
      const { data, error } = await supabase
        .from('orcamentos')
        .update({
          status: 'rejeitado',
          observacoes_admin: reason,
        })
        .eq('id', quoteId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast({
        title: "Quote Rejected",
        description: "Quote has been rejected.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject quote.",
        variant: "destructive",
      });
    },
  });
};

export const useConvertQuoteToOrder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (quoteId: string) => {
      // Get quote details
      const { data: quote, error: quoteError } = await supabase
        .from('orcamentos')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (quoteError) throw quoteError;
      if (!quote) throw new Error('Quote not found');

      if (quote.status !== 'aprovado') {
        throw new Error('Only approved quotes can be converted to orders');
      }

      // Create order from quote
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: quote.nome,
          customer_email: quote.email,
          customer_phone: quote.telefone,
          // total: Number(quote.orcamento_estimado || 0), // Removed: total is a generated column
          status: 'Pendente',
          notes: `Converted from quote: ${quote.servico} - ${quote.descricao}`,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order item from quote
      const { error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          name: quote.servico,
          description: quote.descricao,
          quantity: 1,
          price: Number(quote.orcamento_estimado || 0),
          total: Number(quote.orcamento_estimado || 0),
        });

      if (itemError) throw itemError;

      // Update quote status to converted
      const { error: updateError } = await supabase
        .from('orcamentos')
        .update({
          status: 'convertido',
          converted_to_order_id: order.id,
        })
        .eq('id', quoteId);

      if (updateError) throw updateError;

      return { order, quote };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({
        title: "Quote Converted",
        description: `Quote has been converted to order successfully.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to convert quote to order.",
        variant: "destructive",
      });
    },
  });
};

// Template Management Mutations
export const useCreateQuoteTemplate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (templateData: any) => {
      const { data, error } = await supabase
        .from('quote_templates')
        .insert(templateData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-templates'] });
      toast({
        title: "Template Created",
        description: "Quote template created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create template.",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateQuoteTemplate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ templateId, data }: { templateId: string; data: any }) => {
      const { data: updatedTemplate, error } = await supabase
        .from('quote_templates')
        .update(data)
        .eq('id', templateId)
        .select()
        .single();

      if (error) throw error;
      return updatedTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-templates'] });
      toast({
        title: "Template Updated",
        description: "Quote template updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update template.",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteQuoteTemplate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('quote_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-templates'] });
      toast({
        title: "Template Deleted",
        description: "Quote template deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete template.",
        variant: "destructive",
      });
    },
  });
};

// Generate Invoice from Order
export const useGenerateInvoice = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (orderId: string) => {
      console.log("Starting invoice generation for order:", orderId);
      // Get order details with items
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      if (!orderData) throw new Error('Order not found');

      // Check if invoice already exists in orders table
      if (orderData.invoice_number) {
        throw new Error('Invoice already exists for this order (checked in order)');
      }

      // Check if invoice already exists in invoices table (double check)
      const { data: existingInvoice, error: existingInvoiceError } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('order_id', orderId)
        .maybeSingle();
      
      if (existingInvoice) {
         // Update order if it was missing the reference
         await supabase
          .from('orders')
          .update({
            invoice_number: existingInvoice.invoice_number,
            invoice_generated_at: new Date().toISOString(),
          })
          .eq('id', orderId);
          
         throw new Error(`Invoice already exists: ${existingInvoice.invoice_number}`);
      }

      // Generate invoice number using database function with retry logic
      let invoiceNumber = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        // Try DB generation first
        let num = null;
        try {
            console.log("Attempting to generate invoice number via RPC...");
            const { data: dbNum, error: numberError } = await supabase.rpc('generate_invoice_number');
            if (!numberError && dbNum) {
                num = dbNum;
                console.log("RPC success:", num);
            } else {
                console.warn("RPC returned error or null:", numberError);
            }
        } catch (e) {
            console.warn("RPC generate_invoice_number failed, using client-side fallback", e);
        }

        // Fallback if RPC fails or returns null
        if (!num) {
            const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            num = `INV-${datePart}-${randomPart}`;
            console.log("Generated client-side fallback:", num);
        }
        
        // Check if this number is really unique in invoices table
        const { data: conflictCheck } = await supabase
          .from('invoices')
          .select('id')
          .eq('invoice_number', num)
          .maybeSingle();
          
        if (!conflictCheck) {
          invoiceNumber = num;
          break;
        }
        
        console.warn("Collision detected for number:", num, "Retrying...");
        attempts++;
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (!invoiceNumber) {
         // Final desperate fallback with timestamp to guarantee uniqueness
         const timestamp = Date.now();
         const random = Math.floor(Math.random() * 1000);
         invoiceNumber = `INV-${timestamp}-${random}`;
         console.log("Using final desperate fallback:", invoiceNumber);
      }

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          order_id: orderId,
          customer_id: orderData.customer_id,
          customer_name: orderData.customer_name,
          customer_email: orderData.customer_email,
          customer_phone: orderData.customer_phone,
          customer_address: orderData.shipping_address,
          invoice_number: invoiceNumber,
          subtotal: Number(orderData.total),
          tax_amount: 0,
          total_amount: Number(orderData.total),
          status: 'Pending',
          payment_status: orderData.payment_status || 'Unpaid',
          payment_method: orderData.payment_method,
          issue_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items from order items
      if (orderData.order_items && orderData.order_items.length > 0) {
        const invoiceItems = orderData.order_items.map((item: any) => ({
          invoice_id: invoice.id,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit_price: Number(item.price),
          total: Number(item.total || item.price * item.quantity),
        }));

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(invoiceItems);

        if (itemsError) throw itemsError;
      }

      // Check if order has payment info (e.g. from Stripe) and record payment if needed
      // This is a simplified logic. Ideally we should have a separate payments table.
      // But based on user request, we need to ensure payment info is on the invoice.
      if (orderData.payment_method && orderData.status !== 'Pendente') {
         // Assuming if status is not Pending, payment might have occurred or is confirmed
         // Update invoice to reflect payment if needed
         if (['Confirmado', 'Processando', 'Em Produção', 'Concluído', 'Enviado', 'Entregue'].includes(orderData.status)) {
             const { error: paymentUpdateError } = await supabase
               .from('invoices')
               .update({
                 payment_status: 'Paid',
                 payment_method: orderData.payment_method,
                 paid_date: orderData.created_at // Approximation, or use current date
               })
               .eq('id', invoice.id);
               
             if (paymentUpdateError) console.error("Error updating invoice payment status:", paymentUpdateError);
         }
      }

      // Update order with invoice information
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          invoice_number: invoiceNumber,
          invoice_generated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      return { invoice, invoiceNumber };
    },
    onSuccess: (data) => {
      toast({
        title: "Invoice Generated",
        description: `Invoice ${data.invoiceNumber} has been created successfully.`,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate invoice. Please try again.",
        variant: "destructive",
      });
    },
  });
};

// Order Management Mutations
export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: any) => {
      const { data: newOrder, error } = await supabase
        .from('orders')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return newOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({
        title: "Success",
        description: "Order created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create order.",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateOrder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ orderId, data }: { orderId: string; data: any }) => {
      const { data: updatedOrder, error } = await supabase
        .from('orders')
        .update(data)
        .eq('id', orderId)
        .select()
        .single();
      
      if (error) throw error;
      return updatedOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({
        title: "Success",
        description: "Order updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to update order.",
        variant: "destructive",
      });
    },
  });
};
export const useDeleteOrder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (orderId: string) => {
      // 1. Unlink quotes (set converted_to_order_id to null)
      const { error: quoteError } = await supabase
        .from('orcamentos')
        .update({ converted_to_order_id: null })
        .eq('converted_to_order_id', orderId);
        
      if (quoteError) {
        console.error("Error unlinking quotes:", quoteError);
        // Continue even if this fails, though it might cause FK violation if strict
      }

      // 2. Delete invoices (this cascades to invoice_items and payments usually)
      const { error: invoiceError } = await supabase
        .from('invoices')
        .delete()
        .eq('order_id', orderId);

      if (invoiceError) throw invoiceError;

      // 3. Delete order items
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      // 4. Delete the order itself
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] }); // Also invalidate invoices
      toast({
        title: 'Success',
        description: 'Order and related data deleted successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete order.',
        variant: 'destructive',
      });
    },
  });
};

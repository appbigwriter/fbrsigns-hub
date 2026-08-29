import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const transactionSchema = z.object({
  raw_material_id: z.string().min(1, "Raw material is required"),
  transaction_type: z.enum(["in", "out", "adjustment"], {
    required_error: "Transaction type is required",
  }),
  quantity: z.number().min(0.01, "Quantity must be positive"),
  unit_cost: z.number().min(0, "Unit cost cannot be negative").optional(),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface StockTransactionFormProps {
  onSuccess: () => void;
}

export function StockTransactionForm({ onSuccess }: StockTransactionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rawMaterials } = useQuery({
    queryKey: ["raw-materials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("raw_materials")
        .select("id, name, unit_of_measure, current_stock")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      raw_material_id: "",
      transaction_type: "in",
      quantity: 0,
      unit_cost: undefined,
      reference_number: "",
      notes: "",
    },
  });

  const selectedMaterial = rawMaterials?.find(
    (material) => material.id === form.watch("raw_material_id")
  );

  const createTransaction = useMutation({
    mutationFn: async (data: TransactionFormData) => {
      const user = await supabase.auth.getUser();
      
      const transactionData = {
        raw_material_id: data.raw_material_id,
        transaction_type: data.transaction_type,
        quantity: data.quantity,
        unit_cost: data.unit_cost || null,
        total_cost: data.unit_cost ? data.quantity * data.unit_cost : null,
        reference_number: data.reference_number || null,
        notes: data.notes || null,
        created_by: user.data.user?.id || null,
      };

      const { error } = await supabase
        .from("raw_material_transactions")
        .insert(transactionData);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["raw-materials"] });
      queryClient.invalidateQueries({ queryKey: ["raw-material-transactions"] });
      toast({ title: "Success", description: "Transaction recorded successfully" });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to record transaction: " + error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: TransactionFormData) => {
    setIsLoading(true);
    
    try {
      await createTransaction.mutateAsync(data);
    } finally {
      setIsLoading(false);
    }
  };

  const transactionType = form.watch("transaction_type");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="raw_material_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Raw Material *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select raw material" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {rawMaterials?.map((material) => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.name} (Current: {material.current_stock} {material.unit_of_measure})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="transaction_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Transaction Type *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select transaction type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="in">Stock In (Add)</SelectItem>
                  <SelectItem value="out">Stock Out (Remove)</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Quantity * 
                  {selectedMaterial && ` (${selectedMaterial.unit_of_measure})`}
                </FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    {...field} 
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="unit_cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit Cost</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00"
                    {...field} 
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="reference_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reference Number</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., PO-001, INV-123" />
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
                <Textarea 
                  {...field} 
                  rows={3} 
                  placeholder="Additional details about this transaction..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedMaterial && (
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Transaction Preview</h4>
            <div className="text-sm space-y-1">
              <div>Current Stock: {selectedMaterial.current_stock} {selectedMaterial.unit_of_measure}</div>
              <div>
                New Stock: {
                  transactionType === "in" 
                    ? selectedMaterial.current_stock + (form.watch("quantity") || 0)
                    : transactionType === "out"
                    ? selectedMaterial.current_stock - (form.watch("quantity") || 0)
                    : form.watch("quantity") || 0
                } {selectedMaterial.unit_of_measure}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Recording..." : "Record Transaction"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
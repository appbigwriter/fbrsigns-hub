import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const customerSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Valid email is required"),
  phone_number: z.string().optional(),
  company_name: z.string().optional(),
  address: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerInlineFormProps {
  customer?: any;
  onSuccess: () => void;
}

export function CustomerInlineForm({ customer, onSuccess }: CustomerInlineFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      full_name: customer?.full_name || "",
      email: customer?.email || "",
      phone_number: customer?.phone_number || "",
      company_name: customer?.company_name || "",
      address: customer?.address || "",
    },
  });

  const createCustomer = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const customerData = {
        id: crypto.randomUUID(),
        full_name: data.full_name,
        email: data.email,
        phone_number: data.phone_number || null,
        company_name: data.company_name || null,
        address: data.address || null,
      };

      const { error } = await supabase
        .from("customers")
        .insert(customerData);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers-management"] });
      toast({
        title: "Success",
        description: "Customer created successfully",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCustomer = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const customerData = {
        full_name: data.full_name,
        email: data.email,
        phone_number: data.phone_number || null,
        company_name: data.company_name || null,
        address: data.address || null,
      };

      const { error } = await supabase
        .from("customers")
        .update(customerData)
        .eq("id", customer.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers-management"] });
      toast({
        title: "Success",
        description: "Customer updated successfully",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    if (customer) {
      updateCustomer.mutate(data);
    } else {
      createCustomer.mutate(data);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter full name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Enter email address" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="company_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter company name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input placeholder="Enter phone number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input placeholder="Enter address" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button
            type="submit"
            disabled={createCustomer.isPending || updateCustomer.isPending}
          >
            {createCustomer.isPending || updateCustomer.isPending
              ? "Saving..."
              : customer
              ? "Update Customer"
              : "Create Customer"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
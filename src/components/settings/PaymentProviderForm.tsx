import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const paymentProviderSchema = z.object({
  provider: z.string().min(1, "Provider is required"),
  publishable_key: z.string()
    .min(1, "Publishable key is required")
    .regex(/^pk_/, "Must start with 'pk_' (Publishable Key)"),
  secret_key: z.string()
    .min(1, "Secret key is required")
    .regex(/^(sk_|rk_)/, "Must start with 'sk_' (Secret Key) or 'rk_' (Restricted Key)"),
  webhook_url: z.string().url("Invalid webhook URL").optional().or(z.literal("")),
  is_active: z.boolean().default(true),
});

type PaymentProviderFormData = z.infer<typeof paymentProviderSchema>;

export function PaymentProviderForm() {
  const [loading, setLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("stripe");
  const [integrationId, setIntegrationId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<PaymentProviderFormData>({
    resolver: zodResolver(paymentProviderSchema),
    defaultValues: {
      provider: "stripe",
      publishable_key: "",
      secret_key: "",
      webhook_url: "",
      is_active: true,
    },
  });
  
  const { data: existingIntegration } = useQuery({
    queryKey: ["payment-provider-integration", selectedProvider],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integrations")
        .select("*")
        .eq("provider", selectedProvider)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (existingIntegration) {
      setIntegrationId(existingIntegration.id);
      const config = existingIntegration.config as any;
      form.reset({
        provider: existingIntegration.provider,
        publishable_key: config?.publishable_key || "",
        secret_key: existingIntegration.api_key || "",
        webhook_url: existingIntegration.webhook_url || "",
        is_active: existingIntegration.is_active,
      });
    } else {
      setIntegrationId(null);
      form.reset({
        provider: selectedProvider,
        publishable_key: "",
        secret_key: "",
        webhook_url: "",
        is_active: true,
      });
    }
  }, [existingIntegration, form, selectedProvider]);

  const saveIntegration = useMutation({
    mutationFn: async (data: PaymentProviderFormData) => {
      const user = await supabase.auth.getUser();
      
      const integrationData = {
        name: `${data.provider.charAt(0).toUpperCase() + data.provider.slice(1)} Payment`,
        type: "payment_provider",
        provider: data.provider,
        config: {
          publishable_key: data.publishable_key.trim(),
        },
        api_key: data.secret_key.trim(),
        webhook_url: data.webhook_url ? data.webhook_url.trim() : null,
        is_active: data.is_active,
        created_by: user.data.user?.id,
      };

      if (integrationId) {
        const { error } = await supabase
          .from("integrations")
          .update(integrationData)
          .eq("id", integrationId);
        
        if (error) throw error;
      } else {
        const { data: newIntegration, error } = await supabase
          .from("integrations")
          .insert(integrationData)
          .select()
          .single();
        
        if (error) throw error;
        setIntegrationId(newIntegration.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-provider-integration"] });
      toast({
        title: "Success",
        description: "Payment provider settings saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PaymentProviderFormData) => {
    saveIntegration.mutate(data);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Payment Processors</h3>
          <p className="text-sm text-muted-foreground">
            Configure payment processing integrations
          </p>
        </div>
        {existingIntegration && (
          <Badge variant={existingIntegration.is_active ? "default" : "secondary"}>
            {existingIntegration.is_active ? "Active" : "Inactive"}
          </Badge>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="provider"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Provider</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value);
                    setSelectedProvider(value);
                  }} 
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                    <SelectItem value="square">Square</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="publishable_key"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Publishable Key</FormLabel>
                <FormControl>
                  <Input placeholder="pk_test_..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="secret_key"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Secret Key</FormLabel>
                <FormControl>
                  <Input type="text" placeholder="sk_test_..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="webhook_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Webhook URL (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="https://your-domain.com/webhooks/payment" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Enable Payment Provider</FormLabel>
                  <div className="text-sm text-muted-foreground">
                    Enable or disable this payment provider for transactions
                  </div>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={saveIntegration.isPending}
            >
              {saveIntegration.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
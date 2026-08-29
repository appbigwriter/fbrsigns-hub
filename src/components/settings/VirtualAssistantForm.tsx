import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const virtualAssistantSchema = z.object({
  provider: z.string().min(1, "Provider is required"),
  model: z.string().min(1, "Model is required"),
  api_key: z.string().min(1, "API key is required"),
  system_prompt: z.string().min(1, "System prompt is required"),
  temperature: z.number().min(0).max(2).default(0.7),
  max_tokens: z.number().min(1).max(8000).default(1000),
  is_active: z.boolean().default(true),
});

type VirtualAssistantFormData = z.infer<typeof virtualAssistantSchema>;

export function VirtualAssistantForm() {
  const [loading, setLoading] = useState(false);
  const [integrationId, setIntegrationId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<VirtualAssistantFormData>({
    resolver: zodResolver(virtualAssistantSchema),
    defaultValues: {
      provider: "openai",
      model: "gpt-4o-mini",
      api_key: "",
      system_prompt: "You are a helpful AI assistant for FBRSigns, a sign and graphics company. Help customers with their inquiries about products, services, and orders.",
      temperature: 0.7,
      max_tokens: 1000,
      is_active: true,
    },
  });

  const { data: existingIntegration } = useQuery({
    queryKey: ["virtual-assistant-integration"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integrations")
        .select("*")
        .eq("type", "virtual_assistant")
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
        provider: config?.provider || "openai",
        model: config?.model || "gpt-4o-mini",
        api_key: existingIntegration.api_key || "",
        system_prompt: config?.system_prompt || form.getValues("system_prompt"),
        temperature: config?.temperature || 0.7,
        max_tokens: config?.max_tokens || 1000,
        is_active: existingIntegration.is_active,
      });
    }
  }, [existingIntegration, form]);

  const saveIntegration = useMutation({
    mutationFn: async (data: VirtualAssistantFormData) => {
      const user = await supabase.auth.getUser();
      
      const integrationData = {
        name: "Virtual Assistant",
        type: "virtual_assistant",
        provider: data.provider,
        config: {
          provider: data.provider,
          model: data.model,
          system_prompt: data.system_prompt,
          temperature: data.temperature,
          max_tokens: data.max_tokens,
        },
        api_key: data.api_key,
        is_active: data.is_active,
        created_by: user.data.user?.id,
      };

      if (integrationId) {
        const { error } = await supabase
          .from("integrations" as any)
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
      queryClient.invalidateQueries({ queryKey: ["virtual-assistant-integration"] });
      toast({
        title: "Success",
        description: "Virtual assistant settings saved successfully",
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

  const onSubmit = (data: VirtualAssistantFormData) => {
    saveIntegration.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="provider"
            render={({ field }) => (
              <FormItem>
                <FormLabel>LLM Provider</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="google">Google Gemini</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., gpt-4o-mini" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="api_key"
          render={({ field }) => (
            <FormItem>
              <FormLabel>API Key</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Enter API key" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="system_prompt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>System Prompt</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter system prompt for the AI assistant"
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="temperature"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Temperature (0-2)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="max_tokens"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Tokens</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    max="8000"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Virtual Assistant</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Enable or disable the AI virtual assistant for customer interactions
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
  );
}
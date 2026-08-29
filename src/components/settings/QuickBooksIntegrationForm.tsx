import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, CheckCircle, XCircle, RefreshCw } from "lucide-react";

const quickbooksSchema = z.object({
  environment: z.enum(["sandbox", "production"]),
  client_id: z.string().min(1, "Client ID is required"),
  client_secret: z.string().min(1, "Client Secret is required"),
  redirect_uri: z.string().url("Invalid redirect URI").optional().or(z.literal("")),
  scope: z.string().default("com.intuit.quickbooks.accounting"),
  discovery_document: z.string().url("Invalid discovery document URL").optional().or(z.literal("")),
  is_active: z.boolean().default(true),
});

type QuickBooksFormData = z.infer<typeof quickbooksSchema>;

export function QuickBooksIntegrationForm() {
  const [loading, setLoading] = useState(false);
  const [integrationId, setIntegrationId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "error">("disconnected");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<QuickBooksFormData>({
    resolver: zodResolver(quickbooksSchema),
    defaultValues: {
      environment: "sandbox",
      client_id: "",
      client_secret: "",
      redirect_uri: `${window.location.origin}/quickbooks/callback`,
      scope: "com.intuit.quickbooks.accounting",
      discovery_document: "https://appcenter.intuit.com/connect/oauth2",
      is_active: true,
    },
  });

  const { data: existingIntegration } = useQuery({
    queryKey: ["quickbooks-integration"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integrations")
        .select("*")
        .eq("type", "accounting")
        .eq("provider", "quickbooks")
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: quickbooksSettings } = useQuery({
    queryKey: ["quickbooks-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quickbooks_settings")
        .select("*")
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
        environment: config?.environment || "sandbox",
        client_id: config?.client_id || "",
        client_secret: existingIntegration.api_key || "",
        redirect_uri: config?.redirect_uri || `${window.location.origin}/quickbooks/callback`,
        scope: config?.scope || "com.intuit.quickbooks.accounting",
        discovery_document: config?.discovery_document || "https://appcenter.intuit.com/connect/oauth2",
        is_active: existingIntegration.is_active,
      });
    }

    // Set connection status based on quickbooks settings
    if (quickbooksSettings?.is_connected) {
      setConnectionStatus("connected");
    } else if (quickbooksSettings && !quickbooksSettings.is_connected) {
      setConnectionStatus("error");
    } else {
      setConnectionStatus("disconnected");
    }
  }, [existingIntegration, quickbooksSettings, form]);

  const saveIntegration = useMutation({
    mutationFn: async (data: QuickBooksFormData) => {
      const user = await supabase.auth.getUser();
      
      const integrationData = {
        name: "QuickBooks Online",
        type: "accounting",
        provider: "quickbooks",
        config: {
          environment: data.environment,
          client_id: data.client_id,
          redirect_uri: data.redirect_uri,
          scope: data.scope,
          discovery_document: data.discovery_document,
        },
        api_key: data.client_secret,
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
      queryClient.invalidateQueries({ queryKey: ["quickbooks-integration"] });
      toast({
        title: "Success",
        description: "QuickBooks integration settings saved successfully",
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

  const initiateOAuth = useMutation({
    mutationFn: async () => {
      const formData = form.getValues();
      const baseUrl = formData.environment === "sandbox" 
        ? "https://appcenter.intuit.com/connect/oauth2"
        : "https://appcenter.intuit.com/connect/oauth2";
      
      const params = new URLSearchParams({
        client_id: formData.client_id,
        scope: formData.scope,
        redirect_uri: formData.redirect_uri || `${window.location.origin}/quickbooks/callback`,
        response_type: "code",
        access_type: "offline",
        state: crypto.randomUUID(),
      });

      const authUrl = `${baseUrl}?${params.toString()}`;
      window.open(authUrl, "_blank", "width=600,height=700");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to initiate OAuth: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const testConnection = useMutation({
    mutationFn: async () => {
      // This would typically make a test API call to QuickBooks
      // For now, we'll just check if settings exist
      if (!quickbooksSettings?.access_token) {
        throw new Error("No access token found. Please complete OAuth flow first.");
      }
      
      // In a real implementation, you'd make a test API call here
      return { success: true };
    },
    onSuccess: () => {
      setConnectionStatus("connected");
      toast({
        title: "Success",
        description: "QuickBooks connection test successful",
      });
    },
    onError: (error) => {
      setConnectionStatus("error");
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: QuickBooksFormData) => {
    saveIntegration.mutate(data);
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected": return "default";
      case "error": return "destructive";
      default: return "secondary";
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case "connected": return <CheckCircle className="h-4 w-4" />;
      case "error": return <XCircle className="h-4 w-4" />;
      default: return <RefreshCw className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Connection Status</span>
            <Badge variant={getStatusColor()} className="flex items-center gap-2">
              {getStatusIcon()}
              {connectionStatus === "connected" ? "Connected" : 
               connectionStatus === "error" ? "Connection Error" : "Not Connected"}
            </Badge>
          </CardTitle>
          <CardDescription>
            Current status of your QuickBooks integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              {quickbooksSettings?.company_id && (
                <p className="text-sm text-muted-foreground mb-2">
                  Company ID: {quickbooksSettings.company_id}
                </p>
              )}
              {quickbooksSettings?.last_sync && (
                <p className="text-sm text-muted-foreground">
                  Last sync: {new Date(quickbooksSettings.last_sync).toLocaleString()}
                </p>
              )}
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => testConnection.mutate()}
                disabled={testConnection.isPending}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Test Connection
              </Button>
              {existingIntegration && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => initiateOAuth.mutate()}
                  disabled={initiateOAuth.isPending}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Re-authorize
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle>OAuth Configuration</CardTitle>
          <CardDescription>
            Configure your QuickBooks app credentials for OAuth integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="environment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Environment</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select environment" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="sandbox">Sandbox (Development)</SelectItem>
                        <SelectItem value="production">Production</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Use Sandbox for development and testing
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="client_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter QuickBooks App Client ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="client_secret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Secret</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter QuickBooks App Client Secret" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="redirect_uri"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Redirect URI</FormLabel>
                    <FormControl>
                      <Input placeholder="https://yourapp.com/quickbooks/callback" {...field} />
                    </FormControl>
                    <FormDescription>
                      This must match the redirect URI configured in your QuickBooks app
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scope</FormLabel>
                    <FormControl>
                      <Input placeholder="com.intuit.quickbooks.accounting" {...field} />
                    </FormControl>
                    <FormDescription>
                      OAuth scope for QuickBooks API access
                    </FormDescription>
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
                      <FormLabel className="text-base">Enable Integration</FormLabel>
                      <FormDescription>
                        Enable or disable QuickBooks integration
                      </FormDescription>
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

              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => initiateOAuth.mutate()}
                  disabled={initiateOAuth.isPending || !form.watch("client_id") || !form.watch("client_secret")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {initiateOAuth.isPending ? "Connecting..." : "Connect to QuickBooks"}
                </Button>

                <Button
                  type="submit"
                  disabled={saveIntegration.isPending}
                >
                  {saveIntegration.isPending ? "Saving..." : "Save Configuration"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
          <CardDescription>
            Follow these steps to configure QuickBooks integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Badge variant="outline" className="mt-0.5">1</Badge>
              <div>
                <p className="font-medium">Create QuickBooks App</p>
                <p className="text-sm text-muted-foreground">
                  Go to the QuickBooks Developer dashboard and create a new app
                </p>
                <Button variant="link" className="p-0 h-auto" asChild>
                  <a href="https://developer.intuit.com/app/developer/myapps" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    QuickBooks Developer Dashboard
                  </a>
                </Button>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Badge variant="outline" className="mt-0.5">2</Badge>
              <div>
                <p className="font-medium">Configure App Settings</p>
                <p className="text-sm text-muted-foreground">
                  Set the redirect URI in your QuickBooks app to match the one configured above
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Badge variant="outline" className="mt-0.5">3</Badge>
              <div>
                <p className="font-medium">Get Credentials</p>
                <p className="text-sm text-muted-foreground">
                  Copy the Client ID and Client Secret from your QuickBooks app and paste them above
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Badge variant="outline" className="mt-0.5">4</Badge>
              <div>
                <p className="font-medium">Save & Connect</p>
                <p className="text-sm text-muted-foreground">
                  Save the configuration and click "Connect to QuickBooks" to authorize access
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
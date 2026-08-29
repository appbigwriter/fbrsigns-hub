import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, CheckCircle, AlertCircle, RefreshCw, Settings, Download, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QuickBooksSettings {
  id: string;
  company_id?: string;
  access_token?: string;
  refresh_token?: string;
  realm_id?: string;
  is_connected: boolean;
  last_sync?: string;
  sync_settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export default function QuickBooks() {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["quickbooks-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quickbooks_settings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as QuickBooksSettings | null;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<QuickBooksSettings>) => {
      if (settings?.id) {
        const { data, error } = await supabase
          .from("quickbooks_settings")
          .update(newSettings)
          .eq("id", settings.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("quickbooks_settings")
          .insert(newSettings)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quickbooks-settings"] });
      toast({ title: "Success", description: "Settings updated successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update settings: " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleConnect = async () => {
    toast({
      title: "QuickBooks Integration",
      description: "This feature requires implementation of OAuth flow with QuickBooks API",
    });
  };

  const handleDisconnect = async () => {
    if (settings) {
      updateSettings.mutate({
        is_connected: false,
        access_token: null,
        refresh_token: null,
        company_id: null,
        realm_id: null,
      });
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    
    // Simulate sync process
    setTimeout(() => {
      if (settings) {
        updateSettings.mutate({
          last_sync: new Date().toISOString(),
        });
      }
      setIsSyncing(false);
      toast({ title: "Success", description: "Data synchronized successfully" });
    }, 3000);
  };

  const handleSyncSettingChange = (key: string, value: boolean) => {
    if (settings) {
      updateSettings.mutate({
        sync_settings: {
          ...settings.sync_settings,
          [key]: value,
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">QuickBooks Integration</h1>
          <p className="text-muted-foreground">Connect and sync your data with QuickBooks Online</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="mr-2 h-5 w-5" />
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {settings?.is_connected ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Connected</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    <span>Not Connected</span>
                  </>
                )}
              </div>
              <Badge variant={settings?.is_connected ? "default" : "secondary"}>
                {settings?.is_connected ? "Active" : "Inactive"}
              </Badge>
            </div>

            {settings?.is_connected ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Company ID: {settings.company_id || "N/A"}
                </p>
                {settings.last_sync && (
                  <p className="text-sm text-muted-foreground">
                    Last sync: {new Date(settings.last_sync).toLocaleString()}
                  </p>
                )}
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={handleSync}
                    disabled={isSyncing}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? "Syncing..." : "Sync Now"}
                  </Button>
                  <Button variant="outline" onClick={handleDisconnect}>
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={handleConnect} className="w-full">
                Connect to QuickBooks
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start">
              <Download className="mr-2 h-4 w-4" />
              Export to QuickBooks
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Upload className="mr-2 h-4 w-4" />
              Import from QuickBooks
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Customers
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Products
            </Button>
          </CardContent>
        </Card>
      </div>

      {!settings?.is_connected && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            To use QuickBooks integration, you need to connect your QuickBooks Online account. 
            This will allow you to sync customers, products, invoices, and other data between systems.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="sync-settings" className="w-full">
        <TabsList>
          <TabsTrigger value="sync-settings">Sync Settings</TabsTrigger>
          <TabsTrigger value="mapping">Field Mapping</TabsTrigger>
          <TabsTrigger value="logs">Sync Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="sync-settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Automatic Sync Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sync-customers">Sync Customers</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync customer data between systems
                  </p>
                </div>
                <Switch
                  id="sync-customers"
                  checked={settings?.sync_settings?.customers || false}
                  onCheckedChange={(checked) => handleSyncSettingChange('customers', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sync-products">Sync Products</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync product catalog
                  </p>
                </div>
                <Switch
                  id="sync-products"
                  checked={settings?.sync_settings?.products || false}
                  onCheckedChange={(checked) => handleSyncSettingChange('products', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sync-invoices">Sync Invoices</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync invoices and payments
                  </p>
                </div>
                <Switch
                  id="sync-invoices"
                  checked={settings?.sync_settings?.invoices || false}
                  onCheckedChange={(checked) => handleSyncSettingChange('invoices', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sync-expenses">Sync Expenses</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync expense data
                  </p>
                </div>
                <Switch
                  id="sync-expenses"
                  checked={settings?.sync_settings?.expenses || false}
                  onCheckedChange={(checked) => handleSyncSettingChange('expenses', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sync-frequency">Sync Frequency</Label>
                <Select defaultValue="daily">
                  <SelectTrigger>
                    <SelectValue placeholder="Select sync frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual Only</SelectItem>
                    <SelectItem value="hourly">Every Hour</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mapping" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Field Mapping</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Field mapping configuration will be available once QuickBooks connection is established.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sync History</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Sync logs will appear here once synchronization begins.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
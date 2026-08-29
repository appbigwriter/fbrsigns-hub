import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Bell, Mail, MessageSquare, CreditCard, Package } from "lucide-react";

interface NotificationSetting {
  id: string;
  key: string;
  category: string;
  description: string;
  enabled: boolean;
  icon: any;
}

const defaultNotificationSettings: NotificationSetting[] = [
  {
    id: "email_new_order",
    key: "email_new_order",
    category: "Orders",
    description: "Email notifications for new orders",
    enabled: true,
    icon: Package,
  },
  {
    id: "email_payment_received",
    key: "email_payment_received", 
    category: "Payments",
    description: "Email notifications when payments are received",
    enabled: true,
    icon: CreditCard,
  },
  {
    id: "email_quote_request",
    key: "email_quote_request",
    category: "Quotes",
    description: "Email notifications for new quote requests",
    enabled: true,
    icon: MessageSquare,
  },
  {
    id: "system_low_stock",
    key: "system_low_stock",
    category: "Inventory",
    description: "System alerts for low stock items",
    enabled: true,
    icon: Package,
  },
];

export function NotificationSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["notification-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .eq("category", "notifications");
      
      if (error) throw error;
      return data || [];
    },
  });

  const updateSetting = useMutation({
    mutationFn: async ({ key, enabled }: { key: string; enabled: boolean }) => {
      const existingSetting = settings?.find(s => s.key === key);
      
      if (existingSetting) {
        const { error } = await supabase
          .from("settings")
          .update({ 
            value: { enabled },
            updated_at: new Date().toISOString()
          })
          .eq("key", key);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("settings")
          .insert({
            key,
            value: { enabled },
            description: defaultNotificationSettings.find(s => s.key === key)?.description,
            category: "notifications",
            is_public: false,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
      toast({
        title: "Success",
        description: "Notification setting updated successfully",
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

  const getSettingValue = (key: string): boolean => {
    const setting = settings?.find(s => s.key === key);
    const value = setting?.value as any;
    return value?.enabled ?? true;
  };

  const handleToggle = (key: string, enabled: boolean) => {
    updateSetting.mutate({ key, enabled });
  };

  if (isLoading) {
    return <div>Loading notification settings...</div>;
  }

  const groupedSettings = defaultNotificationSettings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, NotificationSetting[]>);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Notification Preferences</h3>
        <p className="text-sm text-muted-foreground">
          Configure how and when you receive notifications
        </p>
      </div>

      {Object.entries(groupedSettings).map(([category, categorySettings]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {category}
            </CardTitle>
            <CardDescription>
              Manage {category.toLowerCase()} notification settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {categorySettings.map((setting) => {
              const IconComponent = setting.icon;
              const isEnabled = getSettingValue(setting.key);
              
              return (
                <div
                  key={setting.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <IconComponent className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{setting.description}</div>
                      <div className="text-sm text-muted-foreground">
                        {setting.key}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={isEnabled ? "default" : "secondary"}>
                      {isEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(enabled) => handleToggle(setting.key, enabled)}
                      disabled={updateSetting.isPending}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Global Settings</CardTitle>
          <CardDescription>
            Overall notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">Email Notifications</div>
                <div className="text-sm text-muted-foreground">
                  Receive notifications via email
                </div>
              </div>
            </div>
            <Switch
              checked={getSettingValue("global_email_notifications")}
              onCheckedChange={(enabled) => handleToggle("global_email_notifications", enabled)}
              disabled={updateSetting.isPending}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
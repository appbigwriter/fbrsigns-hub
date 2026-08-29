import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanyInfoForm } from "@/components/settings/CompanyInfoForm";
import { VirtualAssistantForm } from "@/components/settings/VirtualAssistantForm";
import { PaymentProviderForm } from "@/components/settings/PaymentProviderForm";
import { QuickBooksIntegrationForm } from "@/components/settings/QuickBooksIntegrationForm";
import { NotificationSettings } from "@/components/settings/NotificationSettings";

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application settings and preferences.
        </p>
      </div>

      <Tabs defaultValue="company" className="space-y-4">
        <TabsList>
          <TabsTrigger value="company">Company Information</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>
                Update your company details that will appear on invoices and quotes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CompanyInfoForm />
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="integrations" className="space-y-4">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Virtual Assistant Settings</CardTitle>
                <CardDescription>
                  Configure your AI virtual assistant integration.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VirtualAssistantForm />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Payment Provider Settings</CardTitle>
                <CardDescription>
                  Configure payment processing integrations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentProviderForm />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>QuickBooks Integration</CardTitle>
                <CardDescription>
                  Connect with QuickBooks for accounting synchronization.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <QuickBooksIntegrationForm />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure how and when you receive notifications.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationSettings />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
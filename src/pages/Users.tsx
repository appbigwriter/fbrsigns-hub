import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminsTab } from "@/components/users/AdminsTab";
import { CustomersTab } from "@/components/users/CustomersTab";

export default function Users() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">
          Manage administrators and customers in your system.
        </p>
      </div>

      <Tabs defaultValue="admins" className="space-y-4">
        <TabsList>
          <TabsTrigger value="admins">Administrators</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="admins" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Administrators</CardTitle>
              <CardDescription>
                Manage system administrators and their permissions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdminsTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Management</CardTitle>
              <CardDescription>
                Manage customer accounts and information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CustomersTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
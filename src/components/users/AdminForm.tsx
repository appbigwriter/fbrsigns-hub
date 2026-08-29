import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";

const adminSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  role: z.string().default("admin"),
  active: z.boolean().default(true),
  password: z.string().optional(),
});

type AdminFormData = z.infer<typeof adminSchema>;

interface AdminFormProps {
  admin?: any;
  onSuccess: () => void;
}

export function AdminForm({ admin, onSuccess }: AdminFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AdminFormData>({
    resolver: zodResolver(adminSchema),
    defaultValues: {
      full_name: admin?.full_name || "",
      email: admin?.email || "",
      role: admin?.role || "admin",
      active: admin?.active ?? true,
      password: "",
    },
  });

  const createAdmin = useMutation({
    mutationFn: async (data: AdminFormData) => {
      if (!data.password) {
        throw new Error("Password is required for new administrators");
      }

      const { data: response, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'create',
          email: data.email,
          password: data.password,
          full_name: data.full_name,
          role: data.role,
        }
      });

      if (error) {
        console.error("Edge Function Invoke Error:", error);
        // Try to parse the error message from the response if possible
        let errorMessage = error.message;
        if (error instanceof Error && 'context' in error) {
           // @ts-ignore
           const context = error.context as Response;
           if (context && typeof context.json === 'function') {
             try {
               const body = await context.json();
               if (body.error) errorMessage = body.error;
             } catch (e) {
               console.error("Failed to parse error response", e);
             }
           }
        }
        throw new Error(errorMessage);
      }
      
      if (response?.error) {
        console.error("Edge Function Response Error:", response.error);
        throw new Error(response.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      toast({
        title: "Success",
        description: "Administrator created successfully",
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

  const updateAdmin = useMutation({
    mutationFn: async (data: AdminFormData) => {
      // 1. Update Profile Info
      const adminData = {
        full_name: data.full_name,
        email: data.email,
        role: data.role,
        active: data.active,
      };

      const { error: dbError } = await supabase
        .from("admins")
        .update(adminData)
        .eq("id", admin.id);

      if (dbError) throw dbError;

      // 2. Update Password if provided
      if (data.password && data.password.trim() !== "") {
        if (!admin.user_id) {
          throw new Error("Cannot update password: User ID not found (Legacy record?)");
        }

        const { data: response, error: fnError } = await supabase.functions.invoke('manage-users', {
          body: {
            action: 'updatePassword',
            userId: admin.user_id,
            password: data.password,
          }
        });

        if (fnError) {
          console.error("Function Error:", fnError);
          throw fnError;
        }
        
        if (response?.error) {
          console.error("Response Error:", response.error);
          throw new Error(response.error);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      toast({
        title: "Success",
        description: "Administrator updated successfully",
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

  const onSubmit = (data: AdminFormData) => {
    if (admin) {
      updateAdmin.mutate(data);
    } else {
      createAdmin.mutate(data);
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
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{admin ? "New Password (Optional)" : "Password"}</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"} 
                    placeholder={admin ? "Leave blank to keep current" : "Enter password"} 
                    {...field} 
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active Status</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Enable or disable this administrator account
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

        <div className="flex justify-end space-x-2">
          <Button
            type="submit"
            disabled={createAdmin.isPending || updateAdmin.isPending}
          >
            {createAdmin.isPending || updateAdmin.isPending
              ? "Saving..."
              : admin
              ? "Update Administrator"
              : "Create Administrator"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
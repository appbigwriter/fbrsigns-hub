import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Save, Upload } from "lucide-react";
import { LogoUpload } from "./LogoUpload";

const companyInfoSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  company_email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  company_phone: z.string().optional(),
  company_address: z.string().optional(),
  company_website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  tax_id: z.string().optional(),
  registration_number: z.string().optional(),
  invoice_terms: z.string().optional(),
  invoice_footer: z.string().optional(),
});

type CompanyInfoFormData = z.infer<typeof companyInfoSchema>;

export function CompanyInfoForm() {
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const form = useForm<CompanyInfoFormData>({
    resolver: zodResolver(companyInfoSchema),
    defaultValues: {
      company_name: "",
      company_email: "",
      company_phone: "",
      company_address: "",
      company_website: "",
      tax_id: "",
      registration_number: "",
      invoice_terms: "",
      invoice_footer: "",
    },
  });

  useEffect(() => {
    loadCompanyInfo();
  }, []);

  const loadCompanyInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('company_info')
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('Error loading company info:', error);
        return;
      }

      if (data) {
        setCompanyId(data.id);
        form.reset({
          company_name: data.company_name || "",
          company_email: data.company_email || "",
          company_phone: data.company_phone || "",
          company_address: data.company_address || "",
          company_website: data.company_website || "",
          tax_id: data.tax_id || "",
          registration_number: data.registration_number || "",
          invoice_terms: data.invoice_terms || "",
          invoice_footer: data.invoice_footer || "",
        });
      }
    } catch (error) {
      console.error('Error loading company info:', error);
      toast.error('Failed to load company information');
    }
  };

  const onSubmit = async (data: CompanyInfoFormData) => {
    setLoading(true);
    
    try {
      if (companyId) {
        // Update existing record
        const { error } = await supabase
          .from('company_info')
          .update(data)
          .eq('id', companyId);

        if (error) throw error;
      } else {
        // Insert new record
        const { data: newData, error } = await supabase
          .from('company_info')
          .insert([data])
          .select()
          .single();

        if (error) throw error;
        setCompanyId(newData.id);
      }

      toast.success('Company information updated successfully');
    } catch (error) {
      console.error('Error saving company info:', error);
      toast.error('Failed to save company information');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="company_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="FBRSigns" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="company_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="admin@fbrsigns.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="company_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 (555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="company_website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Website</FormLabel>
                  <FormControl>
                    <Input placeholder="https://www.fbrsigns.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tax_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Tax identification number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="registration_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Registration Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Business registration number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="company_address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Address</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="123 Business St, City, State 12345" 
                    className="min-h-[80px]"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="invoice_terms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Invoice Terms</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Payment due within 30 days. Late payments may incur additional fees."
                    className="min-h-[80px]"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="invoice_footer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Invoice Footer</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Thank you for your business! For support, contact us at admin@fbrsigns.com"
                    className="min-h-[80px]"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Form>

      <Card>
        <CardHeader>
          <CardTitle>Company Logo</CardTitle>
          <CardDescription>
            Upload your company logo to appear on invoices and quotes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LogoUpload />
        </CardContent>
      </Card>
    </div>
  );
}
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  has_sizes: z.boolean().default(false),
  has_colors: z.boolean().default(false),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: any;
}

export function CategoryForm({ open, onOpenChange, category }: CategoryFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || "",
      description: category?.description || "",
      has_sizes: category?.has_sizes || false,
      has_colors: category?.has_colors || false,
    },
  });

  // Reset form when switching between create and edit
  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name || "",
        description: category.description || "",
        has_sizes: category.has_sizes || false,
        has_colors: category.has_colors || false,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        has_sizes: false,
        has_colors: false,
      });
    }
  }, [category, form]);

  const onSubmit = async (data: CategoryFormData) => {
    setIsLoading(true);
    try {
      if (category) {
        // Update existing category
        const { error } = await supabase
          .from("categories")
          .update({
            name: data.name,
            description: data.description || null,
            has_sizes: !!data.has_sizes,
            has_colors: !!data.has_colors
          })
          .eq("id", category.id);

        if (error) {
          console.error("Error updating category:", error);
          throw error;
        }

        toast({
          title: "Success",
          description: "Category updated successfully",
        });
      } else {
        // Create new category
        const { error } = await supabase
          .from("categories")
          .insert([{
            name: data.name,
            description: data.description || null,
            has_sizes: !!data.has_sizes,
            has_colors: !!data.has_colors
          }]);

        if (error) {
          console.error("Error creating category:", error);
          throw error;
        }

        toast({
          title: "Success",
          description: "Category created successfully",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["categories"] });
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Full error object:", error);
      toast({
        title: "Error",
        description: error.message || error.details || "Failed to save category",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {category ? "Edit Category" : "Create New Category"}
          </DialogTitle>
          <DialogDescription>
            {category 
              ? "Update the category information below."
              : "Add a new category to organize your products."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter category name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter category description" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-4 p-4 border rounded-lg bg-muted/20">
              <h4 className="font-medium text-sm">Product Variants Configuration</h4>
              <FormField
                control={form.control}
                name="has_sizes"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm bg-card">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Enable Sizes
                      </FormLabel>
                      <FormDescription>
                        Products in this category will have size variations (e.g., S, M, L)
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="has_colors"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm bg-card">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Enable Colors
                      </FormLabel>
                      <FormDescription>
                        Products in this category will have color variations
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : category ? "Update" : "Create"} Category
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
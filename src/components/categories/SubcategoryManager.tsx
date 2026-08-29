import { useState } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useSubcategoriesByCategory } from "@/hooks/useQuery";

const subcategorySchema = z.object({
  name: z.string().min(1, "Subcategory name is required"),
  description: z.string().optional(),
});

type SubcategoryFormData = z.infer<typeof subcategorySchema>;

interface SubcategoryManagerProps {
  categoryId: string;
  categoryName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubcategoryManager({ 
  categoryId, 
  categoryName, 
  open, 
  onOpenChange 
}: SubcategoryManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<any>(null);
  const [deletingSubcategory, setDeletingSubcategory] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: subcategories, isLoading: isLoadingSubcategories } = useSubcategoriesByCategory(categoryId);

  const form = useForm<SubcategoryFormData>({
    resolver: zodResolver(subcategorySchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const handleEdit = (subcategory: any) => {
    setEditingSubcategory(subcategory);
    form.reset({
      name: subcategory.name || "",
      description: subcategory.description || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (subcategory: any) => {
    try {
      const { error } = await supabase
        .from("subcategories")
        .delete()
        .eq("id", subcategory.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Subcategory deleted successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete subcategory",
        variant: "destructive",
      });
    }
    setDeletingSubcategory(null);
  };

  const onSubmit = async (data: SubcategoryFormData) => {
    setIsLoading(true);
    try {
      if (editingSubcategory) {
        // Update existing subcategory
        const { error } = await supabase
          .from("subcategories")
          .update({
            name: data.name,
            description: data.description || null,
          })
          .eq("id", editingSubcategory.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Subcategory updated successfully",
        });
      } else {
        // Create new subcategory
        const { error } = await supabase
          .from("subcategories")
          .insert([{
            name: data.name,
            description: data.description || null,
            category_id: categoryId,
          }]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Subcategory created successfully",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      form.reset();
      setShowForm(false);
      setEditingSubcategory(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save subcategory",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingSubcategory(null);
    form.reset();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Subcategories - {categoryName}</DialogTitle>
            <DialogDescription>
              View, add, edit and delete subcategories for this category.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Subcategories</h3>
              <Button onClick={() => setShowForm(true)} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Subcategory
              </Button>
            </div>

            {isLoadingSubcategories ? (
              <div className="text-center py-8">Loading subcategories...</div>
            ) : subcategories && subcategories.length > 0 ? (
              <div className="grid gap-3">
                {subcategories.map((subcategory) => (
                  <Card key={subcategory.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{subcategory.name}</h4>
                            <Badge variant="outline" className="text-xs">
                              Subcategory
                            </Badge>
                          </div>
                          {subcategory.description && (
                            <p className="text-sm text-muted-foreground">
                              {subcategory.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(subcategory)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingSubcategory(subcategory)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8 text-muted-foreground">
                    No subcategories found. Create your first subcategory above.
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subcategory Form Dialog */}
      <Dialog open={showForm} onOpenChange={handleFormClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSubcategory ? "Edit Subcategory" : "Create New Subcategory"}
            </DialogTitle>
            <DialogDescription>
              {editingSubcategory 
                ? "Update the subcategory information below."
                : `Add a new subcategory to "${categoryName}".`}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategory Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter subcategory name" {...field} />
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
                        placeholder="Enter subcategory description" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleFormClose}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Saving..." : editingSubcategory ? "Update" : "Create"} Subcategory
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={!!deletingSubcategory} 
        onOpenChange={() => setDeletingSubcategory(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subcategory</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingSubcategory?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(deletingSubcategory)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
import { useState } from "react";
import { Plus, Edit, Trash2, Filter, Search, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories, useSubcategoriesByCategory } from "@/hooks/useQuery";
import { CategoryForm } from "@/components/categories/CategoryForm";
import { SubcategoryManager } from "@/components/categories/SubcategoryManager";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
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

export default function Categories() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [deletingCategory, setDeletingCategory] = useState<any>(null);
  const [showSubcategories, setShowSubcategories] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const { data: categories, isLoading } = useCategories();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const filteredCategories = categories?.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleManageSubcategories = (category: any) => {
    setSelectedCategory(category);
    setShowSubcategories(true);
  };

  const handleDelete = async (category: any) => {
    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", category.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Category deleted successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["categories"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete category",
        variant: "destructive",
      });
    }
    setDeletingCategory(null);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingCategory(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">
            Manage product categories and subcategories
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Subcategories</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories?.length ? (
                  filteredCategories.map((category) => (
                    <CategoryRow 
                      key={category.id} 
                      category={category}
                      onEdit={handleEdit}
                      onDelete={(cat) => setDeletingCategory(cat)}
                      onManageSubcategories={handleManageSubcategories}
                    />
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      No categories found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Category Form Dialog */}
      <CategoryForm
        open={showForm}
        onOpenChange={handleFormClose}
        category={editingCategory}
      />

      {/* Subcategory Manager */}
      {selectedCategory && (
        <SubcategoryManager
          categoryId={selectedCategory.id}
          categoryName={selectedCategory.name}
          open={showSubcategories}
          onOpenChange={(open) => {
            setShowSubcategories(open);
            if (!open) setSelectedCategory(null);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={!!deletingCategory} 
        onOpenChange={() => setDeletingCategory(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingCategory?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(deletingCategory)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Separate component for category row to handle subcategory count
function CategoryRow({ category, onEdit, onDelete, onManageSubcategories }: {
  category: any;
  onEdit: (category: any) => void;
  onDelete: (category: any) => void;
  onManageSubcategories: (category: any) => void;
}) {
  const { data: subcategories } = useSubcategoriesByCategory(category.id);
  const subcategoryCount = subcategories?.length || 0;

  return (
    <TableRow>
      <TableCell className="font-medium">
        {category.name}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {category.description || "No description"}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {subcategoryCount} subcategories
          </Badge>
          {subcategoryCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onManageSubcategories(category)}
              className="h-6 px-2 text-xs"
            >
              View
            </Button>
          )}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {new Date(category.created_at).toLocaleDateString('en-US')}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onManageSubcategories(category)}
            title="Manage Subcategories"
          >
            <Layers className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(category)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(category)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
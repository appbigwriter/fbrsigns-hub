import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon, Plus, Trash2, Edit } from "lucide-react";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useCategories, useSubcategoriesByCategory } from "@/hooks/useQuery";

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  price: z.string().min(1, "Price is required"),
  category_id: z.string().optional(),
  subcategory_id: z.string().optional(),
  image_url: z.string().url().optional().or(z.literal("")),
  unit: z.string().optional(),
  min_quantity: z.string().optional(),
  max_quantity: z.string().optional(),
  lead_time_days: z.string().optional(),
  additional_images: z.array(z.string()).optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: any;
}

export function ProductForm({ open, onOpenChange, product }: ProductFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [variants, setVariants] = useState<any[]>([]);
  const [newVariant, setNewVariant] = useState({
    size: "",
    color: "",
    sku: "",
    stock_quantity: 0,
    additional_price: 0,
    image_url: ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: categories } = useCategories();
  const { data: subcategories } = useSubcategoriesByCategory(selectedCategoryId || null);

  const selectedCategory = categories?.find(c => c.id === selectedCategoryId);
  const showVariants = selectedCategory?.has_sizes || selectedCategory?.has_colors;

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || "",
      description: product?.description || "",
      price: product?.price?.toString() || "",
      category_id: product?.category_id || "",
      subcategory_id: product?.subcategory_id || "",
      image_url: product?.image_url || "",
      unit: product?.unit || "unit",
      min_quantity: product?.min_quantity?.toString() || "1",
      max_quantity: product?.max_quantity?.toString() || "",
      lead_time_days: product?.lead_time_days?.toString() || "7",
      additional_images: product?.additional_images || [],
    },
  });

  // Set initial category and reset form when editing
  useEffect(() => {
    if (product) {
      // Reset form with product data
      form.reset({
        name: product.name || "",
        description: product.description || "",
        price: product.price?.toString() || "",
        category_id: product.category_id || "",
        subcategory_id: product.subcategory_id || "",
        image_url: product.image_url || "",
        unit: product.unit || "unit",
        min_quantity: product.min_quantity?.toString() || "1",
        max_quantity: product.max_quantity?.toString() || "",
        lead_time_days: product.lead_time_days?.toString() || "7",
        additional_images: product.additional_images || [],
      });

      if (product.category_id) {
        setSelectedCategoryId(product.category_id);
      }

      const images: string[] = [];
      if (product.image_url) images.push(product.image_url);
      if (product.additional_images) images.push(...product.additional_images);
      setUploadedImages(images);
    } else {
      // Reset to empty form when creating new product
      form.reset({
        name: "",
        description: "",
        price: "",
        category_id: "",
        subcategory_id: "",
        image_url: "",
        unit: "unit",
        min_quantity: "1",
        max_quantity: "",
        lead_time_days: "7",
        additional_images: [],
      });
      setSelectedCategoryId("");
      setUploadedImages([]);
      setVariants([]);
      setNewVariant({ size: "", color: "", sku: "", stock_quantity: 0, additional_price: 0, image_url: "" });
    }
  }, [product, form]);

  // Fetch variants for existing product
  useEffect(() => {
    if (product?.id) {
      const fetchVariants = async () => {
        const { data, error } = await supabase
          .from('product_variants')
          .select('*')
          .eq('product_id', product.id);

        if (data) {
          setVariants(data);
        }
      };
      fetchVariants();
    }
  }, [product]);

  // Clear subcategory when category changes
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    form.setValue("category_id", categoryId);
    form.setValue("subcategory_id", ""); // Clear subcategory when category changes
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        return publicUrl;
      });

      const newImageUrls = await Promise.all(uploadPromises);

      const currentImages = [...uploadedImages, ...newImageUrls];
      setUploadedImages(currentImages);

      // Set the first image as the main image_url if not already set
      if (!form.getValues("image_url") && currentImages.length > 0) {
        form.setValue("image_url", currentImages[0]);
      }

      // Update additional_images with the rest (excluding main image)
      const mainImage = form.getValues("image_url") || currentImages[0];
      const additional = currentImages.filter(img => img !== mainImage);
      form.setValue("additional_images", additional);

      toast({
        title: "Success",
        description: `${newImageUrls.length} image(s) uploaded successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = async (imageUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = imageUrl.split('/');
      const filePath = urlParts.slice(-2).join('/'); // Get 'products/filename.ext'

      await supabase.storage
        .from('product-images')
        .remove([filePath]);

      const remainingImages = uploadedImages.filter(url => url !== imageUrl);
      setUploadedImages(remainingImages);

      // If removed image was the main image, set a new one
      if (form.getValues("image_url") === imageUrl) {
        form.setValue("image_url", remainingImages[0] || "");
      }

      // Update additional_images
      const mainImage = form.getValues("image_url");
      const additional = remainingImages.filter(img => img !== mainImage);
      form.setValue("additional_images", additional);

      toast({
        title: "Success",
        description: "Image removed successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove image",
        variant: "destructive",
      });
    }
  };

  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null);

  const addVariant = () => {
    if (selectedCategory?.has_sizes && !newVariant.size) {
      toast({ title: "Error", description: "Size is required", variant: "destructive" });
      return;
    }
    if (selectedCategory?.has_colors && !newVariant.color) {
      toast({ title: "Error", description: "Color is required", variant: "destructive" });
      return;
    }

    // Check for duplicates (unless editing the same variant)
    const isDuplicate = variants.some((v, index) =>
      index !== editingVariantIndex &&
      (v.size === newVariant.size || (!v.size && !newVariant.size)) &&
      (v.color === newVariant.color || (!v.color && !newVariant.color))
    );

    if (isDuplicate) {
      toast({ title: "Error", description: "This variant already exists", variant: "destructive" });
      return;
    }

    if (editingVariantIndex !== null) {
      const updatedVariants = [...variants];
      updatedVariants[editingVariantIndex] = { ...newVariant };
      setVariants(updatedVariants);
      setEditingVariantIndex(null);
      toast({ title: "Success", description: "Variant updated" });
    } else {
      setVariants([...variants, { ...newVariant }]);
      toast({ title: "Success", description: "Variant added" });
    }

    setNewVariant({ size: "", color: "", sku: "", stock_quantity: 0, additional_price: 0, image_url: "" });
  };

  const editVariant = (index: number) => {
    const variant = variants[index];
    setNewVariant({
      size: variant.size || "",
      color: variant.color || "",
      sku: variant.sku || "",
      stock_quantity: variant.stock_quantity || 0,
      additional_price: variant.additional_price || 0,
      image_url: variant.image_url || ""
    });
    setEditingVariantIndex(index);
  };

  const removeVariant = (index: number) => {
    if (editingVariantIndex === index) {
      setEditingVariantIndex(null);
      setNewVariant({ size: "", color: "", sku: "", stock_quantity: 0, additional_price: 0, image_url: "" });
    }
    setVariants(variants.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ProductFormData) => {
    setIsLoading(true);
    try {
      const productData = {
        name: data.name,
        description: data.description,
        price: parseFloat(data.price),
        category_id: data.category_id || null,
        subcategory_id: data.subcategory_id || null,
        image_url: data.image_url || null,
        unit: data.unit,
        min_quantity: data.min_quantity ? parseInt(data.min_quantity) : 1,
        max_quantity: data.max_quantity ? parseInt(data.max_quantity) : null,
        lead_time_days: data.lead_time_days ? parseInt(data.lead_time_days) : 7,
        additional_images: data.additional_images || [],
      };

      let productId = product?.id;

      if (product) {
        // Update existing product
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", product.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Product updated successfully",
        });
      } else {
        // Create new product
        const { data: newProduct, error } = await supabase
          .from("products")
          .insert([productData])
          .select()
          .single();

        if (error) throw error;
        productId = newProduct.id;

        toast({
          title: "Success",
          description: "Product created successfully",
        });
      }

      // Handle variants
      if (productId && (selectedCategory?.has_sizes || selectedCategory?.has_colors)) {
        // Delete existing variants
        if (product) {
          const { error: deleteError } = await supabase
            .from("product_variants")
            .delete()
            .eq("product_id", productId);

          if (deleteError) throw deleteError;
        }

        if (variants.length > 0) {
          const variantsToInsert = variants.map(v => ({
            product_id: productId,
            size: v.size || null,
            color: v.color || null,
            sku: v.sku || null,
            stock_quantity: v.stock_quantity || 0,
            additional_price: v.additional_price || 0,
            image_url: v.image_url || null
          }));

          const { error: variantsError } = await supabase
            .from("product_variants")
            .insert(variantsToInsert);

          if (variantsError) throw variantsError;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["products"] });
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save product",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product ? "Edit Product" : "Create New Product"}
          </DialogTitle>
          <DialogDescription>
            {product
              ? "Update the product information below."
              : "Add a new product to your catalog."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter product name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter product description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={handleCategoryChange}
                      value={field.value || selectedCategoryId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories?.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subcategory_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategory</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!selectedCategoryId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={
                            selectedCategoryId
                              ? "Select a subcategory"
                              : "Select category first"
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subcategories?.map((subcategory) => (
                          <SelectItem key={subcategory.id} value={subcategory.id}>
                            {subcategory.name}
                          </SelectItem>
                        ))}
                        {subcategories?.length === 0 && selectedCategoryId && (
                          <SelectItem value="no-subcategories" disabled>
                            No subcategories available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {!selectedCategoryId && "Please select a category first to see subcategories"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Image Upload Section */}
            <div className="space-y-4">
              <FormLabel>Product Images</FormLabel>

              <div className="flex items-center gap-4">
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                    disabled={isUploading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('image-upload')?.click()}
                    disabled={isUploading}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {isUploading ? 'Uploading...' : 'Upload Images'}
                  </Button>
                </div>

                <FormField
                  control={form.control}
                  name="image_url"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Or Image URL</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://example.com/image.jpg"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter a URL for the product image or upload files above
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Image Preview Grid */}
              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-4 gap-4">
                  {uploadedImages.map((imageUrl, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 overflow-hidden">
                        <img
                          src={imageUrl}
                          alt={`Product image ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(imageUrl)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      {form.getValues("image_url") === imageUrl && (
                        <div className="absolute bottom-1 left-1">
                          <div className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded">
                            Main
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter a URL for the product image
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unit">Unit</SelectItem>
                        <SelectItem value="sq ft">sq ft (square feet)</SelectItem>
                        <SelectItem value="sq in">sq in (square inches)</SelectItem>
                        <SelectItem value="ft">ft (feet)</SelectItem>
                        <SelectItem value="in">in (inches)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="min_quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min. Qty</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="max_quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max. Qty</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lead_time_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead Time</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Product Variants Section */}
            {showVariants && (
              <div className="space-y-4 border rounded-md p-4 bg-muted/20">
                <h3 className="font-semibold text-lg">Product Variants</h3>
                <div className="grid grid-cols-7 gap-2 items-end">
                  {selectedCategory.has_sizes && (
                    <div className="col-span-1">
                      <FormLabel>Size</FormLabel>
                      <Input
                        value={newVariant.size}
                        onChange={(e) => setNewVariant({ ...newVariant, size: e.target.value })}
                        placeholder="Size"
                      />
                    </div>
                  )}
                  {selectedCategory.has_colors && (
                    <div className="col-span-1">
                      <FormLabel>Color</FormLabel>
                      <Input
                        value={newVariant.color}
                        onChange={(e) => setNewVariant({ ...newVariant, color: e.target.value })}
                        placeholder="Color"
                      />
                    </div>
                  )}
                  <div className="col-span-1">
                    <FormLabel>SKU</FormLabel>
                    <Input
                      value={newVariant.sku}
                      onChange={(e) => setNewVariant({ ...newVariant, sku: e.target.value })}
                      placeholder="SKU"
                    />
                  </div>
                  <div className="col-span-1">
                    <FormLabel>Stock</FormLabel>
                    <Input
                      type="number"
                      value={newVariant.stock_quantity}
                      onChange={(e) => setNewVariant({ ...newVariant, stock_quantity: Number(e.target.value) })}
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-1">
                    <FormLabel>+ Price</FormLabel>
                    <Input
                      type="number"
                      step="0.01"
                      value={newVariant.additional_price}
                      onChange={(e) => setNewVariant({ ...newVariant, additional_price: Number(e.target.value) })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="col-span-1">
                    <FormLabel>Image</FormLabel>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            const fileExt = file.name.split('.').pop();
                            const fileName = `${Math.random()}.${fileExt}`;
                            const filePath = `products/variants/${fileName}`;

                            try {
                              const { error: uploadError } = await supabase.storage
                                .from('product-images')
                                .upload(filePath, file);

                              if (uploadError) throw uploadError;

                              const { data: { publicUrl } } = supabase.storage
                                .from('product-images')
                                .getPublicUrl(filePath);

                              setNewVariant({ ...newVariant, image_url: publicUrl });
                            } catch (error: any) {
                              toast({ title: "Error", description: "Failed to upload image", variant: "destructive" });
                            }
                          }}
                          className="hidden"
                          id="variant-image-upload"
                        />
                        {newVariant.image_url ? (
                          <div className="relative h-10 w-full">
                            <img src={newVariant.image_url} alt="Variant" className="h-full w-full object-cover rounded border" />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0"
                              onClick={() => setNewVariant({ ...newVariant, image_url: "" })}
                            >
                              <X className="h-2 w-2" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full h-10 px-2"
                            onClick={() => document.getElementById('variant-image-upload')?.click()}
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="col-span-1">
                    <Button type="button" onClick={addVariant} className="w-full">
                      {editingVariantIndex !== null ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </Button>
                    {editingVariantIndex !== null && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full mt-1 text-xs"
                        onClick={() => {
                          setEditingVariantIndex(null);
                          setNewVariant({ size: "", color: "", sku: "", stock_quantity: 0, additional_price: 0, image_url: "" });
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>

                {variants.length > 0 && (
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {selectedCategory.has_sizes && <TableHead>Size</TableHead>}
                          {selectedCategory.has_colors && <TableHead>Color</TableHead>}
                          <TableHead>SKU</TableHead>
                          <TableHead>Stock</TableHead>
                          <TableHead>+ Price</TableHead>
                          <TableHead>Image</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {variants.map((variant, index) => (
                          <TableRow key={index}>
                            {selectedCategory.has_sizes && <TableCell>{variant.size}</TableCell>}
                            {selectedCategory.has_colors && <TableCell>{variant.color}</TableCell>}
                            <TableCell>{variant.sku}</TableCell>
                            <TableCell>{variant.stock_quantity}</TableCell>
                            <TableCell>+${Number(variant.additional_price).toFixed(2)}</TableCell>
                            <TableCell>
                              {variant.image_url && (
                                <img src={variant.image_url} alt="Variant" className="h-8 w-8 object-cover rounded" />
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => editVariant(index)}
                                >
                                  <Edit className="h-4 w-4 text-blue-500" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeVariant(index)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : product ? "Update" : "Create"} Product
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
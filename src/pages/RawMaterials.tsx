import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Edit, Trash2, Package, TrendingUp, AlertTriangle } from "lucide-react";
import { RawMaterialForm } from "@/components/raw-materials/RawMaterialForm";
import { StockTransactionForm } from "@/components/raw-materials/StockTransactionForm";
import { useToast } from "@/hooks/use-toast";

interface RawMaterial {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  supplier_id?: string;
  unit_of_measure: string;
  cost_per_unit: number;
  current_stock: number;
  minimum_stock?: number;
  maximum_stock?: number;
  reorder_point?: number;
  location?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  suppliers?: { name: string };
}

interface StockTransaction {
  id: string;
  raw_material_id: string;
  transaction_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  unit_cost?: number;
  total_cost?: number;
  reference_number?: string;
  notes?: string;
  created_at: string;
  raw_materials?: { name: string };
}

export default function RawMaterials() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rawMaterials, isLoading } = useQuery({
    queryKey: ["raw-materials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("raw_materials")
        .select(`
          *,
          suppliers(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as RawMaterial[];
    },
  });

  const { data: transactions } = useQuery({
    queryKey: ["raw-material-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("raw_material_transactions")
        .select(`
          *,
          raw_materials(name)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as StockTransaction[];
    },
  });

  const deleteMaterial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("raw_materials")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["raw-materials"] });
      toast({ title: "Success", description: "Raw material deleted successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete raw material: " + error.message,
        variant: "destructive",
      });
    },
  });

  const filteredMaterials = rawMaterials?.filter(material =>
    material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const lowStockMaterials = rawMaterials?.filter(material => 
    material.reorder_point && material.current_stock <= material.reorder_point
  ) || [];

  const handleEdit = (material: RawMaterial) => {
    setSelectedMaterial(material);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this raw material?")) {
      deleteMaterial.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedMaterial(null);
  };

  const getStockStatus = (material: RawMaterial) => {
    if (material.reorder_point && material.current_stock <= material.reorder_point) {
      return { status: "Low Stock", variant: "destructive" as const };
    }
    if (material.maximum_stock && material.current_stock >= material.maximum_stock) {
      return { status: "Overstock", variant: "secondary" as const };
    }
    return { status: "Normal", variant: "default" as const };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Raw Materials</h1>
          <p className="text-muted-foreground">Manage inventory and stock levels</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <TrendingUp className="mr-2 h-4 w-4" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Stock Transaction</DialogTitle>
              </DialogHeader>
              <StockTransactionForm onSuccess={() => setIsTransactionDialogOpen(false)} />
            </DialogContent>
          </Dialog>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedMaterial(null)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Material
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedMaterial ? "Edit Raw Material" : "Add New Raw Material"}
                </DialogTitle>
              </DialogHeader>
              <RawMaterialForm
                material={selectedMaterial}
                onSuccess={handleDialogClose}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {lowStockMaterials.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center text-amber-800">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-amber-700">
              {lowStockMaterials.length} material(s) are below reorder point
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="materials" className="w-full">
        <TabsList>
          <TabsTrigger value="materials">
            <Package className="mr-2 h-4 w-4" />
            Materials
          </TabsTrigger>
          <TabsTrigger value="transactions">
            <TrendingUp className="mr-2 h-4 w-4" />
            Transactions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="materials" className="space-y-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search materials..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Raw Materials ({filteredMaterials.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMaterials.map((material) => {
                      const stockStatus = getStockStatus(material);
                      return (
                        <TableRow key={material.id}>
                          <TableCell className="font-medium">{material.name}</TableCell>
                          <TableCell>{material.sku || "-"}</TableCell>
                          <TableCell>{material.suppliers?.name || "-"}</TableCell>
                          <TableCell>
                            {material.current_stock} {material.unit_of_measure}
                          </TableCell>
                          <TableCell>${material.cost_per_unit}</TableCell>
                          <TableCell>
                            <Badge variant={stockStatus.variant}>
                              {stockStatus.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(material)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(material.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions?.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {new Date(transaction.created_at).toLocaleDateString('en-US')}
                      </TableCell>
                      <TableCell>{transaction.raw_materials?.name}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            transaction.transaction_type === 'in' ? 'default' : 
                            transaction.transaction_type === 'out' ? 'destructive' : 
                            'secondary'
                          }
                        >
                          {transaction.transaction_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{transaction.quantity}</TableCell>
                      <TableCell>{transaction.reference_number || "-"}</TableCell>
                      <TableCell>{transaction.notes || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
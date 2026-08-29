import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Image as ImageIcon } from "lucide-react";

export function LogoUpload() {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current company info to check for existing logo
  const { data: companyInfo } = useQuery({
    queryKey: ["company-info"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_info")
        .select("*")
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      setUploading(true);
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file');
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `logo.${fileExt}`;
      const filePath = `company-logo/${fileName}`;

      // Delete existing logo if it exists
      if (companyInfo?.company_logo_url) {
        const existingPath = companyInfo.company_logo_url.split('/').slice(-2).join('/');
        await supabase.storage
          .from('company-logos')
          .remove([existingPath]);
      }

      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('company-logos')
        .getPublicUrl(filePath);

      const publicUrl = data.publicUrl;

      // Update company info with new logo URL
      const { error: updateError } = await supabase
        .from('company_info')
        .upsert({ 
          id: companyInfo?.id || crypto.randomUUID(),
          company_logo_url: publicUrl,
          company_name: companyInfo?.company_name || 'FBRSigns',
        });

      if (updateError) throw updateError;

      return publicUrl;
    },
    onSuccess: (logoUrl) => {
      queryClient.invalidateQueries({ queryKey: ["company-info"] });
      toast({
        title: "Success",
        description: "Company logo uploaded successfully",
      });
      setUploading(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setUploading(false);
    },
  });

  const deleteLogo = useMutation({
    mutationFn: async () => {
      if (!companyInfo?.company_logo_url) return;

      // Extract file path from URL
      const existingPath = companyInfo.company_logo_url.split('/').slice(-2).join('/');
      
      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('company-logos')
        .remove([existingPath]);

      if (deleteError) throw deleteError;

      // Update company info to remove logo URL
      const { error: updateError } = await supabase
        .from('company_info')
        .update({ company_logo_url: null })
        .eq('id', companyInfo.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-info"] });
      toast({
        title: "Success",
        description: "Company logo removed successfully",
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadLogo.mutate(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDelete = () => {
    deleteLogo.mutate();
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Current Logo Display */}
      {companyInfo?.company_logo_url ? (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                <img
                  src={companyInfo.company_logo_url}
                  alt="Company Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="h-8 w-8 flex items-center justify-center text-muted-foreground">📷</div>';
                    }
                  }}
                />
              </div>
              <div>
                <h4 className="font-medium">Current Logo</h4>
                <p className="text-sm text-muted-foreground">
                  Logo is displayed on invoices and quotes
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUploadClick}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Replace
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={deleteLogo.isPending}
              >
                <X className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        /* Upload Prompt */
        <Card className="p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h4 className="font-medium mb-2">No logo uploaded</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Upload your company logo to display on invoices and quotes
            </p>
            <Button
              onClick={handleUploadClick}
              disabled={uploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Uploading..." : "Upload Logo"}
            </Button>
          </div>
        </Card>
      )}

      {/* Upload Guidelines */}
      <div className="text-sm text-muted-foreground">
        <p className="mb-1">• Supported formats: JPG, PNG, GIF, WebP</p>
        <p className="mb-1">• Maximum file size: 5MB</p>
        <p>• Recommended dimensions: 300x300px or larger</p>
      </div>
    </div>
  );
}
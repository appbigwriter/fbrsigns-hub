import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, DollarSign, FileText, Send, Paperclip, ExternalLink } from "lucide-react";

const quoteSchema = z.object({
  status: z.string(),
  prioridade: z.string().optional(),
  orcamento_estimado: z.number().optional(),
  observacoes_admin: z.string().optional(),
  expires_at: z.string().optional(),
});

interface QuoteFormProps {
  quote: any;
  open: boolean;
  onClose: () => void;
  onUpdate: (data: any) => void;
  onConvertToOrder: (quoteId: string) => void;
  onApprove: (quoteId: string, estimate: number, notes?: string) => void;
  onReject: (quoteId: string, reason: string) => void;
}

export function QuoteForm({ 
  quote, 
  open, 
  onClose, 
  onUpdate, 
  onConvertToOrder, 
  onApprove, 
  onReject 
}: QuoteFormProps) {
  const { toast } = useToast();
  const [actionType, setActionType] = useState<'edit' | 'approve' | 'reject' | 'convert'>('edit');
  const [estimate, setEstimate] = useState<number>(0);
  const [rejectReason, setRejectReason] = useState('');

  const form = useForm<z.infer<typeof quoteSchema>>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      status: quote?.status || 'pendente',
      prioridade: quote?.prioridade || 'media',
      orcamento_estimado: quote?.orcamento_estimado || 0,
      observacoes_admin: quote?.observacoes_admin || '',
      expires_at: quote?.expires_at || '',
    },
  });

  useEffect(() => {
    if (quote) {
      form.reset({
        status: quote.status,
        prioridade: quote.prioridade,
        orcamento_estimado: quote.orcamento_estimado,
        observacoes_admin: quote.observacoes_admin,
        expires_at: quote.expires_at,
      });
      setEstimate(quote.orcamento_estimado || 0);
    }
  }, [quote, form]);

  const onSubmit = (data: z.infer<typeof quoteSchema>) => {
    onUpdate({ ...quote, ...data });
    onClose();
  };

  const handleApprove = () => {
    if (estimate > 0) {
      onApprove(quote.id, estimate, form.getValues('observacoes_admin'));
      onClose();
    } else {
      toast({
        title: "Error",
        description: "Please provide an estimate amount",
        variant: "destructive",
      });
    }
  };

  const handleReject = () => {
    if (rejectReason.trim()) {
      onReject(quote.id, rejectReason);
      onClose();
    } else {
      toast({
        title: "Error",
        description: "Please provide a rejection reason",
        variant: "destructive",
      });
    }
  };

  const handleConvert = () => {
    onConvertToOrder(quote.id);
    onClose();
  };

  if (!quote) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      case 'aprovado': return 'bg-green-100 text-green-800';
      case 'rejeitado': return 'bg-red-100 text-red-800';
      case 'convertido': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Quote Details - {quote.servico}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                <p className="font-medium">{quote.nome}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                <p>{quote.email}</p>
              </div>
              {quote.telefone && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                  <p>{quote.telefone}</p>
                </div>
              )}
              {quote.empresa && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Company</Label>
                  <p>{quote.empresa}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quote Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quote Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Service</Label>
                <p className="font-medium">{quote.servico}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                <p className="text-sm">{quote.descricao}</p>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <Badge className={getStatusColor(quote.status)}>
                    {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Priority</Label>
                  <Badge variant="outline">
                    {quote.prioridade?.charAt(0).toUpperCase() + quote.prioridade?.slice(1)}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                <p className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(quote.created_at).toLocaleDateString('en-US')}
                </p>
              </div>
              {quote.arquivo_url && (
                <div className="pt-2 border-t">
                  <Label className="text-sm font-medium text-muted-foreground">Attached File</Label>
                  <div className="mt-1.5">
                    <a
                      href={quote.arquivo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors w-full font-medium"
                    >
                      <Paperclip className="h-4 w-4 shrink-0" />
                      <span className="truncate flex-1">{quote.arquivo_nome || "View Attached File"}</span>
                      <ExternalLink className="h-3.5 w-3.5 opacity-70 shrink-0" />
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {quote.status === 'pendente' && (
                <>
                  <div className="space-y-2">
                    <Label>Estimate Amount ($)</Label>
                    <Input
                      type="number"
                      value={estimate}
                      onChange={(e) => setEstimate(Number(e.target.value))}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleApprove}
                      className="flex-1"
                      variant="default"
                    >
                      Approve
                    </Button>
                    <Button 
                      onClick={() => setActionType('reject')}
                      variant="destructive"
                      className="flex-1"
                    >
                      Reject
                    </Button>
                  </div>
                </>
              )}
              
              {quote.status === 'aprovado' && !quote.converted_to_order_id && (
                <Button onClick={handleConvert} className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  Convert to Order
                </Button>
              )}

              {quote.orcamento_estimado && (
                <div className="p-3 bg-muted rounded-lg">
                  <Label className="text-sm font-medium text-muted-foreground">Current Estimate</Label>
                  <p className="text-lg font-semibold text-green-600">
                    $ {Number(quote.orcamento_estimado).toLocaleString('en-US', { 
                      minimumFractionDigits: 2 
                    })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quote Management */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quote Management</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pendente">Pending</SelectItem>
                            <SelectItem value="em_analise">Under Review</SelectItem>
                            <SelectItem value="aprovado">Approved</SelectItem>
                            <SelectItem value="rejeitado">Rejected</SelectItem>
                            <SelectItem value="convertido">Converted</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="prioridade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="baixa">Low</SelectItem>
                            <SelectItem value="media">Medium</SelectItem>
                            <SelectItem value="alta">High</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="orcamento_estimado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Amount ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="observacoes_admin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Internal Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add internal notes about this quote..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex gap-2">
                  <Button type="submit">
                    Update Quote
                  </Button>
                  <Button type="button" variant="ghost" onClick={onClose}>
                    Close
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Reject Reason Dialog */}
        {actionType === 'reject' && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-lg text-red-600">Reject Quote</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Rejection Reason</Label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  className="min-h-[80px]"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleReject} variant="destructive">
                  Confirm Rejection
                </Button>
                <Button onClick={() => setActionType('edit')} variant="outline">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
}
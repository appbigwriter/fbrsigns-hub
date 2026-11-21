import { useState } from "react";
import { Plus, Edit, Eye, Trash2, Filter, Search, Clock, CheckCircle, XCircle, FileText, ArrowRight, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuotes } from "@/hooks/useQuery";
import { QuoteForm } from "@/components/quotes/QuoteForm";
import { QuoteTemplates } from "@/components/quotes/QuoteTemplates";
import {
  useUpdateQuote,
  useApproveQuote,
  useRejectQuote,
  useConvertQuoteToOrder,
  useCreateQuoteTemplate,
  useUpdateQuoteTemplate,
  useDeleteQuoteTemplate,
} from "@/hooks/useMutations";

export default function Quotes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [quoteFormOpen, setQuoteFormOpen] = useState(false);

  const { data: quotes, isLoading } = useQuotes();
  
  // Mutations
  const updateQuoteMutation = useUpdateQuote();
  const approveQuoteMutation = useApproveQuote();
  const rejectQuoteMutation = useRejectQuote();
  const convertQuoteMutation = useConvertQuoteToOrder();
  const createTemplateMutation = useCreateQuoteTemplate();
  const updateTemplateMutation = useUpdateQuoteTemplate();
  const deleteTemplateMutation = useDeleteQuoteTemplate();

  const handleQuoteAction = (quote: any, action: string) => {
    setSelectedQuote(quote);
    setQuoteFormOpen(true);
  };

  const handleUpdateQuote = (data: any) => {
    updateQuoteMutation.mutate({ quoteId: data.id, data });
  };

  const handleApproveQuote = (quoteId: string, estimate: number, notes?: string) => {
    approveQuoteMutation.mutate({ quoteId, estimate, notes });
  };

  const handleRejectQuote = (quoteId: string, reason: string) => {
    rejectQuoteMutation.mutate({ quoteId, reason });
  };

  const handleConvertToOrder = (quoteId: string) => {
    convertQuoteMutation.mutate(quoteId);
  };

  const handleCreateTemplate = (data: any) => {
    createTemplateMutation.mutate(data);
  };

  const handleUpdateTemplate = (templateId: string, data: any) => {
    updateTemplateMutation.mutate({ templateId, data });
  };

  const handleDeleteTemplate = (templateId: string) => {
    deleteTemplateMutation.mutate(templateId);
  };

  const handleUseTemplate = (template: any) => {
    // Logic to apply template to new quote
    console.log('Using template:', template);
  };

  const filteredQuotes = quotes?.filter(quote =>
    quote.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quote.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quote.servico.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'em_analise':
        return <Badge variant="default">Under Review</Badge>;
      case 'aprovado':
        return <Badge variant="outline" className="text-success border-success"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejeitado':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'convertido':
        return <Badge variant="outline" className="text-info border-info">Converted</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'alta':
        return <Badge variant="destructive">High</Badge>;
      case 'media':
        return <Badge variant="secondary">Medium</Badge>;
      case 'baixa':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quotes</h1>
          <p className="text-muted-foreground">
            Manage customer quote requests and proposals
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Quote
        </Button>
      </div>

      <Tabs defaultValue="quotes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="quotes" className="gap-2">
            <FileText className="h-4 w-4" />
            Quotes
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quotes" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search quotes..."
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

          {/* Quotes Table */}
          <Card>
            <CardHeader>
              <CardTitle>Quote Requests ({quotes?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Estimate</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuotes?.length ? (
                      filteredQuotes.map((quote) => (
                        <TableRow key={quote.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{quote.nome}</div>
                              <div className="text-sm text-muted-foreground">{quote.email}</div>
                              {quote.empresa && (
                                <div className="text-xs text-muted-foreground">{quote.empresa}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              <div className="font-medium flex items-center gap-1.5">
                                <span>{quote.servico}</span>
                                {quote.arquivo_url && (
                                  <a
                                    href={quote.arquivo_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={`View attachment: ${quote.arquivo_nome || 'File'}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-primary hover:text-primary/80 inline-flex items-center"
                                  >
                                    <Paperclip className="h-3.5 w-3.5" />
                                  </a>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground truncate">
                                {quote.descricao}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(quote.status)}
                          </TableCell>
                          <TableCell>
                            {getPriorityBadge(quote.prioridade)}
                          </TableCell>
                          <TableCell>
                            {quote.orcamento_estimado ? (
                              <span className="font-semibold text-green-600">
                                $ {Number(quote.orcamento_estimado).toLocaleString('en-US', { 
                                  minimumFractionDigits: 2 
                                })}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Pending</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(quote.created_at).toLocaleDateString('en-US')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleQuoteAction(quote, 'view')}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {quote.status === 'aprovado' && !quote.converted_to_order_id && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleConvertToOrder(quote.id)}
                                  title="Convert to Order"
                                >
                                  <ArrowRight className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          No quotes found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <QuoteTemplates
            onCreateTemplate={handleCreateTemplate}
            onUpdateTemplate={handleUpdateTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onUseTemplate={handleUseTemplate}
          />
        </TabsContent>
      </Tabs>

      <QuoteForm
        quote={selectedQuote}
        open={quoteFormOpen}
        onClose={() => {
          setQuoteFormOpen(false);
          setSelectedQuote(null);
        }}
        onUpdate={handleUpdateQuote}
        onConvertToOrder={handleConvertToOrder}
        onApprove={handleApproveQuote}
        onReject={handleRejectQuote}
      />
    </div>
  );
}
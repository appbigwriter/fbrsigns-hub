import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Mail, MessageSquare, Phone, Calendar, User } from "lucide-react";
import { useCustomerCommunications } from "@/hooks/useQuery";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface CustomerCommunicationsProps {
  customerId: string;
}

export function CustomerCommunications({ customerId }: CustomerCommunicationsProps) {
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<string>("");
  const [direction, setDirection] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { data: communications, isLoading: commsLoading } = useCustomerCommunications(customerId);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleAddCommunication = async () => {
    if (!type || !direction || !message.trim()) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("customer_communications")
        .insert({
          customer_id: customerId,
          type,
          direction,
          subject: subject || null,
          message,
          status: 'sent',
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Communication logged successfully",
      });

      // Reset form
      setType("");
      setDirection("");
      setSubject("");
      setMessage("");
      setShowForm(false);
      
      queryClient.invalidateQueries({ queryKey: ["customer-communications", customerId] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to log communication",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'whatsapp': return <MessageSquare className="h-4 w-4" />;
      case 'phone': return <Phone className="h-4 w-4" />;
      case 'meeting': return <Calendar className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'email': return 'bg-blue-100 text-blue-800';
      case 'whatsapp': return 'bg-green-100 text-green-800';
      case 'phone': return 'bg-purple-100 text-purple-800';
      case 'meeting': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Communication History
            </CardTitle>
            <Button 
              onClick={() => setShowForm(!showForm)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Log Communication
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add communication form */}
          {showForm && (
            <div className="p-4 border rounded-lg space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Communication type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="phone">Phone Call</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="note">Note</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={direction} onValueChange={setDirection}>
                  <SelectTrigger>
                    <SelectValue placeholder="Direction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outbound">Outbound (We contacted them)</SelectItem>
                    <SelectItem value="inbound">Inbound (They contacted us)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(type === 'email' || type === 'meeting') && (
                <Input
                  placeholder="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              )}

              <Textarea
                placeholder="Communication details..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />

              <div className="flex gap-2">
                <Button 
                  onClick={handleAddCommunication}
                  disabled={isLoading || !type || !direction || !message.trim()}
                >
                  Log Communication
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Communications list */}
          <div className="space-y-3">
            {commsLoading ? (
              <p className="text-center text-muted-foreground py-4">Loading communications...</p>
            ) : communications?.length ? (
              communications.map((comm) => (
                <div key={comm.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getIcon(comm.type)}
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge className={getTypeColor(comm.type)}>
                            {comm.type.charAt(0).toUpperCase() + comm.type.slice(1)}
                          </Badge>
                          <Badge variant={comm.direction === 'outbound' ? 'default' : 'secondary'}>
                            {comm.direction === 'outbound' ? 'Outbound' : 'Inbound'}
                          </Badge>
                        </div>
                        {comm.subject && (
                          <p className="font-medium mt-1">{comm.subject}</p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(comm.created_at).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-sm">{comm.message}</p>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No communications logged yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
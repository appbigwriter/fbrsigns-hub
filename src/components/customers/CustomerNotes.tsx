import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, MessageSquare } from "lucide-react";
import { useCustomerNotes } from "@/hooks/useQuery";
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

interface CustomerNotesProps {
  customerId: string;
}

export function CustomerNotes({ customerId }: CustomerNotesProps) {
  const [newNote, setNewNote] = useState("");
  const [editingNote, setEditingNote] = useState<any>(null);
  const [deletingNote, setDeletingNote] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { data: notes, isLoading: notesLoading } = useCustomerNotes(customerId);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("customer_notes")
        .insert({
          customer_id: customerId,
          note: newNote,
          is_internal: true,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Note added successfully",
      });

      setNewNote("");
      queryClient.invalidateQueries({ queryKey: ["customer-notes", customerId] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add note",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteNote = async (note: any) => {
    try {
      const { error } = await supabase
        .from("customer_notes")
        .delete()
        .eq("id", note.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Note deleted successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["customer-notes", customerId] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete note",
        variant: "destructive",
      });
    }
    setDeletingNote(null);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Customer Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new note */}
          <div className="space-y-3">
            <Textarea
              placeholder="Add a note about this customer..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
            />
            <Button 
              onClick={handleAddNote} 
              disabled={isLoading || !newNote.trim()}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Note
            </Button>
          </div>

          {/* Notes list */}
          <div className="space-y-3">
            {notesLoading ? (
              <p className="text-center text-muted-foreground py-4">Loading notes...</p>
            ) : notes?.length ? (
              notes.map((note) => (
                <div key={note.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm">{note.note}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(note.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingNote(note)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">No notes yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog 
        open={!!deletingNote} 
        onOpenChange={() => setDeletingNote(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteNote(deletingNote)}
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
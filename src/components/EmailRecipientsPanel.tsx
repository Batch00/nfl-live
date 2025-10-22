import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, Trash2, Plus } from "lucide-react";

interface EmailRecipient {
  id: string;
  email: string;
  name: string | null;
  active: boolean;
  created_at: string;
}

export const EmailRecipientsPanel = () => {
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch recipients
  const { data: recipients, isLoading } = useQuery({
    queryKey: ['email-recipients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('halftime_email_recipients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EmailRecipient[];
    },
  });

  // Add recipient mutation
  const addRecipient = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('halftime_email_recipients')
        .insert({
          email: newEmail,
          name: newName || null,
          active: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-recipients'] });
      setNewEmail("");
      setNewName("");
      toast({
        title: "Success",
        description: "Email recipient added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle active mutation
  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('halftime_email_recipients')
        .update({ active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-recipients'] });
      toast({
        title: "Success",
        description: "Recipient status updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete recipient mutation
  const deleteRecipient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('halftime_email_recipients')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-recipients'] });
      toast({
        title: "Success",
        description: "Recipient removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddRecipient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newEmail.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    addRecipient.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Halftime Email Recipients
        </CardTitle>
        <CardDescription>
          Manage who receives automatic halftime play-by-play CSV exports
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Recipient Form */}
        <form onSubmit={handleAddRecipient} className="space-y-4 p-4 border rounded-lg bg-muted/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name (Optional)</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" disabled={addRecipient.isPending} className="w-full md:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Recipient
          </Button>
        </form>

        {/* Recipients List */}
        <div className="space-y-2">
          <h3 className="font-medium">Current Recipients ({recipients?.length || 0})</h3>
          {isLoading ? (
            <p className="text-muted-foreground">Loading recipients...</p>
          ) : !recipients || recipients.length === 0 ? (
            <p className="text-muted-foreground">No recipients configured yet</p>
          ) : (
            <div className="space-y-2">
              {recipients.map((recipient) => (
                <div
                  key={recipient.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{recipient.email}</p>
                      {recipient.name && (
                        <span className="text-sm text-muted-foreground">({recipient.name})</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Added {new Date(recipient.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`active-${recipient.id}`} className="text-sm">
                        {recipient.active ? 'Active' : 'Inactive'}
                      </Label>
                      <Switch
                        id={`active-${recipient.id}`}
                        checked={recipient.active}
                        onCheckedChange={(checked) =>
                          toggleActive.mutate({ id: recipient.id, active: checked })
                        }
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteRecipient.mutate(recipient.id)}
                      disabled={deleteRecipient.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 bg-muted rounded-lg space-y-2">
          <p className="text-sm font-medium">📧 How it works:</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>All active recipients receive emails when games reach halftime</li>
            <li>Toggle the switch to pause emails for a recipient without removing them</li>
            <li>CSV files are automatically generated with play-by-play data</li>
            <li>Filename format: NFL25_08_KCvGB_plays.csv</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Megaphone } from "lucide-react";

export default function LeadSourceSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ["lead_sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_sources")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("lead_sources").insert({ name });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead_sources"] });
      setNewName("");
      toast({ title: "Origem adicionada" });
    },
    onError: () => toast({ title: "Erro ao adicionar", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("lead_sources").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lead_sources"] }),
    onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" }),
  });

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    addMutation.mutate(trimmed);
  };

  if (isLoading) return <div className="text-muted-foreground text-sm">Carregando...</div>;

  return (
    <div className="space-y-6 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4" /> Origens de Lead
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Nova origem..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={addMutation.isPending} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          </div>

          <div className="divide-y divide-border rounded-lg border border-border">
            {sources.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3">
                <span className={s.active ? "text-foreground" : "text-muted-foreground line-through"}>
                  {s.name}
                </span>
                <Switch
                  checked={s.active}
                  onCheckedChange={(checked) => toggleMutation.mutate({ id: s.id, active: checked })}
                />
              </div>
            ))}
            {sources.length === 0 && (
              <p className="px-4 py-3 text-sm text-muted-foreground">Nenhuma origem cadastrada</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

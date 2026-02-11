import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Save, User } from "lucide-react";

export default function ProfileSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my_profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [initialized, setInitialized] = useState(false);

  if (profile && !initialized) {
    setFullName(profile.full_name || "");
    setPhone(profile.phone || "");
    setInitialized(true);
  }

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, phone })
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_profile"] });
      toast({ title: "Perfil atualizado" });
    },
    onError: () => toast({ title: "Erro ao atualizar perfil", variant: "destructive" }),
  });

  if (isLoading) return <div className="text-muted-foreground text-sm">Carregando...</div>;

  return (
    <div className="space-y-6 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" /> Dados Pessoais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled className="bg-muted" />
          </div>
          <div>
            <Label>Nome Completo</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
          </div>
          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

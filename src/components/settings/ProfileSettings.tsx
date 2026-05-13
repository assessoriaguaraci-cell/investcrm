import { useState, useEffect } from "react";
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
  const [occupation, setOccupation] = useState("");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (profile && !initialized) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setOccupation((profile as any).occupation || "");
      setInitialized(true);
    }
  }, [profile, initialized]);

  const OCCUPATION_OPTIONS = [
    { value: "gestor", label: "Gestor" },
    { value: "coordenador", label: "Coordenador" },
    { value: "administrativo", label: "Administrativo" },
    { value: "estagiario", label: "Estagiário" },
    { value: "outro", label: "Outro" },
  ];

  const updateMutation = useMutation({
    mutationFn: async () => {
      console.log("Iniciando atualização de perfil para:", user?.id);
      const { error } = await supabase
        .from("profiles")
        .upsert({
          user_id: user!.id,
          full_name: fullName,
          phone: phone || null,
          occupation: occupation || null,
          updated_at: new Date().toISOString()
        } as any, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error("Erro Supabase na atualização:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_profile"] });
      toast({ title: "Perfil atualizado com sucesso!", variant: "default" });
    },
    onError: (error: any) => {
      console.error("Erro na mutação:", error);
      toast({
        title: "Falha na atualização",
        description: `Erro: ${error.message || "Permissão negada ou erro de rede. Verifique o console."}`,
        variant: "destructive"
      });
    },
  });

  if (isLoading) return <div className="text-muted-foreground text-sm">Carregando...</div>;

  return (
    <div className="space-y-6 max-w-lg text-foreground">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" /> Dados Pessoais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled className="bg-muted opacity-80" />
            <p className="text-[10px] text-muted-foreground italic">O email não pode ser alterado diretamente.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Nome Completo</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" />
          </div>
          <div className="space-y-1.5">
            <Label>Telefone / WhatsApp</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
          </div>
          <div className="space-y-1.5">
            <Label>Ocupação / Cargo</Label>
            <select
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Selecione...</option>
              {OCCUPATION_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <Button
            className="w-full sm:w-auto font-bold"
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

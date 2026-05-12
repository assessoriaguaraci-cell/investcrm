import { useState, useMemo } from "react";
import { Copy, Trash2, Merge, AlertTriangle, Loader2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useClients, useDeleteClient, useUpdateClient } from "@/hooks/useClients";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export default function DuplicateManagerDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { data: clients = [], isLoading } = useClients();
  const deleteClient = useDeleteClient();
  const updateClient = useUpdateClient();
  const qc = useQueryClient();

  // Find duplicates based on phone
  const duplicateGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};
    clients.forEach(c => {
      const phone = c.phone ? String(c.phone).replace(/\D/g, '') : null;
      if (phone && phone.length >= 8) {
        if (!groups[phone]) groups[phone] = [];
        groups[phone].push(c);
      }
    });
    // Only return groups with more than 1 member
    return Object.entries(groups)
      .filter(([_, members]) => members.length > 1)
      .sort((a, b) => b[1].length - a[1].length);
  }, [clients]);

  const handleMerge = async (phone: string, members: any[]) => {
    setLoading(true);
    try {
      // Sort by completeness (who has more fields filled)
      const sorted = [...members].sort((a, b) => {
        const aScore = Object.values(a).filter(Boolean).length;
        const bScore = Object.values(b).filter(Boolean).length;
        return bScore - aScore;
      });

      const primary = sorted[0];
      const others = sorted.slice(1);

      // Aglutinar informações (pega o que falta no primário dos outros)
      const updates: any = {};
      others.forEach(other => {
        Object.keys(other).forEach(key => {
          if (!primary[key] && other[key]) {
            updates[key] = other[key];
          }
        });
      });

      // 1. Update primary if needed
      if (Object.keys(updates).length > 0) {
        const { error: upError } = await supabase
          .from("clients")
          .update(updates)
          .eq("id", primary.id);
        if (upError) throw upError;
      }

      // 2. Delete others
      for (const other of others) {
        const { error: delError } = await supabase
          .from("clients")
          .delete()
          .eq("id", other.id);
        if (delError) throw delError;
      }

      toast.success(`Mesclagem concluída para o telefone ${phone}`);
      qc.invalidateQueries({ queryKey: ["clients"] });
    } catch (error: any) {
      toast.error("Erro ao mesclar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMergeAll = async () => {
    if (!confirm(`Isso irá mesclar automaticamente todos os ${duplicateGroups.length} grupos de duplicatas. Deseja continuar?`)) return;
    
    setLoading(true);
    let count = 0;
    try {
      for (const [phone, members] of duplicateGroups) {
        const sorted = [...members].sort((a, b) => {
          const aScore = Object.values(a).filter(Boolean).length;
          const bScore = Object.values(b).filter(Boolean).length;
          return bScore - aScore;
        });

        const primary = sorted[0];
        const others = sorted.slice(1);
        const updates: any = {};
        others.forEach(other => {
          Object.keys(other).forEach(key => {
            if (!primary[key] && other[key]) updates[key] = other[key];
          });
        });

        if (Object.keys(updates).length > 0) {
          await supabase.from("clients").update(updates).eq("id", primary.id);
        }

        for (const other of others) {
          await supabase.from("clients").delete().eq("id", other.id);
        }
        count++;
      }
      toast.success(`${count} grupos de duplicatas foram limpos.`);
      qc.invalidateQueries({ queryKey: ["clients"] });
    } catch (error: any) {
      toast.error("Erro na limpeza em massa: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-orange-200 hover:bg-orange-50 text-orange-700 font-bold uppercase text-[10px]">
          <Copy className="h-3.5 w-3.5" />
          Gerenciar Duplicatas
          {duplicateGroups.length > 0 && (
            <Badge variant="destructive" className="ml-1 h-4 min-w-4 p-0 px-1 text-[8px]">
              {duplicateGroups.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tighter">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Limpeza de Leads Duplicados
              </DialogTitle>
              <DialogDescription className="text-xs font-bold uppercase text-muted-foreground mt-1">
                Identificamos {duplicateGroups.length} grupos de telefones repetidos no seu CRM.
              </DialogDescription>
            </div>
            {duplicateGroups.length > 0 && (
              <Button 
                onClick={handleMergeAll} 
                disabled={loading}
                className="bg-orange-600 hover:bg-orange-700 text-white font-black uppercase text-[10px] gap-2 shadow-lg"
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Merge className="h-3.5 w-3.5" />}
                Mesclar Tudo Agora
              </Button>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 mt-4 pr-4">
          <div className="space-y-4 pb-4">
            {duplicateGroups.length === 0 ? (
              <div className="text-center py-12 bg-muted/20 rounded-xl border-2 border-dashed border-muted">
                <p className="text-sm font-black uppercase text-muted-foreground">Parabéns! Nenhuma duplicata encontrada por telefone.</p>
              </div>
            ) : (
              duplicateGroups.map(([phone, members]) => (
                <div key={phone} className="p-4 rounded-xl border bg-card shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-black">
                        {members.length}
                      </div>
                      <div>
                        <p className="text-sm font-black uppercase tracking-tight">{phone}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Telefone compartilhado por {members.length} cartões</p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleMerge(phone, members)}
                      disabled={loading}
                      className="h-8 gap-2 border-orange-200 text-orange-600 hover:bg-orange-50 font-black uppercase text-[10px]"
                    >
                      <Merge className="h-3 w-3" /> Aglutinar Informações
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 border-t pt-3">
                    {members.map(m => (
                      <div key={m.id} className="text-[10px] p-2 rounded bg-muted/30 flex justify-between items-center group">
                        <div className="truncate pr-2">
                          <span className="font-black uppercase">{m.full_name}</span>
                          <span className="mx-1 text-muted-foreground">·</span>
                          <span className="text-muted-foreground">{m.email || 'Sem e-mail'}</span>
                        </div>
                        <Badge variant="outline" className="h-5 text-[8px] font-black uppercase shrink-0">
                          Etapa: {m.stage}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

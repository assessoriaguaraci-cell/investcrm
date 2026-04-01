import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserPlus, X, Phone, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { LINK_STATUSES } from "@/lib/link-constants";

interface Props {
  propertyId: string;
}

function useLinkedClients(propertyId: string) {
  return useQuery({
    queryKey: ["property_linked_clients", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_property_links")
        .select("id, status, clients(id, full_name, phone, whatsapp, temperature)")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

function useAllClients() {
  return useQuery({
    queryKey: ["all_clients_for_linking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, full_name, phone, whatsapp")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });
}

export default function LinkedClients({ propertyId }: Props) {
  const qc = useQueryClient();
  const { data: links, isLoading } = useLinkedClients(propertyId);
  const { data: allClients } = useAllClients();
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const linkedClientIds = useMemo(() => new Set(links?.map(l => (l.clients as any)?.id) ?? []), [links]);

  const filtered = useMemo(() => {
    if (!allClients || !search.trim()) return [];
    const q = search.toLowerCase();
    return allClients
      .filter(c => !linkedClientIds.has(c.id))
      .filter(c =>
        c.full_name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.whatsapp && c.whatsapp.includes(q))
      )
      .slice(0, 8);
  }, [allClients, search, linkedClientIds]);

  const addLink = useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase.from("client_property_links").insert({
        property_id: propertyId,
        client_id: clientId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["property_linked_clients", propertyId] });
      qc.invalidateQueries({ queryKey: ["client_property_links"] });
      setSearch("");
      toast.success("Cliente vinculado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeLink = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase.from("client_property_links").delete().eq("id", linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["property_linked_clients", propertyId] });
      qc.invalidateQueries({ queryKey: ["client_property_links"] });
      toast.success("Vínculo removido");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statusLabel = (s: string) => LINK_STATUSES.find(ls => ls.value === s)?.label ?? s;

  if (isLoading) {
    return <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Clientes Vinculados</span>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowSearch(!showSearch)}>
          <UserPlus className="h-3.5 w-3.5" /> Vincular
        </Button>
      </div>

      {showSearch && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
              autoFocus
            />
          </div>
          {filtered.length > 0 && (
            <ScrollArea className="max-h-32 border rounded-md">
              {filtered.map(c => (
                <button
                  key={c.id}
                  onClick={() => addLink.mutate(c.id)}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 flex items-center justify-between"
                >
                  <span className="font-medium truncate">{c.full_name}</span>
                  <span className="text-muted-foreground ml-2 shrink-0">{c.whatsapp || c.phone || ""}</span>
                </button>
              ))}
            </ScrollArea>
          )}
          {search.trim() && filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-1">Nenhum cliente encontrado</p>
          )}
        </div>
      )}

      {links && links.length > 0 ? (
        <div className="space-y-1.5">
          {links.map(link => {
            const client = link.clients as any;
            if (!client) return null;
            return (
              <div key={link.id} className="flex items-center gap-2 rounded-md border p-2 bg-card text-xs">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{client.full_name}</p>
                  {(client.phone || client.whatsapp) && (
                    <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                      <Phone className="h-3 w-3" />
                      <span>{client.whatsapp || client.phone}</span>
                    </div>
                  )}
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">{statusLabel(link.status)}</Badge>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeLink.mutate(link.id)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-2">Nenhum cliente vinculado</p>
      )}
    </div>
  );
}

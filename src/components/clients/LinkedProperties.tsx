import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2, X, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/property-constants";
import { LINK_STATUSES } from "@/lib/link-constants";

interface Props {
  clientId: string;
}

function useLinkedProperties(clientId: string) {
  return useQuery({
    queryKey: ["client_linked_properties", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_property_links")
        .select("id, status, properties(id, code, city, state, listed_price)")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

function useAllProperties() {
  return useQuery({
    queryKey: ["all_properties_for_linking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, code, city, state, listed_price")
        .order("code");
      if (error) throw error;
      return data;
    },
  });
}

export default function LinkedProperties({ clientId }: Props) {
  const qc = useQueryClient();
  const { data: links, isLoading } = useLinkedProperties(clientId);
  const { data: allProperties } = useAllProperties();
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const linkedPropertyIds = useMemo(() => new Set(links?.map(l => (l.properties as any)?.id) ?? []), [links]);

  const filtered = useMemo(() => {
    if (!allProperties || !search.trim()) return [];
    const q = search.toLowerCase();
    return allProperties
      .filter(p => !linkedPropertyIds.has(p.id))
      .filter(p =>
        p.code.toLowerCase().includes(q) ||
        (p.city && p.city.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [allProperties, search, linkedPropertyIds]);

  const addLink = useMutation({
    mutationFn: async (propertyId: string) => {
      const { error } = await supabase.from("client_property_links").insert({
        client_id: clientId,
        property_id: propertyId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client_linked_properties", clientId] });
      qc.invalidateQueries({ queryKey: ["client_property_links"] });
      setSearch("");
      toast.success("Imóvel vinculado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeLink = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase.from("client_property_links").delete().eq("id", linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client_linked_properties", clientId] });
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
        <span className="text-sm font-medium">Imóveis Vinculados</span>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowSearch(!showSearch)}>
          <Building2 className="h-3.5 w-3.5" /> Vincular
        </Button>
      </div>

      {showSearch && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por código ou cidade..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
              autoFocus
            />
          </div>
          {filtered.length > 0 && (
            <ScrollArea className="max-h-32 border rounded-md">
              {filtered.map(p => (
                <button
                  key={p.id}
                  onClick={() => addLink.mutate(p.id)}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 flex items-center justify-between"
                >
                  <span className="font-mono font-medium">{p.code}</span>
                  <span className="text-muted-foreground ml-2">
                    {[p.city, p.state].filter(Boolean).join("/")} {p.listed_price ? `• ${formatCurrency(p.listed_price)}` : ""}
                  </span>
                </button>
              ))}
            </ScrollArea>
          )}
          {search.trim() && filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-1">Nenhum imóvel encontrado</p>
          )}
        </div>
      )}

      {links && links.length > 0 ? (
        <div className="space-y-1.5">
          {links.map(link => {
            const prop = link.properties as any;
            if (!prop) return null;
            return (
              <div key={link.id} className="flex items-center gap-2 rounded-md border p-2 bg-card text-xs">
                <div className="flex-1 min-w-0">
                  <p className="font-mono font-medium">{prop.code}</p>
                  <p className="text-muted-foreground mt-0.5">
                    {[prop.city, prop.state].filter(Boolean).join("/")}
                    {prop.listed_price ? ` • ${formatCurrency(prop.listed_price)}` : ""}
                  </p>
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
        <p className="text-xs text-muted-foreground text-center py-2">Nenhum imóvel vinculado</p>
      )}
    </div>
  );
}

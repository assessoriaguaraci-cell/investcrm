import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bookmark, Save, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import type { PropertyFilterValues } from "./PropertyFilters";
import { EMPTY_FILTERS } from "./PropertyFilters";

interface SavedFilter {
  id: string;
  name: string;
  filters: PropertyFilterValues;
}

interface Props {
  currentFilters: PropertyFilterValues;
  onLoadFilter: (filters: PropertyFilterValues) => void;
}

export default function SavedFiltersButton({ currentFilters, onLoadFilter }: Props) {
  const { user } = useAuth();
  const [saveOpen, setSaveOpen] = useState(false);
  const [filterName, setFilterName] = useState("");
  const qc = useQueryClient();

  const { data: saved = [] } = useQuery({
    queryKey: ["saved_filters", "properties"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_filters")
        .select("*")
        .eq("entity_type", "properties")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(d => ({
        id: d.id,
        name: d.name,
        filters: d.filters as unknown as PropertyFilterValues,
      })) as SavedFilter[];
    },
  });

  const saveFilter = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("saved_filters").insert({
        user_id: user!.id,
        name: filterName,
        entity_type: "properties",
        filters: currentFilters as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved_filters"] });
      toast.success("Filtro salvo!");
      setFilterName("");
      setSaveOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteFilter = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saved_filters").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved_filters"] });
      toast.success("Filtro removido");
    },
  });

  const hasActiveFilters = Object.entries(currentFilters).some(([k, v]) => {
    if (k === "search") return false;
    if (Array.isArray(v)) return v.length > 0;
    return !!v;
  });

  return (
    <div className="flex items-center gap-1.5">
      {hasActiveFilters && (
        <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1 text-xs h-8">
              <Save className="h-3.5 w-3.5" /> Salvar filtro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Salvar filtro</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Nome do filtro..."
                value={filterName}
                onChange={e => setFilterName(e.target.value)}
              />
              <Button
                className="w-full"
                disabled={!filterName.trim() || saveFilter.isPending}
                onClick={() => saveFilter.mutate()}
              >
                {saveFilter.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {saved.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {saved.map(s => (
            <div key={s.id} className="flex items-center gap-0.5">
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs h-7"
                onClick={() => onLoadFilter(s.filters)}
              >
                <Bookmark className="h-3 w-3" />
                {s.name}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => deleteFilter.mutate(s.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

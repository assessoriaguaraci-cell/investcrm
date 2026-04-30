import { useState, useEffect, useMemo } from "react";
import { usePreAuctionProperties, usePreAuctionFunnels, useUpdatePreAuctionProperty, useCreatePreAuctionFunnel } from "@/hooks/usePreAuction";
import { PreAuctionBoard } from "@/components/pre-auction/PreAuctionBoard";
import { PreAuctionDialog } from "@/components/pre-auction/PreAuctionDialog";
import { PreAuctionProperty, PreAuctionStage } from "@/types/pre-auction";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Gavel, LayoutGrid, Filter, Settings2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function PreAuctionKanban() {
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | undefined>(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<PreAuctionProperty | null>(null);
  const [isNewFunnelOpen, setIsNewFunnelOpen] = useState(false);
  const [newFunnelName, setNewFunnelName] = useState("");

  const { data: funnels } = usePreAuctionFunnels();
  const { data: properties, isLoading } = usePreAuctionProperties(selectedFunnelId);
  const updateMutation = useUpdatePreAuctionProperty();
  const createFunnelMutation = useCreatePreAuctionFunnel();

  useEffect(() => {
    document.title = "Invest CRM | Pré-Arrematação";
  }, []);

  const handleMoveProperty = (id: string, newStage: PreAuctionStage) => {
    updateMutation.mutate({ id, stage: newStage });
  };

  const handleCardClick = (property: PreAuctionProperty) => {
    setSelectedProperty(property);
    setIsDialogOpen(true);
  };

  const handleAddProperty = () => {
    setSelectedProperty(null);
    setIsDialogOpen(true);
  };

  const handleCreateFunnel = async () => {
    if (!newFunnelName) return;
    try {
      await createFunnelMutation.mutateAsync(newFunnelName);
      setIsNewFunnelOpen(false);
      setNewFunnelName("");
      toast.success("Funil criado com sucesso!");
    } catch (error) {
      toast.error("Erro ao criar funil.");
    }
  };

  const [search, setSearch] = useState("");

  const filteredProperties = useMemo(() => {
    if (!properties) return [];
    if (!search) return properties;
    const q = search.toLowerCase();
    return properties.filter(p => 
      (p.code?.toLowerCase().includes(q)) ||
      (p.address?.toLowerCase().includes(q)) ||
      (p.neighborhood?.toLowerCase().includes(q)) ||
      (p.city?.toLowerCase().includes(q))
    );
  }, [properties, search]);

  return (
    <div className="p-4 md:p-6 h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 pb-4 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <Gavel className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-foreground uppercase tracking-tighter leading-none">
              PRÉ-ARREMATAÇÃO
            </h1>
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Gestão de diligências e propostas</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
                <LayoutGrid className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar imóvel..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 h-9 text-xs font-bold uppercase tracking-tight"
                />
            </div>

            <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border">
                <Select value={selectedFunnelId || "default"} onValueChange={(v) => setSelectedFunnelId(v === "default" ? undefined : v)}>
                    <SelectTrigger className="w-[150px] h-8 text-[10px] font-black uppercase tracking-widest border-none bg-transparent">
                        <SelectValue placeholder="Selecionar Funil" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default" className="text-[10px] font-black uppercase">Funil Padrão</SelectItem>
                        {funnels?.map(f => (
                            <SelectItem key={f.id} value={f.id} className="text-[10px] font-black uppercase">{f.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setIsNewFunnelOpen(true)}>
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            <Button onClick={handleAddProperty} className="gap-2 font-black shadow-lg bg-primary hover:bg-primary/90 text-white h-10 px-6 uppercase text-xs shadow-primary/20">
                <Plus className="h-4 w-4" /> Novo Imóvel
            </Button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 opacity-50">
            <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="font-black uppercase tracking-widest text-xs">Carregando Board...</p>
          </div>
        ) : (
          <PreAuctionBoard 
            properties={filteredProperties} 
            onMoveProperty={handleMoveProperty}
            onCardClick={handleCardClick}
            funnelId={selectedFunnelId}
          />
        )}
      </div>

      {/* Dialogs */}
      <PreAuctionDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        property={selectedProperty}
        funnelId={selectedFunnelId}
      />

      <Dialog open={isNewFunnelOpen} onOpenChange={setIsNewFunnelOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle className="font-black uppercase tracking-tighter">Criar Novo Funil</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                  <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nome do Funil</Label>
                      <Input value={newFunnelName} onChange={(e) => setNewFunnelName(e.target.value)} placeholder="Ex: Investidores SP" />
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsNewFunnelOpen(false)} className="font-black uppercase tracking-tight">Cancelar</Button>
                  <Button onClick={handleCreateFunnel} className="font-black uppercase tracking-tight">Criar Funil</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}

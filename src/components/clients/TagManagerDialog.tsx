import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  useClientTags,
  useCreateClientTag,
  useUpdateClientTag,
  useDeleteClientTag,
  TAG_COLORS,
  getTagBgColor,
} from "@/hooks/useClientTags";
import { Plus, Settings2, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function TagManagerDialog() {
  const { data: dbTags = [], isLoading } = useClientTags();
  const createTag = useCreateClientTag();
  const updateTag = useUpdateClientTag();
  const deleteTag = useDeleteClientTag();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("blue");

  const handleCreate = async () => {
    const name = newTagName.trim();
    if (!name) return;

    if (dbTags.some(t => t.name.toLowerCase() === name.toLowerCase())) {
      toast({
        title: "Etiqueta já existe",
        description: "Já existe uma etiqueta global com esse nome.",
        variant: "destructive"
      });
      return;
    }

    try {
      await createTag.mutateAsync({ name, color: newTagColor });
      setNewTagName("");
      toast({
        title: "Etiqueta criada",
        description: `A etiqueta "${name}" foi adicionada às opções globais.`
      });
    } catch (err: any) {
      toast({
        title: "Erro ao criar etiqueta",
        description: err.message || "Erro desconhecido",
        variant: "destructive"
      });
    }
  };

  const handleColorChange = async (id: string, color: string) => {
    try {
      await updateTag.mutateAsync({ id, color });
      toast({
        title: "Cor atualizada",
        description: "A cor da etiqueta foi atualizada globalmente."
      });
    } catch (err: any) {
      toast({
        title: "Erro ao atualizar cor",
        description: err.message || "Erro desconhecido",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir a etiqueta "${name}" globalmente? Ela continuará listada nos clientes antigos, mas deixará de aparecer como sugestão.`)) {
      return;
    }

    try {
      await deleteTag.mutateAsync(id);
      toast({
        title: "Etiqueta excluída",
        description: `A etiqueta "${name}" foi excluída do painel global.`
      });
    } catch (err: any) {
      toast({
        title: "Erro ao excluir etiqueta",
        description: err.message || "Erro desconhecido",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 font-bold uppercase text-[9px] border-slate-200">
          <Settings2 className="h-3 w-3 text-orange-500" />
          Gerenciar Cores
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
            🎨 Gerenciador de Etiquetas Globais
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Create tag inline */}
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg space-y-3">
            <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Nova Etiqueta Global</h4>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Ex: VIP, MENTORIA..."
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                className="h-8 text-[11px] font-bold uppercase"
              />
              <Select value={newTagColor} onValueChange={setNewTagColor}>
                <SelectTrigger className="h-8 text-[11px] font-black uppercase">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-[11px] font-bold uppercase">
                  {TAG_COLORS.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full border border-black/5 ${getTagBgColor(c.value)}`} />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreate} className="w-full h-8 font-black uppercase text-[10px] bg-orange-600 hover:bg-orange-700 text-white gap-1">
              <Plus className="h-3 w-3" /> Adicionar Etiqueta Global
            </Button>
          </div>

          {/* List existing */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Etiquetas Cadastradas ({dbTags.length})</h4>
            {isLoading ? (
              <p className="text-xs text-muted-foreground animate-pulse">Carregando etiquetas...</p>
            ) : dbTags.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Nenhuma etiqueta global cadastrada. Elas serão criadas automaticamente ao adicionar em um cliente ou pelo formulário acima.</p>
            ) : (
              <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
                {dbTags.map(tag => (
                  <div key={tag.id} className="flex items-center justify-between p-2 bg-white border border-slate-100 rounded-lg hover:border-slate-200 transition-colors">
                    <Badge variant="outline" className={`text-[10px] font-black uppercase ${getTagBgColor(tag.color)}`}>
                      {tag.name}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Select value={tag.color} onValueChange={(val) => handleColorChange(tag.id, val)}>
                        <SelectTrigger className="h-7 w-28 text-[9px] font-black uppercase">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="text-[9px] font-bold uppercase">
                          {TAG_COLORS.map(c => (
                            <SelectItem key={c.value} value={c.value}>
                              <div className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${getTagBgColor(c.value)}`} />
                                {c.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(tag.id, tag.name)}
                        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

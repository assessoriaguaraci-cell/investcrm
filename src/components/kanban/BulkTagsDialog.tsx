import { useState, useEffect } from "react";
import { Tag, Loader2, X, Plus, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedCount: number;
    onConfirm: (tags: string[]) => Promise<void>;
}

export function BulkTagsDialog({ open, onOpenChange, selectedCount, onConfirm }: Props) {
    const [tags, setTags] = useState<string[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [loading, setLoading] = useState(false);
    const [existingTags, setExistingTags] = useState<string[]>([]);
    const [fetchingTags, setFetchingTags] = useState(false);

    useEffect(() => {
        if (open) {
            fetchExistingTags();
            setTags([]);
        }
    }, [open]);

    const fetchExistingTags = async () => {
        setFetchingTags(true);
        try {
            const { data } = await supabase.from("clients").select("tags").not("tags", "is", null);
            if (data) {
                const allTags = data.flatMap(d => (Array.isArray(d.tags) ? d.tags : []));
                const uniqueTags = [...new Set(allTags)].sort();
                setExistingTags(uniqueTags);
            }
        } catch (e) {
            console.error("Error fetching existing tags", e);
        } finally {
            setFetchingTags(false);
        }
    };

    const toggleTag = (tag: string) => {
        if (tags.includes(tag)) {
            setTags(tags.filter(t => t !== tag));
        } else {
            setTags([...tags, tag]);
        }
    };

    const handleAddTag = () => {
        const val = inputValue.trim();
        if (val && !tags.includes(val)) {
            setTags([...tags, val]);
            setInputValue("");
        }
    };

    const handleConfirm = async () => {
        if (tags.length === 0) return;
        setLoading(true);
        try {
            await onConfirm(tags);
            onOpenChange(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Tag className="h-5 w-5 text-primary" />
                        Adicionar Tags em Massa
                    </DialogTitle>
                    <DialogDescription>
                        Vincular tags a <b>{selectedCount}</b> clientes selecionados.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="grid gap-2">
                        <Label>Nova Tag</Label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Digite e aperte Enter..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                            />
                            <Button type="button" size="icon" onClick={handleAddTag} className="shrink-0">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                            <History className="h-3.5 w-3.5" />
                            Sugestões (Tags já utilizadas)
                        </Label>
                        {fetchingTags ? (
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <Loader2 className="h-3 w-3 animate-spin" /> Carregando base de tags...
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto p-2 border rounded-md bg-slate-50/50">
                                {existingTags.length === 0 && <span className="text-[10px] text-muted-foreground p-1">Nenhuma tag encontrada.</span>}
                                {existingTags.map(t => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => toggleTag(t)}
                                        className={cn(
                                            "text-[10px] px-2.5 py-1 rounded-full border transition-all font-medium",
                                            tags.includes(t)
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "bg-white text-slate-600 border-slate-200 hover:border-primary/50"
                                        )}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {tags.length > 0 && (
                        <div className="grid gap-2">
                            <Label className="text-xs font-bold text-primary">Tags a serem aplicadas:</Label>
                            <div className="flex flex-wrap gap-1.5 p-2 rounded-md bg-blue-50/30 border border-blue-100">
                                {tags.map((t) => (
                                    <Badge key={t} variant="secondary" className="pl-2 pr-1 gap-1 py-1 bg-white border-blue-200 text-blue-700">
                                        {t}
                                        <button onClick={() => toggleTag(t)} className="hover:bg-slate-200 rounded-full p-0.5">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleConfirm} disabled={tags.length === 0 || loading}>
                        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Confirmar para {selectedCount} Clientes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

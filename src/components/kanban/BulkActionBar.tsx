import { X, Trash2, Tag, ArrowRight, UserPlus, Clock, Pencil, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
    selectedCount: number;
    onClear: () => void;
    onDelete?: () => void;
    onChangeStage?: () => void;
    onAddTag?: () => void;
    onReassign?: () => void;
    onAddTask?: () => void;
    onChangeField?: () => void;
    inline?: boolean;
}

export function BulkActionBar({
    selectedCount,
    onClear,
    onDelete,
    onChangeStage,
    onAddTag,
    onReassign,
    onAddTask,
    onChangeField,
    inline = false
}: Props) {
    if (selectedCount === 0) return null;

    return (
        <div className="w-full bg-slate-50 border-b border-slate-200 py-1 px-4 flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2 pr-4 border-r border-slate-200 shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {selectedCount} selecionados
                    </span>
                </div>

                <div className="flex items-center gap-0.5">
                    {onReassign && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px] text-slate-400 hover:text-slate-800 hover:bg-transparent gap-1.5 px-2"
                            onClick={onReassign}
                        >
                            <RotateCcw className="h-3 w-3" /> reatribuir
                        </Button>
                    )}
                    {onAddTask && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px] text-slate-400 hover:text-slate-800 hover:bg-transparent gap-1.5 px-2"
                            onClick={onAddTask}
                        >
                            <Clock className="h-3 w-3 text-sky-400" /> adicionar tarefa
                        </Button>
                    )}
                    {onChangeStage && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px] text-slate-400 hover:text-slate-800 hover:bg-transparent gap-1.5 px-2"
                            onClick={onChangeStage}
                        >
                            <ArrowRight className="h-3 w-3 text-emerald-400" /> alterar etapa
                        </Button>
                    )}
                    {onChangeField && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px] text-slate-400 hover:text-slate-800 hover:bg-transparent gap-1.5 px-2"
                            onClick={onChangeField}
                        >
                            <Pencil className="h-3 w-3" /> alterar o campo
                        </Button>
                    )}
                    {onDelete && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px] text-red-500 hover:text-red-700 hover:bg-red-50/50 gap-1.5 px-2 transition-colors font-medium shadow-none"
                            onClick={onDelete}
                        >
                            <Trash2 className="h-3 w-3" /> excluir
                        </Button>
                    )}
                    {onAddTag && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px] text-slate-400 hover:text-slate-800 hover:bg-transparent gap-1.5 px-2"
                            onClick={onAddTag}
                        >
                            <Tag className="h-3 w-3" /> editar tags
                        </Button>
                    )}
                </div>
            </div>

            <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-slate-300 hover:text-slate-600 rounded-full shrink-0"
                onClick={onClear}
                title="Limpar seleção"
            >
                <X className="h-3 w-3" />
            </Button>
        </div>
    );
}

import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent
} from "@/components/ui/dropdown-menu";
import { useUpdateActivity, type Activity } from "@/hooks/useActivities";
import { useClients } from "@/hooks/useClients";
import { useProperties } from "@/hooks/useProperties";
import { useApprovedMembers } from "@/hooks/useTeamMembers";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  AlignLeft, 
  CheckSquare, 
  MessageSquare, 
  Calendar, 
  User, 
  Building2, 
  Trash2, 
  Plus, 
  X, 
  Activity as ActivityIcon,
  Clock,
  MoreHorizontal,
  Copy,
  Eye,
  UserPlus,
  Archive,
  ArrowRight,
  Tags,
  Check,
  Settings
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ACTIVITY_TYPES = [
  { value: "ligacao", label: "📞 Ligação" },
  { value: "whatsapp", label: "💬 WhatsApp" },
  { value: "visita", label: "🚗 Visita" },
  { value: "reuniao", label: "🤝 Reunião" },
  { value: "documentacao", label: "📄 Documentação" },
  { value: "lembrete", label: "⏰ Lembrete" },
  { value: "outro", label: "💡 Outro" },
];

const STATUS_LABELS: Record<string, string> = {
  pendente: "A Fazer",
  em_andamento: "Em Andamento",
  feito: "Concluído",
  atrasado: "Atrasado",
};

const DEFAULT_LABELS = [
  { id: "lbl-1", name: "Pedido de Texto", color: "#e2b203" },
  { id: "lbl-2", name: "Mais um passo", color: "#ea7e00" },
  { id: "lbl-3", name: "Prioridade", color: "#cf2e2e" },
  { id: "lbl-4", name: "Time de Design", color: "#7f53f1" },
  { id: "lbl-5", name: "Marketing de Produto", color: "#0079bf" },
  { id: "lbl-6", name: "Dica do Trello", color: "#00c2e0" },
  { id: "lbl-7", name: "Socorro", color: "#61bd4f" }
];

interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

interface CommentItem {
  id: string;
  author: string;
  text: string;
  date: string;
}

interface HistoryItem {
  id: string;
  user: string;
  action: string;
  date: string;
}

interface TaskMetaData {
  description: string;
  checklist: ChecklistItem[];
  comments: CommentItem[];
  history: HistoryItem[];
  labels?: string[];
  customLabels?: { id: string, name: string, color: string }[];
  dates?: {
    dueDate?: string;
    hasDueDate: boolean;
    dueTime: string;
    recurrence: string;
    reminder: string;
  };
}

interface Props {
  activity: Activity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditTaskDialog({ activity, open, onOpenChange }: Props) {
  const { user: authUser } = useAuth();
  const updateActivity = useUpdateActivity();
  const { data: clients } = useClients();
  const { data: properties } = useProperties();
  const { data: members } = useApprovedMembers();
  const qc = useQueryClient();

  // Primary fields
  const [description, setDescription] = useState("");
  const [activityType, setActivityType] = useState("lembrete");
  const [dueDate, setDueDate] = useState("");
  const [clientId, setClientId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [status, setStatus] = useState<"pendente" | "feito" | "atrasado" | "em_andamento">("pendente");
  const [responsibleUserId, setResponsibleUserId] = useState("");

  // Metadata rich fields
  const [richDescription, setRichDescription] = useState("");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newComment, setNewComment] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Labels and customisations
  const [labels, setLabels] = useState<string[]>([]);
  const [customLabels, setCustomLabels] = useState<{ id: string, name: string, color: string }[]>([]);
  const [searchLabel, setSearchLabel] = useState("");
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingLabelName, setEditingLabelName] = useState("");

  // Dates state
  const [dueTime, setDueTime] = useState("12:00");
  const [recurrence, setRecurrence] = useState("never");
  const [reminder, setReminder] = useState("1_day");

  // Members search inside popover
  const [searchMember, setSearchMember] = useState("");

  // Checklist title inside popover
  const [checklistTitle, setChecklistTitle] = useState("Checklist");
  const [copyChecklistFrom, setCopyChecklistFrom] = useState("none");

  // Comment edit state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  // Resolve active user profile details
  const activeMember = members.find(m => m.user_id === authUser?.id);
  const activeUserName = activeMember?.full_name || authUser?.email || "Usuário do CRM";

  // Safe split YYYY-MM-DD
  const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  // Load fields and parse rich notes
  useEffect(() => {
    if (activity) {
      setDescription(activity.description);
      setActivityType(activity.activity_type);
      setDueDate(activity.due_date?.split("T")[0] || "");
      setClientId(activity.client_id || "");
      setPropertyId(activity.property_id || "");
      setStatus(activity.status);
      setResponsibleUserId(activity.responsible_user_id || "");

      // Parse JSON metadata or fallback to plain text notes
      const notesRaw = activity.notes || "";
      if (notesRaw.trim().startsWith("{") && notesRaw.trim().endsWith("}")) {
        try {
          const parsed: TaskMetaData = JSON.parse(notesRaw);
          setRichDescription(parsed.description || "");
          setChecklist(parsed.checklist || []);
          setComments(parsed.comments || []);
          setHistory(parsed.history || []);
          setLabels(parsed.labels || []);
          setCustomLabels(parsed.customLabels || []);
          if (parsed.dates) {
            setDueTime(parsed.dates.dueTime || "12:00");
            setRecurrence(parsed.dates.recurrence || "never");
            setReminder(parsed.dates.reminder || "1_day");
          }
        } catch (e) {
          setRichDescription(notesRaw);
          setChecklist([]);
          setComments([]);
          setHistory([]);
          setLabels([]);
          setCustomLabels([]);
        }
      } else {
        setRichDescription(notesRaw);
        setChecklist([]);
        setComments([]);
        setHistory([]);
        setLabels([]);
        setCustomLabels([]);
      }
    }
  }, [activity]);

  // Saves changes and packages them back into serialised JSON
  const handleSave = (
    updatedFields?: Partial<Activity>, 
    newComments?: CommentItem[], 
    newHistory?: HistoryItem[],
    newLabels?: string[],
    newCustoms?: typeof customLabels,
    newChecklist?: ChecklistItem[]
  ) => {
    if (!activity) return;

    const finalComments = newComments ?? comments;
    const finalHistory = newHistory ?? history;
    const finalLabels = newLabels ?? labels;
    const finalCustoms = newCustoms ?? customLabels;
    const finalChecklist = newChecklist ?? checklist;

    const metaData: TaskMetaData = {
      description: richDescription,
      checklist: finalChecklist,
      comments: finalComments,
      history: finalHistory,
      labels: finalLabels,
      customLabels: finalCustoms,
      dates: {
        dueDate: updatedFields?.due_date !== undefined ? (updatedFields.due_date || "") : dueDate,
        hasDueDate: !!(updatedFields?.due_date !== undefined ? updatedFields.due_date : dueDate),
        dueTime,
        recurrence,
        reminder
      }
    };

    const finalDescription = updatedFields?.description ?? description;
    const finalActivityType = updatedFields?.activity_type ?? activityType;
    const finalDueDate = updatedFields?.due_date !== undefined ? updatedFields.due_date : (dueDate || null);
    const finalClientId = updatedFields?.client_id !== undefined ? (updatedFields.client_id === "none" ? null : updatedFields.client_id) : (clientId && clientId !== "none" ? clientId : null);
    const finalPropertyId = updatedFields?.property_id !== undefined ? (updatedFields.property_id === "none" ? null : updatedFields.property_id) : (propertyId && propertyId !== "none" ? propertyId : null);
    const finalStatus = updatedFields?.status ?? status;
    const finalResponsible = updatedFields?.responsible_user_id !== undefined ? (updatedFields.responsible_user_id === "none" ? null : updatedFields.responsible_user_id) : (responsibleUserId || null);

    updateActivity.mutate(
      {
        id: activity.id,
        description: finalDescription.trim(),
        activity_type: finalActivityType,
        due_date: finalDueDate,
        client_id: finalClientId,
        property_id: finalPropertyId,
        status: finalStatus,
        responsible_user_id: finalResponsible,
        notes: JSON.stringify(metaData),
        completed_at: finalStatus === "feito" ? new Date().toISOString() : null,
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["activities"] });
        },
        onError: () => toast.error("Erro ao atualizar o cartão")
      }
    );
  };

  // Add a checklist item
  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    const newItem: ChecklistItem = {
      id: Math.random().toString(36).substring(2, 9),
      text: newChecklistItem.trim(),
      done: false
    };
    const updatedList = [...checklist, newItem];
    setChecklist(updatedList);
    setNewChecklistItem("");
    
    // Add to history
    const log: HistoryItem = {
      id: Math.random().toString(36).substring(2, 9),
      user: activeUserName,
      action: `adicionou o item "${newItem.text}" ao checklist`,
      date: new Date().toISOString()
    };
    setHistory([log, ...history]);

    // Save automatically
    setTimeout(() => handleSave(undefined, undefined, undefined, undefined, undefined, updatedList), 50);
  };

  // Toggle checklist item
  const handleToggleChecklistItem = (itemId: string) => {
    const updated = checklist.map(item => {
      if (item.id === itemId) {
        return { ...item, done: !item.done };
      }
      return item;
    });
    setChecklist(updated);
    setTimeout(() => handleSave(undefined, undefined, undefined, undefined, undefined, updated), 50);
  };

  // Delete checklist item
  const handleDeleteChecklistItem = (itemId: string) => {
    const deletedItem = checklist.find(item => item.id === itemId);
    const updated = checklist.filter(item => item.id !== itemId);
    setChecklist(updated);

    if (deletedItem) {
      const log: HistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        user: activeUserName,
        action: `removeu o item "${deletedItem.text}" do checklist`,
        date: new Date().toISOString()
      };
      setHistory([log, ...history]);
    }
    setTimeout(() => handleSave(undefined, undefined, undefined, undefined, undefined, updated), 50);
  };

  // Post comment
  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const commentItem: CommentItem = {
      id: Math.random().toString(36).substring(2, 9),
      author: activeUserName,
      text: newComment.trim(),
      date: new Date().toISOString()
    };
    const updatedComments = [commentItem, ...comments];
    setComments(updatedComments);
    setNewComment("");

    const log: HistoryItem = {
      id: Math.random().toString(36).substring(2, 9),
      user: activeUserName,
      action: `comentou: "${commentItem.text.substring(0, 40)}${commentItem.text.length > 40 ? '...' : ''}"`,
      date: new Date().toISOString()
    };
    const updatedHistory = [log, ...history];
    setHistory(updatedHistory);
    setTimeout(() => handleSave(undefined, updatedComments, updatedHistory), 50);
  };

  // Edit Comment Text
  const handleSaveCommentEdit = (commentId: string) => {
    if (!editingCommentText.trim()) return;
    const updatedComments = comments.map(c => {
      if (c.id === commentId) {
        return { ...c, text: editingCommentText.trim() };
      }
      return c;
    });
    setComments(updatedComments);
    setEditingCommentId(null);

    const log: HistoryItem = {
      id: Math.random().toString(36).substring(2, 9),
      user: activeUserName,
      action: `editou um comentário anterior`,
      date: new Date().toISOString()
    };
    const updatedHistory = [log, ...history];
    setHistory(updatedHistory);
    setTimeout(() => handleSave(undefined, updatedComments, updatedHistory), 50);
  };

  // Delete Comment
  const handleDeleteComment = (commentId: string) => {
    if (!confirm("Tem certeza de que deseja excluir este comentário?")) return;
    const updatedComments = comments.filter(c => c.id !== commentId);
    setComments(updatedComments);

    const log: HistoryItem = {
      id: Math.random().toString(36).substring(2, 9),
      user: activeUserName,
      action: `excluiu um comentário`,
      date: new Date().toISOString()
    };
    const updatedHistory = [log, ...history];
    setHistory(updatedHistory);
    setTimeout(() => handleSave(undefined, updatedComments, updatedHistory), 50);
  };

  // Trello Actions: Labels Toggling
  const handleToggleLabel = (labelId: string) => {
    const updated = labels.includes(labelId)
      ? labels.filter(id => id !== labelId)
      : [...labels, labelId];
    setLabels(updated);

    const labelName = customLabels.find(l => l.id === labelId)?.name || DEFAULT_LABELS.find(l => l.id === labelId)?.name || "etiqueta";
    const log: HistoryItem = {
      id: Math.random().toString(36).substring(2, 9),
      user: activeUserName,
      action: labels.includes(labelId) ? `removeu a etiqueta "${labelName}"` : `adicionou a etiqueta "${labelName}"`,
      date: new Date().toISOString()
    };
    const updatedHistory = [log, ...history];
    setHistory(updatedHistory);

    setTimeout(() => handleSave(undefined, undefined, updatedHistory, updated), 50);
  };

  // Trello Actions: Save label name inline
  const handleSaveLabelName = (labelId: string) => {
    if (!editingLabelName.trim()) return;
    const updatedCustoms = [...customLabels];
    const idx = updatedCustoms.findIndex(l => l.id === labelId);
    if (idx >= 0) {
      updatedCustoms[idx].name = editingLabelName.trim();
    } else {
      const def = DEFAULT_LABELS.find(l => l.id === labelId);
      updatedCustoms.push({
        id: labelId,
        name: editingLabelName.trim(),
        color: def?.color || "#6b7280"
      });
    }
    setCustomLabels(updatedCustoms);
    setEditingLabelId(null);
    setTimeout(() => handleSave(undefined, undefined, undefined, undefined, updatedCustoms), 50);
  };

  // Trello Actions: Create new label
  const handleCreateNewLabel = () => {
    const name = prompt("Digite o nome da nova etiqueta:");
    if (!name?.trim()) return;
    const colors = ["#e2b203", "#ea7e00", "#cf2e2e", "#7f53f1", "#0079bf", "#00c2e0", "#61bd4f"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newId = `lbl-custom-${Math.random().toString(36).substring(2, 9)}`;
    const updatedCustoms = [...customLabels, { id: newId, name: name.trim(), color: randomColor }];
    setCustomLabels(updatedCustoms);
    const updatedLabels = [...labels, newId];
    setLabels(updatedLabels);

    const log: HistoryItem = {
      id: Math.random().toString(36).substring(2, 9),
      user: activeUserName,
      action: `criou e adicionou uma nova etiqueta: "${name}"`,
      date: new Date().toISOString()
    };
    const updatedHistory = [log, ...history];
    setHistory(updatedHistory);

    setTimeout(() => handleSave(undefined, undefined, updatedHistory, updatedLabels, updatedCustoms), 50);
  };

  // Advanced header actions: Ingressar (Join)
  const handleJoinCard = () => {
    if (!authUser) return;
    setResponsibleUserId(authUser.id);
    const log: HistoryItem = {
      id: Math.random().toString(36).substring(2, 9),
      user: activeUserName,
      action: `ingressou nesta tarefa como responsável`,
      date: new Date().toISOString()
    };
    setHistory([log, ...history]);
    toast.success("Você agora é o responsável por esta tarefa!");
    setTimeout(() => handleSave({ responsible_user_id: authUser.id }), 50);
  };

  // Advanced header actions: Mover (Move)
  const handleMoveCard = (targetStatus: "pendente" | "feito" | "atrasado" | "em_andamento") => {
    setStatus(targetStatus);
    const log: HistoryItem = {
      id: Math.random().toString(36).substring(2, 9),
      user: activeUserName,
      action: `moveu este cartão para a lista "${STATUS_LABELS[targetStatus]}"`,
      date: new Date().toISOString()
    };
    setHistory([log, ...history]);
    toast.success(`Movido para ${STATUS_LABELS[targetStatus]}`);
    setTimeout(() => handleSave({ status: targetStatus }), 50);
  };

  // Advanced header actions: Copiar (Clone)
  const handleCopyCard = async () => {
    if (!activity) return;
    try {
      const metaData: TaskMetaData = {
        description: richDescription,
        checklist: checklist.map(i => ({ ...i, id: Math.random().toString(36).substring(2, 9) })),
        comments: [], // clear comments for the clone
        history: [{ 
          id: Math.random().toString(36).substring(2, 9), 
          user: activeUserName, 
          action: `copiou esta tarefa a partir do cartão original`, 
          date: new Date().toISOString() 
        }],
        labels,
        customLabels
      };

      const { error } = await supabase
        .from("activities")
        .insert({
          description: `${description} (Cópia)`,
          activity_type: activityType,
          due_date: dueDate || null,
          client_id: clientId && clientId !== "none" ? clientId : null,
          property_id: propertyId && propertyId !== "none" ? propertyId : null,
          status: status,
          responsible_user_id: responsibleUserId || null,
          created_by: authUser?.id || null,
          notes: JSON.stringify(metaData),
        });

      if (error) throw error;
      
      toast.success("Cartão copiado com sucesso!");
      qc.invalidateQueries({ queryKey: ["activities"] });
      onOpenChange(false); // Close dialog
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao copiar o cartão");
    }
  };

  // Advanced header actions: Arquivar (Excluir)
  const handleArchiveCard = async () => {
    if (!activity) return;
    if (!confirm("Tem certeza que deseja arquivar/excluir este cartão?")) return;
    try {
      const { error } = await supabase
        .from("activities")
        .delete()
        .eq("id", activity.id);

      if (error) throw error;

      toast.success("Cartão arquivado!");
      qc.invalidateQueries({ queryKey: ["activities"] });
      onOpenChange(false);
    } catch (e) {
      toast.error("Erro ao arquivar cartão");
    }
  };

  // Checklist percentage calculations
  const totalItems = checklist.length;
  const completedItems = checklist.filter(i => i.done).length;
  const checklistPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Filtered members & labels for popovers
  const filteredMembers = members.filter(m => m.full_name?.toLowerCase().includes(searchMember.toLowerCase()));
  const allLabels = DEFAULT_LABELS.map(def => {
    const custom = customLabels.find(l => l.id === def.id);
    return custom ? custom : def;
  }).concat(customLabels.filter(l => !l.id.startsWith("lbl-")));

  const filteredLabels = allLabels.filter(l => l.name.toLowerCase().includes(searchLabel.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] md:h-[80vh] flex flex-col p-0 overflow-hidden bg-background border border-border shadow-2xl rounded-xl animate-in zoom-in-95 duration-200">
        
        {/* Advanced Action Bar on Top Right (to the left of close button) */}
        <div className="absolute right-12 top-4 flex items-center gap-1.5 z-50">
          
          {/* Join button directly */}
          {responsibleUserId !== authUser?.id && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleJoinCard}
              className="h-8 text-[10px] font-black uppercase tracking-tight gap-1 bg-background hover:bg-muted"
            >
              <UserPlus className="h-3.5 w-3.5" /> Ingressar
            </Button>
          )}

          {/* Three dots dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-muted">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
              <DropdownMenuItem onClick={handleJoinCard} className="gap-2">
                <UserPlus className="h-4 w-4" /> Ingressar
              </DropdownMenuItem>
              
              {/* Move Submenu */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2">
                  <ArrowRight className="h-4 w-4" /> Mover
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => handleMoveCard("pendente")}>
                    📋 A Fazer
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleMoveCard("em_andamento")}>
                    ⚡ Em Andamento
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleMoveCard("feito")}>
                    ✅ Concluído
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleMoveCard("atrasado")}>
                    🚨 Atrasado
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuItem onClick={handleCopyCard} className="gap-2">
                <Copy className="h-4 w-4" /> Copiar
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={handleArchiveCard} className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive">
                <Archive className="h-4 w-4" /> Arquivar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Scrollable Layout */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 flex flex-col md:flex-row gap-6">
          
          {/* Main Content Area (70%) */}
          <div className="flex-1 space-y-6 md:pr-4">
            
            {/* Task Description Title Header */}
            <div className="space-y-1">
              <div className="flex items-start gap-3">
                <CheckSquare className="h-6 w-6 text-primary mt-1 shrink-0" />
                <div className="flex-1">
                  <Input 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={() => handleSave()}
                    className="text-lg md:text-xl font-bold border-transparent hover:border-border focus:border-primary px-1 -ml-1 bg-transparent hover:bg-muted/30 focus:bg-background h-auto py-1 shadow-none focus:ring-0 leading-tight transition-all font-heading"
                  />
                  <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5 flex-wrap">
                    <span>na lista</span>
                    
                    {/* Interactive List Dropdown Picker */}
                    <Select value={status} onValueChange={(v) => handleMoveCard(v as any)}>
                      <SelectTrigger className="h-6 w-auto text-[10px] font-black uppercase bg-muted/65 hover:bg-muted/90 border-border/40 py-0.5 px-2 rounded-md shadow-none focus:ring-0 gap-1.5 inline-flex shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">📋 A Fazer</SelectItem>
                        <SelectItem value="em_andamento">⚡ Em Andamento</SelectItem>
                        <SelectItem value="feito">✅ Concluído</SelectItem>
                        <SelectItem value="atrasado">🚨 Atrasado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Trello Top Action Bar (Horizontal Popover Controls matching screenshot) */}
            <div className="flex flex-wrap gap-2 items-center pl-9 pt-1 pb-2 border-b border-border/10">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mr-1.5 select-none">Adicionar ao cartão</span>

              {/* Etiquetas Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-tight gap-1.5 rounded bg-muted/40 border-border/40 hover:bg-muted/80 shadow-none">
                    <Tags className="h-3.5 w-3.5 text-muted-foreground" /> Etiquetas
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-72 p-4 bg-background border border-border shadow-xl rounded-xl z-50">
                  <div className="flex items-center justify-between pb-2 border-b border-border/40 mb-3">
                    <div className="w-4" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-foreground font-heading">Etiquetas</span>
                    <PopoverPrimitive.Close asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-muted text-muted-foreground"><X className="h-3 w-3" /></Button>
                    </PopoverPrimitive.Close>
                  </div>
                  <Input 
                    placeholder="Buscar etiquetas..." 
                    value={searchLabel}
                    onChange={(e) => setSearchLabel(e.target.value)}
                    className="h-8 text-xs mb-3 shadow-none focus:ring-0 focus:border-primary"
                  />
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                    {filteredLabels.map((lbl) => {
                      const isChecked = labels.includes(lbl.id);
                      return (
                        <div key={lbl.id} className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => handleToggleLabel(lbl.id)}
                            className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-0 shrink-0 cursor-pointer"
                          />
                          {editingLabelId === lbl.id ? (
                            <div className="flex-1 flex gap-1">
                              <Input 
                                value={editingLabelName}
                                onChange={(e) => setEditingLabelName(e.target.value)}
                                className="h-7 text-[11px] py-0 px-1.5 shadow-none"
                                autoFocus
                                onKeyDown={(e) => { if (e.key === "Enter") handleSaveLabelName(lbl.id); }}
                              />
                              <Button size="icon" className="h-7 w-7" onClick={() => handleSaveLabelName(lbl.id)}>
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <div 
                              onClick={() => handleToggleLabel(lbl.id)}
                              className="flex-1 h-7 rounded px-2.5 flex items-center text-[10px] font-black uppercase text-white shadow-sm cursor-pointer select-none transition-all hover:brightness-95"
                              style={{ backgroundColor: lbl.color }}
                            >
                              {lbl.name}
                            </div>
                          )}
                          {editingLabelId !== lbl.id && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-muted-foreground hover:bg-muted shrink-0"
                              onClick={() => {
                                setEditingLabelId(lbl.id);
                                setEditingLabelName(lbl.name);
                              }}
                            >
                              <Plus className="h-3.5 w-3.5 rotate-45" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full h-8 text-[10px] font-black uppercase tracking-tight mt-3 bg-background hover:bg-muted border-border/40"
                    onClick={handleCreateNewLabel}
                  >
                    Criar uma nova etiqueta
                  </Button>
                </PopoverContent>
              </Popover>

              {/* Datas Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-tight gap-1.5 rounded bg-muted/40 border-border/40 hover:bg-muted/80 shadow-none">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Datas
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-72 p-4 bg-background border border-border shadow-xl rounded-xl z-50">
                  <div className="flex items-center justify-between pb-2 border-b border-border/40 mb-3">
                    <div className="w-4" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-foreground font-heading">Datas</span>
                    <PopoverPrimitive.Close asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-muted text-muted-foreground"><X className="h-3 w-3" /></Button>
                    </PopoverPrimitive.Close>
                  </div>
                  <div className="space-y-4 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">Prazo / Entrega</span>
                      <div className="flex items-center gap-2">
                        <input 
                          type="date" 
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="flex-1 h-8 rounded-md border border-border bg-background px-2 py-1 text-xs shadow-sm focus:ring-0 focus:border-primary"
                        />
                        <input 
                          type="time" 
                          value={dueTime}
                          onChange={(e) => setDueTime(e.target.value)}
                          className="w-[90px] h-8 rounded-md border border-border bg-background px-2 py-1 text-xs shadow-sm focus:ring-0 focus:border-primary"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">Recorrente</span>
                      <Select value={recurrence} onValueChange={(v: any) => setRecurrence(v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="never">Nunca</SelectItem>
                          <SelectItem value="daily">Diariamente</SelectItem>
                          <SelectItem value="weekly">Semanalmente</SelectItem>
                          <SelectItem value="monthly">Mensalmente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">Definir Lembrete</span>
                      <Select value={reminder} onValueChange={(v: any) => setReminder(v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          <SelectItem value="on_time">No momento do prazo</SelectItem>
                          <SelectItem value="5_min">5 minutos antes</SelectItem>
                          <SelectItem value="15_min">15 minutos antes</SelectItem>
                          <SelectItem value="1_hour">1 hora antes</SelectItem>
                          <SelectItem value="1_day">1 dia antes</SelectItem>
                          <SelectItem value="2_days">2 dias antes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="pt-2 flex flex-col gap-2">
                      <Button 
                        className="w-full h-8 text-[10px] font-black uppercase tracking-tight bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                        onClick={() => {
                          handleSave({ due_date: dueDate || null });
                          toast.success("Datas e prazos salvos!");
                        }}
                      >
                        Salvar
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full h-8 text-[10px] font-black uppercase tracking-tight border-border/40"
                        onClick={() => {
                          setDueDate("");
                          setDueTime("12:00");
                          handleSave({ due_date: null });
                          toast.success("Prazo removido!");
                        }}
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Checklist Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-tight gap-1.5 rounded bg-muted/40 border-border/40 hover:bg-muted/80 shadow-none">
                    <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" /> Checklist
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-72 p-4 bg-background border border-border shadow-xl rounded-xl z-50">
                  <div className="flex items-center justify-between pb-2 border-b border-border/40 mb-3">
                    <div className="w-4" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-foreground font-heading">Adicionar Checklist</span>
                    <PopoverPrimitive.Close asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-muted text-muted-foreground"><X className="h-3 w-3" /></Button>
                    </PopoverPrimitive.Close>
                  </div>
                  <div className="space-y-1.5 mb-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">Título</span>
                    <Input 
                      value={checklistTitle}
                      onChange={(e) => setChecklistTitle(e.target.value)}
                      placeholder="Checklist"
                      className="h-8 text-xs shadow-none focus:ring-0 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1.5 mb-4">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">Copiar itens de...</span>
                    <Select value={copyChecklistFrom} onValueChange={(v) => setCopyChecklistFrom(v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="(nenhum)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">(nenhum)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    className="w-full h-8 text-[10px] font-black uppercase tracking-tight bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    onClick={() => {
                      const newItem: ChecklistItem = {
                        id: Math.random().toString(36).substring(2, 9),
                        text: `--- ${checklistTitle} ---`,
                        done: false
                      };
                      const updated = [...checklist, newItem];
                      setChecklist(updated);
                      setChecklistTitle("Checklist");
                      toast.success("Novo checklist adicionado!");
                      setTimeout(() => handleSave(undefined, undefined, undefined, undefined, undefined, updated), 50);
                    }}
                  >
                    Adicionar
                  </Button>
                </PopoverContent>
              </Popover>

              {/* Membros Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-tight gap-1.5 rounded bg-muted/40 border-border/40 hover:bg-muted/80 shadow-none">
                    <User className="h-3.5 w-3.5 text-muted-foreground" /> Membros
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-72 p-4 bg-background border border-border shadow-xl rounded-xl z-50">
                  <div className="flex items-center justify-between pb-2 border-b border-border/40 mb-3">
                    <div className="w-4" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-foreground font-heading">Membros</span>
                    <PopoverPrimitive.Close asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-muted text-muted-foreground"><X className="h-3 w-3" /></Button>
                    </PopoverPrimitive.Close>
                  </div>
                  <Input 
                    placeholder="Pesquisar membros" 
                    value={searchMember}
                    onChange={(e) => setSearchMember(e.target.value)}
                    className="h-8 text-xs mb-3 shadow-none focus:ring-0 focus:border-primary"
                  />
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                    <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Membros do Quadro</span>
                    {filteredMembers.map((m) => {
                      const isAssigned = responsibleUserId === m.user_id;
                      return (
                        <div 
                          key={m.user_id}
                          onClick={() => {
                            const finalUserId = isAssigned ? "" : m.user_id;
                            setResponsibleUserId(finalUserId);
                            handleSave({ responsible_user_id: finalUserId });
                            toast.success(isAssigned ? "Responsável removido!" : `Responsável alterado para ${m.full_name}`);
                          }}
                          className="flex items-center justify-between p-1.5 rounded-lg hover:bg-muted/60 cursor-pointer select-none transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                              {m.full_name?.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-xs font-semibold text-foreground">{m.full_name}</span>
                          </div>
                          {isAssigned && <Check className="h-4 w-4 text-primary shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Active Labels List Display */}
            {labels.length > 0 && (
              <div className="pl-9 space-y-1.5">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block select-none">Etiquetas</span>
                <div className="flex flex-wrap gap-1.5">
                  {labels.map((labelId) => {
                    const custom = customLabels.find(l => l.id === labelId);
                    const def = DEFAULT_LABELS.find(l => l.id === labelId);
                    const color = custom?.color || def?.color || "#6b7280";
                    const name = custom?.name || def?.name || "";
                    return (
                      <span 
                        key={labelId}
                        className="h-6 px-2.5 rounded flex items-center text-[10px] font-black uppercase text-white shadow-sm select-none"
                        style={{ backgroundColor: color }}
                      >
                        {name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Badges Row (Membros, Data) */}
            <div className="flex flex-wrap gap-6 pl-9">
              {/* Responsible Badge */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">Responsável</span>
                <Select value={responsibleUserId || "none"} onValueChange={(v) => { setResponsibleUserId(v === "none" ? "" : v); handleSave({ responsible_user_id: v }); }}>
                  <SelectTrigger className="h-8 w-auto text-xs font-semibold bg-muted/60 hover:bg-muted border border-border/40 py-1.5 px-2.5 rounded-lg shadow-none focus:ring-0 gap-2 inline-flex">
                    <div className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[9px] shrink-0">
                      {members.find(m => m.user_id === responsibleUserId)?.full_name?.substring(0, 2).toUpperCase() || "👤"}
                    </div>
                    <SelectValue placeholder="Sem responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">👤 Sem responsável</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>{m.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date Badge */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">Data de Entrega</span>
                <div className="relative">
                  <Input 
                    type="date" 
                    value={dueDate} 
                    onChange={(e) => { setDueDate(e.target.value); handleSave({ due_date: e.target.value || null }); }} 
                    className="h-8 text-xs font-semibold bg-muted/60 hover:bg-muted border border-border/40 py-1.5 pl-8 pr-2.5 rounded-lg shadow-none focus:ring-0 w-[160px] cursor-pointer"
                  />
                  <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Rich Description */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <AlignLeft className="h-5 w-5 text-primary shrink-0" />
                <h3 className="text-sm font-black uppercase text-foreground tracking-wider font-heading">Descrição</h3>
              </div>
              <div className="pl-9 space-y-2">
                {isEditingDesc ? (
                  <div className="space-y-2 animate-in fade-in duration-100">
                    <Textarea 
                      value={richDescription}
                      onChange={(e) => setRichDescription(e.target.value)}
                      placeholder="Adicione uma descrição mais detalhada..."
                      rows={4}
                      className="text-sm border-border focus:ring-1 focus:ring-primary focus:border-primary shadow-sm"
                    />
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => {
                          setIsEditingDesc(false);
                          handleSave();
                        }}
                      >
                        Salvar
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setIsEditingDesc(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => setIsEditingDesc(true)}
                    className="bg-muted/30 hover:bg-muted/60 border border-border/30 rounded-xl p-4 min-h-[80px] cursor-pointer text-sm transition-all text-muted-foreground whitespace-pre-wrap leading-relaxed"
                  >
                    {richDescription.trim() ? (
                      <span className="text-foreground">{richDescription}</span>
                    ) : (
                      <span className="italic text-muted-foreground/60">Adicione uma descrição mais detalhada para esta tarefa...</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Checklist Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckSquare className="h-5 w-5 text-primary shrink-0" />
                  <h3 className="text-sm font-black uppercase text-foreground tracking-wider font-heading">Checklist</h3>
                </div>
                {totalItems > 0 && (
                  <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {checklistPercentage}%
                  </span>
                )}
              </div>

              <div className="pl-9 space-y-4">
                {/* Progress bar */}
                {totalItems > 0 && (
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden flex">
                    <div 
                      className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${checklistPercentage}%` }}
                    />
                  </div>
                )}

                {/* Items list */}
                {checklist.map((item) => (
                  <div key={item.id} className="flex items-center justify-between group py-1 border-b border-border/10 hover:border-border/35 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <input 
                        type="checkbox"
                        checked={item.done}
                        onChange={() => handleToggleChecklistItem(item.id)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary focus:ring-0 shrink-0 cursor-pointer"
                      />
                      <span className={`text-sm ${item.done ? "line-through text-muted-foreground/60" : "text-foreground"} break-words leading-tight`}>
                        {item.text}
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteChecklistItem(item.id)}
                      className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}

                {/* Add new checklist item input */}
                <div className="flex gap-2 items-center">
                  <Input 
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    placeholder="Adicionar um item..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddChecklistItem();
                      }
                    }}
                    className="h-9 text-sm"
                  />
                  <Button size="sm" onClick={handleAddChecklistItem} className="h-9 px-3">
                    <Plus className="h-4 w-4 mr-1" /> Adicionar
                  </Button>
                </div>
              </div>
            </div>

            {/* Comments Feed / History */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-primary shrink-0" />
                <h3 className="text-sm font-black uppercase text-foreground tracking-wider font-heading">Atividades & Comentários</h3>
              </div>

              <div className="pl-9 space-y-4">
                {/* Add comment textarea */}
                <div className="flex gap-3 items-start">
                  <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                    {activeUserName.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 space-y-2">
                    <Textarea 
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Escreva um comentário..."
                      rows={2}
                      className="text-sm shadow-sm"
                    />
                    <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim()}>
                      Enviar comentário
                    </Button>
                  </div>
                </div>

                {/* Combined Feed */}
                <div className="space-y-3 pt-2">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 items-start p-3 bg-muted/20 border border-border/30 rounded-xl">
                      <div className="h-7 w-7 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                        {comment.author.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-foreground">{comment.author}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(comment.date), "dd/MM 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        
                        {/* Edit Inline Comment View */}
                        {editingCommentId === comment.id ? (
                          <div className="space-y-2 mt-2 animate-in fade-in duration-100">
                            <Textarea 
                              value={editingCommentText}
                              onChange={(e) => setEditingCommentText(e.target.value)}
                              rows={2}
                              className="text-xs"
                            />
                            <div className="flex gap-1.5">
                              <Button size="sm" className="h-7 text-[10px] px-2.5" onClick={() => handleSaveCommentEdit(comment.id)}>Salvar</Button>
                              <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2.5" onClick={() => setEditingCommentId(null)}>Cancelar</Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-xs text-foreground mt-1 leading-relaxed whitespace-pre-wrap">{comment.text}</p>
                            
                            {/* Edit / Delete small triggers */}
                            <div className="flex items-center gap-2 mt-1.5 select-none">
                              <button 
                                onClick={() => {
                                  setEditingCommentId(comment.id);
                                  setEditingCommentText(comment.text);
                                }}
                                className="text-[10px] font-semibold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                              >
                                Editar
                              </button>
                              <span className="text-[9px] text-muted-foreground/30">•</span>
                              <button 
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-[10px] font-semibold text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                              >
                                Excluir
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* System Audit logs */}
                  {history.map((log) => (
                    <div key={log.id} className="flex gap-3 items-center text-[10px] text-muted-foreground pl-3 py-0.5 border-l-2 border-border/30">
                      <ActivityIcon className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-foreground/80">{log.user}</span>{" "}
                        <span>{log.action}</span>
                      </div>
                      <span>
                        {format(new Date(log.date), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Sidebar Action Buttons (30%) */}
          <div className="w-full md:w-[240px] space-y-6 border-t md:border-t-0 md:border-l border-border pt-6 md:pt-0 md:pl-6 shrink-0">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Adicionar à tarefa</h4>
              
              {/* Type Picker */}
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider block">Tipo de Atividade</span>
                <Select value={activityType} onValueChange={(v) => { setActivityType(v); handleSave({ activity_type: v }); }}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Client Selection */}
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider block">Cliente Vinculado</span>
                <Select value={clientId || "none"} onValueChange={(v) => { setClientId(v); handleSave({ client_id: v }); }}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">👥 Nenhum cliente</SelectItem>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Property Selection */}
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider block">Imóvel Vinculado</span>
                <Select value={propertyId || "none"} onValueChange={(v) => { setPropertyId(v); handleSave({ property_id: v }); }}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">🏢 Nenhum imóvel</SelectItem>
                    {properties?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Close Modal Button */}
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="w-full mt-4 h-9 font-black uppercase text-[10px] tracking-tight">
                Fechar Cartão
              </Button>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}

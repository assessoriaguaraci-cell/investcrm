import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateActivity, type Activity } from "@/hooks/useActivities";
import { useClients } from "@/hooks/useClients";
import { useProperties } from "@/hooks/useProperties";
import { useApprovedMembers } from "@/hooks/useTeamMembers";
import { useAuth } from "@/hooks/useAuth";
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
  Check,
  ChevronRight,
  Clock
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
        } catch (e) {
          setRichDescription(notesRaw);
          setChecklist([]);
          setComments([]);
          setHistory([]);
        }
      } else {
        setRichDescription(notesRaw);
        setChecklist([]);
        setComments([]);
        setHistory([]);
      }
    }
  }, [activity]);

  // Saves changes and packages them back into serialised JSON
  const handleSave = (updatedFields?: Partial<Activity>) => {
    if (!activity) return;

    const metaData: TaskMetaData = {
      description: richDescription,
      checklist,
      comments,
      history
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
          toast.success("Cartão atualizado com sucesso!");
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
    setTimeout(() => handleSave(), 50);
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
    setTimeout(() => handleSave(), 50);
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
    setTimeout(() => handleSave(), 50);
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
    setHistory([log, ...history]);
    setTimeout(() => handleSave(), 50);
  };

  // Checklist percentage calculations
  const totalItems = checklist.length;
  const completedItems = checklist.filter(i => i.done).length;
  const checklistPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] md:h-[80vh] flex flex-col p-0 overflow-hidden bg-background border border-border shadow-2xl rounded-xl animate-in zoom-in-95 duration-200">
        
        {/* Scrollable Layout */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 flex flex-col md:flex-row gap-8">
          
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
                  <p className="text-xs text-muted-foreground mt-1">
                    na lista <span className="font-semibold underline text-foreground">{STATUS_LABELS[status]}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Badges Row (Membros, Data) */}
            <div className="flex flex-wrap gap-6 pl-9">
              {/* Responsible Badge */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">Responsável</span>
                {responsibleUserId ? (
                  <div className="flex items-center gap-2 bg-muted/60 hover:bg-muted px-2.5 py-1.5 rounded-lg border border-border/50 text-xs font-semibold text-foreground transition-all cursor-pointer">
                    <div className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[9px]">
                      {members.find(m => m.user_id === responsibleUserId)?.full_name?.substring(0, 2).toUpperCase() || "SR"}
                    </div>
                    <span>{members.find(m => m.user_id === responsibleUserId)?.full_name}</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground italic block">Sem responsável</span>
                )}
              </div>

              {/* Due Date Badge */}
              {dueDate && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">Data de Entrega</span>
                  <div className="flex items-center gap-2 bg-muted/60 px-2.5 py-1.5 rounded-lg border border-border/50 text-xs font-semibold text-foreground">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{format(parseLocalDate(dueDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                  </div>
                </div>
              )}
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
                        <p className="text-xs text-foreground mt-1 leading-relaxed whitespace-pre-wrap">{comment.text}</p>
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

              {/* Status Picker */}
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider block">Status / Lista</span>
                <Select value={status} onValueChange={(v) => { setStatus(v as any); handleSave({ status: v as any }); }}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">📋 A Fazer</SelectItem>
                    <SelectItem value="em_andamento">⚡ Em Andamento</SelectItem>
                    <SelectItem value="feito">✅ Concluído</SelectItem>
                    <SelectItem value="atrasado">🚨 Atrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Input */}
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider block">Prazo</span>
                <div className="relative">
                  <Input 
                    type="date" 
                    value={dueDate} 
                    onChange={(e) => { setDueDate(e.target.value); handleSave({ due_date: e.target.value || null }); }} 
                    className="h-9 text-xs pl-8"
                  />
                  <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/60" />
                </div>
              </div>

              {/* Responsible Selection */}
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider block">Responsável</span>
                <Select value={responsibleUserId || "none"} onValueChange={(v) => { setResponsibleUserId(v === "none" ? "" : v); handleSave({ responsible_user_id: v }); }}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Sem responsável" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">👤 Sem responsável</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>{m.full_name}</SelectItem>
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

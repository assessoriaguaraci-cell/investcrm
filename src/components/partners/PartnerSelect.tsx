import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAllCityContacts } from "@/hooks/useCityInfo";
import { Plus } from "lucide-react";
import AddPartnerDialog from "./AddPartnerDialog";

interface Props {
  value: string | null | undefined;
  onValueChange: (value: string) => void;
  className?: string;
  roleFilter?: string[];
  placeholder?: string;
  defaultCity?: { state: string, city: string };
}

export default function PartnerSelect({ value, onValueChange, className, roleFilter, placeholder, defaultCity }: Props) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { data: contacts } = useAllCityContacts();

  const filtered = (contacts || []).filter(c => {
    if (!roleFilter) return true;
    const type = c.contact_type?.trim().toUpperCase();
    if (!type) return false;
    return roleFilter.some(rf => rf.trim().toUpperCase() === type);
  });

  return (
    <div className="flex gap-2 w-full">
      <Select value={value || "none"} onValueChange={(v) => onValueChange(v === "none" ? "" : v)}>
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder || "Selecionar parceiro"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Sem parceiro vinculado</SelectItem>
          {filtered.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.name} ({m.contact_type})
            </SelectItem>
          ))}
          {filtered.length === 0 && contacts && contacts.length > 0 && (
            <SelectItem value="no_matches" disabled className="text-xs">
              Nenhum {roleFilter?.join("/")} encontrado.
              <br />
              Categorias no sistema: {[...new Set(contacts.map(c => c.contact_type))].join(", ")}
            </SelectItem>
          )}
        </SelectContent>
      </Select>
      <button 
        type="button"
        onClick={() => setIsAddOpen(true)}
        className="flex items-center justify-center shrink-0 h-9 w-9 rounded-md border bg-muted/30 hover:bg-muted transition-colors transition-all active:scale-95"
        title="Cadastrar Novo Parceiro"
      >
        <Plus className="h-4 w-4" />
      </button>

      <AddPartnerDialog 
        open={isAddOpen} 
        onOpenChange={setIsAddOpen} 
        onSaved={(id) => onValueChange(id)}
        defaultType={roleFilter?.[0]}
        defaultCity={defaultCity}
      />
    </div>
  );
}

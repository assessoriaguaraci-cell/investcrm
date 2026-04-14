import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApprovedMembers } from "@/hooks/useTeamMembers";

interface Props {
  value: string | null | undefined;
  onValueChange: (value: string) => void;
  className?: string;
  showMentoria?: boolean;
}

export default function ResponsibleSelect({ value, onValueChange, className, showMentoria }: Props) {
  const { data: members } = useApprovedMembers();

  return (
    <Select value={value ?? "none"} onValueChange={(v) => onValueChange(v === "none" ? "" : v)}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Selecionar responsável" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Sem responsável</SelectItem>
        <SelectItem value="mentoria">MENTORIA</SelectItem>
        {members?.map((m) => (
          <SelectItem
            key={m.user_id}
            value={m.user_id}
          >
            {m.full_name || "Sem nome"} {!m.is_registered && "(Aguardando Registro)"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

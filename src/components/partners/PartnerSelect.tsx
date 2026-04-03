import { useState } from "react";
import { Plus, Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAllCityContacts } from "@/hooks/useCityInfo";
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
  const [open, setOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { data: contacts } = useAllCityContacts();

  const filtered = (contacts || []).filter(c => {
    if (!roleFilter) return true;
    const type = c.contact_type?.trim().toUpperCase();
    if (!type) return false;
    return roleFilter.some(rf => rf.trim().toUpperCase() === type);
  });

  const selectedPartner = filtered.find((p) => p.id === value);

  return (
    <div className="flex gap-2 w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("justify-between font-normal", className)}
          >
            {value && selectedPartner ? (
              <span className="truncate">{selectedPartner.name}</span>
            ) : (
              <span className="text-muted-foreground">{placeholder || "Selecionar parceiro..."}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput placeholder="Procurar parceiro..." className="h-9" />
            </div>
            <CommandList>
              <CommandEmpty>Nenhum parceiro encontrado.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    onValueChange("");
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      !value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  Sem parceiro vinculado
                </CommandItem>
                {filtered.map((partner) => (
                  <CommandItem
                    key={partner.id}
                    value={partner.name}
                    onSelect={() => {
                      onValueChange(partner.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === partner.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{partner.name}</span>
                      <span className="text-[10px] text-muted-foreground">{partner.contact_type} {partner.city ? `- ${partner.city}` : ""}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <button 
        type="button"
        onClick={() => setIsAddOpen(true)}
        className="flex items-center justify-center shrink-0 h-10 w-10 rounded-md border bg-muted/30 hover:bg-muted transition-all active:scale-95 shadow-sm"
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

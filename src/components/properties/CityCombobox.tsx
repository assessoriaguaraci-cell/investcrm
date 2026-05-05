import { useState, useMemo } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  value: string;
  onValueChange: (value: string) => void;
  state?: string;
}

export default function CityCombobox({ value, onValueChange, state }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: cities = [] } = useQuery({
    queryKey: ["property-cities", state],
    queryFn: async () => {
      const query = supabase.from("properties").select("city").not("city", "is", null);
      if (state) query.eq("state", state);
      const { data, error } = await query;
      if (error) throw error;
      // Normalize to uppercase and remove duplicates
      const normalized = data.map(d => (d.city || "").toUpperCase()).filter(Boolean);
      const unique = [...new Set(normalized)] as string[];
      return unique.sort();
    },
  });

  const filtered = useMemo(() => {
    if (!search) return cities;
    const s = search.toUpperCase();
    return cities.filter(c => c.toUpperCase().includes(s));
  }, [cities, search]);

  const showCustom = search && !cities.some(c => c.toUpperCase() === search.toUpperCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal h-10 uppercase">
          {value || "Selecione a cidade..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-50" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Buscar cidade..." value={search} onValueChange={(v) => setSearch(v.toUpperCase())} className="uppercase" />
          <CommandList>
            <CommandEmpty>Nenhuma cidade encontrada.</CommandEmpty>
            <CommandGroup>
              {showCustom && (
                <CommandItem
                  value={search.toUpperCase()}
                  onSelect={() => {
                    onValueChange(search.toUpperCase());
                    setOpen(false);
                    setSearch("");
                  }}
                  className="uppercase"
                >
                  <Check className={cn("mr-2 h-4 w-4", value === search.toUpperCase() ? "opacity-100" : "opacity-0")} />
                  Usar "{search.toUpperCase()}"
                </CommandItem>
              )}
              {filtered.map(city => (
                <CommandItem
                  key={city}
                  value={city}
                  onSelect={() => {
                    onValueChange(city);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="uppercase"
                >
                  <Check className={cn("mr-2 h-4 w-4", value === city ? "opacity-100" : "opacity-0")} />
                  {city}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

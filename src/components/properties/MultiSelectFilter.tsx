import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface Props {
  label: string;
  options: Option[];
  selected: string[];
  onSelectionChange: (values: string[]) => void;
  placeholder?: string;
}

export default function MultiSelectFilter({ label, options, selected, onSelectionChange, placeholder = "Todos" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const allSelected = selected.length === 0 || selected.length === options.length;
  const noneSelected = selected.length === options.length && options.length === 0;

  const toggleValue = (val: string) => {
    if (selected.includes(val)) {
      const next = selected.filter(v => v !== val);
      onSelectionChange(next);
    } else {
      const next = [...selected, val];
      // If all selected, clear to mean "all"
      if (next.length === options.length) {
        onSelectionChange([]);
      } else {
        onSelectionChange(next);
      }
    }
  };

  const selectAll = () => onSelectionChange([]);
  const selectNone = () => onSelectionChange(["__none__"]);

  const displayText = () => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1 && selected[0] === "__none__") return "Nenhum";
    if (selected.length === 1) return options.find(o => o.value === selected[0])?.label ?? selected[0];
    return `${selected.filter(s => s !== "__none__").length} selecionados`;
  };

  const isChecked = (val: string) => {
    if (selected.length === 0) return true; // all selected
    return selected.includes(val);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "hover:bg-accent/50 transition-colors"
        )}
      >
        <span className="truncate text-left">{displayText()}</span>
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[200px] rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
          <div className="flex items-center gap-1 p-2 border-b">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs flex-1"
              onClick={selectAll}
            >
              Todos
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs flex-1"
              onClick={selectNone}
            >
              Nenhum
            </Button>
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {options.map(opt => {
              const checked = isChecked(opt.value);
              return (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <Checkbox
                    checked={checked && !(selected.length === 1 && selected[0] === "__none__")}
                    onCheckedChange={() => {
                      if (selected.length === 1 && selected[0] === "__none__") {
                        // From "none" state, select just this one
                        onSelectionChange([opt.value]);
                      } else {
                        toggleValue(opt.value);
                      }
                    }}
                    className="h-4 w-4"
                  />
                  <span className="truncate">{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

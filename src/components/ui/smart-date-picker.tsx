import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { ptBR } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface SmartDatePickerProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function SmartDatePicker({
  value,
  onChange,
  placeholder = "DD/MM/AAAA",
  className,
}: SmartDatePickerProps) {
  const [inputValue, setInputValue] = React.useState("");

  // Sync internal input with value prop
  React.useEffect(() => {
    if (value) {
      try {
        const date = new Date(value + "T12:00:00");
        if (isValid(date)) {
          setInputValue(format(date, "dd/MM/yyyy"));
        }
      } catch (e) {
        setInputValue("");
      }
    } else {
      setInputValue("");
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length > 8) v = v.substring(0, 8);
    
    // Auto-mask DD/MM/YYYY
    let masked = v;
    if (v.length > 2) masked = v.substring(0, 2) + "/" + v.substring(2);
    if (v.length > 4) masked = masked.substring(0, 5) + "/" + masked.substring(5);
    
    setInputValue(masked);

    if (v.length === 8) {
      const parsedDate = parse(masked, "dd/MM/yyyy", new Date());
      if (isValid(parsedDate)) {
        onChange(format(parsedDate, "yyyy-MM-dd"));
      }
    } else if (v.length === 0) {
      onChange(undefined);
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, "yyyy-MM-dd"));
      setInputValue(format(date, "dd/MM/yyyy"));
    } else {
      onChange(undefined);
      setInputValue("");
    }
  };

  return (
    <div className={cn("flex gap-1", className)}>
      <Input
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="flex-1"
        maxLength={10}
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-10 p-0 shrink-0"
            type="button"
          >
            <CalendarIcon className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={value ? new Date(value + "T12:00:00") : undefined}
            onSelect={handleCalendarSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

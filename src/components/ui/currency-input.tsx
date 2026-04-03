import * as React from "react";
import { Input } from "./input";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}

export function CurrencyInput({ value, onChange, ...props }: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = React.useState("");

  // Remove type if it exists in props to avoid browser "number" field behavior
  const { type, ...rest } = props as any;

  const formatValue = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true,
    }).format(val);
  };

  React.useEffect(() => {
    if (value === undefined || value === null) {
      setDisplayValue("");
      return;
    }
    
    const formatted = formatValue(value);
    if (displayValue !== formatted) {
      setDisplayValue(formatted);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    
    if (rawValue === "") {
      setDisplayValue("");
      onChange(undefined);
      return;
    }

    const numericValue = parseInt(rawValue);
    const formatted = formatValue(numericValue);

    setDisplayValue(formatted);
    onChange(numericValue);
  };

  return (
    <div className="relative flex items-center w-full">
      <span className="absolute left-3 text-muted-foreground text-sm font-medium z-10">R$</span>
      <Input
        {...rest}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder="0,00"
        className={`pl-9 ${props.className}`}
      />
    </div>
  );
}

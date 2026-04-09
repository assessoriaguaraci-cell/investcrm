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
      if (displayValue !== "") setDisplayValue("");
      return;
    }
    
    // Verificamos se o valor numérico atual já não é o mesmo que está sendo exibido
    // IMPORTANTE: Se o valor numérico já está correto, NÃO formatamos para não travar a digitação (ex: ,00)
    const currentNumeric = parseFloat(displayValue.replace(/\./g, "").replace(",", "."));
    if (!isNaN(currentNumeric) && currentNumeric === value) {
      return;
    }

    const formatted = formatValue(value);
    if (displayValue !== formatted) {
      setDisplayValue(formatted);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^\d,]/g, "");
    
    // Garante apenas uma vírgula
    const firstComma = raw.indexOf(",");
    if (firstComma !== -1) {
      raw = raw.slice(0, firstComma + 1) + raw.slice(firstComma + 1).replace(/,/g, "");
    }

    if (raw === "") {
      setDisplayValue("");
      onChange(undefined);
      return;
    }

    const parts = raw.split(",");
    const integer = parts[0] || "0";
    const decimals = (parts[1] || "").slice(0, 2);

    // Formata parte inteira para exibição visual (ex: 1.000) mas sem forçar decimais ainda
    const numericInt = parseInt(integer || "0", 10);
    const formattedInteger = integer ? new Intl.NumberFormat("pt-BR").format(numericInt) : "0";
    
    let newDisplay = formattedInteger;
    if (raw.includes(",")) {
      newDisplay += "," + decimals;
    }

    setDisplayValue(newDisplay);

    // Envia o valor numérico para o pai
    const normalized = `${integer || "0"}.${decimals || "0"}`;
    const numericValue = parseFloat(normalized);
    onChange(numericValue);
  };

  const handleBlur = () => {
    // Ao sair do campo, aí sim aplicamos o rigor da formatação ",00"
    if (value !== undefined && value !== null) {
      setDisplayValue(formatValue(value));
    }
  };

  return (
    <div className="relative flex items-center w-full">
      <span className="absolute left-3 text-muted-foreground text-sm font-medium z-10">R$</span>
      <Input
        {...rest}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="0,00"
        className={`pl-9 ${props.className}`}
      />
    </div>
  );
}




import { Settings2, CheckSquare, LayoutGrid, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { useBoardSettings } from "@/hooks/useBoardSettings";

interface Props {
    triggerAsMenuItem?: boolean;
}

export function BoardSettingsMenu({ triggerAsMenuItem }: Props) {
    const settings = useBoardSettings();

    const Content = (
        <div className="flex flex-col">
            <DropdownMenuLabel className="text-[10px] font-black text-muted-foreground uppercase px-2 py-1.5 pt-2">Tamanho do Card</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={settings.cardSize} onValueChange={(v) => settings.setCardSize(v as any)} className="px-1">
                <DropdownMenuRadioItem value="small" className="text-xs font-bold uppercase py-1.5 cursor-pointer">Pequeno</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="medium" className="text-xs font-bold uppercase py-1.5 cursor-pointer">Médio</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="large" className="text-xs font-bold uppercase py-1.5 cursor-pointer">Grande</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator className="my-2" />

            <DropdownMenuLabel className="text-[10px] font-black text-muted-foreground uppercase px-2 py-1.5">Campos Visíveis</DropdownMenuLabel>
            <div className="px-2 py-1 space-y-1">
                {[
                    { id: "showTags", label: "Tags", icon: CheckSquare },
                    { id: "showPropertyLinks", label: "Imóveis Vinculados", icon: CheckSquare },
                    { id: "showPhone", label: "Telefone/WhatsApp", icon: CheckSquare },
                    { id: "showIncome", label: "Renda", icon: CheckSquare },
                    { id: "showLocation", label: "Localização", icon: CheckSquare },
                    { id: "showCpf", label: "CPF", icon: CheckSquare },
                    { id: "showMaritalStatus", label: "Estado Civil", icon: CheckSquare },
                    { id: "showWorkRegime", label: "Regime de Trabalho", icon: CheckSquare },
                ].map((field) => (
                    <div 
                      key={field.id} 
                      className="flex items-center gap-2 py-1 cursor-pointer hover:bg-muted/50 rounded px-1 transition-colors" 
                      onClick={() => settings.toggleField(field.id as any)}
                    >
                        <div className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${settings[field.id as keyof typeof settings] ? 'bg-primary border-primary text-white' : 'border-muted-foreground/30'}`}>
                          {settings[field.id as keyof typeof settings] && <LayoutGrid className="h-2.5 w-2.5" />}
                        </div>
                        <span className="text-[11px] font-bold uppercase leading-none">{field.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    if (triggerAsMenuItem) {
        return (
            <>
                <DropdownMenuSeparator className="my-2" />
                {Content}
            </>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-9 font-bold text-xs uppercase shadow-sm">
                    <Settings2 className="h-4 w-4" />
                    Visualização
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2 shadow-xl border-border/40">
                {Content}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}


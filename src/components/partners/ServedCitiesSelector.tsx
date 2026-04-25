import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBrazilStates, useBrazilCities } from "@/hooks/useCityInfo";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { BRAZILIAN_STATES } from "@/lib/property-constants";

interface Props {
    selectedCities: { state: string; city: string }[];
    onSelect: (cities: { state: string; city: string }[]) => void;
}

export default function ServedCitiesSelector({ selectedCities, onSelect }: Props) {
    const [selectedState, setSelectedState] = useState<string>("");
    const [searchTerm, setSearchTerm] = useState("");
    const { data: states } = useBrazilStates();
    const { data: cities, isLoading: loadingCities } = useBrazilCities(selectedState);

    // Auto-select state if cities are already selected but no state is picked
    useEffect(() => {
        if (!selectedState && selectedCities.length > 0) {
            setSelectedState(selectedCities[0].state);
        }
    }, [selectedCities, selectedState]);

    const handleToggleCity = (city: string) => {
        const exists = selectedCities.find(c => c.state === selectedState && c.city === city);
        if (exists) {
            onSelect(selectedCities.filter(c => !(c.state === selectedState && c.city === city)));
        } else {
            onSelect([...selectedCities, { state: selectedState, city }]);
        }
    };

    const handleSelectAll = () => {
        if (!cities) return;
        const otherCities = selectedCities.filter(c => c.state !== selectedState);
        const thisStateCities = cities.map(c => ({ state: selectedState, city: c.nome }));
        onSelect([...otherCities, ...thisStateCities]);
    };

    const handleSelectNone = () => {
        onSelect(selectedCities.filter(c => c.state !== selectedState));
    };

    const filteredCities = cities?.filter(c =>
        c.nome.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    return (
        <div className="space-y-4 border rounded-md p-3 bg-muted/20">
            <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Estado Atendido</Label>
                <Select value={selectedState} onValueChange={setSelectedState}>
                    <SelectTrigger className="bg-background h-11 border-2 font-bold focus:ring-primary">
                        <SelectValue placeholder="Selecione o estado..." />
                    </SelectTrigger>
                    <SelectContent className="z-[9999]">
                        {(states && states.length > 0 ? states.map(s => ({ sigla: s.sigla, nome: s.nome })) : BRAZILIAN_STATES.map(s => ({ sigla: s, nome: s }))).map(s => (
                            <SelectItem key={s.sigla} value={s.sigla}>{s.nome} ({s.sigla})</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {selectedState && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center justify-between gap-2">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Cidades de {selectedState}</Label>
                        <div className="flex gap-2">
                            <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={handleSelectAll}>Todos</Button>
                            <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={handleSelectNone}>Nenhum</Button>
                        </div>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        <Input
                            placeholder="Pesquisar cidade..."
                            className="h-8 pl-7 text-xs"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <ScrollArea className="h-48 border rounded-md bg-background px-3 py-2">
                        {loadingCities ? (
                            <div className="py-10 text-center text-xs text-muted-foreground animate-pulse">Carregando cidades...</div>
                        ) : filteredCities.length === 0 ? (
                            <div className="py-10 text-center text-xs text-muted-foreground italic">Nenhuma cidade encontrada.</div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2">
                                {filteredCities.map(city => {
                                    const isChecked = selectedCities.some(c => c.state === selectedState && c.city === city.nome);
                                    return (
                                        <div key={city.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`city-${city.id}`}
                                                checked={isChecked}
                                                onCheckedChange={() => handleToggleCity(city.nome)}
                                            />
                                            <Label
                                                htmlFor={`city-${city.id}`}
                                                className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                            >
                                                {city.nome}
                                            </Label>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </ScrollArea>

                    <div className="pt-2 flex flex-wrap gap-1">
                        {selectedCities.filter(c => c.state === selectedState).length > 0 && (
                            <div className="text-[10px] font-bold text-primary">
                                {selectedCities.filter(c => c.state === selectedState).length} selecionadas em {selectedState}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="pt-2 border-t">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block">Total Selecionado: {selectedCities.length} cidades</Label>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1">
                    {selectedCities.map((c, i) => (
                        <div key={i} className="bg-primary/10 text-primary text-[9px] px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                            {c.city} ({c.state})
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-3 w-3 p-0 hover:bg-primary/20"
                                onClick={() => onSelect(selectedCities.filter((_, idx) => idx !== i))}
                            >
                                <span className="sr-only">Remover</span>
                                &times;
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

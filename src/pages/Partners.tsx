import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, MessageCircle, Plus, FilterX, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
    useCityInfo,
    useCreateCityContact,
    useUpdateCityContact,
    useAllCityContacts,
    useUpsertCityInfo,
    useBrazilStates,
    type CityContact,
    type CityInfo
} from "@/hooks/useCityInfo";
import { CONTACT_ROLES } from "@/lib/partner-constants";
import ServedCitiesSelector from "@/components/partners/ServedCitiesSelector";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export default function Partners() {
    const [searchTerm, setSearchTerm] = useState("");
    const [filterState, setFilterState] = useState<string>("all");
    const [filterRole, setFilterRole] = useState<string>("all");
    const [filterServed, setFilterServed] = useState<string>("all");

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<CityContact | null>(null);
    const [selectedServedCities, setSelectedServedCities] = useState<{ state: string, city: string }[]>([]);
    const [newContact, setNewContact] = useState({
        contact_type: CONTACT_ROLES[0],
        name: "",
        phone: "",
        notes: "",
        has_served: false,
        pix_key: ""
    });

    const { data: allStates } = useBrazilStates();
    const { data: contacts, isLoading, refetch } = useAllCityContacts();

    const createContact = useCreateCityContact();
    const updateContact = useUpdateCityContact();
    const upsertCity = useUpsertCityInfo();

    const filteredContacts = useMemo(() => {
        if (!contacts) return [];

        const searchLower = searchTerm.toLowerCase();

        return contacts.filter(contact => {
            // Check filters first (faster)
            const matchesRole = filterRole === "all" || contact.contact_type === filterRole;
            if (!matchesRole) return false;

            const matchesServed = filterServed === "all" || (filterServed === "yes" ? contact.has_served : !contact.has_served);
            if (!matchesServed) return false;

            const matchesState = filterState === "all" || contact.served_cities?.some(sc => sc.city_info.state === filterState);
            if (!matchesState) return false;

            // Search filtering (heavier)
            if (!searchTerm) return true;

            const citiesList = contact.served_cities?.map(sc => sc.city_info.city).join(" ").toLowerCase() || "";
            const statesList = contact.served_cities?.map(sc => sc.city_info.state).join(" ").toLowerCase() || "";

            return contact.name?.toLowerCase().includes(searchLower) ||
                contact.contact_type?.toLowerCase().includes(searchLower) ||
                citiesList.includes(searchLower) ||
                statesList.includes(searchLower) ||
                contact.phone?.toLowerCase().includes(searchLower) ||
                contact.notes?.toLowerCase().includes(searchLower) ||
                contact.pix_key?.toLowerCase().includes(searchLower);
        });
    }, [contacts, searchTerm, filterRole, filterServed, filterState]);

    const handleClearFilters = () => {
        setSearchTerm("");
        setFilterState("all");
        setFilterRole("all");
        setFilterServed("all");
    };

    const handleEditClick = (contact: CityContact) => {
        setEditingContact(contact);
        setNewContact({
            contact_type: contact.contact_type,
            name: contact.name,
            phone: contact.phone || "",
            notes: contact.notes || "",
            has_served: contact.has_served,
            pix_key: contact.pix_key || ""
        });

        // Map served cities for the selector
        const cities = contact.served_cities?.map(sc => ({
            state: sc.city_info.state,
            city: sc.city_info.city
        })) || [];

        setSelectedServedCities(cities);
        setIsAddOpen(true);
    };

    const handleSaveContact = async () => {
        if (!newContact.name || selectedServedCities.length === 0) {
            toast.error("Preencha ao menos o nome e selecione uma cidade.");
            return;
        }

        try {
            // 1. Upsert all selected cities to get their city_info IDs
            toast.loading("Vinculando cidades...");
            const cityInfoIds: string[] = [];

            for (const cityData of selectedServedCities) {
                const res = await upsertCity.mutateAsync(cityData);
                cityInfoIds.push(res.id);
            }

            // 2. Create or Update the contact
            if (editingContact) {
                await updateContact.mutateAsync({
                    id: editingContact.id,
                    city_info_id: cityInfoIds[0],
                    contact_type: newContact.contact_type,
                    name: newContact.name,
                    phone: newContact.phone,
                    notes: newContact.notes,
                    has_served: newContact.has_served,
                    pix_key: newContact.pix_key,
                    served_city_ids: cityInfoIds
                });
                toast.success("Parceiro atualizado com sucesso!");
            } else {
                await createContact.mutateAsync({
                    city_info_id: cityInfoIds[0],
                    contact_type: newContact.contact_type,
                    name: newContact.name,
                    phone: newContact.phone,
                    email: "",
                    notes: newContact.notes,
                    has_served: newContact.has_served,
                    pix_key: newContact.pix_key,
                    served_city_ids: cityInfoIds
                });
                toast.success("Parceiro adicionado com sucesso!");
            }

            toast.dismiss();
            setIsAddOpen(false);
            setEditingContact(null);
            setNewContact({
                contact_type: CONTACT_ROLES[0],
                name: "",
                phone: "",
                notes: "",
                has_served: false,
                pix_key: ""
            });
            setSelectedServedCities([]);
            refetch();
        } catch (e: any) {
            toast.dismiss();
            console.error(e);
            toast.error(e.message || "Erro ao salvar parceiro");
        }
    };

    return (
        <div className="p-4 md:p-6 space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-primary tracking-tight italic">INVEST CRM — PARCEIROS</h1>
                    <p className="text-muted-foreground mt-1 font-medium">
                        Base de dados centralizada de diligentes e prestadores de serviço
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setEditingContact(null);
                        setNewContact({
                            contact_type: CONTACT_ROLES[0],
                            name: "",
                            phone: "",
                            notes: "",
                            has_served: false,
                            pix_key: ""
                        });
                        setSelectedServedCities([]);
                        setIsAddOpen(true);
                    }}
                    className="gap-2 font-black shadow-lg bg-primary hover:bg-primary/90 text-white h-12 px-6"
                >
                    <Plus className="h-5 w-5" /> ADICIONAR PARCEIRO
                </Button>
            </div>

            <Card className="border-none shadow-xl overflow-hidden bg-card/50 backdrop-blur-sm border-2 border-primary/5">
                <CardHeader className="pb-3 border-b bg-muted/30">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle className="text-xl flex items-center gap-2 font-black italic text-primary">
                            <Users className="h-6 w-6" />
                            DIRETÓRIO NACIONAL
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative w-full md:w-80">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por nome, cidade, estado ou função..."
                                    className="pl-9 bg-background focus-visible:ring-primary h-10 border-2 border-primary/10"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>

                {/* Advanced Filters */}
                <div className="p-4 border-b bg-muted/10 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Filtrar por Estado</Label>
                        <Select value={filterState} onValueChange={setFilterState}>
                            <SelectTrigger className="bg-background border-2 border-primary/5 h-10 font-bold">
                                <SelectValue placeholder="Todos os Estados" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Estados</SelectItem>
                                {allStates?.map(st => <SelectItem key={st.sigla} value={st.sigla}>{st.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Filtrar por Função</Label>
                        <Select value={filterRole} onValueChange={setFilterRole}>
                            <SelectTrigger className="bg-background border-2 border-primary/5 h-10 font-bold">
                                <SelectValue placeholder="Todas as Funções" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as Funções</SelectItem>
                                {CONTACT_ROLES.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Prestou Serviço?</Label>
                        <Select value={filterServed} onValueChange={setFilterServed}>
                            <SelectTrigger className="bg-background border-2 border-primary/5 h-10 font-bold">
                                <SelectValue placeholder="Ambos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Ambos</SelectItem>
                                <SelectItem value="yes">Sim</SelectItem>
                                <SelectItem value="no">Não</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Button
                            variant="outline"
                            onClick={handleClearFilters}
                            className="w-full gap-2 h-10 font-bold border-2 hover:bg-muted/50 transition-all"
                            disabled={filterState === "all" && filterRole === "all" && filterServed === "all" && !searchTerm}
                        >
                            <FilterX className="h-4 w-4" /> LIMPAR FILTROS
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/50 border-b-2">
                            <TableRow>
                                <TableHead className="font-black text-[10px] uppercase pl-6 py-4">Nome</TableHead>
                                <TableHead className="font-black text-[10px] uppercase">Função</TableHead>
                                <TableHead className="font-black text-[10px] uppercase">Cidades Atendidas</TableHead>
                                <TableHead className="font-black text-[10px] uppercase">Celular / Whats</TableHead>
                                <TableHead className="font-black text-[10px] uppercase text-center w-32">Serviço?</TableHead>
                                <TableHead className="font-black text-[10px] uppercase">PIX</TableHead>
                                <TableHead className="font-black text-[10px] uppercase">Notas</TableHead>
                                <TableHead className="font-black text-[10px] uppercase text-right pr-6">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-64 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="h-10 w-10 rounded-full border-4 border-primary border-r-transparent animate-spin" />
                                            <p className="font-bold text-muted-foreground animate-pulse">CARREGANDO BASE DE DADOS...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredContacts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-64 text-center">
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground opacity-50">
                                            <Users className="h-12 w-12" />
                                            <p className="font-black italic">NENHUM PARCEIRO ENCONTRADO</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredContacts.map((contact) => (
                                    <TableRow key={contact.id} className="hover:bg-primary/5 transition-all group">
                                        <TableCell className="pl-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-black text-sm text-primary uppercase tracking-tight">{contact.name}</span>
                                                <span className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">ID: {contact.id.slice(0, 8)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 text-[10px] font-black italic px-2">
                                                {contact.contact_type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="max-w-xs">
                                            <div className="flex flex-wrap gap-1">
                                                {contact.served_cities?.map((sc, i) => (
                                                    <Badge key={i} variant="outline" className="text-[9px] font-bold py-0 h-5 bg-background border-muted flex items-center gap-1">
                                                        <MapPin className="h-2 w-2 text-primary" />
                                                        {sc.city_info.city} ({sc.city_info.state})
                                                    </Badge>
                                                ))}
                                                {(!contact.served_cities || contact.served_cities.length === 0) && (
                                                    <Badge variant="outline" className="text-[9px] font-bold py-0 h-5 bg-background border-muted">
                                                        {contact.city_info?.city} ({contact.city_info?.state})
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold tabular-nums">{contact.phone || "-"}</span>
                                                {contact.phone && (
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-50 rounded-full transition-transform group-hover:scale-110"
                                                        onClick={() => window.open(`https://wa.me/55${contact.phone!.replace(/\D/g, '')}`, '_blank')}
                                                        title="Chamar no WhatsApp"
                                                    >
                                                        <MessageCircle className="h-4 w-4 fill-green-500/10" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black tracking-widest ${contact.has_served ? 'bg-green-500 text-white shadow-sm' : 'bg-muted text-muted-foreground'}`}>
                                                {contact.has_served ? "SIM" : "NÃO"}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs font-mono font-bold text-muted-foreground">
                                            {contact.pix_key || "-"}
                                        </TableCell>
                                        <TableCell className="text-[11px] text-muted-foreground font-medium max-w-[200px] truncate" title={contact.notes || ""}>
                                            {contact.notes || "-"}
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="font-black text-[10px] uppercase tracking-tighter hover:bg-primary hover:text-white transition-all"
                                                onClick={() => handleEditClick(contact)}
                                            >
                                                Editar
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* Add Partner Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
                    <div className="bg-primary p-6 text-white shrink-0">
                        <DialogTitle className="text-2xl font-black italic tracking-tight uppercase">
                            {editingContact ? "EDITAR PARCEIRO" : "CADASTRAR NOVO PARCEIRO"}
                        </DialogTitle>
                        <p className="text-primary-foreground/80 font-medium text-sm">
                            {editingContact ? `Atualize os dados de ${editingContact.name}` : "Vincule diligentes às cidades que eles atendem"}
                        </p>
                    </div>

                    <ScrollArea className="flex-1 p-6">
                        <div className="space-y-6 pb-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[11px] font-black uppercase text-primary">Nome Completo *</Label>
                                        <Input
                                            placeholder="Ex: João da Silva"
                                            className="h-11 border-2 focus-visible:ring-primary font-bold"
                                            value={newContact.name}
                                            onChange={e => setNewContact({ ...newContact, name: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[11px] font-black uppercase text-primary">Função / Cargo *</Label>
                                        <Select value={newContact.contact_type} onValueChange={(val) => setNewContact({ ...newContact, contact_type: val })}>
                                            <SelectTrigger className="h-11 border-2 font-bold focus:ring-primary">
                                                <SelectValue placeholder="Selecione a função" />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-64">
                                                {CONTACT_ROLES.map(role => <SelectItem key={role} value={role} className="font-bold">{role}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label className="text-[11px] font-black uppercase text-primary">Telefone / WhatsApp</Label>
                                            <Input
                                                placeholder="(00) 00000-0000"
                                                className="h-11 border-2 font-bold"
                                                value={newContact.phone}
                                                onChange={e => setNewContact({ ...newContact, phone: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[11px] font-black uppercase text-primary">Chave PIX</Label>
                                            <Input
                                                placeholder="PIX"
                                                className="h-11 border-2 font-bold"
                                                value={newContact.pix_key}
                                                onChange={e => setNewContact({ ...newContact, pix_key: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[11px] font-black uppercase text-primary">Notas e Observações</Label>
                                        <Input
                                            placeholder="Detalhes sobre atendimento, preços, etc."
                                            className="h-11 border-2 font-semibold"
                                            value={newContact.notes}
                                            onChange={e => setNewContact({ ...newContact, notes: e.target.value })}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-4 rounded-xl border-2 bg-muted/20">
                                        <div className="space-y-0.5">
                                            <Label className="font-black text-xs uppercase text-primary">Já prestou serviço?</Label>
                                            <p className="text-[10px] text-muted-foreground font-bold">Marque se já houve parceria ativa</p>
                                        </div>
                                        <Switch checked={newContact.has_served} onCheckedChange={(val) => setNewContact({ ...newContact, has_served: val })} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[11px] font-black uppercase text-primary flex items-center gap-2">
                                        <MapPin className="h-4 w-4" />
                                        CIDADES DE ATENDIMENTO *
                                    </Label>
                                    <ServedCitiesSelector
                                        selectedCities={selectedServedCities}
                                        onSelect={setSelectedServedCities}
                                    />
                                </div>
                            </div>
                        </div>
                    </ScrollArea>

                    <DialogFooter className="p-6 border-t bg-muted/10 shrink-0">
                        <Button
                            variant="outline"
                            onClick={() => setIsAddOpen(false)}
                            className="h-12 px-8 font-black uppercase tracking-tight"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSaveContact}
                            disabled={createContact.isPending || updateContact.isPending}
                            className="h-12 px-10 font-black uppercase tracking-tight shadow-lg"
                        >
                            {(createContact.isPending || updateContact.isPending) ? "SALVANDO..." : (editingContact ? "ATUALIZAR PARCEIRO" : "SALVAR PARCEIRO")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, MessageCircle, Plus, FilterX } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useCityInfo, useCreateCityContact, type CityContact, type CityInfo } from "@/hooks/useCityInfo";
import { CONTACT_ROLES } from "@/lib/partner-constants";

type ContactWithCityInfo = CityContact & {
    city_info: CityInfo;
};

export default function Partners() {
    const [searchTerm, setSearchTerm] = useState("");
    const [filterState, setFilterState] = useState<string>("all");
    const [filterCity, setFilterCity] = useState<string>("all");
    const [filterRole, setFilterRole] = useState<string>("all");
    const [filterServed, setFilterServed] = useState<string>("all"); // "all", "yes", "no"

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newContact, setNewContact] = useState({
        city_info_id: "",
        contact_type: CONTACT_ROLES[0],
        name: "",
        phone: "",
        notes: "",
        has_served: false,
        pix_key: ""
    });

    const { data: cityInfos = [] } = useCityInfo();
    const createContact = useCreateCityContact();

    const { data: contacts, isLoading, refetch } = useQuery({
        queryKey: ["all_city_contacts"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("city_contacts")
                .select("*, city_info(*)")
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data as ContactWithCityInfo[];
        },
    });

    // Derived lists for filters
    const availableStates = useMemo(() => Array.from(new Set(cityInfos.map(c => c.state))).sort(), [cityInfos]);
    const availableCities = useMemo(() => {
        if (filterState === "all") return [];
        return cityInfos.filter(c => c.state === filterState).map(c => ({ id: c.id, city: c.city })).sort((a, b) => a.city.localeCompare(b.city));
    }, [cityInfos, filterState]);

    const addModalCities = useMemo(() => {
        const stateToFind = cityInfos.find(c => c.id === newContact.city_info_id)?.state;
        if (!stateToFind) return [];
        return cityInfos.filter(c => c.state === stateToFind).sort((a, b) => a.city.localeCompare(b.city));
    }, [cityInfos, newContact.city_info_id]);

    const filteredContacts = contacts?.filter(contact => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
            contact.name?.toLowerCase().includes(searchLower) ||
            contact.contact_type?.toLowerCase().includes(searchLower) ||
            contact.city_info?.city?.toLowerCase().includes(searchLower) ||
            contact.city_info?.state?.toLowerCase().includes(searchLower) ||
            contact.phone?.toLowerCase().includes(searchLower) ||
            contact.notes?.toLowerCase().includes(searchLower) ||
            contact.pix_key?.toLowerCase().includes(searchLower);

        const matchesState = filterState === "all" || contact.city_info?.state === filterState;
        const matchesCity = filterCity === "all" || contact.city_info?.city === filterCity;
        const matchesRole = filterRole === "all" || contact.contact_type === filterRole;
        const matchesServed = filterServed === "all" || (filterServed === "yes" ? contact.has_served : !contact.has_served);

        return matchesSearch && matchesState && matchesCity && matchesRole && matchesServed;
    }) || [];

    const handleClearFilters = () => {
        setSearchTerm("");
        setFilterState("all");
        setFilterCity("all");
        setFilterRole("all");
        setFilterServed("all");
    };

    const handleAddContact = async () => {
        if (!newContact.city_info_id || !newContact.name) {
            toast.error("Preencha ao menos a cidade e o nome.");
            return;
        }

        try {
            await createContact.mutateAsync({
                city_info_id: newContact.city_info_id,
                contact_type: newContact.contact_type,
                name: newContact.name,
                phone: newContact.phone,
                email: "",
                notes: newContact.notes,
                has_served: newContact.has_served,
                pix_key: newContact.pix_key
            });
            toast.success("Parceiro adicionado com sucesso!");
            setIsAddOpen(false);
            setNewContact({
                city_info_id: "",
                contact_type: CONTACT_ROLES[0],
                name: "",
                phone: "",
                notes: "",
                has_served: false,
                pix_key: ""
            });
            refetch();
        } catch (e: any) {
            console.error(e);
            toast.error(e.message || "Erro ao adicionar parceiro");
        }
    };

    return (
        <div className="p-4 md:p-6 space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-primary tracking-tight">Parceiros e Diligentes</h1>
                    <p className="text-muted-foreground mt-1">
                        Gerencie contatos locais de todas as cidades em um só lugar
                    </p>
                </div>
                <Button onClick={() => setIsAddOpen(true)} className="gap-2 font-bold shadow-md">
                    <Plus className="h-5 w-5" /> Adicionar Parceiro
                </Button>
            </div>

            <Card className="border-none shadow-md overflow-hidden">
                <CardHeader className="pb-3 border-b bg-muted/20">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            Diretório Global
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar parceiro..."
                                    className="pl-9 bg-background focus-visible:ring-1"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>

                {/* Advanced Filters */}
                <div className="p-4 border-b bg-muted/10 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Estado</Label>
                        <Select value={filterState} onValueChange={(v) => { setFilterState(v); setFilterCity("all"); }}>
                            <SelectTrigger className="bg-background"><SelectValue placeholder="Todos" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Estados</SelectItem>
                                {availableStates.map(st => <SelectItem key={st} value={st}>{st}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Cidade</Label>
                        <Select disabled={filterState === "all"} value={filterCity} onValueChange={setFilterCity}>
                            <SelectTrigger className="bg-background"><SelectValue placeholder={filterState === "all" ? "Selecione um estado" : "Todas"} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as Cidades</SelectItem>
                                {availableCities.map(c => <SelectItem key={c.city} value={c.city}>{c.city}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Função</Label>
                        <Select value={filterRole} onValueChange={setFilterRole}>
                            <SelectTrigger className="bg-background"><SelectValue placeholder="Todas" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                {CONTACT_ROLES.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Prestou Serviço?</Label>
                        <Select value={filterServed} onValueChange={setFilterServed}>
                            <SelectTrigger className="bg-background"><SelectValue placeholder="Ambos" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Ambos</SelectItem>
                                <SelectItem value="yes">Sim</SelectItem>
                                <SelectItem value="no">Não</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Button variant="outline" onClick={handleClearFilters} className="w-full gap-2 text-muted-foreground" disabled={filterState === "all" && filterRole === "all" && filterServed === "all" && !searchTerm}>
                            <FilterX className="h-4 w-4" /> Limpar Filtros
                        </Button>
                    </div>
                </div>

                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/40">
                            <TableRow>
                                <TableHead className="font-bold text-xs uppercase pl-6">Estado</TableHead>
                                <TableHead className="font-bold text-xs uppercase">Cidade</TableHead>
                                <TableHead className="font-bold text-xs uppercase">Função</TableHead>
                                <TableHead className="font-bold text-xs uppercase">Nome</TableHead>
                                <TableHead className="font-bold text-xs uppercase">Celular / Whats</TableHead>
                                <TableHead className="font-bold text-xs uppercase">Notas</TableHead>
                                <TableHead className="font-bold text-xs uppercase text-center">Já Prestou Serviço?</TableHead>
                                <TableHead className="font-bold text-xs uppercase">Chave PIX</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="h-6 w-6 rounded-full border-2 border-primary border-r-transparent animate-spin" />
                                            Carregando parceiros...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredContacts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground italic">
                                        Nenhum parceiro encontrado com os filtros atuais.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredContacts.map((contact) => (
                                    <TableRow key={contact.id} className="hover:bg-muted/10 transition-colors">
                                        <TableCell className="pl-6 font-medium text-xs">
                                            {contact.city_info?.state}
                                        </TableCell>
                                        <TableCell className="font-medium text-sm">
                                            {contact.city_info?.city}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase bg-primary/10 text-primary whitespace-nowrap">
                                                {contact.contact_type}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-bold text-sm min-w-[150px]">
                                            {contact.name || "-"}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm">{contact.phone || "-"}</span>
                                                {contact.phone && (
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 text-green-500 hover:text-green-600 hover:bg-green-50 rounded-full"
                                                        onClick={() => window.open(`https://wa.me/55${contact.phone!.replace(/\D/g, '')}`, '_blank')}
                                                        title="Chamar no WhatsApp"
                                                    >
                                                        <MessageCircle className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={contact.notes || ""}>
                                            {contact.notes || "-"}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${contact.has_served ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>
                                                {contact.has_served ? "SIM" : "NÃO"}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs font-mono">
                                            {contact.pix_key || "-"}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Add Partner Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Adicionar Novo Parceiro</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Estado *</Label>
                                <Select
                                    value={cityInfos.find(c => c.id === newContact.city_info_id)?.state || ""}
                                    onValueChange={(st) => {
                                        // Pick first city from this state
                                        const firstCityId = cityInfos.find(c => c.state === st)?.id || "";
                                        setNewContact({ ...newContact, city_info_id: firstCityId });
                                    }}
                                >
                                    <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                                    <SelectContent>
                                        {availableStates.map(st => <SelectItem key={st} value={st}>{st}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Cidade *</Label>
                                <Select
                                    disabled={!addModalCities.length}
                                    value={newContact.city_info_id}
                                    onValueChange={(val) => setNewContact({ ...newContact, city_info_id: val })}
                                >
                                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                    <SelectContent>
                                        {addModalCities.map(c => <SelectItem key={c.id} value={c.id}>{c.city}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Função *</Label>
                            <Select value={newContact.contact_type} onValueChange={(val) => setNewContact({ ...newContact, contact_type: val })}>
                                <SelectTrigger><SelectValue placeholder="Selecione a função" /></SelectTrigger>
                                <SelectContent className="max-h-64">
                                    {CONTACT_ROLES.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Nome do Contato *</Label>
                            <Input placeholder="Nome completo ou identificação" value={newContact.name} onChange={e => setNewContact({ ...newContact, name: e.target.value })} />
                        </div>

                        <div className="space-y-2">
                            <Label>Telefone / WhatsApp</Label>
                            <Input placeholder="(99) 99999-9999" value={newContact.phone} onChange={e => setNewContact({ ...newContact, phone: e.target.value })} />
                        </div>

                        <div className="space-y-2">
                            <Label>Chave PIX</Label>
                            <Input placeholder="CPF, e-mail, celular ou aleatória" value={newContact.pix_key} onChange={e => setNewContact({ ...newContact, pix_key: e.target.value })} />
                        </div>

                        <div className="space-y-2">
                            <Label>Notas</Label>
                            <Input placeholder="Qualquer detalhe importante..." value={newContact.notes} onChange={e => setNewContact({ ...newContact, notes: e.target.value })} />
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t mt-4">
                            <Label className="font-semibold text-muted-foreground">Já prestou serviço para nós?</Label>
                            <Switch checked={newContact.has_served} onCheckedChange={(val) => setNewContact({ ...newContact, has_served: val })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
                        <Button onClick={handleAddContact}>Salvar Parceiro</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

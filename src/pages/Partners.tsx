import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, MessageCircle, Plus, FilterX, MapPin, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
    useCityInfo,
    useCreateCityContact,
    useUpdateCityContact,
    useDeleteCityContact,
    useAllCityContacts,
    useUpsertCityInfo,
    useBrazilStates,
    type CityContact,
    type CityInfo
} from "@/hooks/useCityInfo";
import { CONTACT_ROLES } from "@/lib/partner-constants";
import ServedCitiesSelector from "@/components/partners/ServedCitiesSelector";
import ImportPartnersDialog from "@/components/partners/ImportPartnersDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import MultiSelectFilter from "@/components/properties/MultiSelectFilter";
import { SavedFiltersButton } from "@/components/ui/saved-filters-button";
import AddPartnerDialog from "@/components/partners/AddPartnerDialog";

export interface PartnerFilterValues {
    state: string[];
    role: string[];
    served: string[];
}

export const EMPTY_PARTNER_FILTERS: PartnerFilterValues = {
    state: [],
    role: [],
    served: [],
};

export default function Partners() {
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState<PartnerFilterValues>(EMPTY_PARTNER_FILTERS);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<CityContact | null>(null);
    const [deletingContact, setDeletingContact] = useState<CityContact | null>(null);
    const [selectedServedCities, setSelectedServedCities] = useState<{ state: string, city: string }[]>([]);
    const [newContact, setNewContact] = useState<{
        contact_type: string;
        name: string;
        phone: string;
        notes: string;
        has_served: boolean;
        pix_key: string;
    } | null>(null);

    const { data: allStates } = useBrazilStates();
    const { data: contacts, isLoading, refetch } = useAllCityContacts();

    const createContact = useCreateCityContact();
    const updateContact = useUpdateCityContact();
    const deleteContact = useDeleteCityContact();
    const upsertCity = useUpsertCityInfo();

    const matchesMultiSelect = (value: string | null | undefined, selected: string[]) => {
        if (selected.length === 0) return true; // "all"
        if (selected.length === 1 && selected[0] === "__none__") return false;
        return selected.includes(value || "");
    };

    const filteredContacts = useMemo(() => {
        if (!contacts) return [];

        const searchLower = searchTerm.toLowerCase();

        return contacts.filter(contact => {
            // Check filters first (faster)
            const matchesRole = matchesMultiSelect(contact.contact_type, filters.role);
            if (!matchesRole) return false;

            const matchesServed = matchesMultiSelect(contact.has_served ? "yes" : "no", filters.served);
            if (!matchesServed) return false;

            const matchesState = filters.state.length === 0 || 
                contact.served_cities?.some(sc => filters.state.includes(sc.city_info.state));
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
    }, [contacts, searchTerm, filters]);

    const handleClearFilters = () => {
        setSearchTerm("");
        setFilters(EMPTY_PARTNER_FILTERS);
    };

    const handleEditClick = (contact: CityContact) => {
        setEditingContact(contact);
        setIsAddOpen(true);
    };



    const handleDeleteContact = async () => {
        if (!deletingContact) return;
        try {
            await deleteContact.mutateAsync({
                id: deletingContact.id,
                city_info_id: deletingContact.city_info_id
            });
            toast.success(`Parceiro "${deletingContact.name}" excluído com sucesso!`);
            setDeletingContact(null);
            refetch();
        } catch (e: any) {
            console.error(e);
            toast.error(e.message || "Erro ao excluir parceiro");
        }
    };

    return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4 border-b border-border/50 pb-4 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary shrink-0" />
            <div className="flex flex-col gap-0.5">
              <h1 className="text-xl md:text-2xl font-black text-foreground uppercase tracking-tighter leading-none font-heading">
                Base de Parceiros
              </h1>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider font-body">Diretório de diligentes e prestadores</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ImportPartnersDialog />
          <Button
            onClick={() => {
              setEditingContact(null);
              setIsAddOpen(true);
            }}
            className="gap-2 font-black shadow-lg bg-primary hover:bg-primary/90 text-white h-10 px-6 uppercase text-xs shadow-primary/20 shrink-0"
          >
            <Plus className="h-4 w-4" /> Adicionar Parceiro
          </Button>
        </div>
      </div>

            <Card className="border-none shadow-xl overflow-hidden bg-card/50 backdrop-blur-sm border-2 border-primary/5">
                <CardHeader className="pb-3 border-b bg-muted/30">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle className="text-lg flex items-center gap-2 font-black text-foreground uppercase tracking-tight">
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
                        <MultiSelectFilter
                            label="Estado"
                            options={allStates?.map(st => ({ value: st.sigla, label: st.nome })) || []}
                            selected={filters.state}
                            onSelectionChange={v => setFilters({ ...filters, state: v })}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Filtrar por Função</Label>
                        <MultiSelectFilter
                            label="Função"
                            options={CONTACT_ROLES.map(role => ({ value: role, label: role }))}
                            selected={filters.role}
                            onSelectionChange={v => setFilters({ ...filters, role: v })}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Prestou Serviço?</Label>
                        <MultiSelectFilter
                            label="Serviço"
                            options={[
                                { value: "yes", label: "Sim" },
                                { value: "no", label: "Não" }
                            ]}
                            selected={filters.served}
                            onSelectionChange={v => setFilters({ ...filters, served: v })}
                        />
                    </div>
                    <div>
                        <Button
                            variant="outline"
                            onClick={handleClearFilters}
                            className="w-full gap-2 h-10 font-bold border-2 hover:bg-muted/50 transition-all"
                            disabled={filters.state.length === 0 && filters.role.length === 0 && filters.served.length === 0 && !searchTerm}
                        >
                            <FilterX className="h-4 w-4" /> LIMPAR FILTROS
                        </Button>
                    </div>
                    <div className="md:col-span-4 mt-2">
                        <SavedFiltersButton
                            entityType="partners"
                            currentFilters={filters}
                            emptyFilters={EMPTY_PARTNER_FILTERS}
                            onLoadFilter={setFilters}
                        />
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
                                            <p className="font-black uppercase tracking-widest text-muted-foreground/40">NENHUM PARCEIRO ENCONTRADO</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredContacts.map((contact) => (
                                    <TableRow key={contact.id} className="hover:bg-primary/5 transition-all group">
                                        <TableCell className="pl-6 py-4 cursor-pointer group/name" onClick={() => handleEditClick(contact)}>
                                            <div className="flex flex-col">
                                                <span className="font-black text-sm text-primary uppercase tracking-tight group-hover/name:underline">{contact.name}</span>
                                                <span className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">ID: {contact.id.slice(0, 8)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1.5 items-start">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 text-[10px] font-black uppercase px-2">
                                                        {contact.contact_type}
                                                    </Badge>
                                                    {contact.contact_type === 'VIZINHO' && contact.is_recurring && (
                                                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] font-black uppercase px-1.5 py-0">
                                                            Recorrente 🔁
                                                        </Badge>
                                                    )}
                                                </div>
                                                {contact.contact_type === 'VIZINHO' && (
                                                    <div className="flex flex-col gap-1 text-[10px] font-bold text-muted-foreground">
                                                        {contact.property && (
                                                            <span className="flex items-center gap-1 text-primary bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10 uppercase tracking-tighter">
                                                                CUIDA: {contact.property.code}
                                                            </span>
                                                        )}
                                                        {contact.monthly_value && (
                                                            <span>VALOR: R$ {Number(contact.monthly_value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                        )}
                                                        {contact.payment_date && (
                                                            <span>PAGTO: {contact.payment_date.split('-').reverse().join('/')}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
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
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="font-black text-[10px] uppercase tracking-tighter hover:bg-primary hover:text-white transition-all"
                                                    onClick={() => handleEditClick(contact)}
                                                >
                                                    Editar
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                                    onClick={() => setDeletingContact(contact)}
                                                    title="Excluir parceiro"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            <AddPartnerDialog 
                key={editingContact?.id || "new"}
                open={isAddOpen} 
                onOpenChange={(v) => {
                    setIsAddOpen(v);
                    if (!v) setEditingContact(null);
                }} 
                editingContact={editingContact}
                onSaved={() => refetch()}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deletingContact} onOpenChange={(open) => !open && setDeletingContact(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-black text-lg uppercase tracking-tight text-red-600">
                            Excluir Parceiro?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium">
                            Tem certeza que deseja excluir <strong>&quot;{deletingContact?.name}&quot;</strong>? Esta ação é irreversível e todos os dados deste parceiro serão permanentemente removidos.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="font-black uppercase tracking-tight">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteContact}
                            disabled={deleteContact.isPending}
                            className="bg-red-600 hover:bg-red-700 font-black uppercase tracking-tight gap-2"
                        >
                            <Trash2 className="h-4 w-4" />
                            {deleteContact.isPending ? "EXCLUINDO..." : "SIM, EXCLUIR"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

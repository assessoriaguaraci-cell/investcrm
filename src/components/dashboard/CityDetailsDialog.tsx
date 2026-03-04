import { useState, useMemo, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Plus, Trash2, Save, MapPin, DollarSign, TrendingUp, Info, ArrowLeft, MessageCircle, X,
    Search as SearchIcon, Globe, Map as MapIcon, Shield, TrendingDown, Star, Landmark, Users2, FileText
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCityInfo, useUpsertCityInfo, useCityContacts, useCreateCityContact, useUpdateCityContact, useDeleteCityContact, type CityContact } from "@/hooks/useCityInfo";
import { formatCurrency, totalInvestment } from "@/lib/property-constants";
import { CONTACT_ROLES } from "@/lib/partner-constants";
import { toast } from "sonner";
import type { Property } from "@/hooks/useProperties";

interface Props {
    city: string;
    state: string;
    properties: Property[];
    onClose: () => void;
}

export default function CityDetailsView({ city, state, properties, onClose }: Props) {
    const { data: cityInfos } = useCityInfo();
    const upsertCityInfo = useUpsertCityInfo();
    const createContact = useCreateCityContact();
    const updateContact = useUpdateCityContact();
    const deleteContact = useDeleteCityContact();

    const cityInfo = useMemo(() =>
        cityInfos?.find(ci => ci.city === city && ci.state === state),
        [cityInfos, city, state]);

    const { data: contacts = [] } = useCityContacts(cityInfo?.id);

    // Editable local state for city info
    const [infoForm, setInfoForm] = useState({
        best_neighborhoods: "",
        worst_neighborhoods: "",
        considerations: "",
        dangerous_regions: "",
        where_sold: "",
    });

    // Load form when cityInfo changes
    useEffect(() => {
        const soldAddresses = properties
            .filter(p => p.stage === "finalizado" && p.address)
            .map(p => p.address)
            .join(", ") || "";

        if (cityInfo) {
            setInfoForm({
                best_neighborhoods: cityInfo.best_neighborhoods || "",
                worst_neighborhoods: cityInfo.worst_neighborhoods || "",
                considerations: cityInfo.considerations || "",
                dangerous_regions: cityInfo.dangerous_regions || "",
                where_sold: cityInfo.where_sold || soldAddresses,
            });
        } else {
            setInfoForm(prev => ({ ...prev, where_sold: soldAddresses }));
        }
    }, [cityInfo, properties]);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newContact, setNewContact] = useState({
        contact_type: CONTACT_ROLES[0],
        name: "",
        phone: "",
        notes: "",
        has_served: false,
        pix_key: ""
    });

    // Financials
    const INVESTED_STAGES = ["itbi_contrato", "registro", "desocupacao", "reforma", "venda", "pos_venda", "ir"];
    const investedProps = properties.filter(p => INVESTED_STAGES.includes(p.stage));
    const investedTotal = investedProps.reduce((sum, p) => sum + totalInvestment(p), 0);

    const realizedProps = properties.filter(p => p.stage === "finalizado");
    const realizedRevenue = realizedProps.reduce((sum, p) => sum + (p.final_sale_price || 0), 0);
    const realizedProfit = realizedProps.reduce((sum, p) => {
        const cost = totalInvestment(p);
        return sum + ((p.final_sale_price || 0) - cost);
    }, 0);

    const handleSaveInfo = async () => {
        try {
            await upsertCityInfo.mutateAsync({
                city,
                state,
                ...infoForm,
            });
            toast.success("Informações da cidade atualizadas!");
        } catch (e) {
            toast.error("Erro ao salvar informações");
        }
    };

    const handleAddContact = async () => {
        if (!newContact.name) {
            toast.error("O nome do contato é obrigatório.");
            return;
        }

        let targetCityInfoId = cityInfo?.id;

        try {
            if (!targetCityInfoId) {
                const newInfo = await upsertCityInfo.mutateAsync({ city, state });
                targetCityInfoId = newInfo.id;
            }

            await createContact.mutateAsync({
                city_info_id: targetCityInfoId,
                contact_type: newContact.contact_type,
                name: newContact.name,
                phone: newContact.phone,
                email: "",
                notes: newContact.notes,
                has_served: newContact.has_served,
                pix_key: newContact.pix_key,
            });

            toast.success("Parceiro adicionado com sucesso!");
            setIsAddOpen(false);
            setNewContact({
                contact_type: CONTACT_ROLES[0],
                name: "",
                phone: "",
                notes: "",
                has_served: false,
                pix_key: ""
            });
        } catch (e: any) {
            console.error(e);
            toast.error(e.message || "Erro ao criar parceiro");
        }
    };

    return (
        <div className="absolute inset-0 z-[1001] bg-background flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
            <header className="p-4 md:p-6 border-b bg-card">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-primary/10 hidden sm:block">
                                <MapPin className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl md:text-2xl font-bold leading-none">
                                    {city}, {state}
                                </h2>
                                <Badge variant="secondary" className="mt-1 text-[10px] uppercase font-bold tracking-wider">
                                    {properties.length} {properties.length === 1 ? 'imóvel' : 'imóveis'} no portfólio
                                </Badge>
                            </div>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <X className="h-5 w-5" />
                    </Button>
                </div>
            </header>

            <div className="flex-1 overflow-hidden flex flex-col">
                <Tabs defaultValue="visao" className="h-full flex flex-col">
                    <div className="px-6 border-b bg-card/50">
                        <TabsList className="w-full justify-start h-12 bg-transparent gap-8">
                            <TabsTrigger value="visao" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 font-semibold text-sm">Visão Geral</TabsTrigger>
                            <TabsTrigger value="bairros" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 font-semibold text-sm">Bairros e Regiões</TabsTrigger>
                            <TabsTrigger value="contatos" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 font-semibold text-sm">Contatos e Serviços</TabsTrigger>
                            <TabsTrigger value="financeiro" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 font-semibold text-sm">Financeiro</TabsTrigger>
                        </TabsList>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="p-4 md:p-8 max-w-5xl mx-auto w-full">
                            {/* Visão Geral */}
                            <TabsContent value="visao" className="mt-0 space-y-8 animate-in fade-in slide-in-from-left-2 duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-bold flex items-center gap-2 uppercase tracking-tight text-primary">
                                                <FileText className="h-4 w-4" />
                                                Particularidades e Guia Local
                                            </label>
                                            <Badge variant="outline" className="text-[9px] bg-primary/5 text-primary border-primary/20">
                                                DADOS ENRIQUECIDOS
                                            </Badge>
                                        </div>
                                        <Textarea
                                            placeholder="Ex: Prazos de prefeitura, leiloeiros frequentes, particularidades da documentação..."
                                            className="min-h-[220px] shadow-sm resize-none bg-muted/20 border-primary/10 focus-visible:ring-primary/30 text-sm leading-relaxed"
                                            value={infoForm.considerations}
                                            onChange={e => setInfoForm({ ...infoForm, considerations: e.target.value })}
                                        />
                                        <p className="text-[10px] text-muted-foreground flex gap-1 items-center">
                                            <Globe className="h-3 w-3" /> Informações sincronizadas com a base de dados central.
                                        </p>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <label className="text-sm font-bold uppercase tracking-tight text-muted-foreground flex items-center gap-2">
                                                <Star className="h-4 w-4 text-warning fill-warning" />
                                                Histórico de Sucesso (Onde Vendemos)
                                            </label>
                                            <div className="relative group">
                                                <Textarea
                                                    placeholder="Ex: Região central, proximidades do shopping..."
                                                    className="min-h-[110px] shadow-sm resize-none bg-success/5 border-success/10 focus-visible:ring-success/30 text-sm italic"
                                                    value={infoForm.where_sold}
                                                    onChange={e => setInfoForm({ ...infoForm, where_sold: e.target.value })}
                                                />
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Badge className="bg-success/80 text-[8px]">AUTO-GERADO</Badge>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-background to-primary/5 border border-primary/20 shadow-lg space-y-4 relative overflow-hidden">
                                            <div className="absolute -right-4 -top-4 opacity-5 pointer-events-none">
                                                <TrendingUp className="h-24 w-24" />
                                            </div>
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary/60">Performance na Cidade</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Investido</span>
                                                    <p className="font-black text-xl text-primary">{formatCurrency(investedTotal)}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Lucro Líquido</span>
                                                    <p className="font-black text-xl text-success">{formatCurrency(realizedProfit)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end pt-4 border-t">
                                    <Button onClick={handleSaveInfo} className="gap-2 px-10 h-12 text-base font-bold shadow-xl hover:scale-105 transition-transform">
                                        <Save className="h-5 w-5" /> Salvar Tudo
                                    </Button>
                                </div>
                            </TabsContent>

                            {/* Bairros e Regiões */}
                            <TabsContent value="bairros" className="mt-0 space-y-8 animate-in fade-in slide-in-from-left-2 duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-bold text-success flex items-center gap-2 uppercase tracking-tight">
                                                <Star className="h-4 w-4 fill-success/20" />
                                                Melhores Bairros
                                            </label>
                                            <Badge variant="outline" className="text-[9px] text-success border-success/20 bg-success/5">ALTA LIQUIDEZ</Badge>
                                        </div>
                                        <Textarea
                                            placeholder="Liste os bairros com maior liquidez e valorização..."
                                            className="min-h-[180px] shadow-sm resize-none border-success/20 focus-visible:ring-success bg-success/5 text-sm"
                                            value={infoForm.best_neighborhoods}
                                            onChange={e => setInfoForm({ ...infoForm, best_neighborhoods: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-bold text-rose-500 flex items-center gap-2 uppercase tracking-tight">
                                                <TrendingDown className="h-4 w-4" />
                                                Piores Bairros
                                            </label>
                                            <Badge variant="outline" className="text-[9px] text-rose-500 border-rose-500/20 bg-rose-500/5">EVITAR COMPRA</Badge>
                                        </div>
                                        <Textarea
                                            placeholder="Liste os bairros a evitar ou com baixa liquidez..."
                                            className="min-h-[180px] shadow-sm resize-none border-rose-500/20 focus-visible:ring-rose-500 bg-rose-500/5 text-sm"
                                            value={infoForm.worst_neighborhoods}
                                            onChange={e => setInfoForm({ ...infoForm, worst_neighborhoods: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-bold text-warning flex items-center gap-2 uppercase tracking-tight">
                                            <Shield className="h-4 w-4" />
                                            Regiões Perigosas e Riscos
                                        </label>
                                        <Badge variant="outline" className="text-[9px] text-warning border-warning/20 bg-warning/5">ATENÇÃO REDOBRADA</Badge>
                                    </div>
                                    <Textarea
                                        placeholder="Especifique áreas com problemas de segurança ou difícil acesso..."
                                        className="min-h-[120px] shadow-sm resize-none border-warning/20 focus-visible:ring-warning bg-warning/5 text-sm"
                                        value={infoForm.dangerous_regions}
                                        onChange={e => setInfoForm({ ...infoForm, dangerous_regions: e.target.value })}
                                    />
                                </div>
                                <div className="flex justify-end pt-4 border-t">
                                    <Button onClick={handleSaveInfo} className="gap-2 px-10 h-12 text-base font-bold shadow-xl">
                                        <Save className="h-5 w-5" /> Salvar Localidades
                                    </Button>
                                </div>
                            </TabsContent>

                            {/* Parceiros e Serviços - Unificados */}
                            <TabsContent value="contatos" className="mt-0 space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                    <div>
                                        <h3 className="font-black text-2xl text-primary flex items-center gap-2">
                                            <Users2 className="h-6 w-6" />
                                            Rede de Parceiros Local
                                        </h3>
                                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                                            <Badge className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors border-none text-[10px] font-bold">CONECTADO AO DIRETÓRIO GERAL</Badge>
                                            Estes contatos também aparecem na aba principal de Parceiros.
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" onClick={() => setIsAddOpen(true)} className="gap-2 font-bold shadow-lg hover:shadow-primary/20 active:scale-95 transition-all bg-primary">
                                            <Plus className="h-4 w-4" /> Novo Parceiro/Prefeitura
                                        </Button>
                                    </div>
                                </div>
                                <div className="rounded-xl border shadow-sm overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead className="font-bold text-xs uppercase w-[220px]">Função</TableHead>
                                                <TableHead className="font-bold text-xs uppercase">Nome</TableHead>
                                                <TableHead className="font-bold text-xs uppercase" title="Ex: 11999999999">Celular / Whats</TableHead>
                                                <TableHead className="font-bold text-xs uppercase text-center w-[120px]">Prestou serviço?</TableHead>
                                                <TableHead className="font-bold text-xs uppercase w-[150px]">Chave PIX</TableHead>
                                                <TableHead className="font-bold text-xs uppercase">Notas</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {contacts.map(contact => (
                                                <TableRow key={contact.id} className="group">
                                                    <TableCell className="p-2">
                                                        <Select
                                                            value={contact.contact_type}
                                                            onValueChange={(val) => updateContact.mutate({ id: contact.id, contact_type: val })}
                                                        >
                                                            <SelectTrigger className={`h-9 text-xs border-transparent group-hover:border-input focus:border-input bg-transparent font-semibold uppercase tracking-tight ${contact.contact_type === 'PREFEITURA' ? 'text-primary bg-primary/10 px-2 rounded-md border-primary/20' : 'text-primary'}`}>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="max-h-64">
                                                                {CONTACT_ROLES.map(role => (
                                                                    <SelectItem key={role} value={role} className="text-xs font-semibold">{role}</SelectItem>
                                                                ))}
                                                                {/* Fallback para tipos antigos que não estão na lista */}
                                                                {!CONTACT_ROLES.includes(contact.contact_type) && (
                                                                    <SelectItem value={contact.contact_type} className="text-xs font-semibold">{contact.contact_type}</SelectItem>
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell className="p-2">
                                                        <Input
                                                            defaultValue={contact.name}
                                                            onBlur={e => e.target.value !== contact.name && updateContact.mutate({ id: contact.id, name: e.target.value })}
                                                            className="h-9 border-transparent group-hover:border-input focus:border-input transition-all font-bold text-sm"
                                                            placeholder="Nome..."
                                                        />
                                                    </TableCell>
                                                    <TableCell className="p-2">
                                                        <div className="flex items-center gap-1">
                                                            <Input
                                                                defaultValue={contact.phone || ""}
                                                                onBlur={e => e.target.value !== (contact.phone || "") && updateContact.mutate({ id: contact.id, phone: e.target.value })}
                                                                className="h-9 border-transparent group-hover:border-input focus:border-input transition-all text-sm"
                                                                placeholder="(00) 00000-0000"
                                                            />
                                                            {contact.phone && (
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-50 flex-shrink-0 rounded-full"
                                                                    onClick={() => window.open(`https://wa.me/55${contact.phone!.replace(/\D/g, '')}`, '_blank')}
                                                                    title="Chamar no WhatsApp"
                                                                >
                                                                    <MessageCircle className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="p-2 text-center align-middle">
                                                        <div className="flex justify-center -mt-1">
                                                            <Switch
                                                                checked={!!contact.has_served}
                                                                onCheckedChange={(checked) => updateContact.mutate({ id: contact.id, has_served: checked })}
                                                            />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="p-2">
                                                        <Input
                                                            defaultValue={contact.pix_key || ""}
                                                            onBlur={e => e.target.value !== (contact.pix_key || "") && updateContact.mutate({ id: contact.id, pix_key: e.target.value })}
                                                            className="h-9 border-transparent group-hover:border-input focus:border-input transition-all text-xs font-mono"
                                                            placeholder="PIX..."
                                                        />
                                                    </TableCell>
                                                    <TableCell className="p-2">
                                                        <Input
                                                            defaultValue={contact.notes || ""}
                                                            onBlur={e => e.target.value !== (contact.notes || "") && updateContact.mutate({ id: contact.id, notes: e.target.value })}
                                                            className="h-9 border-transparent group-hover:border-input focus:border-input transition-all text-xs"
                                                            placeholder="..."
                                                        />
                                                    </TableCell>
                                                    <TableCell className="p-2 text-right">
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-destructive/10" onClick={() => deleteContact.mutate({ id: contact.id, city_info_id: contact.city_info_id })}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {contacts.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground italic text-sm">
                                                        Nenhum parceiro ou serviço cadastrado para esta cidade.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </TabsContent>

                            {/* Financeiro */}
                            <TabsContent value="financeiro" className="mt-0 space-y-10 animate-in fade-in slide-in-from-left-2 duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="p-8 rounded-2xl border-2 border-warning/10 bg-warning/5 shadow-sm space-y-4">
                                        <div className="flex items-center gap-3 text-warning">
                                            <div className="p-2 rounded-lg bg-warning/20">
                                                <DollarSign className="h-6 w-6" />
                                            </div>
                                            <h4 className="font-black uppercase tracking-widest text-sm">Capital Alocado</h4>
                                        </div>
                                        <div>
                                            <p className="text-4xl md:text-5xl font-black tracking-tight">{formatCurrency(investedTotal)}</p>
                                            <p className="text-sm text-muted-foreground mt-2 font-medium">Investimento total nos {investedProps.length} imóveis ativos</p>
                                        </div>
                                        <div className="pt-6 border-t border-warning/20">
                                            <p className="text-[10px] font-bold mb-3 uppercase tracking-wider text-muted-foreground/80">Monitoramento de Fases:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {INVESTED_STAGES.map(s => (
                                                    <Badge key={s} variant="outline" className="bg-background/50 border-warning/20 text-[10px] px-2 py-0.5">
                                                        {s.replace(/_/g, ' ')}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-8 rounded-2xl border-2 border-success/10 bg-success/5 shadow-sm space-y-6">
                                        <div className="flex items-center gap-3 text-success">
                                            <div className="p-2 rounded-lg bg-success/20">
                                                <TrendingUp className="h-6 w-6" />
                                            </div>
                                            <h4 className="font-black uppercase tracking-widest text-sm">Retorno Consolidado</h4>
                                        </div>
                                        <div className="space-y-6">
                                            <div>
                                                <p className="text-4xl md:text-5xl font-black tracking-tight">{formatCurrency(realizedRevenue)}</p>
                                                <p className="text-sm text-muted-foreground mt-2 font-medium">Volume total de vendas ({realizedProps.length} imóveis)</p>
                                            </div>
                                            <div className="pt-6 border-t border-success/20">
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Lucro Líquido total:</p>
                                                        <p className={`text-2xl font-black mt-1 ${realizedProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                                                            {formatCurrency(realizedProfit)}
                                                        </p>
                                                    </div>
                                                    <Badge className="bg-success text-success-foreground font-black text-[10px]">REALIZADO</Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl border bg-muted/20 p-6 md:p-8">
                                    <h4 className="text-sm font-black mb-6 uppercase tracking-widest text-muted-foreground">Portfólio de Vendas ({realizedProps.length})</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {realizedProps.map(p => (
                                            <div key={p.id} className="flex justify-between items-center p-4 rounded-xl border bg-background shadow-sm hover:shadow-md transition-shadow">
                                                <div className="space-y-1">
                                                    <p className="font-black text-sm text-primary">{p.code}</p>
                                                    <p className="text-xs text-muted-foreground font-medium">{p.neighborhood || 'Bairro ñ inf.'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-sm">{formatCurrency(p.final_sale_price)}</p>
                                                    <p className="text-[10px] font-bold text-success uppercase">Vendido</p>
                                                </div>
                                            </div>
                                        ))}
                                        {realizedProps.length === 0 && (
                                            <div className="col-span-full py-12 text-center text-muted-foreground bg-background rounded-xl border border-dashed">
                                                Nenhuma venda registrada em {city} até o momento.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>
                        </div>
                    </ScrollArea>
                </Tabs>
            </div>

            {/* Add Partner Dialog Overlay */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="max-w-md z-[1002]">
                    <DialogHeader>
                        <DialogTitle>Adicionar Novo Parceiro</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
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

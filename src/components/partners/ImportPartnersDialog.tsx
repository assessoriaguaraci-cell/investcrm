import { useState } from "react";
import { Upload, FileDown, Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { parseCSV } from "@/utils/importUtils";
import { exportToCSV } from "@/utils/exportUtils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CONTACT_ROLES } from "@/lib/partner-constants";

export default function ImportPartnersDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [mergeMode, setMergeMode] = useState(false);
  const qc = useQueryClient();

  const handleDownloadTemplate = () => {
    const template = [
      {
        name: "João da Silva",
        contact_type: CONTACT_ROLES[0],
        phone: "(11) 99999-9999",
        email: "joao@exemplo.com",
        city: "São Paulo",
        state: "SP",
        pix_key: "joao@pix.com",
        has_served: "não",
        notes: "Parceiro de confiança"
      }
    ];
    exportToCSV("modelo_importacao_parceiros", template);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const data = await parseCSV(file);
      
      // Fetch existing contacts to check for duplicates (by Name + Phone)
      const { data: existingContacts } = await supabase
        .from("city_contacts")
        .select("name, phone");

      const dupes: any[] = [];
      const uniques: any[] = [];

      data.forEach(item => {
        const isDuplicate = existingContacts?.some(existing => 
          item.name && existing.name === item.name && 
          (item.phone && existing.phone === item.phone)
        );

        if (isDuplicate) {
          dupes.push(item);
        } else {
          uniques.push(item);
        }
      });

      setPreview(data);
      setDuplicates(dupes);
      setShowDuplicates(false);
      
      if (dupes.length > 0) {
        toast.warning(`${data.length} registros detectados, sendo ${dupes.length} possíveis duplicatas.`);
      } else {
        toast.success(`${data.length} parceiros detectados no arquivo.`);
      }
    } catch (error) {
      toast.error("Erro ao ler arquivo CSV.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDuplicates = () => {
    const uniques = preview.filter(item => !duplicates.includes(item));
    setPreview(uniques);
    setDuplicates([]);
    setShowDuplicates(false);
    toast.info("Duplicatas removidas da lista de importação.");
  };

  const handleIgnoreDuplicates = () => {
    setDuplicates([]);
    setShowDuplicates(false);
    setMergeMode(false);
    toast.info("Duplicatas serão importadas normalmente.");
  };

  const handleMergeDuplicates = () => {
    setMergeMode(true);
    setDuplicates([]);
    setShowDuplicates(false);
    toast.info("Modo Enriquecimento Ativado: Informações de contato ausentes serão preenchidas.");
  };

  const handleImport = async () => {
    if (preview.length === 0) return;

    setLoading(true);
    try {
      // 1. Map all unique cities/states to their IDs (Upsert if not exists)
      const cityStatePairs = Array.from(new Set(preview.map(p => `${p.city}|${p.state}`)));
      const cityMap: Record<string, string> = {};

      for (const pair of cityStatePairs) {
        const [city, state] = pair.split('|');
        if (!city || !state) continue;

        const { data: cityData } = await supabase
          .from("city_info")
          .select("id")
          .eq("city", city)
          .eq("state", state)
          .maybeSingle();

        if (cityData) {
          cityMap[pair] = cityData.id;
        } else {
          const { data: newCity } = await supabase
            .from("city_info")
            .insert({ city, state })
            .select("id")
            .single();
          if (newCity) cityMap[pair] = newCity.id;
        }
      }

      if (mergeMode) {
        toast.info("Enriquecendo base de parceiros...");
        const { data: existing } = await supabase.from("city_contacts").select("*");
        
        let updatedCount = 0;
        let insertedCount = 0;

        for (const item of preview) {
          const duplicate = existing?.find(ex => 
            item.name && ex.name === item.name && 
            (item.phone && ex.phone === item.phone)
          );

          if (duplicate) {
            const updates: any = {};
            let hasNewData = false;

            const fields = ['email', 'pix_key', 'notes', 'has_served'];
            fields.forEach(f => {
              if (!duplicate[f] && item[f]) {
                updates[f] = f === 'has_served' ? item[f]?.toLowerCase() === 'sim' : item[f];
                hasNewData = true;
              }
            });

            if (hasNewData) {
              await supabase.from("city_contacts").update(updates).eq("id", duplicate.id);
              updatedCount++;
            }
          } else {
            const cityId = cityMap[`${item.city}|${item.state}`];
            if (cityId) {
              await supabase.from("city_contacts").insert({
                name: item.name || 'Sem nome',
                contact_type: item.contact_type || CONTACT_ROLES[0],
                phone: item.phone || null,
                email: item.email || null,
                pix_key: item.pix_key || null,
                notes: item.notes || null,
                has_served: item.has_served?.toLowerCase() === 'sim',
                city_info_id: cityId
              });
              insertedCount++;
            }
          }
        }
        toast.success(`${updatedCount} parceiros enriquecidos e ${insertedCount} novos importados!`);
      } else {
        // Standard batch import
        const batchSize = 100;
        for (let i = 0; i < preview.length; i += batchSize) {
          const batch = preview.slice(i, i + batchSize);
          const cleanBatch = batch.map(item => {
            const cityId = cityMap[`${item.city}|${item.state}`];
            return {
              name: item.name || 'Sem nome',
              contact_type: item.contact_type || CONTACT_ROLES[0],
              phone: item.phone || null,
              email: item.email || null,
              pix_key: item.pix_key || null,
              notes: item.notes || null,
              has_served: item.has_served?.toLowerCase() === 'sim',
              city_info_id: cityId || null
            };
          }).filter(p => p.city_info_id !== null);

          const { error } = await supabase.from("city_contacts").insert(cleanBatch);
          if (error) throw error;
        }
        toast.success(`${preview.length} parceiros importados com sucesso!`);
      }

      await qc.invalidateQueries({ queryKey: ["city_contacts"] });
      await qc.invalidateQueries({ queryKey: ["all_city_contacts"] });
      setOpen(false);
      setPreview([]);
      setMergeMode(false);
    } catch (error: any) {
      toast.error(`Erro na importação: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 font-black uppercase text-[10px] h-9 border-primary/20 hover:bg-primary/5 px-6">
          <Upload className="h-4 w-4" /> Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-heading font-black uppercase text-xl">Importar Parceiros</DialogTitle>
          <DialogDescription className="font-medium">
            Gerencie sua rede nacional importando prestadores via CSV.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex justify-center">
            <Button variant="ghost" className="text-primary font-bold text-xs gap-2" onClick={handleDownloadTemplate}>
              <FileDown className="h-4 w-4" /> Baixar Modelo CSV
            </Button>
          </div>

          <div className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-8 flex flex-col items-center gap-4 hover:border-primary/50 transition-colors cursor-pointer relative bg-muted/5">
            <input 
              type="file" 
              accept=".csv" 
              className="absolute inset-0 opacity-0 cursor-pointer" 
              onChange={handleFileUpload}
              disabled={loading}
            />
            {loading ? (
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="h-10 w-10 text-muted-foreground" />
            )}
            <div className="text-center">
              <p className="font-bold text-sm">Clique ou arraste o arquivo</p>
              <p className="text-xs text-muted-foreground">Apenas arquivos .CSV</p>
            </div>
          </div>

          {preview.length > 0 && (
            <div className="space-y-4">
              {duplicates.length > 0 && !showDuplicates && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                    <AlertCircle className="h-5 w-5" />
                    Detectamos {duplicates.length} possíveis duplicatas
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowDuplicates(true)}
                      className="text-[10px] font-bold uppercase h-7 border-amber-300 text-amber-800 hover:bg-amber-100"
                    >
                      Ver Duplicatas
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleRemoveDuplicates}
                      className="text-[10px] font-bold uppercase h-7 border-red-300 text-red-700 hover:bg-red-50"
                    >
                      Remover Duplicatas
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleMergeDuplicates}
                      className="text-[10px] font-bold uppercase h-7 border-primary/30 text-primary hover:bg-primary/5"
                    >
                      Mesclar e Enriquecer
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleIgnoreDuplicates}
                      className="text-[10px] font-bold uppercase h-7 text-amber-700 hover:bg-amber-100"
                    >
                      Ignorar e Importar Tudo
                    </Button>
                  </div>
                </div>
              )}

              {mergeMode && (
                <div className="bg-primary/10 border border-primary/20 p-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                  <div className="bg-primary rounded-full p-1">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-black uppercase text-primary">Modo Enriquecimento Ativo</p>
                    <p className="text-[10px] text-primary/70 font-semibold">Duplicatas serão mescladas para completar campos vazios.</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setMergeMode(false)} className="h-7 text-[9px] uppercase font-bold">Cancelar</Button>
                </div>
              )}

              {showDuplicates && (
                <div className="border rounded-xl overflow-hidden">
                  <div className="bg-muted/30 p-2 border-b flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-muted-foreground px-1">DUPLICATAS DETECTADAS</span>
                    <Button variant="ghost" size="sm" onClick={() => setShowDuplicates(false)} className="h-6 px-2 text-[10px] uppercase font-bold">X Fechar</Button>
                  </div>
                  <div className="max-h-[150px] overflow-y-auto p-2 space-y-1 bg-white">
                    {duplicates.map((d, idx) => (
                      <div key={idx} className="text-[11px] p-1.5 border-b last:border-0 flex justify-between">
                        <span className="font-bold truncate max-w-[200px]">{d.name}</span>
                        <span className="text-muted-foreground">{d.phone || d.city}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-primary/5 p-4 rounded-lg flex items-center justify-between border border-primary/10">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-bold">{preview.length} Parceiros prontos</span>
                </div>
                <Button onClick={handleImport} disabled={loading || (duplicates.length > 0 && !mergeMode)} size="sm" className="font-black uppercase text-xs">
                  {loading ? "Processando..." : mergeMode ? "Confirmar Mesclagem" : "Confirmar Importação"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

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

export default function ImportClientsDialog() {
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
        full_name: "Exemplo Silva",
        email: "exemplo@email.com",
        phone: "(11) 99999-9999",
        whatsapp: "(11) 99999-9999",
        cpf: "000.000.000-00",
        income: 5000,
        city: "São Paulo",
        state: "SP",
        notes: "Observação importante"
      }
    ];
    exportToCSV("modelo_importacao_clientes", template);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const data = await parseCSV(file);
      
      // Fetch existing clients to check for duplicates
      const { data: existingClients } = await supabase
        .from("clients")
        .select("email, cpf, full_name");

      const dupes: any[] = [];
      const uniques: any[] = [];

      data.forEach(item => {
        const isDuplicate = existingClients?.some(existing => 
          (item.email && existing.email === item.email) || 
          (item.cpf && existing.cpf === item.cpf)
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
        toast.success(`${data.length} contatos detectados no arquivo.`);
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
    toast.info("Duplicatas serão importadas normalmente (registros repetidos).");
  };

  const handleMergeDuplicates = () => {
    setMergeMode(true);
    setDuplicates([]);
    setShowDuplicates(false);
    toast.info("Modo Enriquecimento Ativado: Campos vazios serão preenchidos.");
  };

  const handleImport = async () => {
    if (preview.length === 0) return;

    setLoading(true);
    try {
      if (mergeMode) {
        // Enrichment Logic
        toast.info("Iniciando enriquecimento de dados...");
        
        // Fetch full existing data for merging
        const { data: existing } = await supabase.from("clients").select("*");
        
        let updatedCount = 0;
        let insertedCount = 0;

        for (const item of preview) {
          const duplicate = existing?.find(ex => 
            (item.email && ex.email === item.email) || 
            (item.cpf && ex.cpf === item.cpf)
          );

          if (duplicate) {
            const updates: any = {};
            let hasNewData = false;

            // List of fields to enrich if null/empty in DB
            const fields = ['phone', 'whatsapp', 'city', 'state', 'notes', 'income'];
            fields.forEach(f => {
              if (!duplicate[f] && item[f]) {
                updates[f] = f === 'income' ? parseFloat(item[f]) : item[f];
                hasNewData = true;
              }
            });

            if (hasNewData) {
              await supabase.from("clients").update(updates).eq("id", duplicate.id);
              updatedCount++;
            }
          } else {
            // New record
            const newItem = {
              full_name: item.full_name || 'Sem nome',
              email: item.email || null,
              phone: item.phone || null,
              whatsapp: item.whatsapp || null,
              cpf: item.cpf || null,
              income: item.income ? parseFloat(item.income) : null,
              city: item.city || null,
              state: item.state || null,
              notes: item.notes || null,
              pipeline: 'inicial' as any,
              stage: 'chegada_lead' as any,
              temperature: 'morno' as any
            };
            await supabase.from("clients").insert(newItem);
            insertedCount++;
          }
        }
        toast.success(`${updatedCount} registros enriquecidos e ${insertedCount} novos importados!`);
      } else {
        // Standard batch import
        const batchSize = 100;
        for (let i = 0; i < preview.length; i += batchSize) {
          const batch = preview.slice(i, i + batchSize);
          const cleanBatch = batch.map(item => ({
            full_name: item.full_name || 'Sem nome',
            email: item.email || null,
            phone: item.phone || null,
            whatsapp: item.whatsapp || null,
            cpf: item.cpf || null,
            income: item.income ? parseFloat(item.income) : null,
            city: item.city || null,
            state: item.state || null,
            notes: item.notes || null,
            pipeline: 'inicial' as any,
            stage: 'chegada_lead' as any,
            temperature: 'morno' as any
          }));

          const { error } = await supabase.from("clients").insert(cleanBatch);
          if (error) throw error;
        }
        toast.success(`${preview.length} clientes importados com sucesso!`);
      }

      await qc.invalidateQueries({ queryKey: ["clients"] });
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
        <Button variant="outline" size="sm" className="gap-2 font-bold uppercase text-[10px] h-8 border-primary/20 hover:bg-primary/5">
          <Upload className="h-3.5 w-3.5" /> Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-heading font-black uppercase text-xl">Importar Clientes</DialogTitle>
          <DialogDescription className="font-medium">
            Suba uma lista de contatos em formato CSV. 
            Recomendamos baixar o modelo abaixo para garantir a compatibilidade.
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
                    Detectamos {duplicates.length} duplicatas (E-mail ou CPF já existentes)
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
                      Ignorar e Limpar
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
                    <span className="text-[10px] font-black uppercase text-muted-foreground px-1">Lista de Duplicatas</span>
                    <Button variant="ghost" size="sm" onClick={() => setShowDuplicates(false)} className="h-6 px-2 text-[10px] uppercase font-bold">X Fechar</Button>
                  </div>
                  <div className="max-h-[150px] overflow-y-auto p-2 space-y-1 bg-white">
                    {duplicates.map((d, idx) => (
                      <div key={idx} className="text-[11px] p-1.5 border-b last:border-0 flex justify-between">
                        <span className="font-bold truncate max-w-[200px]">{d.full_name}</span>
                        <span className="text-muted-foreground">{d.email || d.cpf || "Dados repetidos"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-primary/5 p-4 rounded-lg flex items-center justify-between border border-primary/10">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-bold">{preview.length} Clientes prontos</span>
                </div>
                <Button onClick={handleImport} disabled={loading || (duplicates.length > 0 && !mergeMode)} size="sm" className="font-black uppercase text-xs">
                  {loading ? "Processando..." : mergeMode ? "Confirmar Mesclagem" : "Confirmar Importação"}
                </Button>
              </div>
              
              {duplicates.length > 0 && !mergeMode && (
                <p className="text-[10px] text-center text-muted-foreground italic">
                  Resolva as duplicatas acima para habilitar a importação.
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100 items-start">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 leading-tight">
              A conta de destino deve estar correta. Todos os dados serão adicionados à coluna <strong>CHEGADA DO LEAD</strong> do seu funil inicial.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

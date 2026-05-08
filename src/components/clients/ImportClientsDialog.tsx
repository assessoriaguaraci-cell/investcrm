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
import Papa from "papaparse";

export default function ImportClientsDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [fullData, setFullData] = useState<any[]>([]);
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
        notes: "Observação importante",
        codigo_imovel: "IL-0000-0000"
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
      setFullData(data); // SALVA O ARQUIVO COMPLETO AQUI
      
      // Fetch existing clients to check for duplicates
      const { data: existingClients } = await supabase
        .from("clients")
        .select("email, cpf, phone");

      const dupes: any[] = [];
      data.forEach(item => {
        const isDuplicate = existingClients?.some(existing => 
          (item.email && existing.email === item.email) || 
          (item.cpf && existing.cpf === item.cpf) ||
          (item.phone && existing.phone === item.phone.replace(/\D/g, ''))
        );
        if (isDuplicate) dupes.push(item);
      });

      setPreview(data.slice(0, 10)); // MOSTRA SÓ 10 NA TELA PARA FICAR RÁPIDO
      setDuplicates(dupes);
      setShowDuplicates(false);
      
      toast.success(`${data.length} contatos detectados no arquivo.`);
    } catch (error) {
      toast.error("Erro ao ler arquivo CSV.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDuplicates = () => {
    const uniques = fullData.filter(item => !duplicates.includes(item));
    setFullData(uniques);
    setPreview(uniques.slice(0, 10));
    setDuplicates([]);
    setShowDuplicates(false);
    toast.info("Duplicatas removidas.");
  };

  const handleIgnoreDuplicates = () => {
    setDuplicates([]);
    setShowDuplicates(false);
    setMergeMode(false);
  };

  const handleMergeDuplicates = () => {
    setMergeMode(true);
    setDuplicates([]);
    setShowDuplicates(false);
  };

  // Função auxiliar para encontrar valor em colunas com nomes variados
  const findColumnValue = (item: any, possibleNames: string[]) => {
    const keys = Object.keys(item);
    for (const name of possibleNames) {
      const normalizedName = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const match = keys.find(k => {
        const normalizedKey = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        return normalizedKey === normalizedName || normalizedKey.includes(normalizedName);
      });
      if (match && item[match]) return item[match];
    }
    return null;
  };

  const handleImport = async () => {
    if (fullData.length === 0) return;

    setLoading(true);
    try {
      const dataToImport = fullData; // USA OS DADOS COMPLETOS
      if (mergeMode) {
        // Enrichment Logic
        toast.info("Iniciando enriquecimento de dados...");
        
        // Fetch full existing data for merging
        const { data: existing } = await supabase.from("clients").select("*");
        
        let updatedCount = 0;
        let insertedCount = 0;

        for (const item of dataToImport) {
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
            
            // PROCESS PROPERTY LINKS FOR EXISTING CLIENT
            const rawCodes = item.etiquetas || item.tags || item.property_code || item.codigo_imovel || "";
            const codes = String(rawCodes).match(/\d{4}/g) || [];
            for (const code of [...new Set(codes)]) {
              const { data: prop } = await supabase.from("properties").ilike('code', `%${code}%`).maybeSingle();
              if (prop) {
                // Try to link (will ignore if already linked thanks to check or DB constraint)
                const { data: existingLink } = await supabase.from("client_property_links")
                  .select('id')
                  .eq('client_id', duplicate.id)
                  .eq('property_id', prop.id)
                  .maybeSingle();
                
                if (!existingLink) {
                  await supabase.from("client_property_links").insert({
                    client_id: duplicate.id,
                    property_id: prop.id,
                    status: 'interessado'
                  });
                }
              }
            }
          } else {
            // New record
            const firstName = findColumnValue(item, ['primeiro nome', 'first name', 'nome']) || '';
            const lastName = findColumnValue(item, ['sobrenome', 'last name', 'segundo nome']) || '';
            const fullName = (firstName + ' ' + lastName).trim() || 'Sem nome';

            const newItem = {
              full_name: fullName,
              email: findColumnValue(item, ['email', 'e-mail', 'correio']) || null,
              phone: findColumnValue(item, ['telefone', 'whatsapp', 'celular', 'fone', 'phone']) || null,
              whatsapp: findColumnValue(item, ['whatsapp', 'telefone', 'celular', 'fone', 'phone']) || null,
              cpf: findColumnValue(item, ['cpf', 'documento']) || null,
              income: parseFloat(findColumnValue(item, ['income', 'renda', 'salario']) || "0") || null,
              city: findColumnValue(item, ['city', 'cidade', 'municipio']) || null,
              state: findColumnValue(item, ['state', 'estado', 'uf']) || null,
              notes: findColumnValue(item, ['notes', 'observacao', 'obs', 'detalhes']) || null,
              pipeline: 'inicial' as any,
              stage: 'chegada_lead' as any,
              temperature: 'quente' as any
            };

            const { data: inserted, error: insError } = await supabase.from("clients").insert(newItem).select('id').single();
            
            if (!insError && inserted) {
              // Extract codes from various possible fields
              const rawCodes = findColumnValue(item, ['etiquetas', 'tags', 'property_code', 'codigo', 'imovel', 'ref', 'sku', 'imovelcod']) || "";
              const codes = String(rawCodes).match(/\d{4}/g) || [];
              
              let firstPropFound = false;

              for (const code of [...new Set(codes)]) {
                const { data: prop } = await supabase.from("properties").select("id, responsible_user_id, city, state").filter('code', 'ilike', `%${code}%`).maybeSingle();
                
                if (prop) {
                  // Link the property
                  await supabase.from("client_property_links").insert({
                    client_id: inserted.id,
                    property_id: prop.id,
                    status: 'interessado'
                  });

                  // If it's the first property found, inherit its data
                  if (!firstPropFound) {
                    await supabase.from("clients").update({
                      responsible_user_id: prop.responsible_user_id,
                      city: prop.city || newItem.city,
                      state: prop.state || newItem.state
                    }).eq('id', inserted.id);
                    firstPropFound = true;
                  }
                }
              }
            }
            insertedCount++;
          }
        }
        toast.success(`${updatedCount} registros enriquecidos e ${insertedCount} novos importados!`);
      } else {
        // Standard import row-by-row to handle property links correctly
        let insertedCount = 0;
        toast.info(`Iniciando importação de ${dataToImport.length} leads...`);

        for (const item of dataToImport) {
          const firstName = findColumnValue(item, ['primeiro nome', 'first name', 'nome']) || '';
          const lastName = findColumnValue(item, ['sobrenome', 'last name', 'segundo nome']) || '';
          const fullName = (firstName + ' ' + lastName).trim() || 'Sem nome';

          const newItem = {
            full_name: fullName,
            email: findColumnValue(item, ['email', 'e-mail', 'correio']) || null,
            phone: findColumnValue(item, ['telefone', 'whatsapp', 'celular', 'fone', 'phone']) || null,
            whatsapp: findColumnValue(item, ['whatsapp', 'telefone', 'celular', 'fone', 'phone']) || null,
            cpf: findColumnValue(item, ['cpf', 'documento']) || null,
            income: parseFloat(findColumnValue(item, ['income', 'renda', 'salario']) || "0") || null,
            city: findColumnValue(item, ['city', 'cidade', 'municipio']) || null,
            state: findColumnValue(item, ['state', 'estado', 'uf']) || null,
            notes: findColumnValue(item, ['notes', 'observacao', 'obs', 'detalhes']) || null,
            pipeline: 'inicial' as any,
            stage: 'chegada_lead' as any,
            temperature: 'quente' as any
          };

          const { data: inserted, error: insError } = await supabase.from("clients").insert(newItem).select('id').single();
          
          if (!insError && inserted) {
            const rawCodes = findColumnValue(item, ['etiquetas', 'tags', 'property_code', 'codigo', 'imovel', 'ref', 'sku', 'imovelcod']) || "";
            const codes = String(rawCodes).match(/\d{4}/g) || [];
            
            let firstPropFound = false;
            for (const code of [...new Set(codes)]) {
              const { data: prop } = await supabase.from("properties").select("id, responsible_user_id, city, state").filter('code', 'ilike', `%${code}%`).maybeSingle();
              if (prop) {
                await supabase.from("client_property_links").insert({
                  client_id: inserted.id,
                  property_id: prop.id,
                  status: 'interessado'
                });
                if (!firstPropFound) {
                  await supabase.from("clients").update({
                    responsible_user_id: prop.responsible_user_id,
                    city: prop.city || newItem.city,
                    state: prop.state || newItem.state
                  }).eq('id', inserted.id);
                  firstPropFound = true;
                }
              }
            }
            insertedCount++;
          }
        }
        toast.success(`${insertedCount} clientes importados e vinculados com sucesso!`);
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
                  <span className="text-sm font-bold">{fullData.length} Clientes prontos</span>
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

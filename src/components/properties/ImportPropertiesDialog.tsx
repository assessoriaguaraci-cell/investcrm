import { useState } from "react";
import { Upload, FileDown, Loader2 } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ImportPropertiesDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const qc = useQueryClient();

  const handleDownloadTemplate = () => {
    const headers = [
      "CÓDIGO DO IMÓVEL", "UF", "CIDADE", "BAIRRO", "RUA", "TIPO DE IMÓVEL", "NÚM. MATRÍCULA", "LINK DO MAPS", 
      "PONTO DE REFER. DO IMÓVEL", "DIVISÃO INTERNA", "ÁREA DO TERRENO", "ÁREA CONSTR. / PRIVAT.", "VAGA DE GARAGEM", 
      "ELEVADOR", "VALOR MENSAL CONDOMÍNIO", "OBS ÚNICA DO IMÓVEL", "PROPRIETÁRIO", "FASE", "STATUS OCUPAÇÃO", 
      "FORMA DE VENDA", "RESP. INVEST LAR", "RESP. OPERAÇÃO", "DATA DE ARREMATAÇÃO", "ORIGEM", "Nº. SÓCIOS", 
      "PARTICIPAÇÃO GUARA %", "LINK DRIVE", "CUIDADOR VIZINHO", "VALOR MENSAL", "PIX PARA PAGAMENTO", 
      "DATA COMBINADA PAGAM.", "FORMA PGMTO", "VALOR ARREMATAÇÃO", "INVESTIMENTO TOTAL", "POSSUI CORRETOR", 
      "CONTATO CORRETOR", "% CORRETOR LOCAL", "COPY ANÚNCIOS", "SMART LINK", "PLACA?", "FAIXA NA RUA?", 
      "TRÁFEGO PAGO?", "GRUPO FACE?", "GRUPO WHATS?", "PANFLETO", "INFLUENCIADOR / PÁGINA?", "CCA", 
      "OBS ENGENHARIA QUANDO NEGADA", "DATA EXPEDIÇÃO LAUDO", "STATUS ENGENHARIA / LAUDO", "DATA DE VALIDADE DO LAUDO", 
      "VALOR DO LAUDO", "ATT- 01/01/2026"
    ];
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(";");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "modelo_importacao.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const data = await parseCSV(file);
      setPreview(data);
      toast.success(`${data.length} imóveis detectados.`);
    } catch (error) {
      toast.error("Erro ao ler arquivo CSV.");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const mapStage = (v: string): any => {
        const s = v?.toLowerCase() || "";
        if (s.includes("itbi") || s.includes("contrato")) return "itbi_contrato";
        if (s.includes("registro") && s.includes("venda")) return "registro";
        if (s.includes("registro")) return "registro";
        if (s.includes("desocupação") || s.includes("desocupacao")) return "desocupacao";
        if (s.includes("reforma")) return "reforma";
        if (s.includes("reserva")) return "venda";
        if (s.includes("venda")) return "venda";
        if (s.includes("pós") || s.includes("pos")) return "pos_venda";
        if (s.includes("ir") || s.includes("imposto")) return "ir";
        if (s.includes("finalizado") || s.includes("cancelado")) return "finalizado";
        if (s.includes("pré") || s.includes("pre") || s.includes("pós") || s.includes("pos")) return "pos_arrematacao";
        return "pos_arrematacao";
      };

      const mapType = (v: string): any => {
        const t = v?.toLowerCase() || "";
        if (t.includes("apto") || t.includes("apartamento")) return "apartamento";
        if (t.includes("condominio") && t.includes("casa")) return "casa_condominio";
        if (t.includes("casa")) return "casa";
        if (t.includes("terreno")) return "terreno";
        if (t.includes("comercial")) return "comercial";
        return "apartamento";
      };

      const mapOccupation = (v: string): any => {
        const o = v?.toLowerCase() || "";
        if (o.includes("desocupado")) return "desocupado";
        if (o.includes("imissão") || o.includes("imissao")) return "imissao_na_posse";
        if (o.includes("venda para ocupante")) return "venda_para_ocupante";
        if (o.includes("ocupado")) return "ocupado";
        return "ocupado";
      };

      const cleanNum = (v: any) => {
        if (!v) return null;
        // Remove R$, spaces and other currency symbols
        let cleaned = v.toString().replace(/[^\d,.-]/g, '').trim();
        // Brazilian format: 1.234,56 -> we need 1234.56
        // If there's a comma and a dot, the dot is usually thousands and comma is decimal
        if (cleaned.includes(',') && cleaned.includes('.')) {
          cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        } else if (cleaned.includes(',')) {
          // If only comma, it's the decimal separator
          cleaned = cleaned.replace(',', '.');
        }
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
      };

      for (const item of preview) {
        const code = item["CODIGO DO IMOVEL"] || item["CÓDIGO DO IMÓVEL"] || item["code"] || `IMV-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        
        const propertyData: any = {
          code,
          state: item["UF"] || "SP",
          city: item["CIDADE"] || "Não Informada",
          neighborhood: item["BAIRRO"] || null,
          address: item["RUA"] || null,
          property_type: mapType(item["TIPO DE IMOVEL"] || item["TIPO DE IMÓVEL"]),
          registration_number: item["NUM. MATRICULA"] || item["NÚM. MATRÍCULA"] || null,
          landmark: item["PONTO DE REFER. DO IMÓVEL"] || null,
          property_division: `${item["DIVISÃO INTERNA"] || ""} | Vagas: ${item["VAGA DE GARAGEM "] || "0"} | Elevador: ${item["ELEVADOR"] || "Não"}`.trim(),
          area_total: cleanNum(item["ÁREA DO TERRENO"]),
          area_useful: cleanNum(item["ÁREA CONSTR. / PRIVAT."]),
          condo_monthly: cleanNum(item["VALOR MENSAL CONDOMINIO"] || item["VALOR MENSAL CONDOMÍNIO"]),
          owner: item["PROPRIETÁRIO"] || null,
          stage: mapStage(item["FASE"]),
          occupation_status: mapOccupation(item["STATUS OCUPAÇÃO"]),
          sale_type: item["FORMA DE VENDA "] || item["FORMA DE VENDA"] || null,
          auction_date: item["DATA DE ARREMATAÇÃO"] || null,
          origin: item["ORIGEM"] || null,
          num_shareholders: item["NO. SOCIOS"] || item["Nº. SÓCIOS"] ? parseInt(item["NO. SOCIOS"] || item["Nº. SÓCIOS"]) : null,
          guaraci_share_pct: cleanNum(item["PARTICIPAÇÃO GUARA %"]),
          drive_url: item["LINK DRIVE"] || null,
          caretaker_notes: `Cuidador: ${item["CUIDADOR VIZINHO"] || "N/A"} | Valor: ${item["VALOR MENSAL DO RESPONS. SEGURANÇA"] || "0"} | PIX: ${item["PIX PARA PAGAMENTO"] || "N/A"}`,
          purchase_price: cleanNum(item["VALOR ARREMATAÇÃO"]),
          has_broker: !!item["CONTATO CORRETOR"],
          marketing_ad_copy: item["COPY ANUNCIO"] || item["COPY ANÚNCIOS"] || null,
          appraisal_status: item["STATUS ENGENHARIA / LAUDO"] || null,
          appraisal_date: item["DATA EXPEDIÇÃO LAUDO"] || null,
          appraisal_expiry: item["DATA DE VALIDADE DO LAUDO"] || null,
          listed_price: cleanNum(item["VALOR DO LAUDO"]),
          notes: item["OBS UNICA DO IMOVEL"] || item["OBS ÚNICA DO IMÓVEL"] || null,
        };

        const { data: existing } = await supabase.from("properties").select("id").eq("code", code).maybeSingle();
        let pId;

        if (existing) {
          await supabase.from("properties").update(propertyData).eq("id", existing.id);
          pId = existing.id;
        } else {
          const { data: inserted } = await supabase.from("properties").insert(propertyData).select("id").single();
          pId = inserted?.id;
        }

        if (pId) {
          const attFields = Object.keys(item).filter(k => k.toUpperCase().startsWith("ATT-"));
          for (const field of attFields) {
            const content = item[field];
            if (content && content.toString().trim() !== "") {
              await supabase.from("property_updates").insert({
                property_id: pId,
                content: content.trim(),
                update_date: new Date().toISOString(),
                stage: propertyData.stage,
                created_by: user.id
              });
            }
          }
        }
      }

      toast.success("Importação concluída!");
      qc.invalidateQueries({ queryKey: ["properties"] });
      setOpen(false);
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 font-bold uppercase text-[10px] h-8 border-primary/20">
          <Upload className="h-3.5 w-3.5" /> Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-black uppercase text-xl">Importar Portfólio</DialogTitle>
          <DialogDescription>Importação ultra-rápida (56 colunas + Histórico ATT-).</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div className="flex justify-center gap-4">
            <Button variant="ghost" className="text-primary font-bold text-xs gap-2" onClick={handleDownloadTemplate}>
              <FileDown className="h-4 w-4" /> Modelo Atualizado
            </Button>
          </div>

          <div className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-8 flex flex-col items-center gap-4 relative bg-muted/5">
            <input type="file" accept=".csv" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} disabled={loading} />
            {loading ? <Loader2 className="animate-spin h-10 w-10 text-primary" /> : <Upload className="h-10 w-10 text-muted-foreground" />}
            <p className="font-bold text-sm">Arraste seu CSV aqui</p>
          </div>

          {preview.length > 0 && (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-x-auto">
                <Table className="text-[10px]">
                  <TableHeader>
                    <TableRow>
                      {Object.keys(preview[0]).slice(0, 8).map(h => <TableHead key={h} className="whitespace-nowrap">{h}</TableHead>)}
                      <TableHead>...</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.slice(0, 3).map((row, i) => (
                      <TableRow key={i}>
                        {Object.values(row).slice(0, 8).map((v: any, j) => <TableCell key={j} className="whitespace-nowrap">{v}</TableCell>)}
                        <TableCell>...</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setPreview([])}>Sair</Button>
                <Button onClick={handleImport} disabled={loading} className="font-black uppercase">
                  {loading ? "Importando..." : "Iniciar Importação Agora"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

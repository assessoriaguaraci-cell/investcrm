import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FileText, Image as ImageIcon, Trash2, Upload, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PreAuctionFilesProps {
  propertyId: string;
}

export function PreAuctionFiles({ propertyId }: PreAuctionFilesProps) {
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: files, isLoading } = useQuery({
    queryKey: ["pre-auction-files", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pre_auction_files")
        .select("*")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pre_auction_files").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pre-auction-files", propertyId] });
      toast.success("Arquivo removido.");
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}-${Date.now()}.${fileExt}`;
      const filePath = `pre-auction/${propertyId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("property-photos") // Using existing bucket for simplicity, or we could create a new one
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("property-photos")
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase.from("pre_auction_files").insert({
        property_id: propertyId,
        file_url: publicUrl,
        file_name: file.name,
        file_type: file.type.includes("image") ? "image" : file.type.includes("pdf") ? "pdf" : "other",
      });

      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ["pre-auction-files", propertyId] });
      toast.success("Arquivo enviado com sucesso!");
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao enviar arquivo: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  if (!propertyId) return <p className="text-xs text-muted-foreground">Salve o imóvel primeiro para anexar arquivos.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Anexos e Documentos</h4>
        <div className="relative">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
          />
          <Button 
            asChild 
            variant="outline" 
            size="sm" 
            className="h-8 text-[10px] font-black uppercase tracking-tight"
            disabled={uploading}
          >
            <label htmlFor="file-upload" className="cursor-pointer">
              {uploading ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Upload className="h-3 w-3 mr-2" />}
              {uploading ? "Enviando..." : "Anexar Arquivo"}
            </label>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {isLoading ? (
          <div className="col-span-2 flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary/20" /></div>
        ) : files?.length === 0 ? (
          <div className="col-span-2 py-8 text-center border-2 border-dashed rounded-lg text-muted-foreground text-xs uppercase font-bold opacity-50">
            Nenhum anexo encontrado
          </div>
        ) : (
          files?.map((file) => (
            <div key={file.id} className="flex items-center justify-between p-3 rounded-lg border bg-background hover:border-primary/20 transition-colors">
              <div className="flex items-center gap-3 truncate">
                <div className={cn(
                  "h-8 w-8 rounded flex items-center justify-center shrink-0",
                  file.file_type === 'pdf' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                )}>
                  {file.file_type === 'pdf' ? <FileText className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-[10px] font-black uppercase truncate max-w-[150px]">{file.file_name}</span>
                  <span className="text-[8px] text-muted-foreground font-bold">{new Date(file.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-primary hover:bg-primary/5"
                  onClick={() => window.open(file.file_url, "_blank")}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-destructive hover:bg-destructive/5"
                  onClick={() => {
                    if (confirm("Excluir este arquivo?")) deleteMutation.mutate(file.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

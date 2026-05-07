import { useState } from "react";
import { Upload, X, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  propertyId: string;
  currentUrl: string | null;
  onUploaded: (url: string) => void;
}

export default function PropertyPhotoUpload({ propertyId, currentUrl, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Apenas imagens (JPEG, PNG, WebP, GIF) são permitidas");
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("A imagem deve ter no máximo 10MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}.${ext}`;
      const path = `${propertyId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("property-photos")
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("property-photos")
        .getPublicUrl(path);

      // Add cache buster to force UI refresh
      const finalUrl = `${publicUrl}?t=${Date.now()}`;
      onUploaded(finalUrl);
      toast.success("Foto enviada!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar foto");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {currentUrl ? (
        <div className="relative rounded-lg overflow-hidden border bg-muted">
          <img src={currentUrl} alt="Foto do imóvel" className="w-full h-32 object-cover" />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="absolute bottom-2 right-2 text-xs h-7"
            onClick={() => document.getElementById(`photo-input-${propertyId}`)?.click()}
            disabled={uploading}
          >
            {uploading ? "Enviando..." : "Trocar foto"}
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => document.getElementById(`photo-input-${propertyId}`)?.click()}
          disabled={uploading}
          className="w-full h-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
        >
          {uploading ? (
            <span className="text-xs">Enviando...</span>
          ) : (
            <>
              <Upload className="h-5 w-5" />
              <span className="text-xs">Enviar foto</span>
            </>
          )}
        </button>
      )}
      <input
        id={`photo-input-${propertyId}`}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}

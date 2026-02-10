import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-sm text-muted-foreground">Usuários, permissões e integrações</p>
        </div>
      </div>
      <div className="flex items-center justify-center h-64 border border-dashed border-border rounded-lg">
        <div className="text-center text-muted-foreground">
          <Settings className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">Painel de configurações</p>
          <p className="text-sm">Será implementado na próxima etapa</p>
        </div>
      </div>
    </div>
  );
}

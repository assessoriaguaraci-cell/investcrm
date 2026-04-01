import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, UsersRound } from "lucide-react";
import ProfileSettings from "@/components/settings/ProfileSettings";
import TeamSettings from "@/components/settings/TeamSettings";

export default function SettingsPage() {
  return (
    <div className="p-4 md:p-6 text-foreground">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Perfil e equipe</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="profile" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <User className="h-4 w-4" /> Perfil
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <UsersRound className="h-4 w-4" /> Equipe
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <ProfileSettings />
        </TabsContent>
        <TabsContent value="team" className="mt-4">
          <TeamSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

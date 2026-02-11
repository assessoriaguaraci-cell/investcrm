import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Megaphone, UsersRound } from "lucide-react";
import ProfileSettings from "@/components/settings/ProfileSettings";
import LeadSourceSettings from "@/components/settings/LeadSourceSettings";
import TeamSettings from "@/components/settings/TeamSettings";

export default function SettingsPage() {
  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Perfil, origens de lead e equipe</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="h-4 w-4" /> Perfil
          </TabsTrigger>
          <TabsTrigger value="sources" className="gap-1.5">
            <Megaphone className="h-4 w-4" /> Origens
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5">
            <UsersRound className="h-4 w-4" /> Equipe
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileSettings />
        </TabsContent>
        <TabsContent value="sources">
          <LeadSourceSettings />
        </TabsContent>
        <TabsContent value="team">
          <TeamSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

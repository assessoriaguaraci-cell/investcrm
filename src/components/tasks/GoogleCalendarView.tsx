import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, ExternalLink, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function GoogleCalendarView() {
  // Check if user has a saved calendar URL in localStorage or settings (future implementation)
  const calendarUrl = "https://calendar.google.com/calendar/embed?src=addressbook%23contacts%40group.v.calendar.google.com&ctz=America%2FSao_Paulo";

  return (
    <div className="space-y-4">
      <Alert className="bg-blue-50/50 border-blue-100">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800 font-semibold">Configuração do Google Agenda</AlertTitle>
        <AlertDescription className="text-blue-700 text-xs">
          Para visualizar sua agenda pessoal, você pode integrar o link público do seu Google Agenda nas configurações.
        </AlertDescription>
      </Alert>

      <Card className="overflow-hidden border-slate-200 shadow-sm transition-all hover:shadow-md">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CalendarDays className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-slate-800">Google Agenda</CardTitle>
                <p className="text-xs text-slate-500 font-medium">Sincronizado com sua conta Google</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2 text-xs font-semibold" asChild>
              <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer">
                Abrir Agenda <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="aspect-video w-full min-h-[600px] bg-slate-50 flex items-center justify-center">
            <iframe
              src={calendarUrl}
              style={{ border: 0 }}
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              title="Google Calendar"
              className="opacity-90 grayscale-[0.2] hover:grayscale-0 transition-all"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
          <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
            Vantagens da Integração
          </h4>
          <ul className="text-xs text-slate-600 space-y-2 font-medium">
            <li className="flex items-center gap-2">
              <div className="w-1 h-1 bg-slate-400 rounded-full" />
              Sincronização em tempo real com dispositivos móveis
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1 h-1 bg-slate-400 rounded-full" />
              Notificações automáticas de compromissos
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1 h-1 bg-slate-400 rounded-full" />
              Gestão centralizada de visitas e reuniões
            </li>
          </ul>
        </div>
        
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
          <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
            Como Gerenciar
          </h4>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            Adicione o link do seu calendário nas configurações do sistema para que ele apareça aqui. 
            Você pode criar diferentes agendas para cada tipo de atividade no seu CRM.
          </p>
        </div>
      </div>
    </div>
  );
}

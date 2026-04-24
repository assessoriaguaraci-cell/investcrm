import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { RequireAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/layout/AppLayout";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Properties from "@/pages/Properties";
import Clients from "@/pages/Clients";
import Matches from "@/pages/Matches";
import Tasks from "@/pages/Tasks";
import Calendar from "@/pages/Calendar";
import Partners from "@/pages/Partners";
import SettingsPage from "@/pages/SettingsPage";
import PreAuctionKanban from "@/pages/PreAuctionKanban";
import NotFound from "./pages/NotFound";

console.log('App.tsx top-level executing');

const queryClient = new QueryClient();

const App = () => {
  console.log('App component rendering');
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route
                element={
                  <RequireAuth>
                    <AppLayout />
                  </RequireAuth>
                }
              >
                <Route path="/" element={<Dashboard />} />
                <Route path="/pre-auction" element={<PreAuctionKanban />} />
                <Route path="/properties" element={<Properties />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/matches" element={<Matches />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/partners" element={<Partners />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route >
              <Route path="*" element={<NotFound />} />
            </Routes >
          </BrowserRouter >
        </TooltipProvider >
      </QueryClientProvider >
    </ThemeProvider >
  );
};

export default App;

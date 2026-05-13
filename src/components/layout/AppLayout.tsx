import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Building2, Users, Handshake, CheckSquare, Settings, Menu, X, LogOut, CalendarRange, ChevronRight, ChevronLeft, Gavel } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import logoImg from "@/assets/logo.png";
const navItems = [{
  path: "/",
  label: "Dashboard",
  icon: LayoutDashboard
}, {
  path: "/pre-auction",
  label: "Pré-Arrematação",
  icon: Gavel
}, {
  path: "/properties",
  label: "Imóveis",
  icon: Building2
}, {
  path: "/clients",
  label: "Clientes",
  icon: Users
}, {
  path: "/tasks",
  label: "Tarefas",
  icon: CheckSquare
}, {
  path: "/calendar",
  label: "Calendário",
  icon: CalendarRange
}, {
  path: "/partners",
  label: "Parceiros",
  icon: Handshake
}, {
  path: "/settings",
  label: "Configurações",
  icon: Settings
}];
const bottomNavItems = navItems.slice(0, 5).concat(navItems[5]); // Dashboard, Imóveis, Clientes, Tarefas, Calendário, Parceiros
export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()
          .then(({ data, error }) => {
            if (error) {
              console.warn("Profile fetch failed:", error.message);
              return;
            }
            if (data) setProfile(data);
          });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        supabase
          .from("profiles")
          .select("*")
          .eq("id", u.id)
          .single()
          .then(({ data, error }) => {
            if (error) {
              console.warn("Profile fetch failed in auth change:", error.message);
              return;
            }
            if (data) setProfile(data);
          });
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };
  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };
  return <div className="flex h-dvh overflow-hidden bg-background">
    {/* Desktop Sidebar */}
    {!isMobile && (
      <aside 
        className={cn(
          "hidden md:flex flex-col border-r border-[#002B44]/20 bg-[#EDF0F4] transition-all duration-300 ease-in-out relative shadow-lg z-40",
          isExpanded ? "w-52" : "w-20"
        )}
      >
        <div className="px-4 py-5 border-b border-[#002B44]/10 flex items-center gap-3 overflow-hidden">
          <img 
            alt="Logo" 
            className="h-8 w-8 min-w-[32px] object-contain" 
            src={logoImg} 
          />
          {isExpanded && (
            <span className="font-black text-lg truncate text-[#002B44] animate-in fade-in duration-500 uppercase tracking-tight">
              CRM INVEST
            </span>
          )}
        </div>

        <nav className="flex-1 w-full px-3 py-6 space-y-2 overflow-y-auto overflow-x-hidden">
          {navItems.map(item => (
            <button 
              key={item.path} 
              title={!isExpanded ? item.label : ""} 
              onClick={() => navigate(item.path)} 
              className={cn(
                "flex items-center w-full rounded-xl transition-all duration-200 group overflow-hidden",
                isExpanded ? "px-4 py-3 gap-3" : "justify-center py-3",
                isActive(item.path) 
                  ? "bg-[#016FAE] text-white shadow-lg scale-[1.05]" 
                  : "text-[#002B44] hover:text-[#F58228] hover:bg-white/50"
              )}
            >
              <item.icon className={cn("h-6 w-6 min-w-[24px]", isActive(item.path) ? "text-white" : "text-[#002B44] group-hover:text-[#F58228]")} />
              {isExpanded && (
                <span className="text-sm font-black truncate whitespace-nowrap animate-in slide-in-from-left-2 uppercase tracking-tighter">
                  {item.label}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto p-4 border-t border-[#002B44]/20 flex flex-col gap-4 w-full bg-[#E5E9F0]/50">
          {/* User Profile Section - Now more visible */}
          <div className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[#002B44]/10 transition-all shadow-sm",
            isExpanded ? "bg-white mb-1" : "justify-center bg-white/60"
          )}>
            <div className="h-9 w-9 rounded-full bg-[#F58228] flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md ring-2 ring-white">
              {profile?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || "A"}
            </div>
            {isExpanded && (
              <div className="flex flex-col min-w-0 overflow-hidden animate-in fade-in slide-in-from-bottom-1">
                <span className="text-[13px] font-black text-[#002B44] truncate uppercase tracking-tight">
                  {profile?.full_name || "Usuário"}
                </span>
                <span className="text-[10px] font-medium text-[#002B44]/70 truncate">
                  {user?.email || "carregando..."}
                </span>
              </div>
            )}
          </div>

          <div className={cn("flex items-center w-full", isExpanded ? "justify-between px-2" : "justify-center")}>
            <div className="text-[#002B44]">
              <ThemeToggle />
            </div>
            {isExpanded && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleLogout} 
                className="text-[#002B44] hover:text-destructive transition-colors"
                title="Sair"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="absolute -right-3 top-10 h-6 w-6 rounded-full border border-[#002B44]/20 bg-white shadow-sm hover:bg-[#EDF0F4] z-50 p-0 text-[#002B44]"
          >
            {isExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>

          {!isExpanded && (
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair" className="text-[#002B44] hover:text-destructive">
              <LogOut className="h-5 w-5" />
            </Button>
          )}
        </div>
      </aside>
    )}

    {/* Mobile Sidebar Overlay */}
    {isMobile && sidebarOpen && <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-foreground/20" onClick={() => setSidebarOpen(false)} />
      <aside className="relative w-72 flex flex-col bg-sidebar border-r border-sidebar-border animate-in slide-in-from-left">
        <div className="flex items-center justify-between px-5 py-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="Logo" className="h-6 w-6 object-contain" />
            <span className="text-lg font-bold text-sidebar-foreground">CRM INVEST</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => <button key={item.path} onClick={() => {
            navigate(item.path);
            setSidebarOpen(false);
          }} className={cn("flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-colors", isActive(item.path) ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground hover:bg-sidebar-accent")}>
            <item.icon className="h-5 w-5" />
            {item.label}
          </button>)}
        </nav>
        <div className="p-3 border-t border-sidebar-border flex items-center justify-between">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </aside>
    </div>}

    {/* Main Content */}
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Mobile Header */}
      {isMobile && <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card md:hidden">
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <img src={logoImg} alt="Logo" className="h-5 w-5 object-contain" />
          <span className="font-semibold">CRM INVEST</span>
        </div>
        <ThemeToggle />
      </header>}

      {/* Page Content */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-card px-1 py-2 md:hidden safe-area-bottom">
        {bottomNavItems.map(item => <button key={item.path} onClick={() => navigate(item.path)} className={cn("flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-xs transition-colors", isActive(item.path) ? "text-primary" : "text-muted-foreground")}>
          <item.icon className="h-5 w-5" />
          <span className="truncate">{item.label}</span>
        </button>)}
      </nav>}
    </div>
  </div>;
}
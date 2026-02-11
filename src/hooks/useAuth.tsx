import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, session, loading };
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) {
      setCheckingProfile(false);
      return;
    }
    
    const checkStatus = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("status")
        .eq("user_id", user.id)
        .single();
      setProfileStatus((data as any)?.status ?? "approved");
      setCheckingProfile(false);
    };
    checkStatus();
  }, [user]);

  if (loading || checkingProfile) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return null;

  if (profileStatus === "pending") {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="text-center max-w-md p-8 rounded-xl border bg-card shadow-lg">
          <div className="text-4xl mb-4">⏳</div>
          <h2 className="text-xl font-bold mb-2">Cadastro em análise</h2>
          <p className="text-muted-foreground mb-6">
            Seu cadastro foi recebido e está aguardando aprovação do administrador. Você receberá acesso assim que for aprovado.
          </p>
          <button
            onClick={() => supabase.auth.signOut().then(() => navigate("/auth", { replace: true }))}
            className="text-sm text-primary underline hover:no-underline"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  if (profileStatus === "rejected") {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="text-center max-w-md p-8 rounded-xl border bg-card shadow-lg">
          <div className="text-4xl mb-4">🚫</div>
          <h2 className="text-xl font-bold mb-2">Acesso negado</h2>
          <p className="text-muted-foreground mb-6">
            Sua solicitação de acesso foi recusada pelo administrador. Entre em contato caso acredite que houve um engano.
          </p>
          <button
            onClick={() => supabase.auth.signOut().then(() => navigate("/auth", { replace: true }))}
            className="text-sm text-primary underline hover:no-underline"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

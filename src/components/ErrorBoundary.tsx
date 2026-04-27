import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Error caught by ErrorBoundary [${this.props.name || 'Unknown'}]:`, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-destructive/5 rounded-xl border-2 border-dashed border-destructive/20 m-4">
          <div className="h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-tighter mb-2">Ops! Algo deu errado no módulo {this.props.name}</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md">
            Ocorreu um erro inesperado nesta parte do sistema. Não se preocupe, o restante do CRM continua funcionando.
          </p>
          <div className="flex gap-3">
            <Button onClick={this.handleReset} variant="outline" className="font-bold uppercase text-xs gap-2">
              <RefreshCcw className="h-3 w-3" /> Tentar Novamente
            </Button>
            <Button onClick={() => window.location.href = '/'} className="font-bold uppercase text-xs">
              Ir para o Início
            </Button>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-8 p-4 bg-background border rounded text-[10px] text-left overflow-auto max-w-full text-destructive">
              {this.state.error?.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

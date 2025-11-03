"use client";

import { useEffect, useState } from "react";
import { LockKeyhole, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuditCredentials } from "@/components/audit-credentials-provider";

export function CredentialsDialog() {
  const { credentials, hydrated, updateCredentials } = useAuditCredentials();
  const [user, setUser] = useState("");
  const [token, setToken] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setUser(credentials.user ?? "");
    setToken(credentials.token ?? "");
  }, [credentials.user, credentials.token]);

  const requiresToken = process.env.NEXT_PUBLIC_AUDIT_TOKEN_REQUIRED === "true";

  const shouldOpen = hydrated && !credentials.user;

  if (!shouldOpen) {
    return null;
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    if (!user.trim()) {
      return;
    }
    if (requiresToken && !token.trim()) {
      return;
    }
    updateCredentials({ user: user.trim(), token: token.trim() || undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border/40 bg-card p-6 shadow-lg">
        <div className="flex flex-col gap-4">
          <header className="space-y-1">
            <h1 className="text-lg font-semibold text-foreground">
              Identifique-se para iniciar a auditoria
            </h1>
            <p className="text-sm text-muted-foreground">
              Informe seu identificador e, se necessário, o token de auditoria fornecido pelo backend.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground" htmlFor="audit-user">
                <UserRound className="h-4 w-4" /> Usuário de auditoria
              </label>
              <input
                id="audit-user"
                type="text"
                value={user}
                onChange={(event) => setUser(event.target.value)}
                placeholder="Ex: auditor@sala01"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              />
              {touched && !user.trim() ? (
                <span className="text-xs text-destructive">Informe um usuário válido.</span>
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground" htmlFor="audit-token">
                <LockKeyhole className="h-4 w-4" /> Token de auditoria {requiresToken ? "(obrigatório)" : "(opcional)"}
              </label>
              <input
                id="audit-token"
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="••••••••"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required={requiresToken}
              />
              {touched && requiresToken && !token.trim() ? (
                <span className="text-xs text-destructive">Token obrigatório.</span>
              ) : null}
            </div>

            <Button type="submit" className="w-full">
              Entrar na auditoria
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

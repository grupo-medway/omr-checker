"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type AuditCredentials = {
  user: string;
  token?: string;
};

type AuditCredentialsContextValue = {
  credentials: AuditCredentials;
  hydrated: boolean;
  setCredentials: (value: AuditCredentials) => void;
  updateCredentials: (partial: Partial<AuditCredentials>) => void;
  clearCredentials: () => void;
};

const STORAGE_KEY = "audit-credentials";

const AuditCredentialsContext = createContext<AuditCredentialsContextValue | null>(
  null,
);

export function AuditCredentialsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [credentials, setCredentials] = useState<AuditCredentials>({
    user: "",
    token: "",
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AuditCredentials;
        setCredentials({
          user: parsed.user || "",
          token: parsed.token || "",
        });
      } catch (error) {
        console.warn("Falha ao ler credenciais de auditoria armazenadas", error);
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    setHydrated(true);
  }, []);

  const persist = useCallback((value: AuditCredentials) => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  }, []);

  const handleSetCredentials = useCallback(
    (value: AuditCredentials) => {
      setCredentials(value);
      persist(value);
    },
    [persist],
  );

  const handleUpdateCredentials = useCallback(
    (partial: Partial<AuditCredentials>) => {
      setCredentials((prev) => {
        const next = { ...prev, ...partial };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const handleClear = useCallback(() => {
    setCredentials({ user: "", token: "" });
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const value = useMemo<AuditCredentialsContextValue>(
    () => ({
      credentials,
      hydrated,
      setCredentials: handleSetCredentials,
      updateCredentials: handleUpdateCredentials,
      clearCredentials: handleClear,
    }),
    [credentials, handleClear, handleSetCredentials, handleUpdateCredentials, hydrated],
  );

  return (
    <AuditCredentialsContext.Provider value={value}>
      {children}
    </AuditCredentialsContext.Provider>
  );
}

export function useAuditCredentials() {
  const context = useContext(AuditCredentialsContext);
  if (!context) {
    throw new Error(
      "useAuditCredentials deve ser utilizado dentro de AuditCredentialsProvider",
    );
  }
  return context;
}

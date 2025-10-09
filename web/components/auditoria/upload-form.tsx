"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, Upload } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { useAuditCredentials } from "@/components/audit-credentials-provider";
import {
  useProcessOmrMutation,
  useTemplatesQuery,
} from "@/hooks/useAuditoria";
import type { ProcessResponse } from "@/lib/api/types";

type UploadFormProps = {
  onProcessed: (response: ProcessResponse) => void;
  disabled?: boolean;
};

export function UploadForm({ onProcessed, disabled }: UploadFormProps) {
  const { credentials } = useAuditCredentials();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const templatesQuery = useTemplatesQuery();
  const processMutation = useProcessOmrMutation({
    onSuccess: (response) => {
      toast.success("Processamento concluído");
      onProcessed(response);
      setSelectedFile(null);
    },
    onError: (error) => {
      toast.error(error.message || "Falha no processamento");
    },
  });

  useEffect(() => {
    if (!selectedTemplate && templatesQuery.data?.templates?.length) {
      setSelectedTemplate(templatesQuery.data.templates[0]);
    }
  }, [selectedTemplate, templatesQuery.data]);

  const templates = useMemo(() => templatesQuery.data?.templates ?? [], [
    templatesQuery.data,
  ]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".zip")) {
      toast.error("Apenas arquivos ZIP são aceitos");
      event.target.value = "";
      return;
    }
    setSelectedFile(file);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTemplate) {
      toast.error("Selecione um template");
      return;
    }
    if (!selectedFile) {
      toast.error("Selecione um arquivo ZIP");
      return;
    }
    if (!credentials.token && process.env.NEXT_PUBLIC_AUDIT_TOKEN_REQUIRED === "true") {
      toast.error("Informe o token de auditoria antes de processar");
      return;
    }

    processMutation.mutate({ file: selectedFile, template: selectedTemplate });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-border/40 bg-card p-4 shadow-sm"
    >
      <div className="flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:gap-6">
        <div className="flex w-full flex-col gap-2 sm:max-w-md">
          <label
            className="text-sm font-semibold text-foreground"
            htmlFor="template"
          >
            Template
          </label>
          <select
            id="template"
            className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={selectedTemplate}
            onChange={(event) => setSelectedTemplate(event.target.value)}
            disabled={templatesQuery.isLoading || processMutation.isPending || disabled}
            aria-describedby="template-help"
          >
            {templates.length === 0 ? (
              <option value="" disabled>
                {templatesQuery.isLoading ? "Carregando..." : "Nenhum template"}
              </option>
            ) : null}
            {templates.map((template) => (
              <option key={template} value={template}>
                {template}
              </option>
            ))}
          </select>
          <span id="template-help" className="text-xs text-muted-foreground">
            Carregado automaticamente dos templates disponíveis no backend.
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <label
            className="text-sm font-semibold text-foreground"
            htmlFor="file"
          >
            Arquivo ZIP
          </label>
          <input
            id="file"
            type="file"
            accept=".zip"
            onChange={handleFileChange}
            disabled={processMutation.isPending || disabled}
            className="h-12 rounded-md border border-dashed border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-describedby="file-help"
          />
          {selectedFile ? (
            <span id="file-help" className="text-xs text-muted-foreground">
              {selectedFile.name} – {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </span>
          ) : (
            <span id="file-help" className="text-xs text-muted-foreground">
              Tamanho máximo conforme configuração do backend.
            </span>
          )}
        </div>
        <div className="flex flex-col items-stretch gap-2 md:min-w-[220px]">
          <Button
            type="submit"
            disabled={
              !selectedFile ||
              !selectedTemplate ||
              processMutation.isPending ||
              disabled
            }
            className="h-14 justify-center gap-2 rounded-xl border border-primary bg-primary text-base font-semibold text-primary-foreground shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring disabled:border-border disabled:bg-muted disabled:text-muted-foreground"
            aria-live="polite"
          >
            {processMutation.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Processando lote…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Upload className="h-4 w-4" aria-hidden />
                Iniciar processamento
              </span>
            )}
          </Button>
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5" aria-hidden />
            Selecione template e ZIP válidos para liberar o processamento.
          </p>
        </div>
      </div>
    </form>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { FileArchive, Info, Loader2, PlayCircle, Upload, X } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

type FileCardProps = {
  file: File;
  onRemove: () => void;
};

function FileCard({ file, onRemove }: FileCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border/40 bg-muted/50 p-3">
      <FileArchive className="h-5 w-5 shrink-0 text-primary" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {file.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {(file.size / (1024 * 1024)).toFixed(2)} MB
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="h-8 w-8 p-0 shrink-0"
        aria-label="Remover arquivo"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

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

  const handleRemoveFile = () => {
    setSelectedFile(null);
    // Reset input value
    const fileInput = document.getElementById("file") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
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

  const canProcess = Boolean(selectedFile && selectedTemplate);

  return (
    <Card className="border-border/40 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Upload de Cartões</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* GRUPO 1: Configuração */}
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="template"
            >
              Template do Cartão
            </label>
            <select
              id="template"
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={selectedTemplate}
              onChange={(event) => setSelectedTemplate(event.target.value)}
              disabled={templatesQuery.isLoading || processMutation.isPending || disabled}
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
            <p className="text-xs text-muted-foreground">
              Carregado automaticamente dos templates disponíveis no backend
            </p>
          </div>

          <Separator />

          {/* GRUPO 2: Upload */}
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="file"
            >
              Arquivo ZIP
            </label>
            {!selectedFile ? (
              <>
                <div className="relative">
                  <input
                    id="file"
                    type="file"
                    accept=".zip"
                    onChange={handleFileChange}
                    disabled={processMutation.isPending || disabled}
                    className="peer sr-only"
                  />
                  <label
                    htmlFor="file"
                    className="flex h-24 cursor-pointer items-center justify-center rounded-md border border-dashed border-input bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-6 w-6" />
                      <span className="font-medium">Escolher arquivo ZIP</span>
                    </div>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tamanho máximo conforme configuração do backend
                </p>
              </>
            ) : (
              <FileCard file={selectedFile} onRemove={handleRemoveFile} />
            )}
          </div>

          <Separator />

          {/* GRUPO 3: Ação */}
          <div className="space-y-3">
            <Button
              type="submit"
              disabled={!canProcess || processMutation.isPending || disabled}
              className="h-12 w-full gap-2 text-base font-semibold"
            >
              {processMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando lote…
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4" />
                  Iniciar processamento
                </>
              )}
            </Button>
            {!canProcess && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Selecione um template e arquivo ZIP para continuar
                </AlertDescription>
              </Alert>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

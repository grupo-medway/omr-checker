"use client";

import { Download, Eraser, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type ExportActionsProps = {
  batchId: string | null;
  disabled?: boolean;
  isExporting: boolean;
  isCleaning: boolean;
  manifest?: {
    exported_at?: string | null;
    exported_by?: string | null;
  } | null;
  manifestLoading?: boolean;
  onExport: () => void;
  onCleanup: () => void;
};

export function ExportActions({
  batchId,
  disabled,
  isExporting,
  isCleaning,
  manifest,
  manifestLoading,
  onExport,
  onCleanup,
}: ExportActionsProps) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border/40 bg-card p-4 shadow-sm md:flex-row md:items-start md:justify-between">
      <div className="flex flex-1 flex-col text-xs text-muted-foreground">
        <span className="text-sm font-semibold text-foreground">Exportação e limpeza</span>
        {manifest?.exported_at ? (
          <span>
            Última exportação: {new Date(manifest.exported_at).toLocaleString()} por{" "}
            <span className="font-semibold text-foreground">
              {manifest.exported_by ?? "desconhecido"}
            </span>
          </span>
        ) : manifestLoading ? (
          <span>Carregando informações do manifesto...</span>
        ) : (
          <span>Nenhuma exportação registrada até o momento.</span>
        )}
      </div>
      <div className="flex w-full flex-col gap-2 md:max-w-[260px]">
        <Button
          type="button"
          onClick={onExport}
          disabled={disabled || !batchId || isExporting || manifestLoading}
          className="h-12 justify-center gap-2 rounded-lg bg-primary text-base font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Exportando
            </>
          ) : (
            <>
              <Download className="h-4 w-4" /> Exportar CSV
            </>
          )}
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Gera CSV corrigido do lote atual.
        </p>
        <Button
          type="button"
          variant="destructive"
          onClick={onCleanup}
          disabled={disabled || !batchId || isCleaning}
          className="h-12 justify-center gap-2 rounded-lg text-base font-semibold"
        >
          {isCleaning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Limpando
            </>
          ) : (
            <>
              <Eraser className="h-4 w-4" /> Limpar lote
            </>
          )}
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Remove resultados e arquivos exportados do lote.
        </p>
      </div>
    </div>
  );
}

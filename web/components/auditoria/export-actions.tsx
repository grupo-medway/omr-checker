"use client";

import { Download, Eraser, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type ExportActionsProps = {
  batchId: string | null;
  disabled?: boolean;
  isExporting: boolean;
  isCleaning: boolean;
  onExport: () => void;
  onCleanup: () => void;
};

export function ExportActions({
  batchId,
  disabled,
  isExporting,
  isCleaning,
  onExport,
  onCleanup,
}: ExportActionsProps) {
  return (
    <Card className="border-border/40 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Exportar e Limpar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Exportar CSV */}
        <div className="space-y-2">
          <Button
            type="button"
            onClick={onExport}
            disabled={disabled || !batchId || isExporting}
            className="h-12 w-full gap-2 text-base font-semibold"
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
          <p className="text-xs text-muted-foreground">
            Gera CSV corrigido do lote atual
          </p>
        </div>

        <Separator />

        {/* Limpar Lote */}
        <div className="space-y-2">
          <Button
            type="button"
            variant="destructive"
            onClick={onCleanup}
            disabled={disabled || !batchId || isCleaning}
            className="h-12 w-full gap-2 text-base font-semibold"
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
          <p className="text-xs text-muted-foreground">
            Remove resultados e arquivos do lote
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

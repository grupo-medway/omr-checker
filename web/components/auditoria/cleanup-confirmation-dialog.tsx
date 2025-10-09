"use client";

import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type CleanupConfirmationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  batchId: string | null;
  totalItems: number;
};

export function CleanupConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  batchId,
  totalItems,
}: CleanupConfirmationDialogProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Reset ao abrir
  useEffect(() => {
    if (open) {
      setConfirmed(false);
      setCountdown(3);
    }
  }, [open]);

  // Countdown timer
  useEffect(() => {
    if (!open || countdown === 0) return;

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [open, countdown]);

  const handleConfirm = () => {
    if (confirmed && countdown === 0) {
      onConfirm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <DialogTitle>Confirmar Exclusão Permanente</DialogTitle>
          </div>
        </DialogHeader>

        <DialogDescription className="space-y-4 text-foreground">
          <p className="font-medium text-destructive">
            ⚠️ Esta ação é IRREVERSÍVEL
          </p>

          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 space-y-2">
            <p className="font-semibold">Será deletado permanentemente:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>{totalItems} cartões auditados</li>
              <li>Todas as imagens processadas</li>
              <li>Histórico de decisões</li>
              <li>CSVs exportados anteriormente</li>
            </ul>
          </div>

          <div className="rounded-lg border bg-muted/50 p-3">
            <p className="text-sm font-mono">
              <span className="text-muted-foreground">Lote ID:</span>{" "}
              <span className="font-semibold text-destructive">{batchId}</span>
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3">
            <Checkbox
              id="confirm-delete"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked === true)}
            />
            <label
              htmlFor="confirm-delete"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Entendo que esta ação não pode ser desfeita e todos os dados serão
              perdidos permanentemente
            </label>
          </div>
        </DialogDescription>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="sm:flex-1"
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={!confirmed || countdown > 0}
            onClick={handleConfirm}
            className="sm:flex-1"
          >
            {countdown > 0
              ? `Aguarde ${countdown}s...`
              : "Deletar Permanentemente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

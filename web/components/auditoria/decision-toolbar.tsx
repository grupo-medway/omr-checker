"use client";

import { ArrowLeft, ArrowRight, Check, Loader2, StickyNote } from "lucide-react";

import { Button } from "@/components/ui/button";

type DecisionToolbarProps = {
  onSave: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  disabled?: boolean;
  isSaving?: boolean;
  hasChanges: boolean;
  notes: string;
  onNotesChange: (value: string) => void;
};

export function DecisionToolbar({
  onSave,
  onPrev,
  onNext,
  disabled,
  isSaving,
  hasChanges,
  notes,
  onNotesChange,
}: DecisionToolbarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/40 bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onPrev}
            disabled={!onPrev || disabled || isSaving}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" /> Anterior
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onNext}
            disabled={!onNext || disabled || isSaving}
            className="gap-1"
          >
            Próximo <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <Button
          type="button"
          onClick={onSave}
          disabled={disabled || !hasChanges || isSaving}
          className="min-w-[180px] gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Salvando
            </>
          ) : (
            <>
              <Check className="h-4 w-4" /> Salvar decisão
            </>
          )}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <StickyNote className="h-4 w-4" /> Notas da auditoria
        </label>
        <textarea
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          disabled={disabled || isSaving}
          rows={3}
          className="resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Observações (opcional)"
        />
        {hasChanges ? (
          <span className="text-xs font-medium text-blue-600 dark:text-blue-300">
            Alterações não salvas. Confirme antes de navegar para outro cartão.
          </span>
        ) : null}
      </div>
    </div>
  );
}

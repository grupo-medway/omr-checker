"use client";

import { ArrowLeft, ArrowRight, Check, Loader2, StickyNote } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DecisionToolbarProps = {
  onSave: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  disabled?: boolean;
  isSaving?: boolean;
  hasChanges: boolean;
  notes: string;
  onNotesChange: (value: string) => void;
  currentIndex?: number;
  totalCount?: number;
  resolvedCount?: number;
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
  currentIndex = 0,
  totalCount = 0,
  resolvedCount = 0,
}: DecisionToolbarProps) {
  const progressPercentage = totalCount > 0 ? (resolvedCount / totalCount) * 100 : 0;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/40 bg-card p-4 shadow-sm">
      {/* Progress section */}
      {totalCount > 0 && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          {/* Header com números */}
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              Cartão {currentIndex + 1} de {totalCount}
            </span>
            <span className="text-muted-foreground">
              {resolvedCount} resolvidos ({Math.round(progressPercentage)}%)
            </span>
          </div>

          {/* Progress bar */}
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
                progressPercentage < 30 && "bg-red-500",
                progressPercentage >= 30 && progressPercentage < 70 && "bg-amber-500",
                progressPercentage >= 70 && "bg-green-500"
              )}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Status message */}
          {progressPercentage === 100 ? (
            <p className="text-xs text-green-600 dark:text-green-500 font-medium text-center">
              🎉 Todos os cartões resolvidos!
            </p>
          ) : (
            <p className="text-xs text-muted-foreground text-center">
              {totalCount - resolvedCount} cartões restantes
            </p>
          )}
        </div>
      )}
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

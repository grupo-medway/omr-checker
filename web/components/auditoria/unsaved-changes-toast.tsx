"use client";

import { useEffect } from "react";
import { AlertTriangle, Save, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";

type UnsavedChangesToastProps = {
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
};

const UNSAVED_CHANGES_TOAST_ID = "unsaved-changes";

type ToastContentProps = UnsavedChangesToastProps & {
  toastId: string;
};

function UnsavedChangesToastContent({ toastId, onSave, onDiscard, onCancel }: ToastContentProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        toast.dismiss(toastId);
        onSave();
      } else if (event.key === "Escape") {
        event.preventDefault();
        toast.dismiss(toastId);
        onDiscard();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [toastId, onSave, onDiscard]);

  return (
    <div className="flex items-start gap-3 bg-card border border-amber-200 dark:border-amber-800 rounded-lg p-4 shadow-xl max-w-md">
      <div className="flex-shrink-0 mt-0.5">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
      </div>

      <div className="flex-1 space-y-2">
        <div>
          <p className="font-semibold text-foreground">Alterações não salvas</p>
          <p className="text-sm text-muted-foreground">
            Pressione Enter para salvar ou Esc para descartar.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="default"
            className="flex-1 gap-2"
            onClick={() => {
              toast.dismiss(toastId);
              onSave();
            }}
          >
            <Save className="h-3.5 w-3.5" />
            Salvar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => {
              toast.dismiss(toastId);
              onDiscard();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Descartar
          </Button>
        </div>
      </div>

      <button
        onClick={() => {
          toast.dismiss(toastId);
          onCancel();
        }}
        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Fechar toast de alterações não salvas"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function showUnsavedChangesToast({ onSave, onDiscard, onCancel }: UnsavedChangesToastProps) {
  toast.dismiss(UNSAVED_CHANGES_TOAST_ID);
  return toast.custom(
    () => (
      <UnsavedChangesToastContent
        toastId={UNSAVED_CHANGES_TOAST_ID}
        onSave={onSave}
        onDiscard={onDiscard}
        onCancel={onCancel}
      />
    ),
    {
      duration: Infinity,
      position: "top-center",
      id: UNSAVED_CHANGES_TOAST_ID,
    },
  );
}

export { UNSAVED_CHANGES_TOAST_ID };

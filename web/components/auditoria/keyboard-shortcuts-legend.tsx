"use client";

import { Command, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type ShortcutRowProps = {
  keys: string[];
  description: string;
};

function ShortcutRow({ keys, description }: ShortcutRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-1">
        {keys.map((key, i) => (
          <span key={i}>
            <kbd className="pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-xs font-medium text-muted-foreground">
              {key}
            </kbd>
            {i < keys.length - 1 && <span className="mx-1 text-muted-foreground">+</span>}
          </span>
        ))}
      </div>
      <span className="text-sm text-muted-foreground">{description}</span>
    </div>
  );
}

export function KeyboardShortcutsLegend() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Keyboard className="h-4 w-4" />
          Atalhos
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b pb-2">
            <Command className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Atalhos de Teclado</h3>
          </div>

          <div className="space-y-3">
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">
                Navegação
              </h4>
              <div className="space-y-2">
                <ShortcutRow keys={["←"]} description="Cartão anterior" />
                <ShortcutRow keys={["→"]} description="Próximo cartão" />
              </div>
            </div>

            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">
                Resposta
              </h4>
              <div className="space-y-2">
                <ShortcutRow keys={["A", "B", "C", "D", "E"]} description="Marcar resposta (letra)" />
                <ShortcutRow keys={["1", "2", "3", "4", "5"]} description="Marcar resposta (número)" />
                <ShortcutRow keys={["0"]} description="Desmarcar questão" />
                <ShortcutRow keys={["Backspace"]} description="Desmarcar questão" />
              </div>
            </div>

            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">
                Ações
              </h4>
              <div className="space-y-2">
                <ShortcutRow keys={["Cmd", "S"]} description="Salvar decisão" />
                <ShortcutRow keys={["Esc"]} description="Cancelar navegação" />
              </div>
            </div>
          </div>

          <div className="border-t pt-2 text-xs text-muted-foreground">
            💡 Dica: Clique em uma questão para ativar atalhos de resposta
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

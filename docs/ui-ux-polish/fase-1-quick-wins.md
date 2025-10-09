# 🚀 Fase 1: Quick Wins

**Duração:** 1-2 dias (~14h)
**Impacto:** 30% melhoria imediata na UX
**Risco:** Baixo
**Status:** 🔴 Não iniciado (0/5)

---

## 🎯 Objetivo da Fase

Implementar melhorias rápidas de alto impacto que:
- Não requerem refatoração estrutural
- Podem ser testadas independentemente
- Melhoram imediatamente a experiência do usuário
- Validam direção antes do refactor grande (Fase 2)

**Resultado esperado:** UX 30% melhor com esforço mínimo.

---

## ✅ Tasks

### ☑️ Task 1: Image Viewer Altura Dinâmica
**Estimativa:** 30 minutos
**Prioridade:** 🔥 CRÍTICA
**Status:** 🔴 Não iniciado

#### Problema
Altura fixa de `h-[420px]` desperdiça espaço vertical, especialmente em telas grandes (1440p, 4K). Imagem fica minúscula, usuário precisa dar zoom manualmente toda vez.

#### Solução

**Arquivo:** `web/components/auditoria/audit-image-viewer.tsx`

**Mudança 1 - Linha 67:**
```tsx
// ANTES
<div className="relative flex flex-col overflow-hidden rounded-lg border h-[420px] bg-card">

// DEPOIS
<div className="relative flex flex-col overflow-hidden rounded-lg border h-full min-h-[420px] max-h-[calc(100vh-200px)] bg-card">
```

**Mudança 2 - TransformWrapper (L65-92):**
```tsx
// ANTES
<TransformComponent>

// DEPOIS
<TransformComponent wrapperClass="!h-full">
```

**Mudança 3 - Imagem (L81-87):**
```tsx
// ANTES
<img
  src={displayUrl}
  alt="Cartão OMR"
  className="max-w-full"
/>

// DEPOIS
<img
  src={displayUrl}
  alt="Cartão OMR"
  className="h-full w-full object-contain"
/>
```

**Mudança 4 - Parent container (`page.tsx` L402-410):**
```tsx
// ANTES
<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_480px]">
  <AuditImageViewer ... />
</div>

// DEPOIS
<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_480px] h-[calc(100vh-280px)]">
  <AuditImageViewer className="h-full" ... />
</div>
```

#### Critérios de Aceite
- [ ] Imagem cresce para preencher altura disponível
- [ ] Mantém altura mínima de 420px em telas pequenas
- [ ] Não quebra em mobile (<768px)
- [ ] Zoom continua funcionando corretamente

#### Como Testar
1. Abrir auditoria em desktop (1920x1080 ou maior)
2. Verificar que imagem ocupa ~70-80% da altura do viewport
3. Dar zoom in/out → deve funcionar normalmente
4. Redimensionar janela → imagem deve ajustar dinamicamente
5. Testar em mobile → imagem deve ter min 420px

---

### ☑️ Task 2: Issues Highlighting
**Estimativa:** 4 horas
**Prioridade:** 🔥 CRÍTICA
**Status:** 🔴 Não iniciado

#### Problema
Questões problemáticas não saltam aos olhos. Background `bg-amber-500/10` (opacity 10%) é imperceptível. Todas as cards parecem iguais, usuário precisa ler texto para identificar problemas.

#### Solução

**Arquivo:** `web/components/auditoria/question-grid.tsx`

**Mudança 1 - Adicionar helper function (após imports):**
```tsx
type IssueType = 'multi-marked' | 'unmarked' | 'invalid' | null;

function getIssueType(issue: string | undefined): IssueType {
  if (!issue) return null;
  if (issue.toLowerCase().includes('multi')) return 'multi-marked';
  if (issue.toLowerCase().includes('unmarked')) return 'unmarked';
  if (issue.toLowerCase().includes('invalid')) return 'invalid';
  return null;
}

function getIssueBadgeConfig(issueType: IssueType) {
  switch (issueType) {
    case 'multi-marked':
      return {
        variant: 'destructive' as const,
        icon: 'AlertCircle',
        label: 'Multi-marcado',
        color: 'text-red-700',
      };
    case 'unmarked':
      return {
        variant: 'warning' as const,
        icon: 'AlertTriangle',
        label: 'Não marcado',
        color: 'text-amber-700',
      };
    case 'invalid':
      return {
        variant: 'secondary' as const,
        icon: 'XCircle',
        label: 'Inválido',
        color: 'text-gray-700',
      };
    default:
      return null;
  }
}
```

**Mudança 2 - Imports (adicionar):**
```tsx
import { AlertCircle, AlertTriangle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
```

**Mudança 3 - Refatorar card styling (L138-216):**
```tsx
// ANTES (L138-149)
<article
  key={response.question}
  className={`
    flex flex-col gap-2 rounded-md border p-3
    ${isActive ? "border-ring shadow-sm" : "border-border/60"}
    ${isIssue ? "bg-amber-500/10" : "bg-muted/10"}
  `}
>

// DEPOIS
{pagedResponses.map((response) => {
  const { question, detected, expected_answer, issue } = response;
  const currentValue = currentAnswers[question] ?? "";
  const isIssue = issues.has(question);
  const isActive = activeQuestion === question;
  const issueType = getIssueType(issue);
  const badgeConfig = getIssueBadgeConfig(issueType);

  return (
    <article
      key={question}
      className={cn(
        "flex flex-col gap-2 rounded-md border p-3 transition-all",
        // Active state
        isActive && "ring-2 ring-primary shadow-lg scale-[1.02]",
        // Issue states with colored left border
        issueType === 'multi-marked' && "border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/20",
        issueType === 'unmarked' && "border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950/20",
        issueType === 'invalid' && "border-l-4 border-l-gray-500 bg-gray-50 dark:bg-gray-950/20",
        // Default state
        !issueType && "border-border/60 bg-muted/10"
      )}
      onClick={() => setActiveQuestion(question)}
    >
      {/* Header with question number and issue badge */}
      <div className="flex items-center justify-between">
        <span className={cn(
          "font-semibold text-foreground",
          issueType && badgeConfig?.color
        )}>
          {question}
        </span>
        {badgeConfig && (
          <Badge variant={badgeConfig.variant} className="gap-1">
            {badgeConfig.icon === 'AlertCircle' && <AlertCircle className="h-3 w-3" />}
            {badgeConfig.icon === 'AlertTriangle' && <AlertTriangle className="h-3 w-3" />}
            {badgeConfig.icon === 'XCircle' && <XCircle className="h-3 w-3" />}
            {badgeConfig.label}
          </Badge>
        )}
      </div>

      {/* Issue description (se existir) */}
      {issue && (
        <p className={cn(
          "text-xs rounded px-2 py-1",
          issueType === 'multi-marked' && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
          issueType === 'unmarked' && "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
          issueType === 'invalid' && "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200"
        )}>
          {issue}
        </p>
      )}

      {/* Resto do conteúdo (detected, expected, buttons) */}
      {/* ... código existente ... */}
    </article>
  );
})}
```

**Mudança 4 - Criar variant "warning" no Badge:**

**Arquivo:** `web/components/ui/badge.tsx`

```tsx
// Adicionar variant "warning"
const badgeVariants = cva(
  "...",
  {
    variants: {
      variant: {
        default: "...",
        secondary: "...",
        destructive: "...",
        outline: "...",
        // NOVO
        warning: "border-transparent bg-amber-500 text-white hover:bg-amber-500/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)
```

#### Critérios de Aceite
- [ ] Issues multi-marked têm border vermelho + badge vermelho
- [ ] Issues unmarked têm border amarelo + badge amarelo
- [ ] Issues invalid têm border cinza + badge cinza
- [ ] Cards sem issue mantêm aparência neutra
- [ ] Active card tem ring azul destacado
- [ ] Cores funcionam em dark mode

#### Como Testar
1. Processar lote com issues variadas
2. Verificar que cards com issues SE DESTACAM visualmente
3. Comparar com cards sem issues → diferença ÓBVIA
4. Testar em light/dark mode
5. Verificar acessibilidade: contraste mínimo WCAG AA

---

### ☑️ Task 3: Collapsible Upload/Summary/Export
**Estimativa:** 3 horas
**Prioridade:** 🔥 CRÍTICA
**Status:** 🔴 Não iniciado

#### Problema
Upload, Summary e Export sempre visíveis, ocupam ~280-320px de altura mesmo quando irrelevantes. Workspace principal empurrado para baixo da dobra.

#### Solução

**Arquivo:** `web/app/auditoria/page.tsx`

**Mudança 1 - Imports:**
```tsx
import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';
```

**Mudança 2 - Estado para controlar collapses (adicionar após L40):**
```tsx
const [uploadOpen, setUploadOpen] = useState(!batchId);
const [summaryOpen, setSummaryOpen] = useState(false);
const [exportOpen, setExportOpen] = useState(false);
```

**Mudança 3 - Refatorar seções (L351-385):**
```tsx
{/* ANTES: Sempre visível */}
<UploadForm onProcessed={handleProcessed} />

{/* DEPOIS: Collapsible */}
<Collapsible.Root open={uploadOpen} onOpenChange={setUploadOpen}>
  <div className="flex items-center justify-between mb-3">
    <h2 className="text-lg font-semibold">
      {batchId ? 'Novo Lote' : 'Upload de Cartões'}
    </h2>
    <Collapsible.Trigger asChild>
      <Button variant="ghost" size="sm" className="gap-2">
        {uploadOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {uploadOpen ? 'Ocultar' : 'Mostrar'}
      </Button>
    </Collapsible.Trigger>
  </div>
  <Collapsible.Content>
    <UploadForm onProcessed={handleProcessed} />
  </Collapsible.Content>
</Collapsible.Root>

{/* BatchSummary - só renderiza se batchId existe */}
{batchId && (
  <Collapsible.Root open={summaryOpen} onOpenChange={setSummaryOpen}>
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-lg font-semibold">Métricas do Lote</h2>
      <Collapsible.Trigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          {summaryOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {summaryOpen ? 'Ocultar' : 'Mostrar'}
        </Button>
      </Collapsible.Trigger>
    </div>
    <Collapsible.Content>
      <BatchSummary
        batchId={batchId}
        totalCount={totalCount}
        pendingCount={pendingCount}
        resolvedCount={resolvedCount}
        reopenedCount={reopenedCount}
        isLoadingList={listQuery.isLoading}
      />
    </Collapsible.Content>
  </Collapsible.Root>
)}

{/* ExportActions - só renderiza se batchId existe */}
{batchId && (
  <Collapsible.Root open={exportOpen} onOpenChange={setExportOpen}>
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-lg font-semibold">Exportar e Limpar</h2>
      <Collapsible.Trigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          {exportOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {exportOpen ? 'Ocultar' : 'Mostrar'}
        </Button>
      </Collapsible.Trigger>
    </div>
    <Collapsible.Content>
      <ExportActions
        batchId={batchId}
        disabled={!batchId || cleanupMutation.isPending}
        onCleanup={handleCleanup}
      />
    </Collapsible.Content>
  </Collapsible.Root>
)}
```

**Mudança 4 - Auto-collapse após processar (L58-60):**
```tsx
useEffect(() => {
  if (batchId) {
    setUploadOpen(false); // Colapsa upload após processar
  }
}, [batchId]);
```

#### Critérios de Aceite
- [ ] Upload inicia expandido quando não há batchId
- [ ] Upload colapsa automaticamente após processar
- [ ] Summary e Export iniciam colapsados
- [ ] Animação suave (não instantânea)
- [ ] Estado persiste durante navegação entre cards

#### Como Testar
1. Abrir página sem batch → Upload expandido
2. Processar ZIP → Upload colapsa, Summary/Export aparecem colapsados
3. Expandir Summary → verificar métricas
4. Expandir Export → verificar botões
5. Navegar entre cards → estados mantidos

---

### ☑️ Task 4: Keyboard Shortcuts Legend
**Estimativa:** 2 horas
**Prioridade:** 🟡 IMPORTANTE
**Status:** 🔴 Não iniciado

#### Problema
Atalhos de teclado funcionam (arrows L/R, A-E, 0/Backspace) mas sem dica visual. Usuário descobre por acaso, baixa adoção de feature de produtividade.

#### Solução

**Criar novo componente:**

**Arquivo:** `web/components/auditoria/keyboard-shortcuts-legend.tsx` (novo)

```tsx
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
```

**Integrar no header (page.tsx L320-348):**

```tsx
// Adicionar import
import { KeyboardShortcutsLegend } from "@/components/auditoria/keyboard-shortcuts-legend";

// Modificar header (L320)
<header className="flex items-center justify-between mb-6">
  <div>
    <h1 className="text-3xl font-bold tracking-tight">Auditoria de Cartões OMR</h1>
    <p className="text-muted-foreground mt-1">
      Revise e corrija cartões com problemas de leitura
    </p>
  </div>
  <div className="flex items-center gap-3">
    {/* NOVO: Keyboard shortcuts legend */}
    <KeyboardShortcutsLegend />

    {credentials.user && (
      <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5">
        <UserRound className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{credentials.user}</span>
      </div>
    )}
    <Button variant="ghost" size="sm" onClick={handleLogout}>
      <LogOut className="mr-2 h-4 w-4" />
      Sair
    </Button>
  </div>
</header>
```

#### Critérios de Aceite
- [ ] Botão "Atalhos" visível no header
- [ ] Popover abre ao clicar
- [ ] Lista completa de atalhos (navegação, resposta, ações)
- [ ] Atalhos formatados com tag `<kbd>`
- [ ] Responsivo (funciona em mobile/tablet)

#### Como Testar
1. Clicar botão "Atalhos" → Popover abre
2. Verificar lista completa (arrows, A-E, 1-5, 0/Backspace, Cmd+S)
3. Testar atalhos listados → todos funcionam
4. Fechar popover → clicando fora ou Esc
5. Testar em mobile → botão adaptado

---

### ☑️ Task 5: Cleanup Confirmation Robusta
**Estimativa:** 4 horas
**Prioridade:** 🔥 CRÍTICA
**Status:** 🔴 Não iniciado

#### Problema
Confirmação de cleanup usa `window.confirm` nativo, que é:
- Feio e não branded
- Fácil de ignorar (click rápido)
- Não mostra impacto (quantos cartões serão deletados)
- Ação irreversível sem proteção adequada

#### Solução

**Criar novo componente:**

**Arquivo:** `web/components/auditoria/cleanup-confirmation-dialog.tsx` (novo)

```tsx
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
```

**Integrar no page.tsx:**

**Mudança 1 - Import:**
```tsx
import { CleanupConfirmationDialog } from "@/components/auditoria/cleanup-confirmation-dialog";
```

**Mudança 2 - Estado (adicionar após L40):**
```tsx
const [showCleanupDialog, setShowCleanupDialog] = useState(false);
```

**Mudança 3 - Refatorar handleCleanup (L218-240):**
```tsx
// ANTES
const handleCleanup = async () => {
  if (!batchId) return;

  const confirmed = window.confirm(
    `Tem certeza que deseja limpar o lote ${batchId}?\n\nEsta ação é IRREVERSÍVEL e irá deletar:\n- Todos os ${totalCount} cartões\n- Imagens processadas\n- CSVs exportados`
  );

  if (!confirmed) return;

  // ... rest of cleanup logic
};

// DEPOIS
const handleCleanup = async () => {
  if (!batchId) return;
  setShowCleanupDialog(true); // Apenas abre dialog
};

const handleConfirmedCleanup = async () => {
  if (!batchId) return;

  try {
    await cleanupMutation.mutateAsync({
      batchId,
      confirm: true,
    });

    toast.success(`Lote ${batchId} limpo com sucesso`);
    setBatchId(null);
    setSelectedAuditId(null);
    setFilterStatus("pending");
  } catch (error) {
    console.error("Erro ao limpar lote:", error);
    toast.error("Erro ao limpar lote. Tente novamente.");
  }
};
```

**Mudança 4 - Adicionar dialog no JSX (antes do </main> final):**
```tsx
{/* Cleanup Confirmation Dialog */}
<CleanupConfirmationDialog
  open={showCleanupDialog}
  onOpenChange={setShowCleanupDialog}
  onConfirm={handleConfirmedCleanup}
  batchId={batchId}
  totalItems={totalCount}
/>
```

#### Critérios de Aceite
- [ ] Dialog customizado abre no lugar de window.confirm
- [ ] Mostra impacto: número de cartões, batch ID
- [ ] Checkbox obrigatório "Entendo que..."
- [ ] Countdown de 3s antes de permitir ação
- [ ] Botão "Deletar" vermelho e destacado
- [ ] ESC fecha dialog sem deletar

#### Como Testar
1. Clicar "Limpar lote" → Dialog abre (não window.confirm)
2. Verificar informações: batch ID, total items
3. Tentar confirmar SEM checkbox → botão disabled
4. Marcar checkbox → botão ainda disabled (countdown ativo)
5. Aguardar 3s → botão habilita
6. Confirmar → lote deletado
7. Pressionar ESC durante countdown → dialog fecha, nada deletado

---

## 📊 Validação da Fase

### Antes de Considerar Completa

- [ ] Todas as 5 tasks implementadas
- [ ] Testes manuais em 3 resoluções: mobile (375px), tablet (768px), desktop (1920px)
- [ ] Dark mode funcionando corretamente
- [ ] Performance não degradada (Lighthouse score mantido)
- [ ] Commit com mensagem: `feat(ui): implement Phase 1 quick wins`

### Checklist de QA

**Visual:**
- [ ] Image viewer cresce dinamicamente
- [ ] Issues destacadas com cores vibrantes
- [ ] Collapsibles animam suavemente
- [ ] Keyboard shortcuts popover bem formatado
- [ ] Cleanup dialog branded e claro

**Funcional:**
- [ ] Imagem ajusta ao redimensionar janela
- [ ] Borders coloridos aplicados corretamente
- [ ] Collapsibles mantêm estado durante navegação
- [ ] Atalhos de teclado funcionam conforme documentado
- [ ] Cleanup countdown respeita 3s

**Acessibilidade:**
- [ ] Contraste mínimo WCAG AA em todas issues badges
- [ ] Keyboard navigation funciona (Tab, Enter, Esc)
- [ ] Screen reader anuncia estados corretamente
- [ ] Focus visible em todos elementos interativos

---

## 🚀 Próximos Passos

Após completar Fase 1:

1. **Validar com usuários beta** (3-5 pessoas)
2. **Coletar feedback** (formulário ou entrevista)
3. **Ajustar baseado em feedback** (1-2 dias)
4. **Merge para main** com feature flag (se aplicável)
5. **Prosseguir para Fase 2** ([fase-2-layout-refactor.md](./fase-2-layout-refactor.md))

---

**Última atualização:** 2025-10-09
**Status:** 🔴 Aguardando implementação

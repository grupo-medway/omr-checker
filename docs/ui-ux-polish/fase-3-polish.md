# ✨ Fase 3: Polish & Optimization

**Duração:** 2-3 dias (~10h)
**Impacto:** Interface polida profissionalmente, produtividade maximizada
**Risco:** Baixo
**Status:** 🔴 Não iniciado (0/5)

---

## 🎯 Objetivo da Fase

Refinar experiência com melhorias incrementais que:
- Reduzem fricção no fluxo de trabalho
- Aumentam visibilidade de progresso
- Melhoram tomada de decisão (sorting, trends)
- Automatizam ações repetitivas

**Resultado esperado:** Interface polida, produtividade maximizada, UX classe A+.

---

## ⚠️ Pré-requisitos

**IMPORTANTE:** Completar **Fase 1** e **Fase 2** antes de iniciar Fase 3.

**Validações:**
- [ ] Fase 1 completa e validada
- [ ] Fase 2 completa e testada em 5 resoluções
- [ ] Feedback de usuários coletado
- [ ] Performance mantida (Lighthouse >85)

---

## ✅ Tasks

### ☑️ Task 10: Toast Non-Blocking para Unsaved Changes
**Estimativa:** 2 horas
**Prioridade:** 🟡 IMPORTANTE
**Status:** 🔴 Não iniciado

#### Problema

Modal de confirmação de unsaved changes bloqueia toda a tela, interrompendo severamente o fluxo. Usuário precisa parar, ler, decidir, clicar.

**Problemas:**
- Interrupção brusca (modal cobre tudo)
- Não permite navegar sem decisão imediata
- Frustrante para power users que navegam rápido

#### Solução

Substituir modal por **toast não-blocking** com action buttons inline. Permite navegar mantendo contexto visual.

#### Implementação

**Criar novo componente:**

**Arquivo:** `web/components/auditoria/unsaved-changes-toast.tsx` (novo)

```tsx
"use client";

import { AlertTriangle, Save, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";

type UnsavedChangesToastProps = {
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
};

export function showUnsavedChangesToast({
  onSave,
  onDiscard,
  onCancel,
}: UnsavedChangesToastProps) {
  return toast.custom(
    (t) => (
      <div className="flex items-start gap-3 bg-card border border-amber-200 dark:border-amber-800 rounded-lg p-4 shadow-xl max-w-md">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
        </div>

        {/* Content */}
        <div className="flex-1 space-y-2">
          <div>
            <p className="font-semibold text-foreground">
              Alterações não salvas
            </p>
            <p className="text-sm text-muted-foreground">
              O que deseja fazer com as alterações?
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              className="flex-1 gap-2"
              onClick={() => {
                toast.dismiss(t.id);
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
                toast.dismiss(t.id);
                onDiscard();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Descartar
            </Button>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={() => {
            toast.dismiss(t.id);
            onCancel();
          }}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    ),
    {
      duration: Infinity, // Não fecha automaticamente
      position: "top-center",
      id: "unsaved-changes", // ID único para evitar múltiplos toasts
    }
  );
}
```

**Integrar no page.tsx:**

**Arquivo:** `web/app/auditoria/page.tsx`

**Mudança 1 - Import:**
```tsx
import { showUnsavedChangesToast } from "@/components/auditoria/unsaved-changes-toast";
```

**Mudança 2 - Refatorar runOrQueueNavigation (L146-158):**

```tsx
// ANTES: Abre modal blocking
const runOrQueueNavigation = useCallback(
  (navFn: () => void) => {
    if (hasChanges) {
      setPendingNavigation(() => navFn);
      setShowUnsavedDialog(true); // Modal blocking
    } else {
      navFn();
    }
  },
  [hasChanges]
);

// DEPOIS: Toast non-blocking
const runOrQueueNavigation = useCallback(
  (navFn: () => void) => {
    if (hasChanges) {
      showUnsavedChangesToast({
        onSave: async () => {
          await handleSaveDecision();
          navFn();
        },
        onDiscard: () => {
          // Reseta answers para baseline
          setAnswers(baselineAnswers);
          setNotes(baselineNotes);
          navFn();
        },
        onCancel: () => {
          // Apenas fecha toast, não navega
        },
      });
    } else {
      navFn();
    }
  },
  [hasChanges, handleSaveDecision, baselineAnswers, baselineNotes]
);
```

**Mudança 3 - Remover dialog JSX (L513-551):**

```tsx
// DELETAR: Unsaved changes dialog
<UnsavedChangesDialog ... />
```

**Mudança 4 - Remover estado (L39-40):**

```tsx
// DELETAR
const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
```

#### Critérios de Aceite

- [ ] Toast aparece no topo da tela (não bloqueia)
- [ ] Usuário vê conteúdo por trás do toast
- [ ] 3 opções claras: Salvar, Descartar, Fechar (X)
- [ ] Salvar → salva e navega
- [ ] Descartar → reseta e navega
- [ ] Fechar (X) → apenas fecha, não navega
- [ ] Toast persiste até decisão (duration: Infinity)

#### Como Testar

1. Editar resposta, tentar navegar → Toast aparece
2. Clicar "Salvar" → decisão salva, navega para próximo
3. Editar novamente, clicar "Descartar" → mudanças perdidas, navega
4. Editar, clicar "X" → toast fecha, permanece no cartão atual
5. Verificar que não abre múltiplos toasts (ID único)

---

### ☑️ Task 11: Batch Summary com Trends
**Estimativa:** 3 horas
**Prioridade:** 🟡 IMPORTANTE
**Status:** 🔴 Não iniciado

#### Problema

Métricas mostram apenas números absolutos (12 pendentes, 8 resolvidos), sem contexto:
- Números estão aumentando ou diminuindo?
- Progresso está bom ou ruim?
- Quanto falta para terminar?

#### Solução

Adicionar **badges com delta** mostrando variação desde última atualização.

#### Implementação

**Arquivo:** `web/components/auditoria/batch-summary.tsx`

**Mudança 1 - Estado para tracking anterior:**

```tsx
import { useEffect, useRef } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export function BatchSummary({
  batchId,
  totalCount,
  pendingCount,
  resolvedCount,
  reopenedCount,
  isLoadingList,
}: BatchSummaryProps) {
  // Refs para valores anteriores
  const prevPending = useRef<number | null>(null);
  const prevResolved = useRef<number | null>(null);
  const prevReopened = useRef<number | null>(null);

  // Calcular deltas
  const pendingDelta = prevPending.current !== null ? pendingCount - prevPending.current : 0;
  const resolvedDelta = prevResolved.current !== null ? resolvedCount - prevResolved.current : 0;
  const reopenedDelta = prevReopened.current !== null ? reopenedCount - prevReopened.current : 0;

  // Atualizar refs após render
  useEffect(() => {
    if (!isLoadingList) {
      prevPending.current = pendingCount;
      prevResolved.current = resolvedCount;
      prevReopened.current = reopenedCount;
    }
  }, [pendingCount, resolvedCount, reopenedCount, isLoadingList]);

  // ... resto do component
}
```

**Mudança 2 - Criar TrendBadge component:**

```tsx
type TrendBadgeProps = {
  delta: number;
  variant: "success" | "warning" | "destructive";
};

function TrendBadge({ delta, variant }: TrendBadgeProps) {
  if (delta === 0) return null;

  const isPositive = delta > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <Badge
      variant={variant}
      className="ml-2 gap-1 text-xs px-1.5 py-0.5"
    >
      <Icon className="h-3 w-3" />
      {isPositive ? "+" : ""}
      {delta}
    </Badge>
  );
}
```

**Mudança 3 - Adicionar trends nas métricas (L44-68):**

```tsx
{/* Pendentes - trend vermelho se aumentou, verde se diminuiu */}
<div className="flex flex-col gap-1">
  <span className="text-sm text-muted-foreground">Pendentes</span>
  <div className="flex items-baseline gap-2">
    <span className="text-2xl font-semibold text-foreground">
      {pendingCount}
    </span>
    <TrendBadge
      delta={pendingDelta}
      variant={pendingDelta > 0 ? "destructive" : "success"}
    />
  </div>
</div>

{/* Resolvidos - trend verde se aumentou */}
<div className="flex flex-col gap-1">
  <span className="text-sm text-muted-foreground">Resolvidos</span>
  <div className="flex items-baseline gap-2">
    <span className="text-2xl font-semibold text-green-600 dark:text-green-500">
      {resolvedCount}
    </span>
    <TrendBadge
      delta={resolvedDelta}
      variant={resolvedDelta > 0 ? "success" : "secondary"}
    />
  </div>
</div>

{/* Reabertos - trend vermelho se aumentou */}
<div className="flex flex-col gap-1">
  <span className="text-sm text-muted-foreground">Reabertos</span>
  <div className="flex items-baseline gap-2">
    <span className="text-2xl font-semibold text-amber-600 dark:text-amber-500">
      {reopenedCount}
    </span>
    <TrendBadge
      delta={reopenedDelta}
      variant={reopenedDelta > 0 ? "warning" : "secondary"}
    />
  </div>
</div>
```

**Mudança 4 - Adicionar progress percentage:**

```tsx
{/* Adicionar após grid de métricas */}
<div className="mt-4 pt-4 border-t">
  <div className="flex items-center justify-between mb-2">
    <span className="text-sm font-medium">Progresso</span>
    <span className="text-sm text-muted-foreground">
      {Math.round((resolvedCount / totalCount) * 100)}%
    </span>
  </div>
  <div className="h-2 bg-muted rounded-full overflow-hidden">
    <div
      className="h-full bg-green-500 transition-all duration-500"
      style={{ width: `${(resolvedCount / totalCount) * 100}%` }}
    />
  </div>
</div>
```

#### Critérios de Aceite

- [ ] Badges aparecem ao lado dos números
- [ ] Pendentes: +X vermelho, -X verde
- [ ] Resolvidos: +X verde
- [ ] Reabertos: +X amarelo
- [ ] Progress bar atualiza suavemente (transition 500ms)
- [ ] Percentual exibido ao lado da barra

#### Como Testar

1. Processar lote → métricas iniciais sem badges
2. Resolver 1 cartão → badge "+1" verde em Resolvidos, "-1" verde em Pendentes
3. Reabrir cartão → badge "+1" amarelo em Reabertos
4. Progress bar avança visualmente
5. Percentual atualiza (ex: 10/50 = 20%)

---

### ☑️ Task 12: Smart Sorting da Audit List
**Estimativa:** 2 horas
**Prioridade:** 🟡 IMPORTANTE
**Status:** 🔴 Não iniciado

#### Problema

Lista de cartões ordenada apenas por created_at. Cartões com issues graves (multi-marked) aparecem misturados com issues leves (unmarked).

Usuário precisa scrollar lista inteira para encontrar issues críticas.

#### Solução

**Auto-sort por prioridade:**
1. Multi-marked (crítico) → topo
2. Unmarked (warning) → meio
3. Outros issues → baixo
4. Sem issues → final

#### Implementação

**Arquivo:** `web/components/auditoria/audit-list.tsx`

**Mudança 1 - Criar função de sorting:**

```tsx
type IssueSeverity = "critical" | "warning" | "info" | "none";

function getIssueSeverity(issues: string[]): IssueSeverity {
  if (issues.length === 0) return "none";

  const hasMultiMarked = issues.some((i) => i.toLowerCase().includes("multi"));
  const hasUnmarked = issues.some((i) => i.toLowerCase().includes("unmarked"));
  const hasInvalid = issues.some((i) => i.toLowerCase().includes("invalid"));

  if (hasMultiMarked) return "critical";
  if (hasUnmarked) return "warning";
  if (hasInvalid) return "info";
  return "none";
}

function sortByPriority(items: AuditListItem[]): AuditListItem[] {
  return [...items].sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2, none: 3 };

    const aSeverity = getIssueSeverity(a.issues);
    const bSeverity = getIssueSeverity(b.issues);

    // 1. Por severidade
    if (severityOrder[aSeverity] !== severityOrder[bSeverity]) {
      return severityOrder[aSeverity] - severityOrder[bSeverity];
    }

    // 2. Por status (pending primeiro)
    const statusOrder = { pending: 0, reopened: 1, resolved: 2 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }

    // 3. Por data (mais antigo primeiro)
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}
```

**Mudança 2 - Adicionar toggle de sorting:**

```tsx
import { ArrowUpDown } from "lucide-react";

export function AuditList({ items, ... }: AuditListProps) {
  const [sortBy, setSortBy] = useState<"priority" | "date">("priority");

  const sortedItems = useMemo(() => {
    if (sortBy === "priority") {
      return sortByPriority(items);
    }
    // Date: manter ordem original (API já ordena por created_at)
    return items;
  }, [items, sortBy]);

  // ... resto do component
}
```

**Mudança 3 - Adicionar toggle na UI:**

```tsx
{/* Adicionar após search input, antes do select de status */}
<div className="flex items-center gap-2 mb-3">
  <Button
    variant="ghost"
    size="sm"
    className="gap-2"
    onClick={() => setSortBy(sortBy === "priority" ? "date" : "priority")}
  >
    <ArrowUpDown className="h-4 w-4" />
    {sortBy === "priority" ? "Por prioridade" : "Por data"}
  </Button>
</div>
```

**Mudança 4 - Visual indicator de severity nos cards:**

```tsx
{sortedItems.map((item) => {
  const severity = getIssueSeverity(item.issues);

  return (
    <button
      key={item.id}
      className={cn(
        "flex flex-col gap-2 rounded-md border p-3 text-left transition-colors",
        isSelected && "border-ring bg-accent",
        !isSelected && "hover:bg-accent/50",
        // Visual indicator de severity
        severity === "critical" && "border-l-4 border-l-red-500",
        severity === "warning" && "border-l-4 border-l-amber-500",
        severity === "info" && "border-l-4 border-l-blue-500"
      )}
    >
      {/* ... content */}
    </button>
  );
})}
```

#### Critérios de Aceite

- [ ] Lista inicia ordenada por prioridade
- [ ] Multi-marked no topo (border vermelho)
- [ ] Unmarked no meio (border amarelo)
- [ ] Cartões OK no final
- [ ] Toggle "Por prioridade/Por data" funciona
- [ ] Estado persiste durante sessão

#### Como Testar

1. Processar lote com issues variadas
2. Verificar ordem: Multi-marked → Unmarked → Outros → OK
3. Clicar toggle → ordem muda para cronológica
4. Clicar novamente → volta para prioridade
5. Navegar entre cartões → ordem mantida

---

### ☑️ Task 13: Progress Indicator no Toolbar
**Estimativa:** 2 horas
**Prioridade:** 🟡 IMPORTANTE
**Status:** 🔴 Não iniciado

#### Problema

Usuário não sabe quanto progresso fez:
- Quantos cartões faltam?
- Estou perto de terminar?
- Vale a pena continuar agora ou pausar?

#### Solução

Adicionar **progress bar** e **contador** no DecisionToolbar.

#### Implementação

**Arquivo:** `web/components/auditoria/decision-toolbar.tsx`

**Mudança 1 - Adicionar props:**

```tsx
type DecisionToolbarProps = {
  // ... props existentes
  currentIndex?: number;
  totalCount?: number;
  resolvedCount?: number;
};

export function DecisionToolbar({
  onPrevious,
  onNext,
  onSave,
  hasPrevious,
  hasNext,
  hasChanges,
  disabled,
  isSaving,
  notes,
  onNotesChange,
  currentIndex = 0,
  totalCount = 0,
  resolvedCount = 0,
}: DecisionToolbarProps) {
  const progressPercentage = totalCount > 0 ? (resolvedCount / totalCount) * 100 : 0;

  // ... resto do component
}
```

**Mudança 2 - Adicionar progress section:**

```tsx
{/* Adicionar ANTES dos botões de navegação */}
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
```

**Mudança 3 - Passar props no page.tsx:**

```tsx
<DecisionToolbar
  onPrevious={handlePrevious}
  onNext={handleNext}
  onSave={handleSaveDecision}
  hasPrevious={hasPrevious}
  hasNext={hasNext}
  hasChanges={hasChanges}
  disabled={!selectedAuditId}
  isSaving={submitMutation.isPending}
  notes={notes}
  onNotesChange={setNotes}
  // NOVO
  currentIndex={currentIndex}
  totalCount={totalCount}
  resolvedCount={resolvedCount}
/>
```

#### Critérios de Aceite

- [ ] Progress bar atualiza ao resolver cartão
- [ ] Cor muda: vermelho (<30%), amarelo (30-70%), verde (>70%)
- [ ] Contador "X de Y" atualizado
- [ ] Mensagem "🎉 Todos resolvidos!" quando 100%
- [ ] Animação suave (transition 500ms)

#### Como Testar

1. Auditoria com 10 cartões, 3 resolvidos → 30%, amarelo
2. Resolver mais 4 → 70%, verde
3. Resolver todos → 100%, mensagem "🎉 Todos resolvidos!"
4. Progress bar deve animar suavemente (não pular)

---

### ☑️ Task 14: Auto-Scroll para Primeira Issue
**Estimativa:** 1 hora
**Prioridade:** 🟡 IMPORTANTE
**Status:** 🔴 Não iniciado

#### Problema

Ao abrir cartão, usuário precisa scrollar manualmente para encontrar primeira questão com issue. Perde tempo procurando.

#### Solução

**Auto-scroll** para primeira issue ao carregar cartão (já parcialmente implementado na Task 7, mas precisa refinamento).

#### Implementação

**Arquivo:** `web/components/auditoria/question-grid.tsx`

**Refinamento do useEffect existente (Task 7):**

```tsx
// Auto-scroll para primeira issue com delay
useEffect(() => {
  if (sortedResponses.length === 0 || showIssuesOnly) return;

  const firstIssueIndex = sortedResponses.findIndex((r) =>
    issues.has(r.question)
  );

  if (firstIssueIndex !== -1) {
    // Aguardar 300ms para garantir que DOM e virtual scroll estão prontos
    const timer = setTimeout(() => {
      virtualizer.scrollToIndex(firstIssueIndex, {
        align: "start", // Posiciona no topo da viewport
        behavior: "smooth",
      });

      // Flash visual na primeira issue
      const element = document.querySelector(`[data-question="${sortedResponses[firstIssueIndex].question}"]`);
      if (element) {
        element.classList.add("ring-2", "ring-amber-500", "ring-offset-2");
        setTimeout(() => {
          element.classList.remove("ring-2", "ring-amber-500", "ring-offset-2");
        }, 2000);
      }
    }, 300);

    return () => clearTimeout(timer);
  }
}, [sortedResponses, issues, showIssuesOnly, virtualizer]);
```

**Adicionar visual feedback:**

```tsx
// Adicionar classe de animação no Tailwind config ou CSS
@keyframes pulse-highlight {
  0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); }
  50% { box-shadow: 0 0 0 10px rgba(245, 158, 11, 0); }
}

.highlight-issue {
  animation: pulse-highlight 2s ease-out;
}
```

#### Critérios de Aceite

- [ ] Ao abrir cartão, scrolla automaticamente para primeira issue
- [ ] Animação suave (smooth scroll)
- [ ] Flash visual na issue (ring amarelo por 2s)
- [ ] Não acontece se "Show issues only" está ativo (todas já visíveis)
- [ ] Funciona com virtual scroll

#### Como Testar

1. Abrir cartão com issues nas posições 5, 20, 85
2. Verificar que scrolla automaticamente para Q5
3. Ring amarelo pisca por 2s
4. Toggle "Show issues only" → auto-scroll não acontece (desnecessário)

---

## 📊 Validação da Fase

### Antes de Considerar Completa

- [ ] Todas as 5 tasks implementadas
- [ ] Toast funciona em 100% dos casos (não quebra)
- [ ] Trends mostram deltas corretamente
- [ ] Sorting por prioridade óbvio visualmente
- [ ] Progress bar anima suavemente
- [ ] Auto-scroll funciona em todas resoluções

### Checklist de QA

**Toast Non-Blocking:**
- [ ] Aparece no topo (não bloqueia)
- [ ] 3 ações claras: Salvar, Descartar, Fechar
- [ ] Salvar → salva e navega
- [ ] Não abre múltiplos toasts

**Batch Summary Trends:**
- [ ] Badges com +/- aparecem
- [ ] Cores corretas (verde/vermelho/amarelo)
- [ ] Progress bar atualiza
- [ ] Percentual correto

**Smart Sorting:**
- [ ] Multi-marked no topo
- [ ] Toggle funciona
- [ ] Borders coloridos visíveis

**Progress Indicator:**
- [ ] Cores mudam (vermelho → amarelo → verde)
- [ ] Mensagem "🎉" quando 100%
- [ ] Animação suave

**Auto-Scroll:**
- [ ] Scrolla para primeira issue
- [ ] Flash visual funciona
- [ ] Não quebra em mobile

---

## 🚀 Próximos Passos

Após completar Fase 3:

1. **User testing final** (10-15 usuários)
2. **Coletar NPS** (Net Promoter Score)
3. **Medir métricas:**
   - Tempo médio/cartão (meta: <2min)
   - Taxa de conclusão (meta: >90%)
   - Taxa de erros (meta: <5%)
4. **Decidir:** Fase 4 (advanced) ou deploy?
5. **Deploy para produção** (se métricas OK)

---

**Última atualização:** 2025-10-09
**Status:** 🔴 Aguardando implementação

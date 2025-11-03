# 🏗️ Fase 2: Layout Refactor

**Duração:** 3-5 dias
**Impacto:** Transformação estrutural - experiência desktop classe A
**Risco:** Médio (requer refatoração significativa)
**Status:** ✅ Completo (4/4)
**Commits:**
- `d03127e` feat(ui): implement Phase 2 layout refactor
- `ef5d4f4` refactor(ui): improve desktop UX with consultant feedback
- `c2d8976` feat(ui): add navigation between issues with keyboard shortcuts
- `496764f` fix(ui): improve keyboard navigation in question grid

---

## 🎯 Objetivo da Fase

Refatorar estrutura de layout para:
- Eliminar scroll hell (4 áreas de scroll conflitantes)
- Maximizar uso da viewport (95% vs 60% atual)
- Ver imagem + questões simultaneamente
- Garantir responsividade mobile/tablet/desktop

**Resultado esperado:** Interface desktop classe A, mobile usável, produtividade 2-3x melhor.

---

## ⚠️ Pré-requisitos

**IMPORTANTE:** ✅ Fase 1 completa antes de iniciar Fase 2.

**Validações:**
- [x] Fase 1 completa e testada ✅
- [x] Feedback de usuários coletado ✅
- [x] Branch `feat/support-somos-simulado` criada ✅
- [x] Backup de componentes originais ✅

---

## ✅ Tasks

### ✅ Task 6: 3-Column Layout Desktop
**Estimativa:** 2 dias
**Prioridade:** 🔥 CRÍTICA
**Status:** ✅ Completo

#### Problema

Layout atual em 2 colunas (sidebar + main), com imagem e questões competindo por espaço horizontal dentro da coluna principal. Força scroll vertical em ambas áreas.

**Estrutura Atual:**
```
┌─────────────────────────────────────┐
│ Header                              │
├────────┬────────────────────────────┤
│ List   │ Image                      │
│ (320px)│ Questions (abaixo)         │
│        │                            │
│ scroll │ scroll múltiplo            │
└────────┴────────────────────────────┘
```

#### Solução

Layout em 3 colunas fixas em desktop (≥1024px):

**Nova Estrutura:**
```
┌────────────────────────────────────────────────────┐
│ Header                                             │
├──────┬────────────────────────────┬────────────────┤
│ List │ Image                      │ Questions      │
│ 280px│ flex-1                     │ 420px          │
│      │ (cresce)                   │                │
│scroll│ no scroll (altura cheia)   │ virtual scroll │
└──────┴────────────────────────────┴────────────────┘
```

**Benefícios:**
- Imagem visível em tamanho real
- Todas questões acessíveis com 1 scroll
- Navegação lista sem sair do contexto

#### Implementação

**Arquivo:** `web/app/auditoria/page.tsx`

**Mudança 1 - Refatorar main grid (L387-470):**

```tsx
// ANTES (2 colunas)
<main className="grid flex-1 gap-6 pb-10 lg:grid-cols-[320px_minmax(0,1fr)]">
  <aside>
    <AuditList ... />
  </aside>
  <section>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_480px]">
      <AuditImageViewer ... />
      <div>
        <QuestionGrid ... />
        <DecisionToolbar ... />
      </div>
    </div>
  </section>
</main>

// DEPOIS (3 colunas)
<main className="grid flex-1 gap-6 pb-10 h-[calc(100vh-180px)] lg:grid-cols-[280px_1fr_420px]">
  {/* Coluna 1: Lista de cartões (scroll independente) */}
  <aside className="flex flex-col overflow-hidden border rounded-lg">
    <AuditList
      items={items}
      selectedId={selectedAuditId}
      onSelect={handleSelectAudit}
      filterStatus={filterStatus}
      onFilterChange={setFilterStatus}
    />
  </aside>

  {/* Coluna 2: Imagem (altura total, sem scroll) */}
  <section className="flex flex-col gap-4 overflow-hidden">
    <AuditImageViewer
      imageUrl={detailQuery.data?.image_url}
      markedImageUrl={detailQuery.data?.marked_image_url}
      className="flex-1"
    />
    {/* Toolbar sticky no bottom da coluna */}
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
    />
  </section>

  {/* Coluna 3: Questões (virtual scroll) */}
  <aside className="flex flex-col overflow-hidden border rounded-lg">
    {/* Header com summary */}
    <div className="flex items-center justify-between p-4 border-b bg-muted/30">
      <div className="text-sm">
        <span className="font-semibold">
          Cartão {currentIndex + 1} de {totalCount}
        </span>
        {issuesSet.size > 0 && (
          <span className="ml-2 text-destructive">
            • {issuesSet.size} {issuesSet.size === 1 ? 'issue' : 'issues'}
          </span>
        )}
      </div>
      {/* Toggle "Show issues only" */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowIssuesOnly(!showIssuesOnly)}
      >
        {showIssuesOnly ? "Mostrar todas" : "Apenas issues"}
      </Button>
    </div>

    {/* Grid de questões (scroll independente) */}
    <QuestionGrid
      responses={detailQuery.data?.responses ?? []}
      currentAnswers={answers}
      onChange={handleAnswerChange}
      issues={issuesSet}
      isSaving={submitMutation.isPending}
      showIssuesOnly={showIssuesOnly}
    />
  </aside>
</main>
```

**Mudança 2 - Mobile fallback (tabs):**

```tsx
{/* Mobile: Tabs para alternar entre Image/Questions */}
<div className="lg:hidden">
  <Tabs defaultValue="image" value={mobileTab} onValueChange={setMobileTab}>
    <TabsList className="grid w-full grid-cols-2">
      <TabsTrigger value="image">
        Imagem
      </TabsTrigger>
      <TabsTrigger value="questions">
        Questões
        {issuesSet.size > 0 && (
          <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1">
            {issuesSet.size}
          </Badge>
        )}
      </TabsTrigger>
    </TabsList>

    <TabsContent value="image" className="mt-4 h-[calc(100vh-320px)]">
      <AuditImageViewer
        imageUrl={detailQuery.data?.image_url}
        markedImageUrl={detailQuery.data?.marked_image_url}
        className="h-full"
      />
    </TabsContent>

    <TabsContent value="questions" className="mt-4 h-[calc(100vh-320px)]">
      <QuestionGrid
        responses={detailQuery.data?.responses ?? []}
        currentAnswers={answers}
        onChange={handleAnswerChange}
        issues={issuesSet}
        isSaving={submitMutation.isPending}
        showIssuesOnly={showIssuesOnly}
      />
    </TabsContent>
  </Tabs>

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
  />
</div>

{/* Desktop: 3 colunas (código acima) */}
<div className="hidden lg:grid ...">
  {/* ... 3-column layout ... */}
</div>
```

**Mudança 3 - Estado para mobile tab (adicionar após L40):**

```tsx
const [mobileTab, setMobileTab] = useState<"image" | "questions">("image");
const [showIssuesOnly, setShowIssuesOnly] = useState(false);
```

**Mudança 4 - Auto-switch para "questions" tab ao detectar issues:**

```tsx
useEffect(() => {
  // Em mobile, se há issues, auto-switch para tab questions
  if (issuesSet.size > 0 && mobileTab === "image") {
    setMobileTab("questions");
  }
}, [issuesSet.size, mobileTab]);
```

#### Critérios de Aceite

- [x] Desktop (≥1024px): 3 colunas visíveis simultaneamente ✅
- [x] Mobile (<1024px): Tabs para alternar Image/Questions ✅
- [x] Imagem ocupa altura total da coluna central ✅
- [x] Questões com virtual scroll (Task 7) ✅
- [x] Lista mantém scroll independente ✅
- [x] Toolbar sticky no bottom (mobile e desktop) ✅

#### Como Testar

1. Desktop 1920x1080:
   - Verificar 3 colunas lado a lado
   - Lista 280px, Imagem flex, Questões 420px
   - Scroll apenas em Lista e Questões (não em Imagem)

2. Tablet 768px:
   - Verificar tabs Image/Questions
   - Badge com count de issues
   - Auto-switch para Questions se issues

3. Mobile 375px:
   - Tabs funcionando
   - Imagem em tamanho adequado
   - Questões rolam suavemente

---

### ✅ Task 7: Virtual Scroll com @tanstack/react-virtual
**Estimativa:** 1 dia
**Prioridade:** 🔥 CRÍTICA
**Status:** ✅ Completo

#### Problema

Paginação forçada (PAGE_SIZE=60) quebra contexto visual. Usuário não vê overview completo da prova, precisa paginar múltiplas vezes.

**Exemplo:**
- Prova com 100 questões
- Usuário vê apenas 60 por página
- Issues na Q5 e Q85 → precisa navegar para encontrar

#### Solução

Virtual scrolling: renderiza apenas questões visíveis no viewport (~20-30), mas permite scroll suave por todas.

#### Implementação

**Passo 1 - Instalar dependência:**

```bash
npm install @tanstack/react-virtual
```

**Passo 2 - Refatorar QuestionGrid:**

**Arquivo:** `web/components/auditoria/question-grid.tsx`

```tsx
"use client";

import { useRef, useEffect, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AlertCircle, AlertTriangle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { AuditResponseModel } from "@/lib/api/types";
import { normalizeAnswer } from "@/lib/utils/normalize";

const ANSWER_OPTIONS = ["A", "B", "C", "D", "E", "UNMARKED"] as const;

type QuestionGridProps = {
  responses: AuditResponseModel[];
  currentAnswers: Record<string, string>;
  onChange: (question: string, value: string) => void;
  issues: Set<string>;
  isSaving?: boolean;
  showIssuesOnly?: boolean;
};

type IssueType = "multi-marked" | "unmarked" | "invalid" | null;

function getIssueType(issue: string | undefined): IssueType {
  if (!issue) return null;
  if (issue.toLowerCase().includes("multi")) return "multi-marked";
  if (issue.toLowerCase().includes("unmarked")) return "unmarked";
  if (issue.toLowerCase().includes("invalid")) return "invalid";
  return null;
}

export function QuestionGrid({
  responses,
  currentAnswers,
  onChange,
  issues,
  isSaving,
  showIssuesOnly = false,
}: QuestionGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Filtrar e ordenar responses
  const sortedResponses = useMemo(() => {
    let filtered = responses;

    // Filtrar apenas issues se toggle ativo
    if (showIssuesOnly) {
      filtered = responses.filter((r) => issues.has(r.question));
    }

    // Ordenar: issues primeiro, depois por número
    return [...filtered].sort((a, b) => {
      const aHasIssue = issues.has(a.question);
      const bHasIssue = issues.has(b.question);

      if (aHasIssue && !bHasIssue) return -1;
      if (!aHasIssue && bHasIssue) return 1;

      // Extrair número da questão (assume "Q1", "Q2", etc)
      const aNum = parseInt(a.question.replace(/\D/g, ""), 10);
      const bNum = parseInt(b.question.replace(/\D/g, ""), 10);
      return aNum - bNum;
    });
  }, [responses, issues, showIssuesOnly]);

  // Virtual scrolling
  const virtualizer = useVirtualizer({
    count: sortedResponses.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140, // Altura estimada de cada card (px)
    overscan: 5, // Renderizar 5 items extras fora do viewport
  });

  // Auto-scroll para primeira issue ao carregar
  useEffect(() => {
    if (sortedResponses.length > 0 && !showIssuesOnly) {
      const firstIssueIndex = sortedResponses.findIndex((r) =>
        issues.has(r.question)
      );

      if (firstIssueIndex !== -1) {
        // Aguardar próximo frame para garantir que DOM está pronto
        requestAnimationFrame(() => {
          virtualizer.scrollToIndex(firstIssueIndex, {
            align: "center",
            behavior: "smooth",
          });
        });
      }
    }
  }, [sortedResponses, issues, showIssuesOnly, virtualizer]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isSaving) return;

      const target = e.target as HTMLElement;
      const activeQuestion = target.closest("[data-question]")?.getAttribute("data-question");

      if (!activeQuestion) return;

      // A-E ou 1-5 para marcar resposta
      if (/^[A-E]$/i.test(e.key)) {
        e.preventDefault();
        onChange(activeQuestion, e.key.toUpperCase());
      } else if (/^[1-5]$/.test(e.key)) {
        e.preventDefault();
        const answerMap: Record<string, string> = { "1": "A", "2": "B", "3": "C", "4": "D", "5": "E" };
        onChange(activeQuestion, answerMap[e.key]);
      } else if (e.key === "0" || e.key === "Backspace") {
        e.preventDefault();
        onChange(activeQuestion, "");
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [onChange, isSaving]);

  if (sortedResponses.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div className="space-y-2">
          <p className="text-muted-foreground">
            {showIssuesOnly ? "Nenhuma issue encontrada" : "Nenhuma questão disponível"}
          </p>
          {showIssuesOnly && (
            <p className="text-xs text-muted-foreground">
              Todos os cartões estão corretos! 🎉
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={parentRef} className="h-full overflow-y-auto p-4">
      {/* Container virtual com altura total */}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {/* Renderizar apenas items visíveis */}
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const response = sortedResponses[virtualRow.index];
          const { question, detected, expected_answer, issue } = response;
          const currentValue = currentAnswers[question] ?? "";
          const isIssue = issues.has(question);
          const issueType = getIssueType(issue);

          return (
            <article
              key={virtualRow.key}
              data-index={virtualRow.index}
              data-question={question}
              ref={virtualizer.measureElement}
              className={cn(
                "absolute top-0 left-0 w-full",
                "flex flex-col gap-3 rounded-md border p-3 mb-3 transition-all cursor-pointer",
                "hover:shadow-md focus-within:ring-2 focus-within:ring-primary",
                // Issue highlighting
                issueType === "multi-marked" &&
                  "border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/20",
                issueType === "unmarked" &&
                  "border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950/20",
                issueType === "invalid" &&
                  "border-l-4 border-l-gray-500 bg-gray-50 dark:bg-gray-950/20",
                !issueType && "border-border/60 bg-muted/10"
              )}
              style={{
                transform: `translateY(${virtualRow.start}px)`,
              }}
              tabIndex={0}
            >
              {/* Header com número e badge */}
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "font-semibold text-lg",
                    issueType && "text-foreground"
                  )}
                >
                  {question}
                </span>
                {issueType && (
                  <Badge
                    variant={
                      issueType === "multi-marked"
                        ? "destructive"
                        : issueType === "unmarked"
                        ? "warning"
                        : "secondary"
                    }
                    className="gap-1"
                  >
                    {issueType === "multi-marked" && <AlertCircle className="h-3 w-3" />}
                    {issueType === "unmarked" && <AlertTriangle className="h-3 w-3" />}
                    {issueType === "invalid" && <XCircle className="h-3 w-3" />}
                    {issueType === "multi-marked" && "Multi-marcado"}
                    {issueType === "unmarked" && "Não marcado"}
                    {issueType === "invalid" && "Inválido"}
                  </Badge>
                )}
              </div>

              {/* Issue description */}
              {issue && (
                <p
                  className={cn(
                    "text-xs rounded px-2 py-1",
                    issueType === "multi-marked" &&
                      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
                    issueType === "unmarked" &&
                      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
                    issueType === "invalid" &&
                      "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200"
                  )}
                >
                  {issue}
                </p>
              )}

              {/* Detected / Expected */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Detectado:</span>{" "}
                  <span className="font-medium">
                    {normalizeAnswer(detected || "")}
                  </span>
                </div>
                {expected_answer && (
                  <div>
                    <span className="text-muted-foreground">Esperado:</span>{" "}
                    <span className="font-medium">
                      {normalizeAnswer(expected_answer)}
                    </span>
                  </div>
                )}
              </div>

              {/* Answer buttons */}
              <div className="flex flex-wrap gap-2">
                {ANSWER_OPTIONS.map((option) => {
                  const isSelected = normalizeAnswer(currentValue) === option;
                  return (
                    <Button
                      key={option}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "min-w-[44px] px-3 py-2",
                        isSelected && "ring-2 ring-primary ring-offset-2"
                      )}
                      onClick={() => onChange(question, option === "UNMARKED" ? "" : option)}
                      disabled={isSaving}
                    >
                      {option === "UNMARKED" ? "Vazio" : option}
                    </Button>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
```

#### Critérios de Aceite

- [x] Renderiza apenas ~20-30 cards visíveis ✅
- [x] Scroll suave por todas questões (50, 100, 200+) ✅
- [x] Auto-scroll para primeira issue ao carregar ✅
- [x] Performance mantida (60fps) ✅
- [x] Keyboard shortcuts funcionam ✅
- [x] "Show issues only" filtra dinamicamente ✅

#### Como Testar

1. Processar lote com 100+ questões
2. Inspecionar DOM → apenas ~30 cards renderizados
3. Scrollar rápido → cards aparecem/desaparecem suavemente
4. Auto-scroll para primeira issue ao abrir cartão
5. Toggle "Apenas issues" → filtra instantaneamente
6. FPS meter (DevTools) → manter >50fps durante scroll

---

### ✅ Task 8: Remover Scrolls Conflitantes
**Estimativa:** 1 dia
**Prioridade:** 🟡 IMPORTANTE
**Status:** ✅ Completo

#### Problema

Interface atual tem **4 áreas de scroll simultâneas**:
1. Página inteira (body)
2. Sidebar lista
3. Imagem (quando zoom ativo)
4. Questões grid

Usuário fica confuso sobre qual área scrollar, wheel capturado pelo elemento errado.

#### Solução

**Single scroll strategy:**
- Página sem scroll (height: 100vh fixo)
- Apenas 2 scrolls internos: Lista (esquerda) + Questões (direita)
- Imagem sem scroll (zoom usa pan, não scroll)

#### Implementação

**Arquivo:** `web/app/auditoria/page.tsx`

**Mudança 1 - Body e root layout:**

```tsx
// No layout.tsx ou global.css
body {
  overflow: hidden; /* Remove scroll da página */
  height: 100vh;
}
```

**Mudança 2 - Main container com altura fixa:**

```tsx
// page.tsx - main (L387)
<main className="grid gap-6 h-[calc(100vh-180px)] lg:grid-cols-[280px_1fr_420px] overflow-hidden">
  {/* Altura fixa baseada em viewport */}
</main>
```

**Mudança 3 - Audit List scroll independente:**

**Arquivo:** `web/components/auditoria/audit-list.tsx` (L80)

```tsx
// ANTES
<div className="flex-1 overflow-y-auto">

// DEPOIS
<div className="flex-1 overflow-y-auto overscroll-contain">
  {/* overscroll-contain previne scroll bubbling */}
</div>
```

**Mudança 4 - Image Viewer pan (não scroll):**

**Arquivo:** `web/components/auditoria/audit-image-viewer.tsx`

TransformWrapper já usa pan por padrão, mas garantir:

```tsx
<TransformWrapper
  minScale={0.5}
  maxScale={3}
  initialScale={0.9}
  wheel={{ step: 0.1 }}
  panning={{ disabled: false }} // Pan habilitado
  doubleClick={{ disabled: false }}
>
  <TransformComponent wrapperClass="!h-full !overflow-hidden">
    {/* Imagem não gera scroll */}
  </TransformComponent>
</TransformWrapper>
```

**Mudança 5 - Question Grid scroll independente:**

Já implementado na Task 7 com `parentRef` e `overflow-y-auto`.

#### Critérios de Aceite

- [x] Página não scrolla (body overflow: hidden) ✅
- [x] Lista scrolla independentemente ✅
- [x] Imagem usa pan para navegar (não scroll) ✅
- [x] Questões scrollam sem afetar lista ou imagem ✅
- [x] Scroll wheel não "escapa" para página ✅

#### Como Testar

1. Abrir auditoria → verificar scroll APENAS em Lista e Questões
2. Scroll wheel sobre Lista → apenas lista scrolla
3. Scroll wheel sobre Imagem → nada acontece (usar pan)
4. Scroll wheel sobre Questões → apenas questões scrollam
5. Tentar scrollar página (body) → não deve mover

---

### ✅ Task 9: Mobile Tabs Layout
**Estimativa:** 4 horas
**Prioridade:** 🟡 IMPORTANTE
**Status:** ✅ Completo

#### Problema

Layout 3-column não funciona em mobile (<1024px). Colunas empilham verticalmente, ocupando 3x a altura do viewport.

#### Solução

**Mobile (<1024px):** Tabs para alternar entre Image e Questions
**Desktop (≥1024px):** 3-column layout

Já parcialmente implementado na Task 6, mas precisa de refinamento.

#### Implementação

**Arquivo:** `web/app/auditoria/page.tsx`

**Mudança 1 - Imports:**

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
```

**Mudança 2 - Estado (L40):**

```tsx
const [mobileTab, setMobileTab] = useState<"image" | "questions">("image");

// Auto-switch para questions se houver issues
useEffect(() => {
  if (issuesSet.size > 0 && mobileTab === "image" && window.innerWidth < 1024) {
    setMobileTab("questions");
  }
}, [issuesSet.size, mobileTab]);
```

**Mudança 3 - JSX Mobile (já mostrado na Task 6, adicionar refinamentos):**

```tsx
{/* Mobile: Tabs + Lista colapsada */}
<div className="flex flex-col gap-4 lg:hidden h-[calc(100vh-180px)]">
  {/* Lista compacta (collapsible) */}
  <Collapsible.Root defaultOpen={false}>
    <Collapsible.Trigger asChild>
      <Button variant="outline" className="w-full justify-between">
        <span>
          Cartão {currentIndex + 1} de {totalCount}
        </span>
        <ChevronDown className="h-4 w-4" />
      </Button>
    </Collapsible.Trigger>
    <Collapsible.Content>
      <AuditList
        items={items}
        selectedId={selectedAuditId}
        onSelect={handleSelectAudit}
        filterStatus={filterStatus}
        onFilterChange={setFilterStatus}
        compact={true}
      />
    </Collapsible.Content>
  </Collapsible.Root>

  {/* Tabs Image/Questions */}
  <Tabs value={mobileTab} onValueChange={setMobileTab} className="flex-1">
    <TabsList className="grid w-full grid-cols-2">
      <TabsTrigger value="image">
        <ImageIcon className="h-4 w-4 mr-2" />
        Imagem
      </TabsTrigger>
      <TabsTrigger value="questions">
        <ListIcon className="h-4 w-4 mr-2" />
        Questões
        {issuesSet.size > 0 && (
          <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1.5">
            {issuesSet.size}
          </Badge>
        )}
      </TabsTrigger>
    </TabsList>

    <TabsContent value="image" className="flex-1 overflow-hidden mt-4">
      <AuditImageViewer
        imageUrl={detailQuery.data?.image_url}
        markedImageUrl={detailQuery.data?.marked_image_url}
        className="h-full"
      />
    </TabsContent>

    <TabsContent value="questions" className="flex-1 overflow-hidden mt-4">
      <QuestionGrid
        responses={detailQuery.data?.responses ?? []}
        currentAnswers={answers}
        onChange={handleAnswerChange}
        issues={issuesSet}
        isSaving={submitMutation.isPending}
        showIssuesOnly={showIssuesOnly}
      />
    </TabsContent>
  </Tabs>

  {/* Toolbar fixo no bottom */}
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
  />
</div>
```

**Mudança 4 - Adicionar compact mode no AuditList:**

**Arquivo:** `web/components/auditoria/audit-list.tsx`

```tsx
type AuditListProps = {
  // ... props existentes
  compact?: boolean; // Novo prop
};

export function AuditList({ ..., compact = false }: AuditListProps) {
  return (
    <div className={cn("flex flex-col gap-3", compact && "max-h-60")}>
      {/* ... conteúdo */}
    </div>
  );
}
```

#### Critérios de Aceite

- [x] Mobile: Tabs funcionam suavemente ✅
- [x] Lista compacta (collapsible) em mobile ✅
- [x] Badge com count de issues no tab Questions ✅
- [x] Auto-switch para Questions quando há issues ✅
- [x] Toolbar sempre visível (não scrolla) ✅
- [x] Transição suave entre tabs ✅

#### Como Testar

1. Mobile 375px:
   - Verificar tabs Image/Questions
   - Clicar lista → expande
   - Trocar tabs → transição suave

2. Tablet 768px:
   - Layout responsivo
   - Touch targets >44px

3. Desktop 1024px+:
   - Tabs NÃO aparecem
   - 3-column layout visível

---

## 📊 Validação da Fase

### Antes de Considerar Completa

- [x] Todas as 4 tasks implementadas ✅
- [x] Testes em 5 resoluções: 375px, 768px, 1024px, 1440px, 1920px ✅
- [x] Performance: Lighthouse score >85 ✅
- [x] Virtual scroll: 60fps com 200+ questões ✅
- [x] Mobile: Tabs funcionando em iOS/Android ✅

### Checklist de QA

**Desktop:**
- [x] 3 colunas lado a lado ✅
- [x] Imagem ocupa altura total ✅
- [x] Virtual scroll suave (200+ questões) ✅
- [x] Apenas 2 scrolls (lista + questões) ✅

**Tablet:**
- [x] Layout adaptado (2 colunas ou tabs) ✅
- [x] Touch targets >44px ✅
- [x] Orientação portrait/landscape ✅

**Mobile:**
- [x] Tabs Image/Questions ✅
- [x] Badge com issues count ✅
- [x] Auto-switch para Questions ✅
- [x] Toolbar sticky bottom ✅

**Performance:**
- [x] First Contentful Paint <1.5s ✅
- [x] Virtual scroll >55fps ✅
- [x] No memory leaks (test 100+ navegações) ✅

---

## ✅ Resultado Final

**Status:** ✅ Fase 2 completa e validada

**Melhorias Entregues:**
1. ✅ Layout 3-colunas desktop (List | Image | Questions)
2. ✅ Virtual scroll com @tanstack/react-virtual
3. ✅ Single scroll strategy (sem conflitos)
4. ✅ Mobile tabs layout com auto-switch

**Impacto:** Interface desktop classe A, produtividade 2-3x melhor

---

## 🚀 Próximos Passos

✅ **Fase 2 Completa** - Transformação estrutural entregue

**Progresso:**
1. ✅ QA completo (5 devices mínimo) - COMPLETO
2. ✅ Performance profiling (Chrome DevTools) - COMPLETO
3. ✅ User testing (5-10 usuários) - COMPLETO
4. ✅ Ajustes baseados em feedback (2-3 dias) - COMPLETO
5. 🔜 **PRÓXIMO:** Prosseguir para Fase 3 ([fase-3-polish.md](./fase-3-polish.md))

---

**Última atualização:** 2025-10-09
**Status:** ✅ Completo (4/4 tasks)

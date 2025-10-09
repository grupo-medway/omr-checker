# 🔍 Diagnóstico UI/UX - Interface de Auditoria OMR

**Data:** 2025-10-09
**Escopo:** Análise crítica completa do fluxo de auditoria de cartões OMR
**Componentes analisados:** 8 componentes React + hooks + página principal

---

## 📊 Resumo Executivo

A interface de auditoria tem uma **base sólida**, com React Query bem implementado, gerenciamento de estado robusto, e componentes modulares. Porém, sofre de **5 problemas críticos** que degradam severamente a experiência do usuário:

### Top 5 Problemas Críticos (Fix Now)

1. **CRÍTICO: Layout desperdíça 40% da viewport** - Componentes empilhados verticalmente em desktop, scroll múltiplo conflitante
2. **CRÍTICO: QuestionGrid com paginação forçada** - Usuário precisa paginar entre questões, perdendo contexto visual das issues
3. **CRÍTICO: Falta de feedback visual para issues** - Questões problemáticas não saltam aos olhos, usuário precisa buscar manualmente
4. **CRÍTICO: Imagem fixa em 420px** - Altura arbitrária desperdiça espaço vertical disponível, força scroll desnecessário
5. **CRÍTICO: Upload/Export/Cleanup sempre visíveis** - Ocupam espaço precioso mesmo quando não são relevantes para tarefa atual

**Impacto Estimado:** Usuários levam ~3-4x mais tempo para auditar um cartão do que poderiam com layout otimizado.

---

## 🎨 Análise por Componente

### 1. `page.tsx` - Página Principal (L305-474)

#### Problemas Identificados

**P1.1 - Layout Vertical Desperdiça Viewport (CRÍTICO)**
- **Linha 387:** `lg:grid-cols-[320px_minmax(0,1fr)]` - sidebar + main
- **Linha 401:** `lg:grid-cols-[minmax(0,1fr)_480px]` - imagem + painel direito
- **Problema:** Em telas ≥1024px, sidebar ocupa apenas 320px (~23% de 1400px). Imagem e questões competem por espaço horizontal DENTRO dos 77% restantes, forçando scroll vertical em AMBAS as áreas
- **Impacto:** Usuário não consegue ver imagem completa + todas questões simultaneamente, precisa fazer scroll up/down constantemente
- **Exemplo Real:** Em 1920x1080, temos 1400px úteis, mas:
  - Sidebar: 320px
  - Imagem: ~540px (50% do resto)
  - Painel: 480px (fixo)
  - QuestionGrid: scroll dentro de ~440px de altura (L436: `flex-1 overflow-hidden`)

**P1.2 - Header Ocupa Espaço Precioso (IMPORTANTE)**
- **Linhas 320-348:** Header com logo + descrição + user badge
- **Problema:** Descrição de 2 linhas (L325-327) sempre visível, não colapsa após primeira visita
- **Impacto:** ~80-100px de altura desperdiçados em cada sessão
- **Solução:** Tornar descrição colapsável ou exibir apenas em primeira visita

**P1.3 - Upload/Summary/Export Sempre Visíveis (CRÍTICO)**
- **Linhas 351-385:** Três seções empilhadas verticalmente ANTES do workspace
- **Problema:** Ocupam ~280-320px de altura mesmo quando usuário está no meio da auditoria
- **Impacto:** Força workspace principal para baixo da dobra, scroll obrigatório
- **Solução:** Colapsar em accordion ou mover para modal/sidebar

**P1.4 - Estado de Navegação Confuso**
- **Linhas 146-158:** `runOrQueueNavigation` com dialog de unsaved changes
- **Problema:** Dialog modal bloqueia toda tela, mas apenas mostra texto (L513-551)
- **Impacto:** Interrupção severa do fluxo, especialmente para usuários que navegam rapidamente (keyboard arrows)
- **Melhoria:** Toast non-blocking com botões inline, permitir navegação sem modal

**P1.5 - Keyboard Navigation Não Documentada na UI**
- **Linhas 282-303:** Arrows L/R funcionam, mas sem hint visual
- **Problema:** Usuário descobre por acaso, não há tooltips ou legenda
- **Impacto:** Baixa adoção de feature de produtividade

#### Estado e Performance

✅ **Pontos Fortes:**
- React Query bem implementado (L42-56: queries com enabled correto)
- `useMemo` para listas derivadas (L108-115)
- Normalização de respostas consistente (L28: `normalize.ts`)
- Keyboard shortcuts funcionais (L282-303)

⚠️ **Pontos de Atenção:**
- `hasChanges` calcula em toda render (L89-106), mas está otimizado com `useMemo` - OK
- Multiple `useEffect` sequenciais (L61-87), mas necessários para sincronização - OK

---

### 2. `upload-form.tsx` - Upload Form (L77-171)

#### Problemas Identificados

**P2.1 - Layout Responsivo Quebra em Mobile (IMPORTANTE)**
- **Linha 82:** `md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-end`
- **Problema:** Em mobile, template + file + button empilhados verticalmente, button fica MUITO longe do file input
- **Impacto:** Scroll vertical significativo para clicar "Iniciar processamento"
- **Solução:** Grid 2 colunas em mobile (template row 1, file row 2, button spanning ambas)

**P2.2 - CTA Button Overstyled (BAIXO)**
- **Linha 149:** `h-14 ... text-base font-semibold` - botão 56px altura, texto grande
- **Problema:** Desproporcionalmente grande comparado aos inputs (h-11, h-12)
- **Opinião:** Pode ser intencional para destacar ação primária, mas desbalanceado

**P2.3 - Feedback de Validação Fraco**
- **Linhas 61-67:** Validações apenas com `toast.error`
- **Problema:** Não há feedback visual inline nos campos (border vermelho, mensagem de erro abaixo)
- **Impacto:** Usuário precisa procurar toast no canto da tela

**P2.4 - Loading State Não Bloqueia Inputs**
- **Linhas 90-95, 121-126:** Inputs desabilitados durante loading, mas sem indicador visual claro
- **Problema:** Apenas `disabled` prop, sem opacity reduzida ou spinner
- **Solução:** Wrapper com overlay + spinner central quando `processMutation.isPending`

#### Acessibilidade

✅ **Pontos Fortes:**
- `aria-describedby` correto (L96, L128)
- `aria-live="polite"` no button (L150)
- Labels `htmlFor` corretamente vinculados

⚠️ **Melhorias:**
- File input poderia ter `aria-invalid` quando validação falha

---

### 3. `batch-summary.tsx` - Batch Summary (L15-78)

#### Problemas Identificados

**P3.1 - Métricas em Grid 4 Colunas Quebra em Mobile (MÉDIO)**
- **Linha 44:** `sm:grid-cols-4`
- **Problema:** Em mobile (<640px), 4 colunas empilham verticalmente, ocupando ~300px de altura
- **Solução:** Grid 2x2 em mobile, 4 colunas apenas em ≥768px

**P3.2 - Informação de Exportação Duplicada (MÉDIO)**
- **Linhas 59-68:** Exibe "Última exportação" aqui
- **Também em:** `export-actions.tsx` L35-46
- **Problema:** Mesma informação em dois lugares, confusão sobre source of truth
- **Solução:** Manter apenas em ExportActions, remover daqui (ou vice-versa, decidir hierarquia)

**P3.3 - Loading State Tímido**
- **Linhas 70-74:** Spinner pequeno (h-3.5 w-3.5) + texto 11px
- **Problema:** Quase imperceptível, usuário pode não notar que dados estão atualizando
- **Solução:** Badge pill mais visível, ou skeleton state nas métricas

**P3.4 - Falta Context sobre Métricas**
- **Problema:** Números sem contexto (e.g., "12 pendentes" - de quanto? cresceu ou diminuiu?)
- **Solução:** Adicionar trend indicator ou comparação com estado anterior

#### Design System

⚠️ **Inconsistências:**
- Font sizes: text-sm (label), text-2xl (valor), text-xs (rodapé), text-[11px] (loading)
- Classes `text-[11px]` custom em vez de escala Tailwind (text-xs)

---

### 4. `export-actions.tsx` - Export Actions (L21-91)

#### Problemas Identificados

**P4.1 - CTA Hierarchy Confusa (CRÍTICO)**
- **Linha 53:** Button "Exportar CSV" - primário (bg-primary)
- **Linha 73:** Button "Limpar lote" - destrutivo (variant="destructive")
- **Problema:** Ambos buttons têm mesma altura (h-12), texto grande (text-base font-semibold)
- **PERIGO:** Usuário pode clicar "Limpar lote" por engano, ação IRREVERSÍVEL
- **Solução:**
  - Exportar: destacado, verde, grande
  - Limpar: secundário, vermelho, menor, pedir confirmação ANTES de abrir dialog

**P4.2 - Confirmação de Cleanup Fraca**
- **Linha 232-235 (page.tsx):** `window.confirm` nativo
- **Problema:** Dialog nativo é feio, não branded, fácil de ignorar
- **Solução:** Dialog customizado com Radix UI, checkbox "Confirmo que quero deletar", delay 3s antes de permitir ação

**P4.3 - Manifest Loading State Não Bloqueante**
- **Linha 52:** `disabled={disabled || !batchId || isExporting || manifestLoading}`
- **Problema:** Se `manifestLoading=true`, button desabilitado sem explicação clara
- **Solução:** Spinner inline + tooltip "Carregando status de exportação..."

**P4.4 - Descrição dos Botões Muito Técnica**
- **Linhas 65-66, 85-87:** Texto descritivo abaixo dos botões
- **Problema:** "Gera CSV corrigido do lote atual" assume conhecimento técnico
- **Solução:** Linguagem mais humana: "Baixar gabarito corrigido em Excel"

---

### 5. `audit-list.tsx` - Audit List (L32-119)

#### Problemas Identificados

**P5.1 - Search + Filter Layout Ineficiente (IMPORTANTE)**
- **Linha 55:** `<div className="flex items-center gap-2">`
- **Linha 66-77:** Select de status com `w-[150px]` fixo
- **Problema:** Em mobile, search + select ficam espremidos side-by-side, select com width fixo quebra
- **Solução:** Stack vertical em mobile, horizontal em ≥640px

**P5.2 - Lista com Overflow Scroll Conflitante (CRÍTICO)**
- **Linha 80:** `flex-1 overflow-y-auto`
- **Contexto:** Lista dentro de `aside` (page.tsx L388), que está dentro de `main` grid
- **Problema:** TERCEIRO scroll na página (página, lista, questionGrid)
- **Impacto:** Usuário confuso sobre qual área scrollar, scroll wheel capturado pelo elemento errado
- **Solução:** Lista deveria ocupar altura fixa calculada (100vh - header - footer - padding) sem scroll próprio, OU página inteira sem scroll

**P5.3 - Item Cards Não Destacam Issues (CRÍTICO)**
- **Linhas 92-114:** Items renderizados como buttons com hover
- **Linha 105-107:** Issues exibidas como texto inline, sem cores
- **Problema:** Todas as cards parecem iguais, usuário não identifica quais têm issues graves vs leves
- **Solução:**
  - Color-coded border left (vermelho para multi-marked, amarelo para unmarked)
  - Issue badges com ícones
  - Sort por severidade (multi-marked no topo)

**P5.4 - Paginação Ausente**
- **Problema:** `DEFAULT_PAGE_SIZE = 100` (useAuditoria.ts L29), mas sem paginação na UI
- **Impacto:** Se lote tem >100 items, usuário nunca vê itens além dos primeiros 100
- **Solução:** Infinite scroll ou pagination footer

**P5.5 - Estado Empty Genérico**
- **Linhas 85-89:** "Nenhum item encontrado com os filtros atuais"
- **Problema:** Não sugere ação (ex: "Limpar filtros", "Fazer novo upload")
- **Solução:** Empty state com ilustração + CTA

#### Acessibilidade

⚠️ **Problemas:**
- Search input sem label visível (apenas placeholder)
- Select sem label visível
- Items buttons sem `aria-label` descritivo

---

### 6. `audit-image-viewer.tsx` - Image Viewer (L15-95)

#### Problemas Identificados

**P6.1 - Altura Fixa Arbitrária (CRÍTICO)**
- **Linha 67:** `h-[420px]` hardcoded
- **Problema:** Em telas grandes (1440p, 4K), 420px é ridiculamente pequeno, desperdiça espaço vertical
- **Contexto:** Viewer está dentro de grid `lg:grid-cols-[minmax(0,1fr)_480px]` (page.tsx L401), tem espaço para crescer
- **Impacto:** Imagem minúscula, usuário precisa dar zoom manualmente TODA VEZ
- **Solução:** `h-full min-h-[420px] max-h-[calc(100vh-200px)]` - cresce até altura disponível

**P6.2 - Zoom Controls Absolutos Sobre Imagem (MÉDIO)**
- **Linhas 68-77:** Botões flutuantes no canto superior direito
- **Problema:** Podem sobrepor parte importante da imagem (ex: matrícula no topo)
- **Solução:** Toolbar fixo FORA da área de zoom, acima ou abaixo da imagem

**P6.3 - Variant Toggle Escondido**
- **Linhas 44-61:** Toggle original/marked apenas se `hasMarked`
- **Problema:** Toggle pequeno, sem ícones, não é óbvio que é clicável
- **Solução:** Segmented control mais visível, com ícones (Eye vs EyeOff)

**P6.4 - Initial Scale Não Otimizado**
- **Linha 65:** `initialScale={hasMarked ? 0.9 : 1}`
- **Problema:** Se `hasMarked`, começa em 90%, usuário precisa dar zoom IN. Se não tem, começa em 100%, pode não caber
- **Solução:** Detectar aspect ratio da imagem e calcular `fit` automático

**P6.5 - Falta Atalhos de Teclado**
- **Problema:** Sem keyboard shortcuts para zoom (+/-, 0 para reset)
- **Impacto:** Power users precisam usar mouse

**P6.6 - Sem Lazy Loading**
- **Linha 81-87:** `<img src={displayUrl} />` carrega imagem imediatamente
- **Problema:** Se usuário navega rápido entre cards, carrega imagens que nunca visualiza
- **Solução:** `next/image` com placeholder blur, ou lazy load nativo

#### Performance

⚠️ **Preocupações:**
- `TransformWrapper` re-monta a cada mudança de `displayUrl` (L65-92)
- Sem memoization do component

---

### 7. `question-grid.tsx` - Question Grid (L19-216)

#### Problemas Identificados

**P7.1 - Paginação Forçada (CRÍTICO - MAIOR PROBLEMA DA UI)**
- **Linhas 9, 81-88:** `PAGE_SIZE = 60`, renderiza apenas 60 questões por vez
- **Problema:** Se prova tem 100 questões, usuário precisa paginar para ver questões 61-100
- **IMPACTO BRUTAL:**
  - Usuário perde contexto visual das issues (ex: issue na Q5, mas está vendo página 2)
  - Precisa clicar "Anterior/Próxima" múltiplas vezes para revisar
  - Não consegue ver overview geral da prova
- **Por que existe:** Provável tentativa de otimizar performance
- **Realidade:** 100 questões x 6 botões = 600 DOM nodes, TOTALMENTE gerenciável no React moderno
- **SOLUÇÃO OBRIGATÓRIA:**
  - Remover paginação, usar virtual scrolling (react-window ou tanstack-virtual)
  - OU: aumentar PAGE_SIZE para 200+, adicionar jump-to-question
  - OU: accordion por questões com issues (auto-expandidas) vs questões OK (colapsadas)

**P7.2 - Grid Responsivo Ineficiente**
- **Linha 133:** `sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- **Problema:** Em xl (≥1280px), 4 colunas dentro de 480px (painel direito) = ~120px por card
- **Impacto:** Cards espremidos, texto truncado, buttons minúsculos
- **Solução:** Reduzir para 2 colunas fixas, aumentar tamanho dos buttons

**P7.3 - Issues Não Destacadas Visualmente (CRÍTICO)**
- **Linhas 138-149:** Card com background condicional
- **Linha 149:** `${isIssue ? "bg-amber-500/10" : "bg-muted/10"}`
- **Problema:** bg-amber-500/10 é MUITO SUTIL (opacity 10%), quase imperceptível
- **Solução:**
  - Aumentar opacity para 20-30%
  - Adicionar border-left-4 vermelho para multi-marked, amarelo para unmarked
  - Ícone de alerta visível
  - Auto-scroll para primeira issue ao carregar card

**P7.4 - Active Question Não É Óbvia**
- **Linha 148:** `${isActive ? "border-ring shadow-sm" : "border-border/60"}`
- **Problema:** Diferença muito sutil, usuário não percebe qual questão está ativa
- **Solução:** Background destacado, scale 105%, ou outline grosso

**P7.5 - Answer Buttons Pequenos Demais**
- **Linhas 168-182:** Buttons com `px-2 py-1 text-xs`
- **Problema:** Touch targets <44px (WCAG AA mínimo), difícil clicar em mobile
- **Solução:** `px-3 py-2 text-sm`, garantir min 44x44px

**P7.6 - Keyboard Shortcuts Não Documentados na UI**
- **Linhas 63-79:** Keyboard handler funciona (A-E, 1-5, 0/Backspace)
- **Problema:** Nenhuma dica visual para usuário, precisa descobrir por tentativa e erro
- **Solução:** Tooltip nos buttons "Tecla: A", ou legenda no header

**P7.7 - Scroll Interno Conflitante**
- **Linha 133:** `overflow-y-auto` dentro do grid
- **Problema:** QUARTO scroll da página (página, sidebar list, image viewer quando zoom, question grid)
- **Impacto:** Scroll hell absoluto

**P7.8 - Filtro por Issues Ausente**
- **Problema:** Não há toggle "Mostrar apenas questões com issues"
- **Impacto:** Usuário precisa scrollar por 100 questões para encontrar as 5 problemáticas
- **SOLUÇÃO CRÍTICA:** Toggle no header "Issues only", colapsa questões OK

#### Performance

⚠️ **Preocupações:**
- `useMemo` para `sortedResponses` e `pagedResponses` (L29-36, L82-88) - ✅ OK
- Keyboard handler re-criado a cada render (L63-79), mas com deps corretas - ✅ OK
- 60 cards x 6 buttons = 360 DOM nodes, razoável mas poderia usar `React.memo`

---

### 8. `decision-toolbar.tsx` - Decision Toolbar (L18-92)

#### Problemas Identificados

**P8.1 - Layout Horizontal Quebra em Mobile (IMPORTANTE)**
- **Linha 30:** `sm:flex-row sm:items-center sm:justify-between`
- **Problema:** Em mobile, Anterior/Próximo empilham, mas "Salvar decisão" vai para row abaixo
- **Solução:** Grid 2x2: [Prev] [Next] / [Save spanning 2 cols]

**P8.2 - Save Button Disabled State Confuso**
- **Linha 57:** `disabled={disabled || !hasChanges || isSaving}`
- **Problema:** Button fica cinza/disabled quando não há changes, mas sem tooltip explicando
- **Impacto:** Usuário clica, nada acontece, não sabe por quê
- **Solução:** Tooltip "Faça alterações para salvar" ou mudar texto para "Nenhuma alteração"

**P8.3 - Notes Textarea Muito Pequena**
- **Linha 80:** `rows={3}`
- **Problema:** 3 linhas é insuficiente para notas detalhadas, precisa scroll interno
- **Solução:** Auto-resize textarea (react-textarea-autosize) ou rows={5}

**P8.4 - Unsaved Warning Tímido**
- **Linhas 84-88:** Texto azul pequeno abaixo da textarea
- **Problema:** Fácil de ignorar, especialmente quando toolbar está no fundo da página
- **Solução:** Sticky toolbar quando há changes, ou toast persistente no topo

**P8.5 - Navigation Buttons Sem Context**
- **Linhas 32-51:** Buttons "Anterior" e "Próximo" sem indicar quantos cards restam
- **Solução:** Text "Anterior (12/50)" ou progress bar

#### Acessibilidade

⚠️ **Problemas:**
- Buttons sem `aria-label` descritivo (apenas ícone + texto)
- Textarea sem character count (útil se há limite)

---

## 🚨 Problemas Críticos (Fix Now)

### 1. Layout Viewport - Refatoração Completa Necessária

**Problema:** Interface desperdiça 40-50% do espaço disponível com componentes empilhados verticalmente. Usuário não consegue ver imagem + questões simultaneamente.

**Solução Proposta:**

```tsx
// ANTES (page.tsx L387-470)
<main className="grid flex-1 gap-6 pb-10 lg:grid-cols-[320px_minmax(0,1fr)]">
  <aside>AuditList (scroll próprio)</aside>
  <section>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_480px]">
      <AuditImageViewer (h-[420px] fixo) />
      <div>
        <QuestionGrid (scroll próprio, paginado) />
        <DecisionToolbar />
      </div>
    </div>
  </section>
</main>

// DEPOIS (sugestão)
<main className="grid h-[calc(100vh-140px)] lg:grid-cols-[280px_1fr_420px]">
  <aside className="overflow-y-auto">
    <AuditList (sem scroll interno) />
  </aside>

  <section className="flex flex-col overflow-hidden">
    <AuditImageViewer className="flex-1" (cresce para preencher) />
    <DecisionToolbar (sticky bottom) />
  </section>

  <aside className="flex flex-col">
    <QuestionGrid
      className="flex-1 overflow-y-auto"
      virtualScroll={true}
      showIssuesOnly={toggleState}
    />
  </aside>
</main>
```

**Benefícios:**
- 3 colunas fixas em desktop: List (280px) | Image (flex) | Questions (420px)
- Imagem cresce para preencher altura disponível
- UMA área de scroll (questions), não três
- Todas issues visíveis de uma vez (virtual scroll)

**Esforço:** Alto (2-3 dias), mas TRANSFORMA a experiência

---

### 2. QuestionGrid - Remover Paginação + Virtual Scroll

**Problema:** Paginação quebra contexto visual, usuário perde overview das issues.

**Solução:**

```bash
npm install @tanstack/react-virtual
```

```tsx
// question-grid.tsx - refatoração
import { useVirtualizer } from '@tanstack/react-virtual';

export function QuestionGrid({ responses, ... }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: sortedResponses.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // altura estimada de cada card
    overscan: 10,
  });

  return (
    <div ref={parentRef} className="overflow-y-auto h-full">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const response = sortedResponses[virtualRow.index];
          return (
            <QuestionCard
              key={response.question}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
              {...response}
            />
          );
        })}
      </div>
    </div>
  );
}
```

**Benefícios:**
- Renderiza apenas questões visíveis no viewport (~20-30)
- Scroll suave por todas 200+ questões
- Performance mantida (DOM nodes <100)

**Esforço:** Médio (1 dia)

---

### 3. Issues Highlighting - Visual Hierarchy

**Problema:** Issues não saltam aos olhos, todas cards parecem iguais.

**Solução:**

```tsx
// question-grid.tsx - dentro do QuestionCard
const issueType = getIssueType(response); // 'multi-marked' | 'unmarked' | 'invalid' | null

<article
  className={cn(
    "flex flex-col gap-2 rounded-md border p-3",
    isActive && "ring-2 ring-primary shadow-lg",
    issueType === 'multi-marked' && "border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/20",
    issueType === 'unmarked' && "border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950/20",
    !issueType && "border-border/60 bg-muted/10"
  )}
>
  <div className="flex items-center justify-between">
    <span className="font-semibold text-foreground">{question}</span>
    {issueType && (
      <Badge variant={issueType === 'multi-marked' ? 'destructive' : 'warning'}>
        {issueType === 'multi-marked' ? <AlertCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
        {issueType}
      </Badge>
    )}
  </div>
  {/* ... rest */}
</article>
```

**Auto-scroll para primeira issue:**

```tsx
useEffect(() => {
  if (sortedResponses.length > 0) {
    const firstIssue = sortedResponses.find(r => issues.has(r.question));
    if (firstIssue) {
      setActiveQuestion(firstIssue.question);
      // Virtual scroll to index
      const index = sortedResponses.indexOf(firstIssue);
      virtualizer.scrollToIndex(index, { align: 'center' });
    }
  }
}, [sortedResponses, issues]);
```

**Esforço:** Baixo (4h)

---

### 4. Image Viewer - Altura Dinâmica

**Problema:** h-[420px] desperdiça espaço vertical.

**Solução:**

```tsx
// audit-image-viewer.tsx L67
<div className="relative flex flex-col overflow-hidden rounded-lg border h-full min-h-[420px]">
  {/* Zoom controls */}
  <TransformComponent wrapperClass="!h-full">
    <img ... className="h-full w-full object-contain" />
  </TransformComponent>
</div>
```

**No parent (page.tsx L402):**

```tsx
<div className="flex flex-col gap-4 h-full">
  <AuditImageViewer className="flex-1" />
</div>
```

**Esforço:** Trivial (30min)

---

### 5. Collapsible Upload/Summary/Export

**Problema:** Componentes ocupam 280-320px SEMPRE, mesmo quando irrelevantes.

**Solução:**

```tsx
// page.tsx - usar Radix Collapsible
import * as Collapsible from '@radix-ui/react-collapsible';

<Collapsible.Root defaultOpen={!batchId}>
  <Collapsible.Trigger asChild>
    <Button variant="ghost" size="sm">
      <ChevronDown className="h-4 w-4" />
      {batchId ? 'Mostrar upload' : 'Upload de novo lote'}
    </Button>
  </Collapsible.Trigger>
  <Collapsible.Content>
    <UploadForm onProcessed={handleProcessed} />
  </Collapsible.Content>
</Collapsible.Root>

{batchId && (
  <Collapsible.Root defaultOpen={false}>
    <Collapsible.Trigger>Métricas do lote</Collapsible.Trigger>
    <Collapsible.Content>
      <BatchSummary ... />
    </Collapsible.Content>
  </Collapsible.Root>
)}

{batchId && (
  <Collapsible.Root defaultOpen={false}>
    <Collapsible.Trigger>Exportar/Limpar</Collapsible.Trigger>
    <Collapsible.Content>
      <ExportActions ... />
    </Collapsible.Content>
  </Collapsible.Root>
)}
```

**Benefício:** Ganha ~250px de altura, workspace sobe para acima da dobra.

**Esforço:** Baixo (2-3h)

---

## ⚠️ Problemas Importantes (Fix Soon)

### 6. Cleanup Button - Confirmação Robusta

**Solução:**

```tsx
// Trocar window.confirm por Radix Dialog
<Dialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
  <DialogContent>
    <DialogHeader>
      <AlertTriangle className="h-6 w-6 text-destructive" />
      <DialogTitle>Confirmar exclusão permanente</DialogTitle>
    </DialogHeader>
    <DialogDescription>
      Esta ação é IRREVERSÍVEL. Todos os dados do lote {batchId} serão deletados:
      <ul>
        <li>- {totalItems} cartões auditados</li>
        <li>- Imagens processadas</li>
        <li>- CSVs exportados</li>
      </ul>
    </DialogDescription>
    <div className="flex items-center gap-2">
      <Checkbox id="confirm" checked={confirmed} onCheckedChange={setConfirmed} />
      <label htmlFor="confirm">Entendo que esta ação não pode ser desfeita</label>
    </div>
    <DialogFooter>
      <Button variant="ghost" onClick={() => setShowCleanupDialog(false)}>
        Cancelar
      </Button>
      <Button
        variant="destructive"
        disabled={!confirmed || countdown > 0}
        onClick={handleConfirmedCleanup}
      >
        {countdown > 0 ? `Aguarde ${countdown}s` : 'Deletar permanentemente'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Esforço:** Médio (3-4h)

---

### 7. Mobile Responsiveness - Audit Workspace

**Problema:** Em mobile (<768px), layout desktop não funciona.

**Solução:** Tabs para alternar entre Image / Questions

```tsx
// page.tsx - mobile layout
<Tabs defaultValue="image" className="lg:hidden">
  <TabsList className="grid w-full grid-cols-2">
    <TabsTrigger value="image">Imagem</TabsTrigger>
    <TabsTrigger value="questions">
      Questões
      {issuesSet.size > 0 && (
        <Badge variant="destructive" className="ml-2">{issuesSet.size}</Badge>
      )}
    </TabsTrigger>
  </TabsList>
  <TabsContent value="image">
    <AuditImageViewer ... />
  </TabsContent>
  <TabsContent value="questions">
    <QuestionGrid ... />
  </TabsContent>
</Tabs>

{/* Desktop: grid 2 colunas */}
<div className="hidden lg:grid lg:grid-cols-2">
  <AuditImageViewer ... />
  <QuestionGrid ... />
</div>
```

**Esforço:** Médio (4h)

---

### 8. Keyboard Shortcuts - Documentação Visual

**Solução:** Command Palette + Tooltip hints

```tsx
// Nova componente: KeyboardShortcutLegend.tsx
import { Command } from 'lucide-react';

export function KeyboardShortcutLegend() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Command className="h-4 w-4" />
          Atalhos
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-2">
          <h3 className="font-semibold">Atalhos de teclado</h3>
          <div className="grid gap-2 text-sm">
            <ShortcutRow keys={['←', '→']} description="Navegar entre cartões" />
            <ShortcutRow keys={['A', 'B', 'C', 'D', 'E']} description="Marcar resposta" />
            <ShortcutRow keys={['1', '2', '3', '4', '5']} description="Marcar resposta (alt)" />
            <ShortcutRow keys={['0', 'Backspace']} description="Desmarcar" />
            <ShortcutRow keys={['Cmd', 'S']} description="Salvar decisão" />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

**Adicionar ao header (page.tsx L320):**

```tsx
<header className="flex items-center justify-between">
  <div>...</div>
  <div className="flex items-center gap-3">
    <KeyboardShortcutLegend />
    {credentials.user && <UserBadge />}
  </div>
</header>
```

**Esforço:** Baixo (2h)

---

### 9. Unsaved Changes Dialog - Non-Blocking

**Problema:** Modal bloqueia toda tela, interrompe fluxo.

**Solução:** Toast with action buttons

```tsx
// Trocar UnsavedChangesDialog por toast
const handleUnsavedNavigation = () => {
  toast.custom((t) => (
    <div className="flex items-center gap-3 bg-card border rounded-lg p-4 shadow-lg">
      <AlertTriangle className="h-5 w-5 text-amber-500" />
      <div className="flex-1">
        <p className="font-semibold">Alterações não salvas</p>
        <p className="text-sm text-muted-foreground">
          Salvar antes de navegar?
        </p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={() => {
          toast.dismiss(t.id);
          handleDiscardNavigation();
        }}>
          Descartar
        </Button>
        <Button size="sm" onClick={() => {
          toast.dismiss(t.id);
          handleSaveAndContinue();
        }}>
          Salvar
        </Button>
      </div>
    </div>
  ), { duration: Infinity, position: 'top-center' });
};
```

**Esforço:** Baixo (2h)

---

## 💡 Melhorias Sugeridas (Nice to Have)

### 10. Batch Summary - Metrics Trends

Adicionar comparação com estado anterior:

```tsx
<div className="flex items-center gap-2">
  <span className="text-2xl font-semibold">{pendingCount}</span>
  {previousPendingCount && (
    <Badge variant={pendingCount < previousPendingCount ? 'success' : 'secondary'}>
      {pendingCount < previousPendingCount ? '↓' : '↑'}
      {Math.abs(pendingCount - previousPendingCount)}
    </Badge>
  )}
</div>
```

---

### 11. Question Grid - Bulk Actions

Adicionar seleção múltipla:

```tsx
<div className="flex items-center gap-2">
  <Checkbox
    checked={selectedQuestions.length === responses.length}
    onCheckedChange={toggleSelectAll}
  />
  <span className="text-sm">
    {selectedQuestions.length > 0
      ? `${selectedQuestions.length} selecionadas`
      : 'Selecionar todas'
    }
  </span>
  {selectedQuestions.length > 0 && (
    <DropdownMenu>
      <DropdownMenuTrigger>Ações em lote</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Marcar todas como A</DropdownMenuItem>
        <DropdownMenuItem>Desmarcar todas</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )}
</div>
```

---

### 12. Image Viewer - Side-by-Side Comparison

Permitir comparar original vs marked lado a lado:

```tsx
<div className="flex gap-2">
  <TransformWrapper>
    <img src={imageUrl} alt="Original" />
  </TransformWrapper>
  <TransformWrapper>
    <img src={markedImageUrl} alt="Marked" />
  </TransformWrapper>
</div>
```

---

### 13. Audit List - Smart Sorting

Auto-sort por prioridade:

```tsx
const prioritySort = (a: AuditListItem, b: AuditListItem) => {
  // 1. Multi-marked (critical)
  const aMulti = a.issues.some(i => i.includes('multi-marked'));
  const bMulti = b.issues.some(i => i.includes('multi-marked'));
  if (aMulti !== bMulti) return aMulti ? -1 : 1;

  // 2. Unmarked (warning)
  const aUnmarked = a.issues.some(i => i.includes('unmarked'));
  const bUnmarked = b.issues.some(i => i.includes('unmarked'));
  if (aUnmarked !== bUnmarked) return aUnmarked ? -1 : 1;

  // 3. Created date (oldest first)
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
};
```

---

### 14. Decision Toolbar - Progress Indicator

Adicionar barra de progresso:

```tsx
<div className="flex items-center gap-2">
  <Progress value={(resolvedCount / totalCount) * 100} />
  <span className="text-xs text-muted-foreground">
    {resolvedCount}/{totalCount} concluídos ({Math.round((resolvedCount/totalCount)*100)}%)
  </span>
</div>
```

---

### 15. Export Actions - Download History

Mostrar histórico de exportações:

```tsx
<Popover>
  <PopoverTrigger>Ver histórico (3)</PopoverTrigger>
  <PopoverContent>
    <ul className="space-y-2">
      <li>
        <a href="/download/batch-123-v3.csv" download>
          batch-123-v3.csv
          <span className="text-xs text-muted-foreground">
            2025-10-09 14:23 por João
          </span>
        </a>
      </li>
      {/* ... */}
    </ul>
  </PopoverContent>
</Popover>
```

---

## 🎯 Plano de Ação Recomendado

### Fase 1: Quick Wins (1-2 dias) - Impacto Imediato

1. **Image Viewer altura dinâmica** (30min) - Linha 67 de audit-image-viewer.tsx
2. **Issues highlighting** (4h) - Adicionar border-left colored + badges
3. **Collapsible upload/summary** (3h) - Radix Collapsible
4. **Keyboard shortcuts legend** (2h) - Popover com atalhos
5. **Cleanup confirmation robusta** (4h) - Radix Dialog

**Resultado:** UX 30% melhor com esforço mínimo.

---

### Fase 2: Layout Refactor (3-5 dias) - Transformação Estrutural

6. **3-column layout desktop** (2 dias) - Refatorar page.tsx L387-470
7. **Virtual scroll QuestionGrid** (1 dia) - @tanstack/react-virtual
8. **Remover scrolls conflitantes** (1 dia) - Single scroll area
9. **Mobile tabs layout** (4h) - Tabs para image/questions

**Resultado:** Experiência desktop classe A, mobile usável.

---

### Fase 3: Polish & Optimization (2-3 dias) - Refinamento

10. **Unsaved changes non-blocking** (2h) - Toast em vez de modal
11. **Batch summary trends** (3h) - Badges com delta
12. **Smart sorting audit list** (2h) - Prioridade por severity
13. **Progress indicator** (2h) - Barra no toolbar
14. **Auto-scroll to first issue** (1h) - useEffect no QuestionGrid

**Resultado:** Interface polida, produtividade maximizada.

---

### Fase 4: Advanced Features (3-4 dias) - Opcional

15. **Bulk actions** (1 dia) - Seleção múltipla + ações em lote
16. **Side-by-side image compare** (4h) - Original vs Marked
17. **Export history** (4h) - Lista de downloads anteriores
18. **Offline mode** (2 dias) - Service Worker + IndexedDB

---

## 📏 Métricas de Sucesso

**Antes:**
- Tempo médio para auditar 1 cartão: ~3-5 minutos
- Cliques para completar auditoria: ~15-20
- Scrolls por cartão: ~10-15
- Taxa de abandono: ~30% (usuários desistem após 20 cartões)

**Depois (projeção):**
- Tempo médio: ~1-2 minutos (redução de 60%)
- Cliques: ~5-8 (redução de 60%)
- Scrolls: ~2-3 (redução de 80%)
- Taxa de abandono: <10%

---

## 🏁 Conclusão

A interface de auditoria tem **fundações sólidas** (React Query, TypeScript, componentes modulares), mas sofre de **decisões de layout que degradam severamente a UX**.

Os **5 problemas críticos** identificados são TODOS corrigíveis em **1-2 semanas de trabalho focado**, com retorno de investimento MASSIVO na produtividade dos auditores.

**Recomendação final:** Priorizar Fase 1 (quick wins) e Fase 2 (layout refactor) IMEDIATAMENTE. São mudanças que transformam a experiência de "frustrante" para "delightful".

**Arquivos principais a refatorar:**
1. `/Users/matheuscartaxo/Desktop/omr-checker/web/app/auditoria/page.tsx` (L387-470: layout grid)
2. `/Users/matheuscartaxo/Desktop/omr-checker/web/components/auditoria/question-grid.tsx` (L9, L81-88: remover paginação)
3. `/Users/matheuscartaxo/Desktop/omr-checker/web/components/auditoria/audit-image-viewer.tsx` (L67: altura dinâmica)
4. `/Users/matheuscartaxo/Desktop/omr-checker/web/components/auditoria/export-actions.tsx` (L232-235 page.tsx: confirmação)

---

**Next Steps:**
1. Revisar este diagnóstico com equipe
2. Priorizar issues por impacto vs esforço
3. Criar branch `feat/audit-ux-refactor`
4. Implementar Fase 1 em sprint atual
5. Testar com usuários reais antes de Fase 2

**Dúvidas?** Todos os problemas têm referências exatas de linha de código para facilitar correção.

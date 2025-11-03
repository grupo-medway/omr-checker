# 🔍 Auditoria do Código Atual - Interface de Auditoria

**Data:** 2025-10-09
**Propósito:** Mapear estado real do código ANTES de atualizar documentação

---

## ✅ O Que JÁ ESTÁ IMPLEMENTADO

### **Layout Atual**
- ✅ Grid 2-column: `lg:grid-cols-[320px_minmax(0,1fr)]` (L387)
- ✅ Sidebar esquerda: Lista de cartões (320px)
- ✅ Main direita: Nested grid `lg:grid-cols-[minmax(0,1fr)_480px]` (L401)
  - Coluna 1: Imagem (flex-1)
  - Coluna 2: Metadata + QuestionGrid + DecisionToolbar (480px)

**Arquivos:** `web/app/auditoria/page.tsx`

---

### **Componentes Shadcn/UI Disponíveis**
✅ **Instalados (2025-10-09):**
- `Badge` → badge.tsx
- `Dialog` → dialog.tsx
- `Checkbox` → checkbox.tsx
- `Popover` → popover.tsx
- `Collapsible` → collapsible.tsx
- `Tabs` → tabs.tsx
- `ScrollArea` → scroll-area.tsx
- `DropdownMenu` → dropdown-menu.tsx
- `Button` → button.tsx (já existia)

**Dependências adicionadas:**
```json
"@radix-ui/react-checkbox": "^1.3.3",
"@radix-ui/react-collapsible": "^1.1.12",
"@radix-ui/react-dialog": "^1.1.15",
"@radix-ui/react-dropdown-menu": "^2.1.16",
"@radix-ui/react-popover": "^1.1.15",
"@radix-ui/react-scroll-area": "^1.2.10",
"@radix-ui/react-tabs": "^1.1.13"
```

---

### **Props e Funções Reais**

#### **page.tsx**
```tsx
// ❌ ERRADO (docs antigos)
handleSelectAudit(id)
items

// ✅ CORRETO (código atual)
handleSelectItem(id)  // L166
listQuery.data?.items // L390
```

#### **AuditList** (L389-396)
```tsx
<AuditList
  items={listQuery.data?.items}          // ✅ Prop real
  isLoading={listQuery.isLoading}
  selectedId={selectedAuditId}
  onSelect={handleSelectItem}            // ✅ Função real
  filterStatus={filterStatus}
  onFilterStatus={setFilterStatus}
/>
```

#### **BatchSummary** (atual)
```tsx
<BatchSummary
  response={listQuery.data}              // ✅ Recebe AuditListResponse completo
  batchId={batchId}
  manifestInfo={manifestQuery.data}
  isRefreshing={listQuery.isRefetching}
/>

// Props reais (batch-summary.tsx L5-13):
type BatchSummaryProps = {
  response: AuditListResponse | undefined;
  batchId: string | null;
  manifestInfo?: { exported_at, exported_by } | null;
  isRefreshing?: boolean;
};
```

❌ **Docs assumiam props inexistentes:**
```tsx
totalCount={totalCount}      // NÃO existe
pendingCount={pendingCount}  // NÃO existe
resolvedCount={resolvedCount}// NÃO existe
```

✅ **Valores reais vêm de `response`:**
```tsx
response.pending   // ✅
response.resolved  // ✅
response.reopened  // ✅
response.total     // ✅
```

---

### **AuditImageViewer**
**Altura atual:** `h-[420px]` (L67 de audit-image-viewer.tsx)
- ✅ Altura fixa existe (problema identificado corretamente)
- ❌ Task 1 da Fase 1 marcada "não iniciado" mas problema confirmado

**Código:**
```tsx
<div className="relative flex h-[420px] flex-col overflow-hidden...">
  {/* ... */}
</div>
```

---

### **QuestionGrid**
**Paginação atual:** `PAGE_SIZE = 60` (L9 de question-grid.tsx)
- ✅ Paginação forçada existe (problema identificado corretamente)
- ❌ Virtual scroll NÃO implementado

**Issues highlighting atual:**
```tsx
// L138-149 (aproximado, precisa verificar styling exato)
className={`
  ${isActive ? "border-ring shadow-sm" : "border-border/60"}
  ${isIssue ? "bg-amber-500/10" : "bg-muted/10"}  // ❌ Opacity 10% imperceptível
`}
```

---

### **Estados e Variáveis (page.tsx)**

**✅ Existem:**
- `baselineAnswers` (L36)
- `baselineNotes` (L38)
- `showUnsavedDialog` (L39)
- `pendingNavigation` (L40)
- `selectedAuditId` (L33)
- `batchId` (L32)
- `answers` (L35)
- `notes` (L37)

**Computed values:**
```tsx
const listItems = useMemo(() => listQuery.data?.items ?? [], [listQuery.data]);
const totalItems = listItems.length;
const pendingCount = listQuery.data?.pending ?? 0;
const resolvedCount = listQuery.data?.resolved ?? 0;
const cardPosition = listItems.findIndex(item => item.id === selectedAuditId) + 1;
```

---

## ❌ O Que NÃO ESTÁ IMPLEMENTADO

### **Fase 1 - Quick Wins**
- ❌ Task 1: Altura dinâmica (h-[420px] ainda hardcoded)
- ❌ Task 2: Issues highlighting com borders coloridos
- ❌ Task 3: Collapsible sections (upload/summary/export sempre visíveis)
- ❌ Task 4: Keyboard shortcuts legend
- ❌ Task 5: Cleanup confirmation robusta (usa window.confirm nativo?)

### **Fase 2 - Layout Refactor**
- ❌ Task 6: 3-column layout (ainda 2-col + nested grid)
- ❌ Task 7: Virtual scroll (@tanstack/react-virtual não instalado)
- ❌ Task 8: Single scroll area (múltiplos scrolls ainda presentes)
- ❌ Task 9: Mobile tabs layout (não vejo tabs)

### **Fase 3 - Polish**
- ❌ Task 10: Toast non-blocking (modal ainda blocking?)
- ❌ Task 11: Batch summary trends (sem badges de delta)
- ❌ Task 12: Smart sorting (sem priorização por severity)
- ❌ Task 13: Progress indicator (não vejo no toolbar)
- ❌ Task 14: Auto-scroll issues (não implementado)

### **Fase 4 - Advanced**
- ❌ Todas tasks (bulk actions, side-by-side, export history, offline)

---

## 📦 Dependências Faltantes

### **Para Fase 2:**
```bash
npm install @tanstack/react-virtual  # Virtual scroll
```

### **Para Fase 4:**
```bash
npm install next-pwa idb  # Offline mode
```

---

## 🔧 Ajustes Necessários nos Docs

### **1. Props Corretos**

❌ **Mudar:**
```tsx
handleSelectAudit → handleSelectItem
items → listQuery.data?.items
totalCount (prop) → response.total (via BatchSummary)
```

✅ **Usar:**
```tsx
// page.tsx L166
const handleSelectItem = useCallback((id: number) => { ... }, []);

// BatchSummary - acessar via response
response.pending, response.resolved, response.total
```

---

### **2. Instalação Shadcn**

✅ **Adicionar no início de cada fase:**
```markdown
## ⚠️ Pré-requisitos

**Componentes Shadcn necessários:**
Já instalados em 2025-10-09. Se não estiverem disponíveis, instalar com:

\`\`\`bash
npx shadcn@latest add badge dialog checkbox popover collapsible tabs scroll-area dropdown-menu
\`\`\`
```

---

### **3. Status Real**

Atualizar ROADMAP.md:
- Fase 1: 0/5 (nenhuma task completada)
- Fase 2: 0/4
- Fase 3: 0/5
- Fase 4: 0/4 (opcional)

❌ **NÃO atualizar para "parcialmente completo"** porque:
- Layout atual (2-col nested) ≠ Layout alvo (3-col)
- Altura h-[420px] identificada mas não corrigida
- Issues highlighting identificado mas não implementado

---

### **4. Referências de Linha**

❌ **Linhas mudaram desde análise inicial:**
- audit-image-viewer.tsx: h-[420px] agora está em L67 (não L67 exato, verificar)
- question-grid.tsx: PAGE_SIZE em L9
- page.tsx: grid em L387-470

✅ **Solução:** Remover referências exatas de linha, usar busca por código:
```markdown
**Arquivo:** `audit-image-viewer.tsx`
**Buscar por:** `h-[420px]`
**Linha aproximada:** ~67
```

---

## 🎯 Próximos Passos

1. ✅ Atualizar ROADMAP.md com:
   - Pré-requisito: Shadcn instalado
   - Status: 0/18 tasks
   - Data: 2025-10-09
   - Props corretos (handleSelectItem, response.*)

2. ✅ Revisar Fase 1:
   - Code examples com props reais
   - Shadcn já disponível
   - Status: não iniciado (todas)

3. ✅ Revisar Fase 2-4:
   - Props corretos
   - Dependências explícitas
   - Backend changes (Fase 4 Task 17)

---

**Documento gerado:** 2025-10-09
**Propósito:** Base de verdade para atualização dos docs

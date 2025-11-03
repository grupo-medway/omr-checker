# 🎁 Fase 4: Advanced Features (Opcional)

**Duração:** 3-4 dias
**Impacto:** Diferenciação competitiva, features para power users
**Risco:** Médio-Alto (features complexas)
**Status:** 🔴 Não iniciado (0/4) - **OPCIONAL**

---

## 🎯 Objetivo da Fase

Adicionar features avançadas que:
- Aumentam produtividade de power users
- Diferenciam o produto competitivamente
- Permitem uso offline (crítico para alguns cenários)
- Reduzem tarefas repetitivas

**Resultado esperado:** Interface com features classe empresarial, adoption de power users.

---

## ⚠️ Pré-requisitos

**IMPORTANTE:** Esta fase é **OPCIONAL**. Execute apenas se:
- Fases 1-3 completas e validadas
- Feedback de usuários solicitou estas features
- Roadmap de produto prioriza diferenciação
- Time tem bandwidth (3-4 dias disponíveis)

**Validações:**
- [ ] Fases 1-3 deployadas e estáveis
- [ ] Métricas de sucesso alcançadas (tempo <2min/cartão, conclusão >90%)
- [ ] Feedback solicitando features específicas
- [ ] Aprovação de stakeholders para continuar

---

## ✅ Tasks

### ☑️ Task 15: Bulk Actions - Seleção Múltipla
**Estimativa:** 1 dia
**Prioridade:** 🟢 NICE TO HAVE
**Status:** 🔴 Não iniciado

#### Problema

Cenários onde auditor precisa aplicar mesma ação em múltiplas questões:
- 10 questões marcadas como "B" mas deveria ser "C"
- Desmarcar todas questões de uma seção (Q1-Q20)
- Marcar todas como "A" para testar

Atualmente, precisa clicar 1 por 1.

#### Solução

**Bulk actions:** Seleção múltipla + dropdown de ações.

#### Implementação

**Arquivo:** `web/components/auditoria/question-grid.tsx`

**Mudança 1 - Estado para seleção múltipla:**

```tsx
const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
const [bulkMode, setBulkMode] = useState(false);

const toggleSelection = (question: string) => {
  const newSet = new Set(selectedQuestions);
  if (newSet.has(question)) {
    newSet.delete(question);
  } else {
    newSet.add(question);
  }
  setSelectedQuestions(newSet);
};

const selectAll = () => {
  setSelectedQuestions(new Set(sortedResponses.map((r) => r.question)));
};

const deselectAll = () => {
  setSelectedQuestions(new Set());
};
```

**Mudança 2 - Header com bulk actions:**

```tsx
{/* Adicionar antes do virtual scroll container */}
<div className="flex items-center justify-between p-3 border-b bg-muted/30">
  <div className="flex items-center gap-2">
    <Checkbox
      checked={selectedQuestions.size === sortedResponses.length}
      onCheckedChange={(checked) => {
        if (checked) {
          selectAll();
        } else {
          deselectAll();
        }
      }}
    />
    <span className="text-sm font-medium">
      {selectedQuestions.size > 0
        ? `${selectedQuestions.size} selecionadas`
        : "Selecionar todas"}
    </span>
  </div>

  {selectedQuestions.size > 0 && (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Ações em lote
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Marcar todas como:</DropdownMenuLabel>
        {["A", "B", "C", "D", "E"].map((answer) => (
          <DropdownMenuItem
            key={answer}
            onClick={() => {
              selectedQuestions.forEach((q) => onChange(q, answer));
              deselectAll();
            }}
          >
            Resposta {answer}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            selectedQuestions.forEach((q) => onChange(q, ""));
            deselectAll();
          }}
          className="text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Desmarcar todas
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )}

  <Button
    variant="ghost"
    size="sm"
    onClick={() => {
      setBulkMode(!bulkMode);
      deselectAll();
    }}
  >
    {bulkMode ? "Sair do modo bulk" : "Modo seleção"}
  </Button>
</div>
```

**Mudança 3 - Adicionar checkbox em cada card (quando bulk mode ativo):**

```tsx
{/* Dentro do map de virtualRow */}
<article className="..." onClick={(e) => {
  if (bulkMode) {
    e.stopPropagation();
    toggleSelection(question);
  }
}}>
  {bulkMode && (
    <Checkbox
      checked={selectedQuestions.has(question)}
      onCheckedChange={() => toggleSelection(question)}
      className="absolute top-2 left-2 z-10"
    />
  )}
  {/* ... resto do conteúdo */}
</article>
```

#### Critérios de Aceite

- [ ] Toggle "Modo seleção" ativa bulk mode
- [ ] Checkbox aparece em cada card
- [ ] Selecionar todas/desmarcar todas funciona
- [ ] Dropdown com ações: A-E, Desmarcar
- [ ] Ação aplicada em todas selecionadas
- [ ] Contador "X selecionadas"

#### Como Testar

1. Ativar "Modo seleção"
2. Selecionar Q1, Q5, Q10
3. Dropdown → "Marcar como C"
4. Verificar que todas 3 mudaram para C
5. Selecionar todas → Desmarcar todas
6. Verificar que todas ficaram vazias

---

### ☑️ Task 16: Side-by-Side Image Comparison
**Estimativa:** 4 horas
**Prioridade:** 🟢 NICE TO HAVE
**Status:** 🔴 Não iniciado

#### Problema

Usuário precisa alternar entre original e marked (toggle) para comparar. Perde contexto visual ao trocar.

Cenário: detectar se marcação está correta requer comparação simultânea.

#### Solução

**Layout side-by-side:** Original à esquerda, Marked à direita, com sincronização de zoom/pan.

#### Implementação

**Arquivo:** `web/components/auditoria/audit-image-viewer.tsx`

**Mudança 1 - Estado para layout mode:**

```tsx
const [layoutMode, setLayoutMode] = useState<"single" | "side-by-side">("single");
```

**Mudança 2 - Toggle para layout:**

```tsx
{/* Adicionar ao header */}
{hasMarked && (
  <div className="flex items-center gap-2 mb-3">
    <Button
      variant={layoutMode === "single" ? "default" : "outline"}
      size="sm"
      onClick={() => setLayoutMode("single")}
    >
      <Maximize2 className="h-4 w-4" />
    </Button>
    <Button
      variant={layoutMode === "side-by-side" ? "default" : "outline"}
      size="sm"
      onClick={() => setLayoutMode("side-by-side")}
    >
      <Columns className="h-4 w-4" />
    </Button>
  </div>
)}
```

**Mudança 3 - Layout side-by-side:**

```tsx
{layoutMode === "single" ? (
  // Layout existente (toggle original/marked)
  <TransformWrapper>
    <TransformComponent>
      <img src={displayUrl} alt="Cartão OMR" />
    </TransformComponent>
  </TransformWrapper>
) : (
  // NOVO: Side-by-side com zoom sincronizado
  <div className="grid grid-cols-2 gap-4 h-full">
    {/* Original */}
    <div className="flex flex-col border rounded-lg overflow-hidden">
      <div className="bg-muted px-3 py-1.5 text-xs font-medium border-b">
        Original
      </div>
      <TransformWrapper
        ref={transformRef1}
        onTransformed={(state) => {
          // Sincronizar com marked
          if (transformRef2.current) {
            transformRef2.current.setTransform(
              state.positionX,
              state.positionY,
              state.scale
            );
          }
        }}
      >
        <TransformComponent wrapperClass="!h-full">
          <img src={imageUrl} alt="Original" className="w-full h-full object-contain" />
        </TransformComponent>
      </TransformWrapper>
    </div>

    {/* Marked */}
    <div className="flex flex-col border rounded-lg overflow-hidden">
      <div className="bg-muted px-3 py-1.5 text-xs font-medium border-b">
        Marked
      </div>
      <TransformWrapper
        ref={transformRef2}
        onTransformed={(state) => {
          // Sincronizar com original
          if (transformRef1.current) {
            transformRef1.current.setTransform(
              state.positionX,
              state.positionY,
              state.scale
            );
          }
        }}
      >
        <TransformComponent wrapperClass="!h-full">
          <img src={markedImageUrl} alt="Marked" className="w-full h-full object-contain" />
        </TransformComponent>
      </TransformWrapper>
    </div>
  </div>
)}
```

**Mudança 4 - Refs para sincronização:**

```tsx
import { useRef } from "react";
import type { ReactZoomPanPinchRef } from "react-zoom-pan-pinch";

const transformRef1 = useRef<ReactZoomPanPinchRef | null>(null);
const transformRef2 = useRef<ReactZoomPanPinchRef | null>(null);
```

#### Critérios de Aceite

- [ ] Toggle entre single/side-by-side funciona
- [ ] Side-by-side: 2 imagens lado a lado
- [ ] Zoom em uma sincroniza com outra
- [ ] Pan sincronizado
- [ ] Labels "Original" e "Marked" claros

#### Como Testar

1. Cartão com marked image
2. Clicar botão "Columns" → layout side-by-side
3. Dar zoom na imagem esquerda → direita acompanha
4. Pan para ver detalhe → ambas movem juntas
5. Clicar "Maximize" → volta para single

---

### ☑️ Task 17: Export History
**Estimativa:** 4 horas
**Prioridade:** 🟢 NICE TO HAVE
**Status:** 🔴 Não iniciado

#### Problema

Após exportar CSV múltiplas vezes, usuário perde controle:
- Qual foi a última versão?
- Quando exportei?
- Posso baixar versões anteriores?

#### Solução

**Export history:** Lista de exportações anteriores com timestamp e link de download.

#### Implementação

**Backend (API) - Salvar histórico:**

**Arquivo:** `api/routes/audits.py`

**Mudança 1 - Criar modelo de ExportHistory:**

**Arquivo:** `api/db/models.py`

```python
class ExportHistory(SQLModel, table=True):
    __tablename__ = "export_history"

    id: int | None = Field(default=None, primary_key=True)
    batch_id: str = Field(index=True)
    exported_at: datetime = Field(default_factory=datetime.utcnow)
    exported_by: str
    file_path: str  # path relativo em storage/
    file_size: int  # bytes
    total_items: int
```

**Mudança 2 - Salvar no endpoint de export:**

```python
# Em /api/audits/export POST
history_entry = ExportHistory(
    batch_id=batch_id,
    exported_at=datetime.utcnow(),
    exported_by=audit_user,
    file_path=csv_path,
    file_size=os.path.getsize(csv_path),
    total_items=len(results),
)
db.add(history_entry)
db.commit()
```

**Mudança 3 - Endpoint para listar histórico:**

```python
@router.get("/audits/export-history/{batch_id}")
async def get_export_history(
    batch_id: str,
    db: Session = Depends(get_db),
):
    history = db.exec(
        select(ExportHistory)
        .where(ExportHistory.batch_id == batch_id)
        .order_by(ExportHistory.exported_at.desc())
    ).all()

    return [
        {
            "id": entry.id,
            "exported_at": entry.exported_at,
            "exported_by": entry.exported_by,
            "file_size": entry.file_size,
            "total_items": entry.total_items,
            "download_url": f"/api/audits/export/{batch_id}/download/{entry.id}",
        }
        for entry in history
    ]
```

**Frontend:**

**Arquivo:** `web/components/auditoria/export-actions.tsx`

**Mudança 1 - Query para histórico:**

```tsx
import { useQuery } from "@tanstack/react-query";

const historyQuery = useQuery({
  queryKey: ["export-history", batchId],
  queryFn: async () => {
    const res = await fetch(`/api/audits/export-history/${batchId}`);
    return res.json();
  },
  enabled: Boolean(batchId),
});
```

**Mudança 2 - Popover com histórico:**

```tsx
<div className="flex items-center gap-2">
  <Button onClick={handleExport} disabled={...}>
    Exportar CSV
  </Button>

  {historyQuery.data && historyQuery.data.length > 0 && (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="h-4 w-4" />
          Histórico ({historyQuery.data.length})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Exportações Anteriores</h4>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {historyQuery.data.map((entry: any) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-2 border rounded hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {new Date(entry.exported_at).toLocaleString("pt-BR")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Por {entry.exported_by} • {entry.total_items} itens •{" "}
                      {(entry.file_size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <a href={entry.download_url} download>
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  )}
</div>
```

#### Critérios de Aceite

- [ ] Histórico persiste no banco (export_history table)
- [ ] Lista ordenada por data (mais recente primeiro)
- [ ] Mostra: data, usuário, tamanho, count de itens
- [ ] Link de download funciona
- [ ] Badge com count de exportações

#### Como Testar

1. Exportar CSV → primeira exportação
2. Resolver mais cartões, exportar novamente
3. Clicar "Histórico (2)" → popover abre
4. Verificar 2 entradas com timestamps corretos
5. Clicar download na primeira → baixa CSV v1

---

### ☑️ Task 18: Offline Mode com Service Worker
**Estimativa:** 2 dias
**Prioridade:** 🟢 NICE TO HAVE (mas crítico para alguns cenários)
**Status:** 🔴 Não iniciado

#### Problema

Cenários onde internet é instável ou inexistente:
- Auditoria em escolas rurais
- Internet corporativa com bloqueios
- Viagens, fieldwork

Atualmente, aplicação quebra sem internet.

#### Solução

**PWA com offline support:**
- Service Worker para cache de assets
- IndexedDB para queue de decisões offline
- Sync automático quando online

#### Implementação

**Passo 1 - Configurar Next.js PWA:**

```bash
npm install next-pwa
```

**Arquivo:** `next.config.js`

```js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

module.exports = withPWA({
  // ... existing config
});
```

**Passo 2 - Criar manifest:**

**Arquivo:** `public/manifest.json`

```json
{
  "name": "OMR Auditoria",
  "short_name": "OMR Audit",
  "description": "Sistema de auditoria de cartões OMR",
  "start_url": "/auditoria",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Passo 3 - IndexedDB para queue:**

**Arquivo:** `web/lib/offline-queue.ts` (novo)

```ts
import { openDB, DBSchema } from 'idb';

interface OfflineQueueDB extends DBSchema {
  decisions: {
    key: number;
    value: {
      id: number;
      auditId: number;
      answers: Record<string, string>;
      notes: string;
      timestamp: number;
    };
  };
}

const DB_NAME = 'omr-audit-offline';
const DB_VERSION = 1;

export async function getDB() {
  return openDB<OfflineQueueDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('decisions')) {
        db.createObjectStore('decisions', { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

export async function queueDecision(auditId: number, answers: Record<string, string>, notes: string) {
  const db = await getDB();
  await db.add('decisions', {
    auditId,
    answers,
    notes,
    timestamp: Date.now(),
  });
}

export async function getQueuedDecisions() {
  const db = await getDB();
  return db.getAll('decisions');
}

export async function clearQueuedDecision(id: number) {
  const db = await getDB();
  await db.delete('decisions', id);
}
```

**Passo 4 - Hook para sync:**

**Arquivo:** `web/hooks/use-offline-sync.ts` (novo)

```ts
import { useEffect } from 'react';
import { useOnlineStatus } from './use-online-status';
import { getQueuedDecisions, clearQueuedDecision } from '@/lib/offline-queue';
import { useSubmitDecisionMutation } from './useAuditoria';

export function useOfflineSync() {
  const isOnline = useOnlineStatus();
  const submitMutation = useSubmitDecisionMutation();

  useEffect(() => {
    if (!isOnline) return;

    // Quando volta online, processar queue
    async function syncQueue() {
      const queue = await getQueuedDecisions();

      for (const item of queue) {
        try {
          await submitMutation.mutateAsync({
            id: item.auditId,
            answers: item.answers,
            notes: item.notes,
          });

          await clearQueuedDecision(item.id);
        } catch (error) {
          console.error('Erro ao sincronizar:', error);
          // Mantém na queue para tentar novamente
        }
      }
    }

    syncQueue();
  }, [isOnline, submitMutation]);
}
```

**Passo 5 - Usar no page.tsx:**

```tsx
import { useOfflineSync } from '@/hooks/use-offline-sync';

export default function AuditoriaPage() {
  useOfflineSync(); // Auto-sync quando online

  const handleSaveDecision = async () => {
    if (!navigator.onLine) {
      // Offline: adicionar à queue
      await queueDecision(selectedAuditId!, answers, notes);
      toast.success("Salvo offline. Sincronizará quando online.");
    } else {
      // Online: submit direto
      await submitMutation.mutateAsync({ ... });
    }
  };

  // ... resto
}
```

#### Critérios de Aceite

- [ ] PWA instalável (manifest + service worker)
- [ ] Assets em cache (CSS, JS, fonts)
- [ ] Decisões offline vão para IndexedDB
- [ ] Sync automático ao voltar online
- [ ] Badge mostrando "X pendentes offline"
- [ ] Toast informando quando offline/online

#### Como Testar

1. Instalar PWA (Chrome → 3 pontos → Instalar app)
2. Desconectar internet
3. Resolver cartão, salvar → "Salvo offline"
4. Verificar IndexedDB (DevTools → Application → IndexedDB)
5. Reconectar internet → auto-sync
6. Verificar que decisão foi enviada ao servidor

---

## 📊 Validação da Fase

### Antes de Considerar Completa

- [ ] Todas as 4 tasks implementadas (se decidir fazer)
- [ ] Bulk actions testado com 50+ questões selecionadas
- [ ] Side-by-side sincronização perfeita
- [ ] Export history funcionando com 10+ exportações
- [ ] Offline mode testado em 3 cenários (offline → online)

### Checklist de QA

**Bulk Actions:**
- [ ] Seleção múltipla funciona
- [ ] Ações aplicadas corretamente
- [ ] Performance mantida (selection de 100+ questões)

**Side-by-Side:**
- [ ] Zoom sincronizado
- [ ] Pan sincronizado
- [ ] Layout responsivo (mobile degrada gracefully)

**Export History:**
- [ ] Histórico persiste
- [ ] Downloads funcionam
- [ ] Ordenação correta (mais recente primeiro)

**Offline Mode:**
- [ ] PWA instalável
- [ ] Queue funciona offline
- [ ] Sync funciona ao voltar online
- [ ] Sem perda de dados

---

## 🚀 Decisão: Fazer ou Não Fazer?

### Fatores para Decidir SIM:

- [ ] Usuários solicitaram explicitamente estas features
- [ ] Concorrência oferece features similares
- [ ] ROI justifica 3-4 dias de desenvolvimento
- [ ] Offline mode é crítico para casos de uso reais
- [ ] Time tem bandwidth disponível

### Fatores para Decidir NÃO (Deploy Fase 3):

- [ ] Fases 1-3 já alcançaram métricas de sucesso
- [ ] Usuários satisfeitos com funcionalidade atual
- [ ] Prioridade é deploy e coletar feedback real
- [ ] Features avançadas podem vir em iteração futura
- [ ] Time precisa focar em outros projetos

---

## 📈 ROI Estimado

**Investimento:** 3-4 dias dev + 1 dia QA = ~30h

**Retorno:**
- **Bulk actions:** ~30% redução de tempo em lotes com erros padrão (ex: gabarito errado)
- **Side-by-side:** ~20% melhoria em acurácia de detecção de erros
- **Export history:** Reduz confusão, evita reexportações desnecessárias
- **Offline mode:** **Crítico** se cenário de uso é fieldwork sem internet

**Recomendação:** Priorizar **Task 18 (Offline)** se cenário é crítico. Demais tasks podem aguardar feedback pós-deploy.

---

**Última atualização:** 2025-10-09
**Status:** 🔴 Aguardando decisão de stakeholders

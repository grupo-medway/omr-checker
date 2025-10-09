# 🎨 Roadmap: Polimento UI/UX - Interface de Auditoria OMR

**Data:** 2025-10-09
**Status:** 🟡 Em Planejamento
**Objetivo:** Transformar a experiência de auditoria de cartões OMR, reduzindo tempo de processamento em 60% e melhorando usabilidade drasticamente.

---

## 📊 Métricas de Sucesso

| Métrica | Antes | Meta | Impacto |
|---------|-------|------|---------|
| Tempo/cartão | 3-5 min | 1-2 min | -60% |
| Cliques/auditoria | 15-20 | 5-8 | -60% |
| Scrolls/cartão | 10-15 | 2-3 | -80% |
| Taxa abandono | 30% | <10% | -70% |
| Viewport utilizado | 60% | 95% | +35% |

---

## 🗓️ Timeline Estimado

| Fase | Duração | Status | Progresso |
|------|---------|--------|-----------|
| **Fase 1: Quick Wins** | 1-2 dias | 🔴 Não iniciado | 0/5 |
| **Fase 2: Layout Refactor** | 3-5 dias | 🔴 Não iniciado | 0/4 |
| **Fase 3: Polish** | 2-3 dias | 🔴 Não iniciado | 0/5 |
| **Fase 4: Advanced** | 3-4 dias | ⚪ Opcional | 0/4 |
| **TOTAL** | 6-10 dias | - | **0/18** |

---

## ✅ Checklist de Progresso

### 🚀 Fase 1: Quick Wins (1-2 dias)
*Melhorias rápidas com 30% de impacto na UX*

- [ ] **Task 1:** Image Viewer altura dinâmica (30min)
- [ ] **Task 2:** Issues highlighting com borders coloridos (4h)
- [ ] **Task 3:** Collapsible upload/summary/export (3h)
- [ ] **Task 4:** Keyboard shortcuts legend (2h)
- [ ] **Task 5:** Cleanup confirmation robusta (4h)

**Total:** ~14h | **Doc:** [fase-1-quick-wins.md](./fase-1-quick-wins.md)

---

### 🏗️ Fase 2: Layout Refactor (3-5 dias)
*Transformação estrutural da interface*

- [ ] **Task 6:** 3-column layout desktop (2 dias)
- [ ] **Task 7:** Virtual scroll com @tanstack/react-virtual (1 dia)
- [ ] **Task 8:** Remover scrolls conflitantes (1 dia)
- [ ] **Task 9:** Mobile tabs layout (4h)

**Total:** ~4.5 dias | **Doc:** [fase-2-layout-refactor.md](./fase-2-layout-refactor.md)

---

### ✨ Fase 3: Polish (2-3 dias)
*Refinamento e otimizações*

- [ ] **Task 10:** Toast non-blocking para unsaved changes (2h)
- [ ] **Task 11:** Batch summary com trends/deltas (3h)
- [ ] **Task 12:** Smart sorting por severity (2h)
- [ ] **Task 13:** Progress indicator no toolbar (2h)
- [ ] **Task 14:** Auto-scroll para primeira issue (1h)

**Total:** ~10h | **Doc:** [fase-3-polish.md](./fase-3-polish.md)

---

### 🎁 Fase 4: Advanced Features (3-4 dias) - OPCIONAL
*Features avançadas para power users*

- [ ] **Task 15:** Bulk actions - seleção múltipla (1 dia)
- [ ] **Task 16:** Side-by-side image comparison (4h)
- [ ] **Task 17:** Export history (4h)
- [ ] **Task 18:** Offline mode com Service Worker (2 dias)

**Total:** ~3.5 dias | **Doc:** [fase-4-advanced.md](./fase-4-advanced.md)

---

## 🎯 Priorização e Estratégia

### Execução Recomendada

#### Sprint 1: Fase 1 ✅
**Por quê:** Melhorias rápidas, baixo risco, alto ROI
**Resultado:** UX 30% melhor em 1-2 dias
**Validação:** Testar com usuários reais antes de prosseguir

#### Sprint 2: Fase 2 🏗️
**Por quê:** Transforma experiência desktop/mobile
**Resultado:** Interface classe A
**Validação:** QA completo, testar em múltiplas resoluções

#### Sprint 3: Fase 3 ✨
**Por quê:** Refinamentos e produtividade
**Resultado:** Interface polida profissionalmente
**Validação:** Métricas de tempo/cliques antes e depois

#### Sprint 4: Fase 4 (Opcional) 🎁
**Por quê:** Features avançadas, não críticas
**Resultado:** Diferenciação competitiva
**Validação:** A/B test com power users

---

## 🔍 Arquivos Principais a Modificar

### Core Components
1. `web/app/auditoria/page.tsx` (L387-470) - Layout principal
2. `web/components/auditoria/question-grid.tsx` (L9, L81-88) - Paginação
3. `web/components/auditoria/audit-image-viewer.tsx` (L67) - Altura
4. `web/components/auditoria/export-actions.tsx` - Confirmação cleanup

### Supporting Components
5. `web/components/auditoria/upload-form.tsx` - Collapsible
6. `web/components/auditoria/batch-summary.tsx` - Trends
7. `web/components/auditoria/audit-list.tsx` - Smart sorting
8. `web/components/auditoria/decision-toolbar.tsx` - Progress indicator

### New Components
9. `web/components/auditoria/keyboard-shortcuts-legend.tsx` (novo)
10. `web/components/auditoria/cleanup-confirmation-dialog.tsx` (novo)
11. `web/components/auditoria/unsaved-changes-toast.tsx` (novo)

---

## 📦 Dependências a Instalar

```bash
# Fase 2: Virtual Scroll
npm install @tanstack/react-virtual

# Fase 4 (opcional): Offline Mode
npm install workbox-webpack-plugin
```

---

## 🧪 Estratégia de Testes

### Por Fase

**Fase 1:**
- ✅ Visual regression tests
- ✅ Keyboard navigation
- ✅ Responsividade (mobile/tablet/desktop)

**Fase 2:**
- ✅ Performance benchmarks (FPS, render time)
- ✅ Scroll behavior em diferentes resoluções
- ✅ Layout em 5 viewports (mobile, tablet, laptop, desktop, 4K)

**Fase 3:**
- ✅ User acceptance testing
- ✅ Métricas de tempo/cliques
- ✅ Acessibilidade (WCAG AA)

**Fase 4:**
- ✅ Offline functionality
- ✅ Bulk actions edge cases
- ✅ Export history limits

---

## 🚨 Riscos e Mitigações

### Riscos Identificados

1. **Refactor Fase 2 pode quebrar testes existentes**
   - **Mitigação:** Rodar suite completa antes/depois, branch separada

2. **Virtual scroll pode ter bugs com questões dinâmicas**
   - **Mitigação:** Testar com 50, 100, 200+ questões

3. **Mobile layout pode não funcionar em todas devices**
   - **Mitigação:** Testar em BrowserStack (iOS/Android 10 devices)

4. **Performance pode degradar em máquinas antigas**
   - **Mitigação:** Lighthouse CI, benchmark em CPU 4x slowdown

---

## 📈 Como Medir Sucesso

### Métricas Técnicas
- [ ] Lighthouse Score: Performance >90
- [ ] First Contentful Paint: <1.5s
- [ ] Time to Interactive: <3s
- [ ] Cumulative Layout Shift: <0.1

### Métricas de UX
- [ ] Tempo médio de auditoria: <2 min/cartão
- [ ] Taxa de erros: <5%
- [ ] Taxa de conclusão: >90%
- [ ] NPS (Net Promoter Score): >8/10

### Métricas de Acessibilidade
- [ ] WCAG AA compliance: 100%
- [ ] Keyboard navigation: 100% funcional
- [ ] Screen reader compatibility: Testado com NVDA/VoiceOver

---

## 🎓 Decisões de Design

### Trade-offs Aceitos

1. **Virtual Scroll vs Paginação**
   - **Escolha:** Virtual scroll
   - **Razão:** Contexto visual completo > performance marginal

2. **3-column vs 2-column Layout**
   - **Escolha:** 3 colunas em desktop (List | Image | Questions)
   - **Razão:** Maximiza viewport usage, reduz scrolling

3. **Toast vs Modal para Unsaved Changes**
   - **Escolha:** Toast non-blocking
   - **Razão:** Fluxo menos interruptivo, power users navegam rápido

4. **Radix Dialog vs window.confirm**
   - **Escolha:** Radix Dialog customizado
   - **Razão:** Branded, mais seguro (checkbox + countdown)

---

## 📚 Recursos e Referências

### Documentação
- [Diagnóstico Completo](./auditoria-ui-ux-polimento.md) - 1000+ linhas de análise
- [Fase 1: Quick Wins](./fase-1-quick-wins.md) - Guia de implementação
- [Fase 2: Layout Refactor](./fase-2-layout-refactor.md) - Transformação estrutural
- [Fase 3: Polish](./fase-3-polish.md) - Refinamentos
- [Fase 4: Advanced](./fase-4-advanced.md) - Features avançadas (opcional)

### Ferramentas
- [Radix UI](https://www.radix-ui.com/) - Componentes acessíveis
- [TanStack Virtual](https://tanstack.com/virtual/latest) - Virtual scrolling
- [React Hot Toast](https://react-hot-toast.com/) - Toast notifications
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS

### Inspiração
- Linear.app - Keyboard shortcuts, performance
- Notion - Layout adaptativo, virtual scrolling
- Vercel Dashboard - Clean UI, subtle animations

---

## 🚀 Próximos Passos

1. ✅ Revisar este roadmap com equipe de desenvolvimento
2. ✅ Criar branch `feat/audit-ux-phase-1`
3. 🔜 Implementar Fase 1 (1-2 dias)
4. 🔜 Validar com 3-5 usuários beta
5. 🔜 Ajustar baseado em feedback
6. 🔜 Prosseguir para Fase 2

---

## 📞 Contato e Feedback

**Owner:** Equipe Frontend
**Slack:** #auditoria-ui-ux
**GitHub Issues:** Tag com `ui-ux-polish`

---

**Última atualização:** 2025-10-09
**Versão:** 1.0.0

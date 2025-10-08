# Fase 3 – Frontend de Auditoria

## Objetivos
- Criar interface única para upload, revisão e correção manual dos cartões.
- Garantir experiência fluida com foco em produtividade e clareza de erros.
- Integrar com as APIs de auditoria disponibilizadas no backend.

## Escopo
- Página `/auditoria` desktop-first com fluxo completo de trabalho.
- Componentes dedicados para visualização de imagem, grid de questões e painel de status.
- Integração com endpoints: upload, listagem de cartões, detalhe, decisão, exportação e limpeza.
- Testes de componentes e fluxo com mocks de API.

## Tarefas
1. **Estrutura da página**
   - Implementar formulário de upload (seleção de template + ZIP) consumindo `/api/templates` e `POST /api/process-omr`.
   - Exibir resumo do lote processado (total, pendentes, resolvidos) e ações rápidas.
2. **Lista de cartões**
   - Sidebar ou painel com cartões problemáticos, filtros por status e busca por identificador.
   - Indicadores visuais de pendência, número de issues e tempo desde ingestão.
3. **Split-view de auditoria**
   - Componente `AuditImageViewer` com zoom, pan e destaque das questões sinalizadas.
   - `QuestionGrid` com botões A–E/∅, comparação lido vs corrigido, atalhos de teclado e estados de validação.
   - Botões “Salvar correção”, “Marcar como resolvido” e navegação rápida (setas/atalhos).
4. **Exportação e limpeza**
   - Ações visíveis para download do CSV corrigido e limpeza do lote, com modais de confirmação.
   - Feedback de progresso (loading, toasts) e tratamento de erros.
5. **Estado e dados**
   - Utilizar React Query para cache/invalidar dados (lista, item, exportação).
   - Armazenar alterações locais com auto-save opcional ou aviso de mudanças não salvas.
6. **Testes**
   - Componentes: `QuestionGrid`, `AuditImageViewer`, `UploadForm` com React Testing Library.
   - Fluxo integrado com mocks: upload → selecionar cartão → editar → salvar → exportar.

## Riscos e Mitigações
- **Performance com muitas questões** → paginar ou agrupar grid acima de 60 itens e memoizar componentes.
- **Imagens pesadas** → carregar via streaming/URL estática com lazy loading e fallback.
- **URLs de imagens relativas** → garantir que `NEXT_PUBLIC_API_URL` aponte para o backend para que o viewer resolva `/static/...` corretamente.
- **Erros UX** → prototipar fluxo com usuários internos antes de consolidar interações.

## Critérios de Aceite
- Usuário consegue processar lote, revisar cartões, corrigir e exportar CSV em uma única tela.
- UI destaca claramente diferenças entre leitura automática e correção manual.
- Testes de componentes e fluxo passam, garantindo estabilidade básica da interface.

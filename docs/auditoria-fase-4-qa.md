# Fase 4 – Estabilização e QA

## Objetivos
- Consolidar estabilidade, segurança e performance do fluxo de auditoria.
- Validar o produto frente às metas de tempo e confiabilidade estabelecidas.
- Preparar o pacote final de entrega e execução local.

## Escopo
- Hardening de validações, logs e monitoração básica.
- Testes finais (backend, frontend, integração e e2e).
- Automatizações de execução (scripts, Docker Compose, Makefile).
- Checklist de release interno.

## Tarefas
1. **Validações e segurança**
   - Revisar inputs das APIs (limites, tipos, autenticação opcional) e adicionar testes negativos.
   - Implementar lock básico para evitar condições de corrida (upload simultâneo, exportação concorrente).
   - Garantir limpeza idempotente e logs claros em caso de falha.
2. **Performance e monitoramento**
   - Medir tempo de processamento para lote de 100 cartões, identificar gargalos e otimizar I/O.
   - Adicionar métricas simples (tempo por cartão, pendentes vs resolvidos, throughput).
   - Configurar níveis de log e flags para depuração.
3. **Automação operacional**
   - Criar script Make ou Docker Compose orquestrando FastAPI, Next.js e SQLite.
   - Adicionar comando `make audit-demo` (ou similar) processando lote exemplo end-to-end.
4. **Testes finais**
   - Rodar suite completa: lint, pytest, integração, testes frontend (React Testing Library) e e2e (Playwright/Cypress headless).
   - Documentar resultados, anexar relatórios relevantes.
5. **Checklist de release**
   - Validar critérios de sucesso (100 cartões < 30 minutos, 0 erros pendentes).
   - Preparar nota de release com riscos remanescentes e próximos passos.

## Riscos e Mitigações
- **Tempo acima da meta** → profiling antecipado e ajustes em fases anteriores, priorizar otimizações com maior impacto.
- **Testes flaky** → investir em mocks determinísticos e ambientes isolados.
- **Ambiente difícil de reproduzir** → scripts automatizados e documentação curta de setup.

## Critérios de Aceite
- Todas as suites de testes executam sem falhas em ambiente limpo.
- Scripts operacionais permitem subir e derrubar o sistema facilmente.
- Relatório final atesta cumprimento de metas e lista próximos passos.

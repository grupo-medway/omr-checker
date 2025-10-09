# Fase 1 – Backend Core de Auditoria

## Objetivos
- Persistir cartões problemáticos gerados pelo processamento OMR.
- Disponibilizar APIs para consulta e atualização de decisões de auditoria.
- Garantir acesso controlado às imagens e aos dados necessários para revisão manual.

## Escopo
- Ajustes no pipeline `OMRProcessor` para capturar metadados e registrar auditoria.
- Endpoints REST para listar, detalhar e atualizar itens em auditoria.
- Servir arquivos estáticos necessários para visualização (imagens marcadas e originais).
- Cobertura de testes integrados simulando fluxo de auditoria backend.

## Tarefas
1. **Persistência de auditoria**
   - Estender `OMRProcessor.process_omr_files` para salvar `AuditItem` (status `pending`, `issues`, paths) e `AuditResponse` (respostas lidas).
   - Garantir que CSV `Results` inclua identificador único por cartão para reconciliação.
2. **Endpoints principais**
   - `GET /api/audits`: suporta filtros por status, template, data; resposta paginada com contadores.
   - `GET /api/audits/{id}`: retorna dados completos (respostas, issues, paths para imagens, metadados do template).
   - `POST /api/audits/{id}/decision`: recebe mapa de respostas corrigidas e notas opcionais; atualiza status e registra histórico.
   - (Opcional) `PATCH /api/audits/{id}/status` para reabrir cartões, se necessário.
3. **Serviço de arquivos**
   - Configurar `StaticFiles` para expor diretórios de imagens processadas e originais com rotas dedicadas.
   - Assegurar que paths retornados pelos endpoints sejam relativos às rotas estáticas.
4. **Validações e erros**
   - Estruturar responses padronizadas (`pydantic`) com mensagens claras.
   - Tratar casos de itens inexistentes, upload duplicado, e exceções do pipeline.
5. **Testes**
   - Integração: upload ZIP → criação de registros → consulta `GET /api/audits` → fetch `GET /api/audits/{id}`.
   - Testes unitários para serviços auxiliares (mapeamento de paths, serialização de issues).

## Riscos e Mitigações
- **Desalinhamento entre CSV e banco** → definir chave única e testes garantindo consistência.
- **Carga pesada nos endpoints** → paginação e limites de payload (lazy loading de imagens via URLs).
- **Erros silenciosos no pipeline** → logging estruturado e propagação de exceptions amigáveis.

## Critérios de Aceite
- Upload conclui com itens pendentes registrados no banco.
- APIs retornam dados suficientes para renderizar auditoria sem depender de arquivos locais.
- Testes integrados passam com lote de exemplo, demonstrando fluxo completo backend.

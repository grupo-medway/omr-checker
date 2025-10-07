# Plano MVP – Auditoria Manual de Cartões OMR

## 1. Objetivos e Escopo
- **Propósito:** permitir correção manual confiável dos cartões com leitura problemática, garantindo 100% de efetividade nos lotes auditados.
- **Escopo inicial (MVP):** upload único de ZIP, processamento síncrono, revisão manual imediatamente após o processamento e exportação de um `Results_Corrigidos.csv`.
- **Métricas de sucesso:** processar e corrigir um lote de 100 cartões em < 30 minutos com 0 erros não resolvidos.
- **Requisitos não-funcionais:** resposta da interface < 1s por item, execução local/offline usando armazenamento em disco.
- **Fora do escopo (por ora):** relatórios avançados, notificações automáticas, autenticação robusta, integrações externas.

## 2. Arquitetura Geral Simplificada

### 2.1 Fluxo de Dados
1. **Upload Web:** usuário escolhe o tipo de cartão (template/sample) e envia o ZIP correspondente pela interface Next.js.
2. **Processamento OMR:** reaproveitar o endpoint existente `POST /api/process-omr`, que já valida o template, copia `template.json` / `config.json` / `evaluation.json` (quando houver) e roda o pipeline síncronamente gerando CSVs e imagens marcadas.
3. **Auditoria Imediata:** estender a resposta do `OMRProcessor` para devolver lista de cartões problemáticos (paths + dados lidos); frontend exibe split-view para correção humana.
4. **Correção Manual:** usuário ajusta respostas problemáticas; backend aplica mudanças em memória e persiste em armazenamento simples (SQLite/CSV).
5. **Exportação:** usuário baixa `Results_Corrigidos.csv` e pode acionar botão “Limpar” para remover temporários.

### 2.2 Componentes
- **Backend FastAPI (`api/`):** endpoints mínimos para processar ZIP, buscar detalhes de um cartão e salvar decisão.
- **Core OMR (`src/`):** reaproveitado sem modificações estruturais; apenas expõe arquivos gerados.
- **Frontend Next.js (`web/`):** uma página desktop-first com upload, lista de erros e interface de correção.
- **Armazenamento:** SQLite local (ou estrutura em arquivos/CSV) para registrar decisões e permitir reabertura de cartões.

## 3. Backend – Especificação MVP

### 3.1 Modelagem de Dados

| Tabela | Campos principais | Observações |
| --- | --- | --- |
| `audit_items` | `id`, `file_id`, `template`, `issues` (array ou JSON), `image_path`, `marked_image_path`, `raw_answers` (JSON), `status` (`pending`, `resolved`), `created_at`, `updated_at` | Estrutura mínima para reabrir cartões. |
| `audit_responses` | `id`, `audit_item_id`, `question`, `read_value`, `corrected_value` | Permite lidar com provas de até 180 questões. |

### 3.2 Processamento Integrado
- Reutilizar `POST /api/process-omr`
  - Entrada e validações já existentes (ZIP + `template`).
  - Ajustar `FileHandler.copy_template_files` para garantir inclusão de referências necessárias e retornar metadados úteis.
  - Alterar `OMRProcessor.process_omr_files` para retornar, além do `ProcessResponse` atual, a lista de cartões que exigem auditoria (incluindo caminhos das imagens processadas e dados lidos por questão).
  - Persiste `audit_items` e `audit_responses` em SQLite/CSV.
  - Retorna lista resumida (`audit_item_id`, `file_id`, `issues`, paths de imagem) para o frontend.

### 3.3 Auditoria e Correção
- `GET /api/audits/{id}`
  - Retorna dados completos do item: caminho da imagem original/processada (frontend carrega via `<img src="/static/...">`), respostas lidas e questões com erro.
- `POST /api/audits/{id}/decision`
  - Corpo: `answers` (mapa `question` → `A|B|C|D|E|UNMARKED`), `notes` opcionais.
  - Atualiza `audit_responses.corrected_value`, marca `audit_items.status = resolved`, regenera `Results_Corrigidos.csv` combinando respostas corrigidas com o CSV original.
- `(Opcional futuro)` reabertura de item (`PATCH /status`), mas pode ser adiado.

### 3.4 Reconciliação Simplificada
- Função direta que lê `Results` original, aplica correções de `audit_responses` e escreve `Results_Corrigidos.csv`.
- Em caso de falha, mantém item em `pending` e retorna erro para a interface.

### 3.5 Segurança e Testes
- Para uso local, autenticação pode ser mínima (token simples). Validar ZIP contra path traversal.
- Testes prioritários: fluxo completo upload → auditoria → CSV corrigido usando fixtures de cartões.

## 4. Frontend – Especificação Desktop

### 4.1 Layout
- Página única `/auditoria`:
  - **Seção Upload:** formulário com seleção do template/sample (consumindo `GET /api/templates` já existente) e envio do ZIP, além do botão “Processar”.
  - **Lista de Cartões:** tabela ou lista lateral com cartões problemáticos, `file_id`, tipos de erro, status.
  - **Split-View:**
    - **Esquerda:** imagem original com zoom e highlight das questões indicadas (anchors geradas a partir de `issues`).
    - **Direita:** grid scrollável de questões (1..180) com botões `A–E` + `∅` (`UNMARKED`), pré-selecionando valor lido e destacando problemas.
  - **Ações:** “Salvar correção”, “Exportar CSV Corrigido”, “Limpar temporários”.

### 4.2 Estado e Integração
- Usar React Query para cachear respostas de `GET /api/audits/{id}`.
- Evitar base64 grande: frontend requisita caminhos de arquivo servidos estáticamente.
- Não implementar locks complexos; cenário de uso é single-user.
- Basear a UI nos componentes shadcn/ui já configurados no projeto (`components.json`), reutilizando botões, tabelas, dialogs e inputs para garantir consistência visual.

### 4.3 UX Essencial
- Navegação rápida (setas) entre cartões.
- Indicar diferenças `lido vs corrigido` em cada questão.
- Mostrar contador de itens pendentes/resolvidos e tempo estimado.
- Validar e alertar se o template não possuir `evaluation.json` (sem recálculo de nota) ou se arquivos auxiliares estiverem ausentes.
- Paginador/accordion no grid quando > 60 questões para manter performance.

### 4.4 Testes Frontend
- Testes de componentes (QuestionGrid, ImageViewer).
- Integração simulando fluxo completo com mocks de API.

## 5. Operação Manual (sem Automação)
- Processamento dispara ingestão automaticamente no endpoint `POST /api/process`.
- Usuário pode executar localmente via Docker Compose (FastAPI + Next.js + SQLite).
- Limpeza manual: botão “Limpar” remove diretório temporário e reseta tabelas.
- Logs simples em console são suficientes; sem métricas/monitoramento extra.

## 6. Roadmap Enxuto

### Fase 0 – Preparação (1-2 dias)
- Definir escolha de banco (SQLite) e estruturar diretórios temporários.
- Criar script utilitário para resetar ambiente (`cleanup`).

### Fase 1 – Backend Core (1 semana)
1. Implementar `POST /api/process` com chamada ao pipeline OMR e persistência em SQLite.
2. Disponibilizar `GET /api/audits/{id}` e `POST /api/audits/{id}/decision`.
3. Desenvolver rotina de reconciliação (`Results_Corrigidos.csv`).
4. Testes end-to-end em lote de exemplo.

### Fase 2 – Frontend MVP (1 semana)
1. Construir tela `/auditoria` com upload e listagem de cartões.
2. Implementar split-view com grid de questões e salvamento de decisões.
3. Adicionar ações de exportar CSV corrigido e limpar temporários.

### Fase 3 – Ajustes Finais (2-3 dias)
- Melhorias de UX (atalhos, destaques, paginação de grid).
- Hardening básico (validação de inputs, mensagens de erro).
- Documentação rápida para uso interno.

## 7. Riscos e Mitigações
- **Sobrecarga em lotes grandes (>500 cartões):** exibir barra de progresso e considerar processar em batches; MVP validado para 100 cartões.
- **Grid com muitas questões (>180):** implementar paginação/accordion para manter desempenho.
- **Falha no pipeline OMR:** exibir erro claro, permitir reprocessar sem perder arquivos originais.
- **Armazenamento temporário cheio:** botão “Limpar” e diretório configurável.

## 8. Próximos Passos Práticos
1. Validar este plano com o desenvolvedor responsável.
2. Configurar ambiente local (FastAPI + Next.js + SQLite) e preparar dataset de teste.
3. Criar issues/tarefas seguindo o roadmap.
4. Iniciar implementação da Fase 1 e agendar checkpoint após a primeira semana.
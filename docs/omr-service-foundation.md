# PRD: OMR Platform Foundation for Medway

**Versao:** 1.0  
**Data:** 2026-03-09  
**Status:** Draft  
**Owner:** Engenharia de Produto

---

## 1. Sumario Executivo

Este PRD define a fundacao do servico de OMR da Medway como uma capacidade compartilhada entre dois repositorios:

- `omr-checker`: motor de leitura de cartoes-resposta e exposicao via API
- `medway-app`: produto que abre jobs, audita resultados e persiste o dado final nos dominios corretos

O objetivo nao e construir um "sistema de correcao" dentro do OMR. O objetivo e construir um motor confiavel de leitura bruta que possa ser chamado por varios fluxos do `medway-app`, como:

1. avaliacoes montadas no painel de coordenacao
2. simulados internos presenciais com cartao-resposta
3. simulados oficiais ou gerais em que a Medway queira produzir leitura inicial ou completa

### Tese principal

O desenho correto para V1 e:

1. o `medway-app` escolhe o contexto de negocio
2. o `medway-app` escolhe o `template_id`
3. o `omr-checker` le RA, lingua e respostas marcadas
4. o `omr-checker` devolve leitura bruta com flags e artefatos de revisao
5. o `medway-app` apresenta a auditoria ao coordenador
6. o coordenador corrige apenas no `medway-app`
7. o `medway-app` persiste o dado final no dominio correspondente

### Decisoes ja fechadas

1. O identificador do aluno na V1 sera `RA` lido por bolinhas.
2. O `omr-checker` nao precisa validar se o RA existe no Medway.
3. RA invalido, ambiguidade ou erro de leitura entram na auditoria do `medway-app`.
4. O template do OMR deve ser um cadastro tecnico de modelo de cartao, nao uma instancia de prova.
5. A vinculacao entre prova real e `template_id` acontece no `medway-app` no momento da abertura do job.
6. A auditoria manual e a persistencia final vivem exclusivamente no `medway-app`.

---

## 2. Problema

Hoje a Medway ja possui cenarios reais em que cartoes-resposta impressos precisam ser processados. Esse processamento nao pertence a um unico fluxo do produto:

1. existem avaliacoes gerenciadas por coordenacao, compostas por solicitacoes a professores
2. podem existir simulados internos presenciais
3. existem simulados oficiais ou gerais em que a Medway pode querer gerar uma nota inicial antes do processamento de terceiros

O problema atual nao e apenas "ler bolinhas". O problema real e nao existir ainda uma fundacao unica e reutilizavel para:

1. processar cartoes via API
2. abrir esse processamento de varios pontos do produto
3. devolver uma leitura auditavel ao coordenador
4. permitir correcao manual no proprio Medway
5. persistir o resultado final no dominio correto

Sem essa fundacao, cada fluxo tende a resolver upload, leitura, auditoria e conciliacao de forma paralela, o que aumenta custo operacional, ambiguidade e risco de divergencia entre repositorios.

---

## 3. Estado Atual

### 3.1 `omr-checker`

Ja existe:

1. core de leitura por template com `template.json`, `config.json` e `evaluation.json`
2. API FastAPI inicial com `GET /api/templates` e `POST /api/process-omr`
3. Dockerfile e `railway.json` para deploy simples
4. separacao conceitual entre arquivos ok, multimarcados e arquivos com erro no core

Ainda falta:

1. contrato HTTP de producao
2. job model assincrono
3. template registry formal
4. propagacao de flags do core para a API
5. autenticacao, limites, observabilidade e trilha de auditoria
6. testabilidade headless confiavel

### 3.2 `medway-app`

Ja existe:

1. dominio de `avaliacoes` com operacao por `admin`, `teacher` e `coordinator`
2. composicao de prova com solicitacoes a professores
3. dominios de simulados internos e outros fluxos administrativos
4. padrao de autenticacao, autorizacao e operacao por coordenacao

O que ainda nao existe de forma padronizada:

1. pontos de entrada para jobs OMR em multiplos dominios
2. fila de auditoria de folhas lidas
3. reconciliacao RA -> aluno no fluxo de leitura
4. persistencia padronizada de overrides manuais

---

## 4. Objetivo do Produto

Construir uma plataforma de leitura OMR reutilizavel, auditavel e desacoplada do dominio final da prova, permitindo que o `medway-app` abra jobs de leitura em diferentes contextos e mantenha controle total sobre conciliacao, correcao manual e persistencia final.

### 4.1 Objetivos primarios

1. Tornar o `omr-checker` um servico deployavel e chamavel via API.
2. Permitir multiplos pontos de entrada no `medway-app` para processamento de cartoes-resposta.
3. Garantir que o coordenador revise e corrija apenas no `medway-app`.
4. Padronizar o retorno do OMR como leitura bruta estruturada, com flags e artefatos de revisao.
5. Evitar acoplamento do motor OMR a um unico dominio como `avaliacoes` ou `simulados internos`.

### 4.2 Objetivos secundarios

1. Reaproveitar templates de cartao em provas diferentes quando o layout for igual.
2. Permitir cadastro progressivo de novos modelos de cartao conforme forem surgindo.
3. Reduzir dependencia operacional de processamentos externos quando fizer sentido.
4. Preparar a base para QR Codes ou outros identificadores no futuro sem bloquear a V1.

### 4.3 Nao objetivos da V1

1. Fazer correcao manual dentro do `omr-checker`.
2. Fazer o `omr-checker` decidir qual aluno ou qual prova esta correta.
3. Acoplar o template a uma unica prova do Medway.
4. Resolver QR Code na V1.
5. Entregar analytics finais, ranking ou nota final dentro do OMR.

---

## 5. Principios de Design

1. OMR le, Medway decide.
2. Leitura bruta vem antes de qualquer regra de negocio.
3. Template e cadastro tecnico, nao entidade final de produto.
4. Auditoria manual deve acontecer onde o dado final vive.
5. Um contrato unico de job deve servir varios consumidores.
6. Falhas parciais por folha devem ser tratadas como estado normal do sistema, nao como excecao de infra.

---

## 6. Arquitetura Alvo

### 6.1 Responsabilidades do `omr-checker`

O `omr-checker` deve ser responsavel por:

1. receber imagens e `template_id`
2. processar folhas
3. ler RA, lingua e respostas
4. classificar cada folha como `processed`, `needs_review` ou `failed`
5. devolver flags de ambiguidade e artefatos de revisao
6. expor um contrato de API estavel para consumo pelo `medway-app`

O `omr-checker` nao deve ser responsavel por:

1. validar se o RA existe
2. decidir aluno final
3. decidir prova final
4. armazenar override manual final
5. calcular nota final ou ranking

### 6.2 Responsabilidades do `medway-app`

O `medway-app` deve ser responsavel por:

1. escolher o contexto de negocio do job
2. autenticar e autorizar quem pode processar cartoes
3. escolher o `template_id` correto no contexto daquele fluxo
4. reconciliar RA lido com o aluno esperado
5. exibir a fila de auditoria
6. permitir ajustes manuais por folha e por questao
7. persistir o resultado final no dominio chamador
8. acionar integracoes, notas, ranking e analytics depois da auditoria

### 6.3 Modelo em dois niveis para templates

O desenho recomendado e:

1. `omr-checker` possui cadastro tecnico de templates
2. `medway-app` referencia um `template_id` quando abre o job

Exemplos de template tecnico:

1. `somos-dia-1-90q`
2. `somos-dia-2-60q`
3. `modelo-escola-dia-1-90q`
4. `modelo-escola-dia-2-60q`

Exemplo de uso:

1. uma avaliacao no `medway-app` escolhe `somos-dia-1-90q`
2. um simulado oficial diferente pode escolher o mesmo `template_id` se o cartao for identico

Isso preserva:

1. reuso tecnico
2. independencia entre produto e leitura
3. menor custo de manutencao de templates

---

## 7. Contrato Funcional da Plataforma

### 7.1 Abertura de job

`POST /v1/omr-jobs`

Entrada minima:

1. `template_id`
2. `source_type` ex: `exam_assessment | internal_exam | official_mock | generic`
3. `source_id` opcional
4. imagens ou ZIP
5. metadata opcional para correlacao

Resposta minima:

1. `job_id`
2. `status`
3. `created_at`

### 7.2 Consulta de job

`GET /v1/omr-jobs/:job_id`

Resposta por folha:

1. `sheet_id`
2. `filename`
3. `status`
4. `student_identifier`
5. `language`
6. `answers_raw`
7. `confidence_summary`
8. `flags`
9. `review_artifacts`

### 7.3 Template registry

`GET /v1/templates`  
`POST /v1/templates`  
`GET /v1/templates/:id`

Metadados minimos:

1. `id`
2. `name`
3. `school`
4. `card_brand_or_model`
5. `application_label`
6. `question_count`
7. `areas`
8. `student_identifier_schema`
9. `language_schema`
10. `version`
11. `is_active`

---

## 8. Payload Canonico da Leitura

O retorno principal deve continuar sendo a leitura bruta da folha.

```json
{
  "sheet_id": "uuid",
  "status": "needs_review",
  "student_identifier": {
    "raw": "12345",
    "schema": "ra_bubbles",
    "type": "ra"
  },
  "language": "english",
  "answers_raw": {
    "q1": "B",
    "q2": "C",
    "q27": "",
    "q28": "D"
  },
  "flags": [
    "multi_mark_q27",
    "low_confidence_identifier"
  ],
  "review_artifacts": {
    "annotated_image_url": "..."
  }
}
```

### Conveniencias opcionais

Quando o template souber mapear o cartao para um dominio conhecido, o OMR pode expor tambem:

```json
{
  "answers_by_area": {
    "LINGUAGENS": { "1": "B", "2": "C" },
    "HUMANAS": { "46": "A" },
    "NATUREZAS": {},
    "MATEMATICA": {}
  }
}
```

Mas isso e complementar. O contrato principal continua sendo a leitura bruta.

---

## 9. Fluxo de Produto Desejado

### 9.1 Fluxo padrao

1. o usuario entra no contexto de negocio certo no `medway-app`
2. escolhe o modelo de cartao ou o sistema predefine o `template_id`
3. envia as imagens
4. o `medway-app` abre um job no `omr-checker`
5. o `omr-checker` processa e devolve leitura por folha
6. o `medway-app` reconcilia RA, exibe flags e mostra a auditoria
7. o coordenador corrige o que for necessario
8. o `medway-app` persiste o resultado final

### 9.2 Fluxo de erro de RA

1. o OMR le um RA bruto
2. o `medway-app` tenta reconciliar esse RA com o aluno esperado
3. se nao encontrar aluno, a folha entra como `needs_review`
4. o coordenador ajusta no `medway-app`
5. o dado final corrigido e persistido no dominio correspondente

### 9.3 Fluxo de dupla marcacao

1. o OMR detecta dupla marcacao em uma ou mais questoes
2. a folha volta com `flags`
3. o `medway-app` mostra a folha na fila de auditoria
4. o coordenador define a resposta final no Medway

---

## 10. Escopo da V1

### 10.1 Incluido

1. servico OMR deployavel via API
2. contrato de job unico para multiplos consumidores
3. leitura de RA via bolinhas
4. leitura de respostas `A/B/C/D/E` ou em branco
5. retorno de flags e artefatos visuais
6. cadastro tecnico de templates
7. abertura de job via `medway-app`
8. auditoria manual no `medway-app`
9. persistencia final do lado do `medway-app`

### 10.2 Excluido

1. QR Code como identificador de aluno
2. correcao manual dentro do OMR
3. nota final dentro do OMR
4. acoplamento da plataforma a um unico fluxo do Medway
5. automacao completa de todas as reconciliacoes sem auditoria humana

---

## 11. Fases de Implementacao

### Fase 1: Foundation no `omr-checker`

Objetivo:

Transformar o core atual em um servico estavel, testavel e preparado para producao.

Entregas:

1. remover dependencia de GUI em import-time
2. criar testes headless do core e da API
3. formalizar schemas de request/response
4. propagar multimarcacao, erro e artefatos para a API
5. adicionar limites de upload e validacoes basicas
6. definir modelo inicial de `template registry`

Saida esperada:

1. API de leitura bruta estavel
2. template tecnico versionado
3. processamento repetivel em ambiente de servidor

### Fase 2: Orquestracao no `medway-app`

Objetivo:

Permitir que o `medway-app` abra jobs OMR de maneira autenticada e contextualizada.

Entregas:

1. criar service client para o OMR
2. criar endpoint server-side mediador
3. modelar `source_type` e correlacao com o contexto chamador
4. definir selecao de `template_id` no fluxo de negocio
5. persistir resultados brutos do job para auditoria

Saida esperada:

1. um job pode ser aberto a partir do `medway-app`
2. o resultado volta para o contexto correto

### Fase 3: Auditoria no `medway-app`

Objetivo:

Dar ao coordenador uma fila clara para revisar e corrigir apenas o que precisar.

Entregas:

1. tela de auditoria por job e por folha
2. destaque de flags de RA e dupla marcacao
3. preview da folha anotada
4. override manual por questao e por identificacao do aluno
5. controle de "pendente", "revisado" e "aplicado"

Saida esperada:

1. leitura bruta pode virar resultado final auditado dentro do Medway

### Fase 4: Persistencia por dominio

Objetivo:

Aplicar o resultado auditado no dominio chamador sem acoplar a fundacao a um unico fluxo.

Entregas:

1. adaptador para `avaliacoes`
2. adaptador para `simulados internos` presenciais
3. adaptador para `simulados oficiais/gerais`
4. trilha de auditoria de quem aplicou o resultado e quando

Saida esperada:

1. multiplos fluxos usam a mesma plataforma OMR com persistencia final propria

### Fase 5: Hardening operacional

Objetivo:

Garantir confiabilidade de producao e capacidade de evolucao.

Entregas:

1. jobs assincronos e polling
2. logs estruturados
3. metricas por job, folha e template
4. idempotencia de reprocessamento
5. runbooks operacionais

---

## 12. Dependencias por Repositorio

### 12.1 `omr-checker`

Arquivos e areas diretamente relacionadas:

1. `api/main.py`
2. `api/services/omr_processor.py`
3. `api/utils/file_handler.py`
4. `src/entry.py`
5. `src/template.py`
6. `src/utils/interaction.py`
7. `samples/**`

### 12.2 `medway-app`

Areas com maior probabilidade de consumo:

1. `app/(shared)/avaliacoes/gerenciar/**`
2. servicos do dominio de `avaliacoes`
3. fluxos administrativos acessiveis a `coordinator`
4. dominios de simulados que precisarem de cartao presencial

---

## 13. Riscos Principais

### 13.1 Risco de acoplamento errado

Se o OMR for modelado como parte de um unico fluxo, o reuso em outros contextos vira retrabalho.

Mitigacao:

1. manter contrato unico de job
2. manter template como cadastro tecnico
3. deixar persistencia final fora do OMR

### 13.2 Risco de baixa auditabilidade

Se a API nao devolver flags e artefatos suficientes, o coordenador nao consegue revisar com seguranca.

Mitigacao:

1. expor flags por folha
2. expor artefatos visuais
3. preservar leitura bruta e override final como estados separados

### 13.3 Risco de complexidade prematura

Se tentarmos resolver QR Code, nota final, ranking e todos os fluxos de uma vez, a fundacao atrasa.

Mitigacao:

1. fixar RA como identificador da V1
2. focar leitura + auditoria + persistencia final
3. abrir adaptadores por dominio em fases posteriores

### 13.4 Risco operacional de ambiente

Hoje o core ainda apresenta fragilidade em ambiente headless.

Mitigacao:

1. tratar isso como gate da Fase 1
2. nao considerar a fundacao pronta sem testes headless passando

---

## 14. Criterios de Aceite

### Aceite da plataforma base

1. O `omr-checker` pode ser deployado e chamado por API em ambiente de servidor.
2. O servico aceita um `template_id` e retorna leitura bruta por folha.
3. O retorno inclui RA lido, respostas lidas, flags e artefatos de revisao.
4. O OMR nao depende de GUI para executar em producao.

### Aceite da integracao

1. O `medway-app` consegue abrir um job OMR em pelo menos um contexto de negocio real.
2. O `medway-app` recebe o resultado bruto e exibe uma fila de auditoria.
3. O coordenador consegue corrigir RA e respostas manualmente no Medway.
4. O resultado final corrigido e persistido no dominio chamador sem depender do OMR.

### Aceite arquitetural

1. O mesmo servico consegue atender ao menos dois contextos diferentes do `medway-app` sem mudanca estrutural no contrato.
2. O template tecnico pode ser reutilizado por provas diferentes quando o cartao e o mesmo.
3. A plataforma nao assume que toda leitura sera automaticamente valida ou aplicavel sem auditoria.

---

## 15. Proxima Acao Recomendada

Abrir a execucao pela **Fase 1 no `omr-checker`**, porque ela desbloqueia todo o resto:

1. estabilizar runtime headless
2. formalizar o contrato de job
3. propagar flags do core para a API
4. modelar o primeiro registry de templates

Quando essa fase estiver clara, o passo seguinte e abrir o backlog espelhado no `medway-app` para:

1. service client
2. endpoint mediador
3. tela de auditoria
4. persistencia final por dominio

---

## 16. Resumo da Decisao

Este PRD consolida uma decisao arquitetural clara:

1. o `omr-checker` sera um motor de leitura bruta e auditavel
2. o `medway-app` sera o dono da reconciliacao, da auditoria manual e da persistencia final
3. templates serao cadastros tecnicos reutilizaveis
4. a plataforma sera desenhada desde o inicio para multiplos pontos de entrada

Esse e o desenho que melhor preserva reuso, clareza de responsabilidades e velocidade de implementacao entre os dois repositorios.

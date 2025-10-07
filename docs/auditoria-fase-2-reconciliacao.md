# Fase 2 – Reconciliação e Exportação

## Objetivos
- Reconciliar respostas corrigidas com os resultados originais do processamento.
- Entregar arquivo `Results_Corrigidos.csv` confiável e acessível ao usuário.
- Disponibilizar rotinas para limpeza e encerramento de lotes auditados.

## Escopo
- Motor de reconciliação que combine dados do banco com CSVs originais.
- Endpoints para exportação e limpeza.
- Registro de metadados de reconciliação (manifesto, timestamps, autor). 
- Testes abrangendo cenários de correção.

## Tarefas
1. **Motor de reconciliação**
   - Ler CSV `Results` associado ao lote e aplicar correções presentes em `audit_responses`.
   - Gerar `Results_Corrigidos.csv` mantendo cabeçalhos e ordem original.
   - Criar `results_manifest.json` com hashes, timestamps, usuário responsável e contagem de itens.
2. **Endpoints**
   - `GET /api/audits/export`: retorna CSV corrigido (streaming) e atualiza status geral do lote.
   - `POST /api/audits/cleanup`: remove arquivos temporários, diretórios e registros do lote após confirmação.
   - Validar existência de correções antes de exportar e bloquear duplicidade.
3. **Histórico e auditoria**
   - Registrar em tabela/coluna adicional o momento da exportação e usuário que executou.
   - Manter rastreabilidade de alterações por cartão (logs simples).
4. **Testes**
   - Unitários para reconciliação (sem correções, 1 correção, múltiplas correções).
   - Integração: fluxo upload → correção → export → verificação de conteúdo do CSV.
   - Validar que `cleanup` remove dados e diretórios esperados.

## Riscos e Mitigações
- **Perda de dados ao reconciliar** → backup do CSV original e manifesto com hashes para conferência.
- **Concorrência em exportação** → bloquear export simultânea via lock simples ou flag no banco.
- **Falha durante limpeza** → processo idempotente com verificação antes/depois.

## Critérios de Aceite
- CSV corrigido disponível para download com todas as correções aplicadas.
- Manifesto acompanha o CSV e contém informações necessárias para auditoria.
- Após `cleanup`, sistema retorna ao estado inicial sem arquivos residuais.

# Fase 0 – Preparação e Infraestrutura

## Objetivos
- Estabelecer fundações técnicas para auditoria manual (persistência, estrutura de armazenamento e segurança básica).
- Garantir ambiente limpo e repetível para processamento de lotes.

## Escopo
- Persistência em SQLite com modelos adequados.
- Organização de diretórios compartilhados e rotina de limpeza.
- Revisão de utilitários de arquivos e configuração de assets estáticos.
- Configuração de segurança mínima e fixtures de teste.

## Tarefas
1. **Persistência**
   - Definir camada `api/db` (SQLModel ou SQLAlchemy) com inicialização e sessão.
   - Criar modelos `AuditItem` e `AuditResponse` com relacionamentos, timestamps e status.
   - Implementar migração inicial ou script de bootstrap do schema.
2. **Estrutura de armazenamento**
   - Criar diretórios configuráveis `storage/processing`, `storage/results` e mapear em `settings`.
   - Atualizar utilitário de limpeza (`cleanup`) para remover lotes e resetar banco quando necessário.
3. **FileHandler e assets**
   - Permitir configurar base path para cópia de templates e outputs.
   - Mapear paths para servir imagens/CSVs via FastAPI (`StaticFiles`).
4. **Segurança e fixtures**
   - Validar tamanho máximo de ZIP e reforçar prevenção de path traversal.
   - Adicionar opção de token simples para endpoints críticos (variável de ambiente).
   - Preparar fixtures de lote exemplo e dados de teste.
5. **Testes**
   - Criar smoke tests garantindo inicialização do banco, criação de tabelas e execução do utilitário de limpeza.

## Riscos e Mitigações
- **Escolha inadequada de ORM** → validar compatibilidade com FastAPI e testes antes de avançar.
- **Diretórios temporários inconsistentes** → centralizar criação via helper único e documentar uso.
- **Segurança negligenciada** → checklist de validações (tamanho, extensão, token) integrado aos testes.

## Critérios de Aceite
- Banco inicializado automaticamente com tabelas de auditoria.
- Diretórios compartilhados criados e limpos com comando único.
- Uploads rejeitam entradas suspeitas e fixtures disponíveis para testes.

## Status
- **Concluída:** critérios validados com `pytest tests/api -q`, execução de `uvicorn api.main:app --reload` gerando `storage/auditoria.db` e rodando `python scripts/cleanup.py`.

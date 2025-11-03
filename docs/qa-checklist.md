# Checklist de QA - Fase 4

## 📋 Objetivos

Validar a estabilidade, segurança e performance do sistema de auditoria OMR.

**Meta MVP:** Processar e corrigir 100 cartões em < 30 minutos com 0 erros pendentes.

---

## ✅ Critérios de Aceite

### 1. Testes Automatizados

- [ ] `make test` executa sem falhas
  - [ ] Testes de backend (pytest): 36+ testes passando
  - [ ] Testes de validação (test_validators.py): 28 testes passando
  - [ ] Testes de frontend (vitest): 5+ testes passando
- [ ] Pre-commit hooks funcionais
  - [ ] `black` formata código corretamente
  - [ ] `isort` organiza imports
  - [ ] `flake8` não reporta erros críticos
  - [ ] `pytest -k sample1` passa
- [ ] Pre-push hooks funcionais
  - [ ] Suite completa de testes passa

### 2. Validações de Entrada

- [ ] Endpoint `/api/process-omr` rejeita:
  - [ ] Templates inválidos (path traversal, caracteres especiais)
  - [ ] Arquivos não-ZIP
  - [ ] ZIPs maiores que limite configurado
  - [ ] Templates inexistentes
- [ ] Endpoint `/api/audits/{id}/decision` rejeita:
  - [ ] Valores de resposta inválidos (F, AB, 1, X, etc.)
  - [ ] Questões inexistentes para o item
  - [ ] Notas com caracteres perigosos (XSS)
- [ ] Endpoint `/api/audits/export` rejeita:
  - [ ] Requisições sem header `X-Audit-User`
  - [ ] `batch_id` com path traversal
  - [ ] Usuários com caracteres inválidos
- [ ] Endpoint `/api/audits/cleanup` rejeita:
  - [ ] Limpeza sem confirmação explícita

### 3. Rate Limiting

- [ ] Apenas um processamento OMR por vez
  - [ ] Segundo upload retorna HTTP 429
  - [ ] Lock é liberado após conclusão
  - [ ] Lock é liberado após erro

### 4. Logging

- [ ] Logs estruturados em pontos críticos:
  - [ ] Início de processamento OMR
  - [ ] Conclusão de processamento (com batch_id, total, processados)
  - [ ] Registro de auditoria (batch_id, template, total)
  - [ ] Reconciliação de lote (batch_id, exported_by)
  - [ ] Erros fatais com stack trace
  - [ ] Tentativas de acesso não autorizado

### 5. Automação Operacional

- [ ] `make help` lista comandos disponíveis
- [ ] `make install` instala dependências Python + Node.js
- [ ] `make dev` inicia API + Web simultaneamente
- [ ] `make api` inicia apenas API (http://localhost:8000)
- [ ] `make web` inicia apenas Web (http://localhost:3000)
- [ ] `make test` roda pytest + vitest
- [ ] `make lint` roda pre-commit hooks
- [ ] `make clean` reseta ambiente (SQLite + storage)
- [ ] `make audit-demo` completa fluxo E2E em < 30s

### 6. Fluxo E2E (scripts/demo.sh)

- [ ] Verifica se API está online
- [ ] Cria ZIP de exemplo
- [ ] Processa OMR via `/api/process-omr`
- [ ] Lista itens de auditoria
- [ ] Simula correção manual (se houver itens pendentes)
- [ ] Exporta CSV corrigido
- [ ] Valida conteúdo do CSV
- [ ] Limpa ambiente
- [ ] Completa em < 30 segundos

### 7. Performance

- [ ] Processamento de 10 cartões:
  - [ ] Tempo total < 10s
  - [ ] Registro de auditoria < 2s
  - [ ] Exportação de CSV < 1s
- [ ] Benchmark documentado em [docs/performance.md](docs/performance.md)

### 8. Segurança

- [ ] Input validation em todos endpoints
- [ ] Path traversal bloqueado
- [ ] XSS characters sanitizados
- [ ] Locks funcionais para operações críticas
- [ ] Tokens de auditoria validados (quando configurados)

### 9. Documentação

- [ ] [README.md](../README.md) atualizado com seção "Uso Local"
- [ ] [docs/qa-checklist.md](docs/qa-checklist.md) (este arquivo)
- [ ] [docs/performance.md](docs/performance.md) com benchmark
- [ ] Comentários de código nos pontos críticos

---

## 🧪 Procedimento de Teste

### Setup Inicial

```bash
# 1. Limpar ambiente
make clean

# 2. Instalar dependências
make install

# 3. Iniciar API
make api
```

### Testes Manuais

```bash
# 1. Validar pre-commit hooks
make lint

# 2. Rodar suite de testes
make test

# 3. Executar demo E2E
make audit-demo

# 4. Verificar logs
# Logs devem aparecer no terminal da API com INFO level
```

### Testes de Carga (Opcional)

```bash
# Processar lote maior (50+ cartões)
# Tempo esperado: < 60s para 50 cartões

python3 main.py -i ./samples/evolucional-dia1
```

---

## 🚨 Riscos Identificados

| Risco | Mitigação | Status |
|-------|-----------|--------|
| Suite de testes flaky | Mocks determinísticos, ambientes isolados | ✅ Resolvido |
| Processamento lento (> 30min para 100 cartões) | Benchmark antecipado, otimizações de I/O | ⏳ A validar |
| Ambiente difícil de reproduzir | Scripts automatizados (Makefile, demo.sh) | ✅ Resolvido |
| Input validation insuficiente | Testes negativos, validadores dedicados | ✅ Resolvido |
| Locks com deadlock | Context managers, finally blocks | ✅ Resolvido |

---

## 📊 Métricas de Sucesso

✅ **Mínimo Aceitável (MVP):**
- Suite de testes: 100% passando
- Demo E2E: < 30s
- Processamento de 100 cartões: < 30min

🎯 **Ideal:**
- Suite de testes: 100% passando + cobertura > 80%
- Demo E2E: < 10s
- Processamento de 100 cartões: < 10min

---

## 🔄 Próximos Passos (Pós-MVP)

1. **Cobertura de testes**: Adicionar `pytest-cov` para métricas de cobertura
2. **E2E avançado**: Playwright/Cypress para testes de UI
3. **CI/CD**: GitHub Actions para rodar testes em PRs
4. **Docker Compose**: Orquestração completa (API + Web + DB)
5. **Observabilidade**: APM, métricas de performance, alertas

---

**Última atualização:** 2025-10-08
**Responsável:** Equipe de Desenvolvimento

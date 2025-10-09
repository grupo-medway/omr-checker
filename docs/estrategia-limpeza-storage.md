# Estratégia de Limpeza do Storage

**Status:** 📋 Planejado (não implementado no MVP)
**Prioridade:** Baixa (pós-MVP)
**Autor:** Equipe de Desenvolvimento
**Data:** 2025-10-08

---

## 🎯 Contexto

O diretório `storage/` armazena:
- Banco SQLite de auditoria (`auditoria.db`)
- Imagens processadas (originais + marcadas)
- CSVs exportados (`Results_Corrigidos_*.csv`)
- Manifestos de exportação (`manifest_*.json`)

**Crescimento estimado:**
- 100 cartões/lote ≈ 50-100 MB
- 10 lotes/dia ≈ 500 MB - 1 GB/dia
- **Sem limpeza: ~30 GB/mês**

---

## ⚠️ Riscos da Limpeza Automática Agressiva

### 1. Perda de Auditoria em Progresso
```
Cenário crítico:
├─ 23:50 → Usuário processa lote e inicia auditoria
├─ 00:00 → Cron diário apaga tudo automaticamente
└─ 00:05 → Usuário retorna: dados perdidos ❌
```

### 2. Compliance e Rastreabilidade
- Auditorias podem ser requeridas para **comprovação legal**
- "Quem corrigiu o cartão X no dia Y?" → histórico perdido
- Potencial violação de requisitos de auditoria/LGPD

### 3. Exportações Não Baixadas
```
Cenário:
├─ 23:55 → Usuário exporta CSV
├─ 00:00 → Cron apaga arquivos
└─ 00:05 → Download falha (arquivo removido) ❌
```

---

## ✅ Estratégias Recomendadas

### Opção 1: Limpeza Manual (IMPLEMENTADO NO MVP)

**Status:** ✅ Atual

**Funcionamento:**
- Usuário decide quando limpar via botão "Limpar Lote" na UI
- Remove apenas o lote selecionado
- Confirmação obrigatória antes de deletar

**Prós:**
- ✅ Zero risco de perda acidental
- ✅ Usuário controla ciclo de vida dos dados
- ✅ Simples de entender e usar

**Contras:**
- ⚠️ Pode acumular dados antigos se usuário esquecer
- ⚠️ Sem governança automática de storage

**Recomendação:** Suficiente para MVP e uso local/pequeno.

---

### Opção 2: TTL com Aviso (RECOMENDADO PARA PRODUÇÃO)

**Status:** 📋 Não implementado

**Funcionamento:**
```python
# Exemplo de estrutura com TTL
storage/
├── batch-001/
│   ├── created_at: 2025-09-01
│   ├── expires_at: 2025-11-01  # 60 dias após criação
│   └── status: "exported"       # Seguro deletar
├── batch-002/
│   ├── created_at: 2025-09-15
│   ├── expires_at: 2025-11-15  # 60 dias
│   └── status: "pending"        # NÃO DELETAR (auditoria ativa)
└── batch-003/
    ├── created_at: 2025-10-01
    ├── expires_at: 2025-12-01
    └── status: "cleaned"        # Pode deletar imediatamente
```

**Regras de TTL Sugeridas:**
| Status | TTL | Pode Deletar? |
|--------|-----|---------------|
| `pending` | ∞ (nunca) | ❌ Auditoria ativa |
| `resolved` | 90 dias | ⚠️ Após TTL |
| `exported` | 7 dias | ⚠️ Após TTL |
| `cleaned` | 1 dia | ✅ Sim |

**Implementação:**
```python
# api/services/storage_cleanup.py (exemplo)

from datetime import datetime, timedelta
from pathlib import Path
import shutil
from api.db.models import AuditBatch, BatchStatus

def cleanup_expired_batches(dry_run=True):
    """Remove batches expirados com base em TTL e status"""
    now = datetime.now(timezone.utc)
    removed = []

    with Session(engine) as session:
        # Buscar batches expirados
        expired = session.exec(
            select(AuditBatch).where(
                AuditBatch.expires_at < now,
                AuditBatch.status.in_([
                    BatchStatus.EXPORTED,
                    BatchStatus.CLEANED
                ])
            )
        ).all()

        for batch in expired:
            batch_dir = Path(settings.STATIC_ROOT) / batch.batch_id

            if batch_dir.exists():
                if dry_run:
                    print(f"[DRY RUN] Would remove: {batch.batch_id}")
                else:
                    shutil.rmtree(batch_dir)
                    session.delete(batch)
                    removed.append(batch.batch_id)

        if not dry_run:
            session.commit()

    return removed
```

**Prós:**
- ✅ Governança automática de storage
- ✅ Seguro (respeita status de auditoria)
- ✅ Transparente (usuário sabe quando expira)

**Contras:**
- ⚠️ Requer mudanças no schema do banco
- ⚠️ Precisa avisar usuário antes de expirar
- ⚠️ Mais complexo de implementar

---

### Opção 3: Script Manual + Cron Opcional (BALANCEADO)

**Status:** 📋 Não implementado

**Funcionamento:**
```bash
# Script CLI para limpeza manual
python scripts/cleanup_storage.py --older-than 90 --dry-run

# Ver o que seria removido
python scripts/cleanup_storage.py --older-than 90

# Executar limpeza
python scripts/cleanup_storage.py --older-than 90 --execute
```

**Implementação Sugerida:**
```python
# scripts/cleanup_storage.py

import argparse
from datetime import datetime, timedelta
from pathlib import Path
import shutil
import json

def cleanup_storage(days: int = 90, dry_run: bool = True):
    """Remove batches mais antigos que X dias"""
    storage = Path("storage")
    if not storage.exists():
        print("❌ Storage directory not found")
        return

    cutoff = datetime.now() - timedelta(days=days)
    removed = []
    protected = []

    for batch_dir in storage.glob("batch-*"):
        # Verificar timestamp de modificação
        mtime = datetime.fromtimestamp(batch_dir.stat().st_mtime)
        age_days = (datetime.now() - mtime).days

        # Verificar se tem auditoria pendente
        manifest = batch_dir / "manifest.json"
        is_safe_to_delete = True

        if manifest.exists():
            with open(manifest) as f:
                data = json.load(f)
                # Não deletar se status for "pending"
                if data.get("status") == "pending":
                    is_safe_to_delete = False
                    protected.append(batch_dir.name)

        if mtime < cutoff and is_safe_to_delete:
            if dry_run:
                print(f"[DRY RUN] Would remove: {batch_dir.name} (age: {age_days} days)")
                removed.append(batch_dir.name)
            else:
                shutil.rmtree(batch_dir)
                removed.append(batch_dir.name)
                print(f"✅ Removed: {batch_dir.name}")
        elif not is_safe_to_delete:
            print(f"⚠️ Protected: {batch_dir.name} (pending audit)")

    print(f"\n📊 Summary:")
    print(f"   Removed: {len(removed)} batches")
    print(f"   Protected: {len(protected)} batches")
    print(f"   Cutoff: {days} days")

    return removed

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Cleanup old audit batches from storage"
    )
    parser.add_argument(
        "--older-than",
        type=int,
        default=90,
        help="Remove batches older than X days (default: 90)"
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually delete files (default is dry-run)"
    )

    args = parser.parse_args()
    cleanup_storage(args.older_than, dry_run=not args.execute)
```

**Cron Opcional (Produção):**
```bash
# /etc/cron.d/omr-cleanup
# Roda todo domingo às 3h da manhã
0 3 * * 0 cd /app && python scripts/cleanup_storage.py --older-than 90 --execute
```

**Prós:**
- ✅ Flexível (manual ou automático)
- ✅ Dry-run para segurança
- ✅ Fácil de implementar
- ✅ Protege auditorias pendentes

**Contras:**
- ⚠️ Requer acesso CLI/SSH
- ⚠️ Cron pode esquecer de rodar

---

## 📋 Recomendação Final

### Para MVP (Atual):
- ✅ **Manter limpeza manual via UI** (já implementado)
- ✅ **Adicionar ao .gitignore** (já feito)
- ✅ **Documentar** no README

### Para Produção (Futuro):
1. **Curto prazo** (1-2 sprints):
   - Implementar `cleanup_storage.py` script
   - Adicionar comando no README
   - Monitorar uso de disco

2. **Médio prazo** (3-6 meses):
   - Adicionar coluna `expires_at` em `AuditBatch`
   - Implementar TTL de 90 dias
   - Dashboard de uso de storage

3. **Longo prazo** (6-12 meses):
   - Migrar para S3/Cloud Storage
   - Lifecycle policies automáticas
   - Archive para cold storage após 1 ano

---

## 🔧 Manutenção Manual (Atual)

### Via Interface:
```
1. Acessar /auditoria
2. Selecionar lote
3. Clicar "Limpar Lote"
4. Confirmar
```

### Via Linha de Comando:
```bash
# Listar batches
ls -lh storage/

# Remover batch específico
rm -rf storage/batch-20251008-001

# Remover todos os batches (CUIDADO!)
rm -rf storage/batch-*

# Verificar tamanho do storage
du -sh storage/
```

### Recomendações:
- 📅 Revisar storage semanalmente
- 🗑️ Limpar batches exportados após 7 dias
- 💾 Manter backup de CSVs importantes
- 📊 Monitorar espaço em disco

---

## 📊 Métricas para Monitorar

Quando implementar limpeza automática, monitorar:

| Métrica | Alerta |
|---------|--------|
| Tamanho total do storage | > 50 GB |
| Batches com > 90 dias | Manual review |
| Batches em "pending" > 7 dias | Investigar |
| Crescimento diário | > 2 GB/dia |
| Taxa de limpeza | < 1x/semana |

---

## 🔗 Referências

- [CLAUDE.md](../CLAUDE.md) - Documentação do projeto
- [plano-auditoria.md](./plano-auditoria.md) - Planejamento geral
- [correcoes-fase-3.md](./correcoes-fase-3.md) - Correções aplicadas

---

**Próxima revisão:** Após MVP em produção por 1 mês
**Responsável:** DevOps / Backend Team

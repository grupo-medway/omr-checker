#!/usr/bin/env bash

# ============================================================================
# Script de Demonstração E2E do Fluxo de Auditoria
# ============================================================================
# Este script valida o fluxo completo:
# 1. Processa lote OMR de exemplo
# 2. Simula correção manual via API
# 3. Exporta CSV corrigido
# 4. Valida conteúdo
# 5. Limpa ambiente
# ============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_BASE="http://localhost:8000"
TEMPLATE="evolucional-dia1"
SAMPLE_DIR="samples/${TEMPLATE}"
AUDIT_USER="demo-tester"
BATCH_ID=""

# Helper functions
log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

check_api() {
    echo "🔍 Verificando se API está rodando..."
    if ! curl -s "${API_BASE}/" > /dev/null 2>&1; then
        log_error "API não está respondendo em ${API_BASE}. Inicie com 'make api' ou 'uvicorn api.main:app --reload'"
    fi
    log_info "API está online"
}

create_sample_zip() {
    echo "📦 Criando ZIP de exemplo..."

    if [ ! -d "$SAMPLE_DIR" ]; then
        log_error "Diretório de exemplo não encontrado: $SAMPLE_DIR"
    fi

    # Find sample images
    local images=$(find "$SAMPLE_DIR" -type f \( -iname "*.jpg" -o -iname "*.png" -o -iname "*.jpeg" \) | head -5)

    if [ -z "$images" ]; then
        log_warn "Nenhuma imagem encontrada em $SAMPLE_DIR, usando arquivos de teste..."
        # Create dummy images for testing
        mkdir -p /tmp/demo-images
        for i in {1..3}; do
            echo "dummy image $i" > "/tmp/demo-images/test_$i.jpg"
        done
        images=$(find /tmp/demo-images -type f -name "*.jpg")
    fi

    local zip_file="/tmp/audit-demo-${TEMPLATE}.zip"
    rm -f "$zip_file"

    echo "$images" | while IFS= read -r img; do
        zip -j "$zip_file" "$img" > /dev/null 2>&1 || true
    done

    log_info "ZIP criado: $zip_file ($(du -h "$zip_file" | cut -f1))"
    echo "$zip_file"
}

process_omr() {
    local zip_file=$1
    echo "🔄 Processando OMR..."

    local response=$(curl -s -X POST "${API_BASE}/api/process-omr" \
        -F "file=@${zip_file}" \
        -F "template=${TEMPLATE}")

    # Extract batch_id from response
    BATCH_ID=$(echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('summary', {}).get('batch_id', ''))" 2>/dev/null || echo "")

    if [ -z "$BATCH_ID" ]; then
        log_error "Falha ao processar OMR. Resposta: $response"
    fi

    local total=$(echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('summary', {}).get('total', 0))" 2>/dev/null || echo "0")
    local processed=$(echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('summary', {}).get('processed', 0))" 2>/dev/null || echo "0")

    log_info "Processamento concluído: batch_id=$BATCH_ID, total=$total, processados=$processed"
}

list_audit_items() {
    echo "📋 Listando itens de auditoria..."

    local response=$(curl -s "${API_BASE}/api/audits?batch_id=${BATCH_ID}")
    local pending=$(echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('pending', 0))" 2>/dev/null || echo "0")

    log_info "Itens pendentes: $pending"

    if [ "$pending" -eq 0 ]; then
        log_warn "Nenhum item pendente encontrado (isso é esperado se o template processar perfeitamente)"
        return 0
    fi

    # Get first item ID
    local first_item_id=$(echo "$response" | python3 -c "import sys, json; items = json.load(sys.stdin).get('items', []); print(items[0]['id'] if items else '')" 2>/dev/null || echo "")

    if [ -n "$first_item_id" ]; then
        simulate_correction "$first_item_id"
    fi
}

simulate_correction() {
    local item_id=$1
    echo "✏️  Simulando correção manual do item $item_id..."

    # Submit correction
    local response=$(curl -s -X POST "${API_BASE}/api/audits/${item_id}/decision" \
        -H "Content-Type: application/json" \
        -d '{"answers": {"q1": "A", "q2": "B"}, "notes": "Correção via demo script"}')

    local status=$(echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('status', ''))" 2>/dev/null || echo "")

    if [ "$status" != "resolved" ]; then
        log_warn "Status inesperado: $status"
    else
        log_info "Correção registrada com sucesso"
    fi
}

export_csv() {
    echo "📥 Exportando CSV corrigido..."

    local csv_file="/tmp/audit-demo-export.csv"

    curl -s "${API_BASE}/api/audits/export?batch_id=${BATCH_ID}&format=file" \
        -H "X-Audit-User: ${AUDIT_USER}" \
        -o "$csv_file"

    if [ ! -f "$csv_file" ] || [ ! -s "$csv_file" ]; then
        log_error "Falha ao exportar CSV"
    fi

    local lines=$(wc -l < "$csv_file" | tr -d ' ')
    log_info "CSV exportado: $csv_file ($lines linhas)"

    # Show first 5 lines
    echo ""
    echo "Primeiras linhas do CSV:"
    head -5 "$csv_file"
    echo ""
}

cleanup() {
    echo "🧹 Limpando ambiente..."

    local response=$(curl -s -X POST "${API_BASE}/api/audits/cleanup" \
        -H "Content-Type: application/json" \
        -H "X-Audit-User: ${AUDIT_USER}" \
        -d "{\"batch_id\": \"${BATCH_ID}\", \"confirm\": true}")

    local status=$(echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('status', ''))" 2>/dev/null || echo "")

    if [ "$status" == "CLEANED" ]; then
        log_info "Limpeza concluída"
    else
        log_warn "Limpeza pode não ter sido completa. Status: $status"
    fi
}

# Main execution
main() {
    echo "============================================"
    echo "  Audit Demo - End-to-End Validation"
    echo "============================================"
    echo ""

    local start_time=$(date +%s)

    check_api

    local zip_file=$(create_sample_zip)

    process_omr "$zip_file"

    list_audit_items

    export_csv

    cleanup

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    echo ""
    echo "============================================"
    log_info "Demo concluído em ${duration}s"
    echo "============================================"

    # Cleanup temp files
    rm -f "$zip_file" /tmp/audit-demo-export.csv
    rm -rf /tmp/demo-images
}

# Run main
main

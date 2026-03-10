# OMR Checker

Sistema de leitura de folhas OMR com core Python e API FastAPI.

## O que é OMR?

OMR (Optical Mark Recognition) é usado para detectar e interpretar dados marcados por humanos em documentos. Comumente usado em provas, pesquisas e outros formulários.

## Instalacao Rapida

### 1. Instalar dependências

```bash
# Verificar se Python3 está instalado
python3 --version
python3 -m pip --version

# Instalar OpenCV
python3 -m pip install --user opencv-python opencv-contrib-python

# Instalar dependências do projeto
python3 -m pip install --user -r requirements.txt
```

### 2. Executar

```bash
# Copiar sample de exemplo
cp -r ./samples/evolucional-dia1 inputs/

# Executar OMRChecker
python3 main.py
```

## API v1

O servico exposto em `api.main` agora usa um contrato de jobs em `/v1`.

Fluxo base:

1. listar templates em `GET /v1/templates`
2. abrir job em `POST /v1/omr-jobs`
3. consultar resultado em `GET /v1/omr-jobs/{job_id}`
4. baixar artefato anotado em `GET /v1/omr-jobs/{job_id}/sheets/{sheet_id}/artifacts/annotated`

Por padrao, todos os endpoints `/v1/**` e os wrappers legados em `/api/*` usam bearer token quando `OMR_API_TOKEN` estiver configurado.

Os templates produtivos ficam em `samples/` e exigem `manifest.json` alem de `template.json` e `config.json`.

## Runtime Headless

Para ambientes de servidor ou CI:

```bash
export OMR_HEADLESS=1
uvicorn api.main:app --host 0.0.0.0 --port 8000
```

Esse modo evita dependencias de GUI em import-time e e o caminho recomendado para a API.

## Configuracao Visual

Para configurar visualmente seu template OMR e ver como o sistema está interpretando o layout:

```bash
# Modo visual - mostra o layout do template sobre as imagens
python3 main.py --setLayout
```

**Processo iterativo:**
1. Execute `--setLayout` para ver o layout atual
2. Analise a visualização dos campos
3. Modifique o `template.json` se necessário
4. Execute novamente até o layout estar perfeito

## 📁 Estrutura de Arquivos

```
samples/
├── evolucional-dia1/
│   ├── template_reference.jpg  # Imagem de referência
│   ├── template.json          # Configuração do template
│   └── config.json            # Parâmetros de tuning
└── evolucional-dia2/
    └── ...

inputs/                         # Coloque suas imagens aqui
outputs/                        # Resultados gerados aqui
```

## Uso Completo

```bash
python3 main.py [--setLayout] [--inputDir dir1] [--outputDir dir1]
```

**Argumentos:**
- `--setLayout`: **MODO VISUAL** - mostra layout do template para configuração
- `--inputDir`: Especifica diretório de entrada
- `--outputDir`: Especifica diretório de saída

## Exemplos de Uso

```bash
# Usar sample específico
python3 main.py -i ./samples/evolucional-dia1

# Modo visual com sample específico
python3 main.py --setLayout -i ./samples/evolucional-dia1

# Processar diretório customizado
python3 main.py -i ./minhas-imagens -o ./meus-resultados
```

## Recursos Visuais

- **Processamento passo a passo** das imagens OMR
- **Layout visual** do template sobre as imagens
- **Saída em CSV** com respostas detectadas
- **Avaliação colorida** dos resultados

## Licenca

[MIT License](LICENSE)

---

Consulte [api/README.md](./api/README.md) para o contrato HTTP atual e as variaveis de ambiente do servico.

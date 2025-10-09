# OMR Checker

Sistema de leitura e correção de folhas OMR usando scanner 🖨 ou celular 🤳.

## O que é OMR?

OMR (Optical Mark Recognition) é usado para detectar e interpretar dados marcados por humanos em documentos. Comumente usado em provas, pesquisas e outros formulários.

## 🚀 Instalação Rápida

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

## 🎯 Configuração Visual (IMPORTANTE!)

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

## 🔧 Uso Completo

```bash
python3 main.py [--setLayout] [--inputDir dir1] [--outputDir dir1]
```

**Argumentos:**
- `--setLayout`: **MODO VISUAL** - mostra layout do template para configuração
- `--inputDir`: Especifica diretório de entrada
- `--outputDir`: Especifica diretório de saída

## 📊 Exemplos de Uso

```bash
# Usar sample específico
python3 main.py -i ./samples/evolucional-dia1

# Modo visual com sample específico
python3 main.py --setLayout -i ./samples/evolucional-dia1

# Processar diretório customizado
python3 main.py -i ./minhas-imagens -o ./meus-resultados
```

## 🎨 Recursos Visuais

- **Processamento passo a passo** das imagens OMR
- **Layout visual** do template sobre as imagens
- **Saída em CSV** com respostas detectadas
- **Avaliação colorida** dos resultados

## 📄 Licença

[MIT License](LICENSE)

---

## 🚀 Uso Local (API + Web)

### Setup Completo

```bash
# Instalar todas as dependências (Python + Node.js)
make install

# Ou manualmente:
python3 -m pip install --user -r requirements.txt requirements-api.txt requirements.dev.txt
cd web && npm install
```

### Desenvolvimento

```bash
# Iniciar API + Web simultaneamente
make dev

# Ou individualmente:
make api   # API em http://localhost:8000
make web   # Web em http://localhost:3000
```

**Endpoints disponíveis:**
- API: http://localhost:8000/docs (Swagger)
- Web: http://localhost:3000
- Auditoria: http://localhost:3000/auditoria

### Comandos Úteis

```bash
make help           # Listar todos os comandos disponíveis
make test           # Rodar todos os testes (pytest + vitest)
make lint           # Executar pre-commit hooks
make clean          # Limpar ambiente (storage + DB)
make audit-demo     # Demonstração E2E do fluxo de auditoria
make format         # Formatar código (black + isort)
```

### Fluxo de Auditoria

1. Acesse http://localhost:3000/auditoria
2. Selecione o template (ex: `evolucional-dia1`)
3. Faça upload do ZIP com os cartões escaneados
4. Revise e corrija os cartões problemáticos
5. Exporte o CSV corrigido
6. Limpe o lote quando finalizado

---

**Dica:** Use sempre o `--setLayout` primeiro para configurar visualmente seu template antes de processar as imagens reais!

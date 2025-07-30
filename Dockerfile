FROM python:3.11-slim

WORKDIR /app

# Set environment variable to indicate Railway environment
ENV RAILWAY_ENVIRONMENT=true

# Instalar dependências do sistema necessárias para o OpenCV
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libglib2.0-0 \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

# Copiar arquivos de requisitos
COPY requirements.txt requirements-api.txt ./

# Instalar dependências Python
RUN pip install --no-cache-dir -r requirements-api.txt
RUN pip install opencv-python-headless

# Copiar código da aplicação
COPY . .

# Expor a porta
EXPOSE 8000

# Comando para iniciar a aplicação
CMD uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}
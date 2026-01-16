FROM python:3.11-slim

WORKDIR /app

# Instalar dependências do sistema (apenas ffmpeg para yt-dlp)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Garantir versão atualizada do yt-dlp
RUN pip install --no-cache-dir --upgrade yt-dlp

# Copiar aplicação
COPY . .

# Criar diretórios
RUN mkdir -p /app/downloads /app/data

# Executar
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

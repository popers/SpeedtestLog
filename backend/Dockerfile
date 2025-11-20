# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# --- NOWE KROKI: Instalacja speedtest-cli ORAZ klienta bazy danych ---
RUN apt-get update && apt-get install -y \
    curl gnupg lsb-release mariadb-client && \
    rm -rf /var/lib/apt/lists/*

RUN curl -s https://packagecloud.io/install/repositories/ookla/speedtest-cli/script.deb.sh | bash
RUN apt-get update && apt-get install -y speedtest
# --- Koniec nowych kroków ---

# Kopiuj i zainstaluj zależności Pythona
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Kopiuj pliki aplikacji
COPY backend/main.py .

# Kopiowanie plików frontendu
COPY frontend/index.html .
COPY frontend/login.html .
COPY frontend/backup.html . 
COPY frontend/manifest.json .
COPY frontend/style.css .
COPY frontend/script.js .
COPY frontend/logo.png .
COPY frontend/speedtest.png .
COPY frontend/favicon.ico .

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Run main.py when the container launches
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
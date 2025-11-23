# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Zapobiega buforowaniu logów Pythona
ENV PYTHONUNBUFFERED=1

# --- Instalacja narzędzi systemowych, klienta DB i PING ---
RUN apt-get update && apt-get install -y \
    curl gnupg lsb-release mariadb-client iputils-ping && \
    rm -rf /var/lib/apt/lists/*

# --- Instalacja speedtest-cli ---
RUN curl -s https://packagecloud.io/install/repositories/ookla/speedtest-cli/script.deb.sh | bash
RUN apt-get update && apt-get install -y speedtest

# Kopiuj i zainstaluj zależności Pythona
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Kopiuj pliki aplikacji backendowej
COPY backend/main.py .

# --- Kopiowanie plików frontendu ---
COPY frontend/css ./css
COPY frontend/js ./js
COPY frontend/index.html .
COPY frontend/login.html .
COPY frontend/backup.html .
COPY frontend/settings.html . 
COPY frontend/manifest.json .
COPY frontend/logo.png .
COPY frontend/speedtest.png .
COPY frontend/favicon.ico .

# Make port 8000 available 
EXPOSE 8000

# Run main.py
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
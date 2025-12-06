# 1. Obraz bazowy
FROM python:3.10-slim

# 2. Zmienne środowiskowe
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 3. Katalog roboczy
WORKDIR /app

# 4. Instalacja narzędzi systemowych (curl do healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 5. Instalacja zależności (Cache)
# Kopiujemy requirements.txt z podkatalogu backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 6. Kopiowanie kodu aplikacji (Backend)
# Kopiujemy zawartość folderu backend bezpośrednio do /app
# Dzięki temu main.py będzie w /app/main.py
COPY backend/ .

# 7. Kopiowanie kodu aplikacji (Frontend)
# Kopiujemy folder frontend do katalogu /app/frontend
# Dzięki temu struktura w kontenerze będzie idealna dla StaticFiles
COPY frontend/ ./frontend

# 8. Konfiguracja portu i start
EXPOSE 8000

# Uruchamiamy aplikację
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
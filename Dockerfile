# 1. Obraz bazowy
FROM python:3.10-slim

# 2. Zmienne środowiskowe
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 3. Katalog roboczy
WORKDIR /app

# 4. Instalacja narzędzi systemowych
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    iputils-ping \
    default-mysql-client \
    && rm -rf /var/lib/apt/lists/*

# 5. Instalacja zależności (Cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 6. Instalacja Speedtest CLI (oficjalna binarka Ookla)
RUN curl -s https://install.speedtest.net/app/cli/ookla-speedtest-1.2.0-linux-x86_64.tgz | tar xz -C /usr/local/bin speedtest

# 7. Kopiowanie kodu aplikacji
# Kopiujemy zawartość frontend BEZPOŚREDNIO do /app.
# Teraz frontend zawiera:
# - pliki .html, .js, .css w głównym katalogu (lub podkatalogach js/css)
# - katalog 'py' z kodem backendu
COPY frontend/ .

# 8. Konfiguracja portu i start
EXPOSE 8000

# Uruchamiamy aplikację.
# Ponieważ skopiowaliśmy 'frontend/' do '/app', a w nim jest folder 'py',
# ścieżka do modułu to 'py.main:app'.
CMD ["uvicorn", "py.main:app", "--host", "0.0.0.0", "--port", "8000"]
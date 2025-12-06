# 1. Obraz bazowy
FROM python:3.10-slim

# 2. Zmienne środowiskowe
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 3. Katalog roboczy
WORKDIR /app

# 4. Instalacja narzędzi systemowych (curl do healthcheck, iputils-ping do watchdog)
# Dodajemy iputils-ping, ponieważ Twoja aplikacja używa polecenia 'ping' w watchdog.py
# Dodajemy default-mysql-client, ponieważ backup.py używa 'mysqldump' i 'mysql'
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    iputils-ping \
    default-mysql-client \
    && rm -rf /var/lib/apt/lists/*

# 5. Instalacja zależności (Cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 6. Instalacja Speedtest CLI (oficjalna binarka Ookla)
# Jest wymagana przez backend/speedtest.py.
# Pobieramy, rozpakowujemy i usuwamy zbędne pliki.
RUN curl -s https://install.speedtest.net/app/cli/ookla-speedtest-1.2.0-linux-x86_64.tgz | tar xz -C /usr/local/bin speedtest

# 7. Kopiowanie kodu aplikacji (Backend)
# Kopiujemy zawartość folderu backend bezpośrednio do /app
COPY backend/ ./py

# 8. Kopiowanie kodu aplikacji (Frontend)
# ZMIANA: Kopiujemy zawartość frontend BEZPOŚREDNIO do /app, a nie do /app/frontend.
# Dzięki temu foldery 'css' i 'js' oraz 'index.html' są w tym samym katalogu co main.py
COPY frontend/ .

# 9. Konfiguracja portu i start
EXPOSE 8000

# Uruchamiamy aplikację
CMD ["uvicorn", "py.main:app", "--host", "0.0.0.0", "--port", "8000"]
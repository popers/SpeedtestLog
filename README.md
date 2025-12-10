# SpeedtestLog ![version](https://img.shields.io/badge/v0.2-blue)

SpeedtestLog is a self-hosted application designed to track your internet connection performance over time. It automatically runs speed tests using the official Ookla CLI, logs the results to a database, visualizes them on interactive charts, and monitors your connection stability via a continuous Ping Watchdog.

### Features:

* **Automated Speedtests:** Schedules periodic tests using the official Ookla CLI to log download, upload, ping, and jitter metrics.

* **Interactive Visualization:** Displays performance trends and detailed history on dynamic charts and searchable tables.

* **Connectivity Watchdog:** Continuously monitors connection status to detect downtime and packet loss in real-time.

* **Smart Notifications:** Sends alerts via Webhook, Ntfy.sh, Pushover, or browser push notifications when tests complete or status changes.

* **Backup & Restore:** Supports easy local database exports and automated cloud backups to Google Drive.

* **Secure Access:** Features built-in password authentication and supports OpenID Connect (OIDC) for Single Sign-On integration.

* **Responsive Design:** Offers a modern, mobile-friendly user interface with customizable dark and light themes.

### Screenshots:

**Dashboard**

<img alt="dashboard" src="https://github.com/user-attachments/assets/c32f2bcf-fc01-4eaa-86a8-401ad742f41d" />

**Backup**

<img alt="backup" src="https://github.com/user-attachments/assets/089671d1-2b9d-4c05-bf4d-d29f28c508ee" />

**Settings**

<img alt="settings" src="https://github.com/user-attachments/assets/69ece726-79a5-48bb-964b-3637e4314aec" />

**Watchdog**

<img alt="watchdog" src="https://github.com/user-attachments/assets/5fa19b06-f8e8-4147-973a-2d630dc69ddc" />

### 🚀 Installation (Docker)

**Docker compose:**
```
services:
  speedtestlog:
    image: popers/speedtestlog:latest
    container_name: speedtestlog-app
    ports:
      - "8000:8000"
    environment:
      - DB_HOST=db
      - DB_PORT=3306
      - DB_DATABASE=${DB_DATABASE}
      - DB_USERNAME=${DB_USERNAME}
      - DB_PASSWORD=${DB_PASSWORD}
      - AUTH_ENABLED=${AUTH_ENABLED}
      - APP_USERNAME=${APP_USERNAME}
      - APP_PASSWORD=${APP_PASSWORD}
      - SESSION_SECRET=${SESSION_SECRET}
      - APP_LANG=${APP_LANG}
      - OOKLA_EULA_GDPR=true
      - TZ=Europe/Amsterdam
    volumes:
      # Persist application logs
      - ./data_app:/app/data
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "--fail", "http://localhost:8000/api/auth-status"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s
    restart: unless-stopped

  db:
    image: mariadb:10.11
    container_name: speedtestlog-db
    environment:
      - MARIADB_DATABASE=${DB_DATABASE}
      - MARIADB_USER=${DB_USERNAME}
      - MARIADB_PASSWORD=${DB_PASSWORD}
      - MARIADB_ROOT_PASSWORD=${DB_ROOT_PASSWORD}
      - TZ=Europe/Amsterdam
    volumes:
      - db-data:/var/lib/mysql
      - ./data_db_logs:/var/log/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "${DB_USERNAME}", "-p${DB_PASSWORD}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    command:
      - --slow_query_log=1
      - --long_query_time=2
      - --innodb-use-native-aio=0
volumes:
  db-data:
```

**.env**
```
DB_CONNECTION=mysql
DB_HOST=db
DB_PORT=3306
DB_DATABASE=speedtestlog
DB_USERNAME=speedtestlog
DB_PASSWORD=strong_db_password
DB_ROOT_PASSWORD=strong_root_password
SESSION_SECRET=change_me_to_something_random_and_long
AUTH_ENABLED=true
APP_USERNAME=admin
APP_PASSWORD=admin
APP_LANG=en
```

**Start the containers:**
```
docker compose up -d
```

Your SpeedtestLog dashboard will be accessible at: http://your-server-ip:8000


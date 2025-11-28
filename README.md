SpeedtestLog 🚀

SpeedtestLog is a robust, self-hosted application designed to track your internet connection performance over time. Built with FastAPI (Python) and a vanilla JS/HTML/CSS frontend, it runs seamlessly in Docker.

It automatically runs speed tests using the official Ookla CLI, logs the results to a database, visualizes them on interactive charts, and monitors your connection stability via a continuous Ping Watchdog.

Note: This project is designed to be lightweight and privacy-focused. You own your data.

✨ Key Features

📊 Monitoring & Analytics

Automated Speedtests: Schedule tests to run every 1, 3, 6, 12, or 24 hours.

Interactive Charts: Visualize Download, Upload, Ping, Jitter, and Loaded Latency trends over time (24h, 7 days, 30 days, or All-time).

Detailed History: Browse a paginated table of every test result with precise timestamps and server details.

ISP Comparison: Define your declared ISP speeds to see percentage performance metrics at a glance.

🐶 Connectivity Watchdog

Ping Watchdog: Continuously monitors connection stability by pinging a target (e.g., 8.8.8.8).

Live Status: Real-time Online/Offline indicator in the UI.

Packet Loss Tracking: Logs latency and packet loss history to help diagnose intermittent connection issues.

🔔 Notifications

Multiple Providers: Get notified via Browser Push, Webhooks, Ntfy.sh, or Pushover.

Smart Alerts: Receive alerts on completed speed tests or when the Watchdog detects a connection drop/restore.

🛡️ Security & Management

Authentication: Secure login system with session management.

OIDC Support: Optional Single Sign-On (SSO) integration (e.g., Keycloak, Authentik, Google).

Backup & Restore:

One-click local SQL database export/import.

Google Drive Integration: Automatically upload backups to your Google Drive on a schedule.

🎨 UI & UX

Responsive Design: Fully optimized for desktop and mobile devices.

Dark/Light Mode: Toggle themes based on preference.

Multi-language: Supports English and Polish.

🚀 Installation (Docker)

The recommended way to run SpeedtestLog is using Docker Compose.

1. Create a project directory

Create a folder on your server and navigate into it:

mkdir speedtestlog
cd speedtestlog


2. Create compose.yaml

Create a file named compose.yaml (or docker-compose.yml) with the following content. This configuration pulls the stable version 1.0 from Docker Hub.
```
services:
  backend:
    image: popers/speedtestlog:1.0
    container_name: speedtest-backend
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
      # Required to accept Ookla's license
      - OOKLA_EULA_GDPR=true
      # Set your timezone for correct scheduling
      - TZ=Europe/Warsaw
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
    container_name: speedtest-mariadb
    environment:
      - MARIADB_DATABASE=${DB_DATABASE}
      - MARIADB_USER=${DB_USERNAME}
      - MARIADB_PASSWORD=${DB_PASSWORD}
      - MARIADB_ROOT_PASSWORD=${DB_ROOT_PASSWORD}
      - TZ=Europe/Warsaw
    volumes:
      # Persist database data
      - speedtest-db-data:/var/lib/mysql
      # Database logs
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
  speedtest-db-data:
```

3. Create .env file

Create a .env file in the same directory to store your configuration secrets.

⚠️ Security Warning: Please change the default passwords and secrets before deploying!
```
# --- Database Configuration ---
DB_CONNECTION=mysql
DB_HOST=db
DB_PORT=3306
DB_DATABASE=speedtest
DB_USERNAME=speedtest
# Change these passwords!
DB_PASSWORD=strong_db_password
DB_ROOT_PASSWORD=strong_root_password

# --- App Configuration ---
# Session Secret (Random string for security cookies)
SESSION_SECRET=change_me_to_something_random_and_long

# Enable Login? (true/false)
AUTH_ENABLED=true

# Dashboard Login Credentials
APP_USERNAME=admin
APP_PASSWORD=admin

# Default Language (en/pl)
APP_LANG=en

# Timezone (Important for correct scheduling)
TZ=Europe/London
```

4. Run the application

Start the containers in detached mode:

docker compose up -d


Your SpeedtestLog dashboard will be accessible at: http://your-server-ip:8000

⚙️ Configuration Notes

Google Drive Backup: To enable cloud backups, go to the Backup tab in the UI. You will need to provide a Google Cloud Client ID and Secret (authorized for the Drive API) and authorize the application.

OIDC (SSO): Can be configured in the Settings tab. Ensure your Identity Provider sends the email or sub claim.

Startup Test: By default, the application runs a speed test 1 minute after the container starts to verify functionality. This can be disabled in Settings.

🛠️ Built With

Backend: Python 3.11, FastAPI, SQLAlchemy, APScheduler

Frontend: HTML5, CSS3 (Variables), Vanilla JavaScript

Database: MariaDB

Speedtest Engine: Official Ookla Speedtest CLI

📄 License

This project is open-source. Feel free to fork and contribute!

SCREENSHOTS:

Dashboard
<img width="2560" height="4540" alt="dashboard" src="https://github.com/user-attachments/assets/eca6e596-2711-45c8-b759-c53abe96b7d1" />

Backup
<img width="2560" height="1288" alt="backup" src="https://github.com/user-attachments/assets/8f79ab62-145f-463a-927e-c7aab43c57f4" />

Settings
<img width="2560" height="2529" alt="settings" src="https://github.com/user-attachments/assets/2b87d6fd-f3c1-425d-8e02-c5530eacb232" />


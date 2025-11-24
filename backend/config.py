import os
import sys
import logging
from logging.handlers import RotatingFileHandler

# --- Konfiguracja Zmiennych ---
LOG_DIR = '/app/data/logs'
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, 'app.log')
SERVERS_FILE = 'data/servers.json'

# Pobranie języka aplikacji z ENV (domyślnie polski)
APP_LANG = os.getenv("APP_LANG", "pl").lower()

DB_USER = os.getenv("DB_USERNAME")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_DATABASE")

AUTH_ENABLED = os.getenv("AUTH_ENABLED", "true").lower() in ["true", "1", "yes"]
APP_USERNAME = os.getenv("APP_USERNAME", "admin")
APP_PASSWORD = os.getenv("APP_PASSWORD", "admin")
SESSION_COOKIE_NAME = "speedtest_session"
import secrets
SESSION_SECRET = os.getenv("SESSION_SECRET") or secrets.token_hex(16)

os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

# --- Konfiguracja Logowania ---
def setup_logging():
    log_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    
    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(log_formatter)
    stream_handler.setLevel(logging.INFO)
    
    file_handler = RotatingFileHandler(LOG_FILE, maxBytes=5 * 1024 * 1024, backupCount=5, encoding='utf-8')
    file_handler.setFormatter(log_formatter)
    file_handler.setLevel(logging.INFO)

    # Konfiguracja głównego loggera (root)
    # force=True resetuje istniejące handlery, co pomaga uniknąć duplikatów
    logging.basicConfig(level=logging.INFO, handlers=[stream_handler, file_handler], force=True)
    
    # Wyciszenie gadatliwych bibliotek
    logging.getLogger("schedule").setLevel(logging.WARNING)
    logging.getLogger("multipart").setLevel(logging.WARNING)
    logging.getLogger("googleapiclient").setLevel(logging.WARNING)
    logging.getLogger("requests").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    
    # ZMIANA: Usunięto explicit dodawanie handlera do uvicorn, aby uniknąć podwójnych logów w konsoli
    # Uvicorn domyślnie ma swoje handlery konsolowe.
    # Jeśli chcemy, aby logi uvicorn trafiały TEŻ do pliku, dodajemy file_handler:
    logging.getLogger("uvicorn").addHandler(file_handler)
    logging.getLogger("uvicorn.access").addHandler(file_handler)

# --- Słownik Tłumaczeń Powiadomień ---
NOTIF_TRANS = {
    "pl": {
        "speedtest_title": "🚀 Nowy wynik Speedtest",
        "speedtest_body": "Download: {dl} Mbps, Upload: {ul} Mbps, Ping: {ping} ms.",
        "watchdog_up_title": "🟢 Watchdog ONLINE",
        "watchdog_up_body": "Ping Watchdog: Cel {target} jest teraz ONLINE.",
        "watchdog_down_title": "🔴 Watchdog OFFLINE",
        "watchdog_down_body": "Ping Watchdog: Cel {target} jest teraz OFFLINE.",
        "test_title": "Test Powiadomienia",
        "test_body": "To jest testowe powiadomienie ze SpeedtestLog. 🚀"
    },
    "en": {
        "speedtest_title": "🚀 New Speedtest Result",
        "speedtest_body": "Download: {dl} Mbps, Upload: {ul} Mbps, Ping: {ping} ms.",
        "watchdog_up_title": "🟢 Watchdog ONLINE",
        "watchdog_up_body": "Ping Watchdog: Target {target} is now ONLINE.",
        "watchdog_down_title": "🔴 Watchdog OFFLINE",
        "watchdog_down_body": "Ping Watchdog: Target {target} is now OFFLINE.",
        "test_title": "Notification Test",
        "test_body": "This is a test notification from SpeedtestLog. 🚀"
    }
}

# --- Słownik Tłumaczeń Logów ---
LOG_TRANS = {
    "en": {
        "db_init": "⏳ Initializing database...",
        "db_mig_startup": "🔧 Migration: Adding startup_test_enabled column...",
        "db_mig_colors": "🔧 Migration: Adding chart color columns...",
        "db_mig_notify": "🔧 Migration: Adding notification settings...",
        "db_mig_lang": "🔧 Migration: Adding app_language column...",
        "db_connected": "✅ Connected to database.",
        "db_unavailable": "⚠️ Database unavailable... ({}/{})",
        "backup_start": "📂 Starting scheduled Google Drive backup...",
        "backup_skipped": "Backup skipped: Disabled or no token.",
        "backup_dump_err": "mysqldump error",
        "drive_api_err": "No access to Drive API",
        "backup_old_removed": "Removed old backup: {}",
        "backup_success": "✅ Backup to Google Drive successful.",
        "backup_crit_err": "Backup critical error: {}",
        "backup_scheduled": "🗓️ Backup scheduled every {} days at {}",
        "watchdog_start": "🐶 Starting Ping Watchdog...",
        "servers_err": "Servers error: {}",
        "test_err_fallback": "⚠️ Test error on server ID {}. Attempting auto fallback...",
        "test_err_auto": "❌ Speedtest Error (Auto Fallback): {}",
        "test_err": "❌ Speedtest Error: {}",
        "result_format_err": "❌ Invalid result format: {}",
        "test_result": "✅ Speedtest Result: ↓ {} Mbps",
        "test_crit_err": "❌ Critical Speedtest Error: {}",
        "startup_test_scheduled": "🕒 Startup test scheduled in 1 minute.",
        "settings_updated": "⚙️ Settings updated.",
        "auth_url_gen": "🔐 Generating auth URL with Redirect URI: {}",
        "auth_url_warn": "⚠️ ENSURE THIS URL IS ADDED IN GOOGLE CLOUD CONSOLE!",
        "callback_params": "Callback params - Code: {}, Error: {}",
        "callback_full": "Callback Full Params: {}",
        "google_err": "Google returned error: {}",
        "no_code": "No auth code in callback",
        "auth_callback_err": "Auth Callback Error: {}",
        "watchdog_err": "Watchdog error: {}",
        "notify_sent": "🔔 Notification sent via {}"
    },
    "pl": {
        "db_init": "⏳ Inicjalizacja bazy danych...",
        "db_mig_startup": "🔧 Migracja: Dodawanie kolumny startup_test_enabled...",
        "db_mig_colors": "🔧 Migracja: Dodawanie kolumn kolorów wykresów...",
        "db_mig_notify": "🔧 Migracja: Dodawanie ustawień powiadomień...",
        "db_mig_lang": "🔧 Migracja: Dodawanie kolumny app_language...",
        "db_connected": "✅ Połączono z bazą danych.",
        "db_unavailable": "⚠️ Baza niedostępna... ({}/{})",
        "backup_start": "📂 Rozpoczynanie zaplanowanego backupu do Google Drive...",
        "backup_skipped": "Backup pominięty: Wyłączony lub brak tokena.",
        "backup_dump_err": "Błąd mysqldump",
        "drive_api_err": "Brak dostępu do API Drive",
        "backup_old_removed": "Usunięto stary backup: {}",
        "backup_success": "✅ Backup do Google Drive zakończony sukcesem.",
        "backup_crit_err": "Backup critical error: {}",
        "backup_scheduled": "🗓️ Zaplanowano backup co {} dni o {}",
        "watchdog_start": "🐶 Uruchamianie Ping Watchdog...",
        "servers_err": "Błąd serwerów: {}",
        "test_err_fallback": "⚠️ Błąd testu na serwerze ID {}. Próba automatycznego wyboru serwera...",
        "test_err_auto": "❌ Błąd Speedtestu (Auto Fallback): {}",
        "test_err": "❌ Błąd Speedtestu: {}",
        "result_format_err": "❌ Nieprawidłowy format wyniku: {}",
        "test_result": "✅ Wynik Speedtestu: ↓ {} Mbps",
        "test_crit_err": "❌ Krytyczny błąd Speedtestu: {}",
        "startup_test_scheduled": "🕒 Zaplanowano test startowy za 1 minutę.",
        "settings_updated": "⚙️ Ustawienia zaktualizowane.",
        "auth_url_gen": "🔐 Generowanie URL autoryzacji z Redirect URI: {}",
        "auth_url_warn": "⚠️ UPEWNIJ SIĘ, ŻE TEN ADRES JEST DODANY W GOOGLE CLOUD CONSOLE!",
        "callback_params": "Callback params - Code: {}, Error: {}",
        "callback_full": "Callback Full Params: {}",
        "google_err": "Google zwróciło błąd: {}",
        "no_code": "Brak kodu autoryzacji w callbacku",
        "auth_callback_err": "Auth Callback Error: {}",
        "watchdog_err": "Watchdog error: {}",
        "notify_sent": "🔔 Wysłano powiadomienie przez {}"
    }
}

def get_log(key, *args):
    """Helper do pobierania przetłumaczonego loga"""
    lang_dict = LOG_TRANS.get(APP_LANG, LOG_TRANS["pl"])
    msg = lang_dict.get(key, key)
    if args:
        try:
            return msg.format(*args)
        except Exception:
            return msg + " " + str(args)
    return msg
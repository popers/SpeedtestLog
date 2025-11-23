import os
import json
import subprocess
import threading
import time
import schedule
import uvicorn
import uuid
import logging
import sys
import csv
import io
import secrets
import shutil
import re
from logging.handlers import RotatingFileHandler
from fastapi import FastAPI, HTTPException, Request, Depends, Response, status, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse, RedirectResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from contextlib import asynccontextmanager
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

# --- Importy SQLAlchemy i MariaDB ---
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, text
from sqlalchemy.dialects.mysql import DATETIME, MEDIUMTEXT
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.exc import OperationalError
import pymysql

# --- Importy Google Drive --- 
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from google.auth.transport.requests import Request as GoogleRequest

# --- Konfiguracja Logowania ---
LOG_DIR = '/app/data/logs'
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, 'app.log')

# Pobranie języka aplikacji z ENV (domyślnie polski)
APP_LANG = os.getenv("APP_LANG", "pl").lower()

log_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
stream_handler = logging.StreamHandler(sys.stdout)
stream_handler.setFormatter(log_formatter)
stream_handler.setLevel(logging.INFO)
file_handler = RotatingFileHandler(LOG_FILE, maxBytes=5 * 1024 * 1024, backupCount=5, encoding='utf-8')
file_handler.setFormatter(log_formatter)
file_handler.setLevel(logging.INFO)

logging.basicConfig(level=logging.INFO, handlers=[stream_handler, file_handler], force=True)
logging.getLogger("uvicorn").addHandler(stream_handler)
logging.getLogger("schedule").setLevel(logging.WARNING)
logging.getLogger("multipart").setLevel(logging.WARNING)
logging.getLogger("googleapiclient").setLevel(logging.WARNING)

# --- Słownik Tłumaczeń Logów ---
LOG_TRANS = {
    "en": {
        "db_init": "⏳ Initializing database...",
        "db_mig_startup": "🔧 Migration: Adding startup_test_enabled column...",
        "db_mig_colors": "🔧 Migration: Adding chart color columns...",
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
        "watchdog_err": "Watchdog error: {}"
    },
    "pl": {
        "db_init": "⏳ Inicjalizacja bazy danych...",
        "db_mig_startup": "🔧 Migracja: Dodawanie kolumny startup_test_enabled...",
        "db_mig_colors": "🔧 Migracja: Dodawanie kolumn kolorów wykresów...",
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
        "watchdog_err": "Watchdog error: {}"
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

# --- Konfiguracja ENV i DB ---
DB_USER = os.getenv("DB_USERNAME")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_DATABASE")

AUTH_ENABLED = os.getenv("AUTH_ENABLED", "true").lower() in ["true", "1", "yes"]
APP_USERNAME = os.getenv("APP_USERNAME", "admin")
APP_PASSWORD = os.getenv("APP_PASSWORD", "admin")
SESSION_COOKIE_NAME = "speedtest_session"
SESSION_SECRET = os.getenv("SESSION_SECRET") or secrets.token_hex(16)

os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

SQLALCHEMY_DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
Base = declarative_base()

# --- Modele Pydantic ---
class SettingsModel(BaseModel):
    server_id: int | None = None
    schedule_hours: int | None = 1
    ping_target: str | None = "8.8.8.8"
    ping_interval: int | None = 30
    declared_download: int | None = 0
    declared_upload: int | None = 0
    startup_test_enabled: bool | None = True
    # Nowe pola kolorów
    chart_color_download: str | None = None
    chart_color_upload: str | None = None
    chart_color_ping: str | None = None
    chart_color_jitter: str | None = None

class BackupSettingsModel(BaseModel):
    client_id: str | None = None
    client_secret: str | None = None
    folder_name: str | None = "SpeedtestLog_Backup"
    schedule_days: int | None = 1
    schedule_time: str | None = "03:00"
    retention_days: int | None = 30
    is_enabled: bool | None = False

class DeleteModel(BaseModel):
    ids: list[str]

class LoginModel(BaseModel):
    username: str
    password: str

# --- Modele SQLAlchemy ---
class SpeedtestResult(Base):
    __tablename__ = "speedtest_results"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp = Column(DATETIME(fsp=6), default=datetime.now)
    ping = Column(Float)
    jitter = Column(Float)
    download = Column(Float)
    upload = Column(Float)
    server_id = Column(Integer, nullable=True)
    server_name = Column(String(255), nullable=True)
    server_location = Column(String(255), nullable=True)
    result_url = Column(String(255), nullable=True)
    isp = Column(String(255), nullable=True)
    client_ip = Column(String(45), nullable=True)
    ping_low = Column(Float, nullable=True)
    download_latency_low = Column(Float, nullable=True)
    download_latency_high = Column(Float, nullable=True)
    upload_latency_low = Column(Float, nullable=True)
    upload_latency_high = Column(Float, nullable=True)

class PingLog(Base):
    __tablename__ = "ping_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DATETIME(fsp=6), default=datetime.now)
    target = Column(String(255))
    latency = Column(Float, nullable=True) 
    packet_loss = Column(Float) 
    is_online = Column(Boolean)

class AppSettings(Base):
    __tablename__ = "app_settings"
    id = Column(Integer, primary_key=True, index=True)
    selected_server_id = Column(Integer, nullable=True)
    schedule_hours = Column(Integer, default=1)
    ping_target = Column(String(255), default="8.8.8.8")
    ping_interval = Column(Integer, default=30)
    declared_download = Column(Integer, default=0)
    declared_upload = Column(Integer, default=0)
    startup_test_enabled = Column(Boolean, default=True)
    # Nowe kolumny na kolory
    chart_color_download = Column(String(20), nullable=True)
    chart_color_upload = Column(String(20), nullable=True)
    chart_color_ping = Column(String(20), nullable=True)
    chart_color_jitter = Column(String(20), nullable=True)

class DriveBackupSettings(Base):
    __tablename__ = "drive_backup_settings"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(String(255), nullable=True)
    client_secret = Column(String(255), nullable=True)
    token_json = Column(MEDIUMTEXT, nullable=True) 
    folder_name = Column(String(255), default="SpeedtestLog_Backup")
    schedule_days = Column(Integer, default=1) 
    schedule_time = Column(String(10), default="03:00") 
    retention_days = Column(Integer, default=30)
    is_enabled = Column(Boolean, default=False)
    last_run = Column(DATETIME, nullable=True)
    last_status = Column(String(50), nullable=True)

# --- Globalne Zmienne ---
SERVERS_FILE = 'data/servers.json'
os.makedirs('data', exist_ok=True)
test_lock = threading.Lock()
app_state = {
    "schedule_job": None,
    "backup_job": None,
    "engine": None, 
    "SessionLocal": None,
    "watchdog_config": {"target": "8.8.8.8", "interval": 30},
    "latest_ping_status": {"online": False, "latency": 0, "loss": 0, "target": "init"}
}

# --- Inicjalizacja DB ---
def initialize_db(max_retries=10, delay=5):
    logging.info(get_log("db_init"))
    global engine, SessionLocal
    engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    app_state["engine"] = engine
    app_state["SessionLocal"] = SessionLocal
    for i in range(max_retries):
        try:
            with engine.connect() as connection:
                Base.metadata.create_all(bind=engine)
                
                # Migracja: startup_test_enabled
                try:
                    connection.execute(text("SELECT startup_test_enabled FROM app_settings LIMIT 1"))
                except Exception:
                    logging.info(get_log("db_mig_startup"))
                    connection.execute(text("ALTER TABLE app_settings ADD COLUMN startup_test_enabled BOOLEAN DEFAULT 1"))
                    connection.commit()
                
                # Migracja: kolory wykresów
                try:
                    connection.execute(text("SELECT chart_color_download FROM app_settings LIMIT 1"))
                except Exception:
                    logging.info(get_log("db_mig_colors"))
                    connection.execute(text("ALTER TABLE app_settings ADD COLUMN chart_color_download VARCHAR(20) DEFAULT NULL"))
                    connection.execute(text("ALTER TABLE app_settings ADD COLUMN chart_color_upload VARCHAR(20) DEFAULT NULL"))
                    connection.execute(text("ALTER TABLE app_settings ADD COLUMN chart_color_ping VARCHAR(20) DEFAULT NULL"))
                    connection.execute(text("ALTER TABLE app_settings ADD COLUMN chart_color_jitter VARCHAR(20) DEFAULT NULL"))
                    connection.commit()

                logging.info(get_log("db_connected"))
                return
        except OperationalError:
            logging.warning(get_log("db_unavailable", i+1, max_retries))
            if i < max_retries - 1: time.sleep(delay)
            else: raise

def get_db():
    db = app_state["SessionLocal"]()
    try: yield db
    finally: db.close()

# --- Helpery ---
def load_settings_from_db(db_session):
    settings = db_session.query(AppSettings).filter(AppSettings.id == 1).first()
    if not settings:
        settings = AppSettings(id=1, selected_server_id=None, schedule_hours=1, ping_target="8.8.8.8", ping_interval=30, declared_download=0, declared_upload=0, startup_test_enabled=True)
        db_session.add(settings)
        db_session.commit()
    return settings

def load_backup_settings(db_session):
    settings = db_session.query(DriveBackupSettings).filter(DriveBackupSettings.id == 1).first()
    if not settings:
        settings = DriveBackupSettings(id=1)
        db_session.add(settings)
        db_session.commit()
    return settings

# --- Google Drive Functions ---
SCOPES = ['https://www.googleapis.com/auth/drive.file']

def get_drive_service(settings):
    if not settings.token_json or not settings.client_id or not settings.client_secret:
        return None
    
    try:
        token_data = json.loads(settings.token_json)
        creds = Credentials.from_authorized_user_info(token_data, SCOPES)
        
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(GoogleRequest())
            db = app_state["SessionLocal"]()
            s = load_backup_settings(db)
            s.token_json = creds.to_json()
            db.commit()
            db.close()
            
        return build('drive', 'v3', credentials=creds)
    except Exception as e:
        logging.error(f"Google Auth Error: {e}")
        return None

def get_or_create_folder(service, folder_name):
    query = f"mimeType='application/vnd.google-apps.folder' and name='{folder_name}' and trashed=false"
    results = service.files().list(q=query, spaces='drive', fields='files(id, name)').execute()
    items = results.get('files', [])
    
    if not items:
        file_metadata = {
            'name': folder_name,
            'mimeType': 'application/vnd.google-apps.folder'
        }
        file = service.files().create(body=file_metadata, fields='id').execute()
        return file.get('id')
    else:
        return items[0].get('id')

def perform_backup_task():
    logging.info(get_log("backup_start"))
    db = app_state["SessionLocal"]()
    try:
        settings = load_backup_settings(db)
        if not settings.is_enabled or not settings.token_json:
            logging.warning(get_log("backup_skipped"))
            return

        # 1. Generowanie zrzutu bazy
        env = os.environ.copy(); env["MYSQL_PWD"] = DB_PASSWORD
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        filename = f"speedtest_backup_{timestamp}.sql"
        temp_path = f"/tmp/{filename}"
        
        cmd = ["mysqldump", "-h", DB_HOST, "-P", str(DB_PORT), "-u", DB_USER, "--no-tablespaces", DB_NAME]
        with open(temp_path, "w") as f:
            proc = subprocess.run(cmd, stdout=f, stderr=subprocess.PIPE, env=env)
        
        if proc.returncode != 0:
            logging.error(get_log("backup_dump_err"))
            settings.last_status = "error"
            db.commit()
            return

        # 2. Upload do Drive
        service = get_drive_service(settings)
        if not service:
            logging.error(get_log("drive_api_err"))
            settings.last_status = "auth_error"
            db.commit()
            return

        folder_id = get_or_create_folder(service, settings.folder_name or "SpeedtestLog_Backup")
        
        file_metadata = {'name': filename, 'parents': [folder_id]}
        media = MediaIoBaseUpload(open(temp_path, 'rb'), mimetype='application/sql')
        
        service.files().create(body=file_metadata, media_body=media, fields='id').execute()
        
        # 3. Retencja (usuwanie starych)
        if settings.retention_days and settings.retention_days > 0:
            cutoff_date = (datetime.now() - timedelta(days=settings.retention_days)).isoformat()
            query = f"'{folder_id}' in parents and createdTime < '{cutoff_date}' and trashed=false"
            results = service.files().list(q=query, fields="files(id, name)").execute()
            for file in results.get('files', []):
                try:
                    service.files().delete(fileId=file.get('id')).execute()
                    logging.info(get_log("backup_old_removed", file.get('name')))
                except: pass

        # Sprzątanie lokalne
        os.remove(temp_path)
        
        settings.last_run = datetime.now()
        settings.last_status = "success"
        db.commit()
        logging.info(get_log("backup_success"))

    except Exception as e:
        logging.error(get_log("backup_crit_err", e))
        settings.last_status = f"error: {str(e)}"
        db.commit()
    finally:
        db.close()

def setup_backup_schedule(settings):
    if app_state["backup_job"]:
        try:
            schedule.cancel_job(app_state["backup_job"])
        except: pass
        app_state["backup_job"] = None

    if settings.is_enabled and settings.schedule_days and settings.schedule_time:
        days = int(settings.schedule_days)
        if days < 1: days = 1
        
        app_state["backup_job"] = schedule.every(days).days.at(settings.schedule_time).do(
            lambda: threading.Thread(target=perform_backup_task, daemon=True).start()
        )
        logging.info(get_log("backup_scheduled", days, settings.schedule_time))

# --- Pozostałe funkcje (Watchdog, Speedtest) ---
def run_ping_watchdog():
    logging.info(get_log("watchdog_start"))
    while True:
        db = app_state["SessionLocal"]()
        try:
            s = load_settings_from_db(db)
            target = s.ping_target
            interval = s.ping_interval if s.ping_interval and s.ping_interval >= 5 else 30
            
            app_state["watchdog_config"] = {"target": target, "interval": interval}

            cmd = ["ping", "-c", "3", "-W", "2", target]
            proc = subprocess.run(cmd, capture_output=True, text=True)
            
            latency = None
            packet_loss = 100.0
            is_online = False
            output = proc.stdout
            
            loss_match = re.search(r"(\d+)% packet loss", output)
            if loss_match:
                packet_loss = float(loss_match.group(1))
            
            rtt_match = re.search(r"rtt min/avg/max/mdev = ([\d\.]+)/([\d\.]+)", output)
            if rtt_match:
                latency = float(rtt_match.group(2))
                is_online = True
            
            log_entry = PingLog(target=target, latency=latency, packet_loss=packet_loss, is_online=is_online)
            db.add(log_entry)
            
            cutoff = datetime.now() - timedelta(hours=24)
            db.query(PingLog).filter(PingLog.timestamp < cutoff).delete()
            db.commit()
            
            app_state["latest_ping_status"] = {
                "online": is_online,
                "latency": round(latency, 1) if latency else None,
                "loss": packet_loss,
                "target": target,
                "updated": datetime.now().isoformat()
            }

        except Exception as e:
            logging.error(get_log("watchdog_err", e))
        finally:
            db.close()
        
        time.sleep(app_state["watchdog_config"]["interval"])

def get_closest_servers():
    if not os.path.exists(SERVERS_FILE) or os.stat(SERVERS_FILE).st_size == 0:
        try:
            subprocess.run(['speedtest', '--accept-license', '--accept-gdpr', '--servers', '--format=json'], check=True, stdout=subprocess.DEVNULL)
            res = subprocess.run(['speedtest', '--accept-license', '--accept-gdpr', '--servers', '--format=json'], capture_output=True, text=True)
            with open(SERVERS_FILE, 'w', encoding='utf-8') as f: f.write(res.stdout)
        except Exception as e: logging.error(get_log("servers_err", e))

def run_speed_test_and_save(server_id=None):
    if not test_lock.acquire(blocking=False): return None
    db_session = app_state["SessionLocal"]()
    try:
        cmd = ['speedtest', '--accept-license', '--accept-gdpr', '--format=json']
        if server_id: cmd.extend(['--server-id', str(server_id)])
        
        proc = None
        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=600)
        except subprocess.CalledProcessError as e:
            if server_id:
                logging.warning(get_log("test_err_fallback", server_id))
                fallback_cmd = ['speedtest', '--accept-license', '--accept-gdpr', '--format=json']
                try:
                    proc = subprocess.run(fallback_cmd, capture_output=True, text=True, check=True, timeout=600)
                except subprocess.CalledProcessError as e2:
                    logging.error(get_log("test_err_auto", e2.stderr))
                    return None
            else:
                logging.error(get_log("test_err", e.stderr))
                return None

        if not proc: return None

        data = json.loads(proc.stdout)
        if data.get('type') != 'result': 
            logging.error(get_log("result_format_err", proc.stdout))
            return None
        
        res = SpeedtestResult(
            id=str(uuid.uuid4()), timestamp=datetime.now(),
            ping=data.get("ping", {}).get("latency", 0), jitter=data.get("ping", {}).get("jitter", 0),
            download=round(data.get("download", {}).get("bandwidth", 0) * 8 / 1_000_000, 2),
            upload=round(data.get("upload", {}).get("bandwidth", 0) * 8 / 1_000_000, 2),
            server_id=data.get("server", {}).get("id"), server_name=data.get("server", {}).get("name"),
            server_location=data.get("server", {}).get("location"), result_url=data.get("result", {}).get("url"),
            isp=data.get("isp"), client_ip=data.get("interface", {}).get("externalIp"),
            ping_low=data.get("ping", {}).get("low"),
            download_latency_low=data.get("download", {}).get("latency", {}).get("low"),
            download_latency_high=data.get("download", {}).get("latency", {}).get("high"),
            upload_latency_low=data.get("upload", {}).get("latency", {}).get("low"),
            upload_latency_high=data.get("upload", {}).get("latency", {}).get("high")
        )
        db_session.add(res)
        db_session.commit()
        logging.info(get_log("test_result", res.download))
        return res
    except Exception as e:
        logging.error(get_log("test_crit_err", e))
        return None
    finally:
        db_session.close()
        test_lock.release()

def run_scheduled_test(job_tag=None):
    if job_tag == 'startup-test': schedule.clear('startup-test')
    db = app_state["SessionLocal"]()
    s = load_settings_from_db(db)
    srv_id = s.selected_server_id 
    db.close()
    run_speed_test_and_save(srv_id)

def run_speed_test_and_save_threaded(job_tag=None):
    threading.Thread(target=run_scheduled_test, args=(job_tag,), daemon=True).start()

def run_schedule_loop():
    while True: schedule.run_pending(); time.sleep(1)

# --- FastAPI ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_db()
    
    threading.Thread(target=get_closest_servers, daemon=True).start()
    threading.Thread(target=run_schedule_loop, daemon=True).start()
    threading.Thread(target=run_ping_watchdog, daemon=True).start()
    
    db = app_state["SessionLocal"]()
    s = load_settings_from_db(db)
    bs = load_backup_settings(db) 
    
    hours = s.schedule_hours
    run_on_startup = s.startup_test_enabled
    
    if hours and hours > 0:
        app_state["schedule_job"] = schedule.every(hours).hours.do(run_speed_test_and_save_threaded, job_tag='hourly-test')
    
    if run_on_startup:
        logging.info(get_log("startup_test_scheduled"))
        schedule.every(1).minutes.do(run_speed_test_and_save_threaded, job_tag='startup-test').tag('startup-test')
    
    setup_backup_schedule(bs)
    db.close()
    
    yield
    if app_state["engine"]: app_state["engine"].dispose()

app = FastAPI(lifespan=lifespan)
app.mount("/css", StaticFiles(directory="css"), name="css")
app.mount("/js", StaticFiles(directory="js"), name="js")

async def verify_session(request: Request):
    if not AUTH_ENABLED: return True
    if request.cookies.get(SESSION_COOKIE_NAME) != SESSION_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return True

def get_redirect_uri(request: Request):
    base_url = str(request.base_url).rstrip('/')
    if "localhost" not in base_url and "127.0.0.1" not in base_url and base_url.startswith("http://"):
        base_url = base_url.replace("http://", "https://")
    return f"{base_url}/api/backup/google/callback"

# --- Endpoints ---
@app.post("/api/login")
async def login(creds: LoginModel, response: Response):
    if not AUTH_ENABLED: return {"message": "Auth disabled"}
    if creds.username == APP_USERNAME and creds.password == APP_PASSWORD:
        # Zmiana: Dodano max_age=2592000 (30 dni), aby ciasteczko przetrwało zamknięcie przeglądarki/restart aplikacji
        response.set_cookie(
            key=SESSION_COOKIE_NAME, 
            value=SESSION_SECRET, 
            httponly=True, 
            samesite='lax',
            max_age=2592000 
        )
        return {"message": "Logged in"}
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.post("/api/logout")
async def logout(response: Response):
    response.delete_cookie(SESSION_COOKIE_NAME)
    return {"message": "Logged out"}

@app.get("/api/auth-status")
async def auth_status(): return {"enabled": AUTH_ENABLED}

@app.get("/api/results", dependencies=[Depends(verify_session)])
async def get_results(db=Depends(get_db)):
    return db.query(SpeedtestResult).order_by(SpeedtestResult.timestamp.desc()).limit(1000).all()

@app.get("/api/results/latest", dependencies=[Depends(verify_session)])
async def get_latest(db=Depends(get_db)):
    res = db.query(SpeedtestResult).order_by(SpeedtestResult.timestamp.desc()).first()
    return res if res else JSONResponse(content={}, status_code=404)

@app.get("/api/servers", dependencies=[Depends(verify_session)])
async def get_srv():
    if os.path.exists(SERVERS_FILE):
        with open(SERVERS_FILE, 'r') as f: return json.load(f)
    raise HTTPException(status_code=404)

@app.get("/api/settings", dependencies=[Depends(verify_session)])
async def get_set(db=Depends(get_db)):
    s = load_settings_from_db(db)
    l = db.query(SpeedtestResult).order_by(SpeedtestResult.timestamp.desc()).first()
    return {
        "selected_server_id": s.selected_server_id,
        "schedule_hours": s.schedule_hours,
        "ping_target": s.ping_target,
        "ping_interval": s.ping_interval,
        "declared_download": s.declared_download,
        "declared_upload": s.declared_upload,
        "startup_test_enabled": s.startup_test_enabled,
        "chart_color_download": s.chart_color_download,
        "chart_color_upload": s.chart_color_upload,
        "chart_color_ping": s.chart_color_ping,
        "chart_color_jitter": s.chart_color_jitter,
        "latest_test_timestamp": l.timestamp if l else None
    }

@app.post("/api/settings", dependencies=[Depends(verify_session)])
async def set_set(s: SettingsModel, db=Depends(get_db)):
    rec = load_settings_from_db(db)
    
    if s.schedule_hours is not None and s.schedule_hours != rec.schedule_hours:
        if app_state["schedule_job"]: 
            schedule.cancel_job(app_state["schedule_job"])
            app_state["schedule_job"] = None
        
        if s.schedule_hours > 0:
            app_state["schedule_job"] = schedule.every(s.schedule_hours).hours.do(run_speed_test_and_save_threaded, job_tag='hourly-test')
    
    rec.selected_server_id = s.server_id
    if s.schedule_hours is not None: rec.schedule_hours = s.schedule_hours
    if s.ping_target: rec.ping_target = s.ping_target
    if s.ping_interval: rec.ping_interval = s.ping_interval
    if s.declared_download is not None: rec.declared_download = s.declared_download
    if s.declared_upload is not None: rec.declared_upload = s.declared_upload
    if s.startup_test_enabled is not None: rec.startup_test_enabled = s.startup_test_enabled
    
    # Zapis kolorów
    if s.chart_color_download: rec.chart_color_download = s.chart_color_download
    if s.chart_color_upload: rec.chart_color_upload = s.chart_color_upload
    if s.chart_color_ping: rec.chart_color_ping = s.chart_color_ping
    if s.chart_color_jitter: rec.chart_color_jitter = s.chart_color_jitter
    
    db.commit()
    logging.info(get_log("settings_updated"))
    return {"message": "Settings saved"}

@app.get("/api/watchdog/status", dependencies=[Depends(verify_session)])
async def watchdog_status(db=Depends(get_db)):
    history = db.query(PingLog).order_by(PingLog.timestamp.desc()).limit(60).all()
    history_data = [{"time": log.timestamp.strftime("%H:%M:%S"), "latency": log.latency} for log in reversed(history)]
    return {"current": app_state["latest_ping_status"], "history": history_data}

@app.post("/api/trigger-test", dependencies=[Depends(verify_session)])
async def trig_test(s: SettingsModel):
    if test_lock.locked(): raise HTTPException(status_code=429)
    threading.Thread(target=run_speed_test_and_save, args=(s.server_id,), daemon=True).start()
    return {"message": "Started"}

@app.delete("/api/results", dependencies=[Depends(verify_session)])
async def del_res(d: DeleteModel, db=Depends(get_db)):
    c = db.query(SpeedtestResult).filter(SpeedtestResult.id.in_(d.ids)).delete(synchronize_session=False)
    db.commit()
    return {"deleted_count": c}

@app.get("/api/export", dependencies=[Depends(verify_session)])
async def export_csv(db=Depends(get_db)):
    results = db.query(SpeedtestResult).order_by(SpeedtestResult.timestamp.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Timestamp', 'Ping', 'Download', 'Upload'])
    for r in results: writer.writerow([r.timestamp, r.ping, r.download, r.upload])
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=speedtest.csv"})

@app.get("/api/backup", dependencies=[Depends(verify_session)])
async def backup_db():
    env = os.environ.copy(); env["MYSQL_PWD"] = DB_PASSWORD
    cmd = ["mysqldump", "-h", DB_HOST, "-P", str(DB_PORT), "-u", DB_USER, "--no-tablespaces", DB_NAME]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env)
    stdout, stderr = proc.communicate()
    if proc.returncode != 0: raise HTTPException(500)
    
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"backup_{timestamp}.sql"
    
    return Response(content=stdout, media_type="application/sql", headers={"Content-Disposition": f"attachment; filename={filename}"})

@app.post("/api/restore", dependencies=[Depends(verify_session)])
async def restore_db(file: UploadFile = File(...)):
    temp = f"/tmp/{uuid.uuid4()}.sql"
    with open(temp, "wb") as b: shutil.copyfileobj(file.file, b)
    env = os.environ.copy(); env["MYSQL_PWD"] = DB_PASSWORD
    cmd = ["mysql", "-h", DB_HOST, "-P", str(DB_PORT), "-u", DB_USER, DB_NAME]
    with open(temp, "r") as f:
        proc = subprocess.Popen(cmd, stdin=f, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env)
        stdout, stderr = proc.communicate()
    os.remove(temp)
    if proc.returncode != 0: raise HTTPException(500)
    return {"message": "Restored"}

# --- Nowe Endpointy Google Drive Backup ---

@app.get("/api/backup/settings", dependencies=[Depends(verify_session)])
async def get_backup_settings(db=Depends(get_db)):
    s = load_backup_settings(db)
    has_token = True if s.token_json else False
    return {
        "client_id": s.client_id,
        "client_secret": s.client_secret if s.client_secret else "",
        "folder_name": s.folder_name,
        "schedule_days": s.schedule_days,
        "schedule_time": s.schedule_time,
        "retention_days": s.retention_days,
        "is_enabled": s.is_enabled,
        "has_token": has_token,
        "last_run": s.last_run,
        "last_status": s.last_status
    }

@app.post("/api/backup/settings", dependencies=[Depends(verify_session)])
async def save_backup_settings(s: BackupSettingsModel, db=Depends(get_db)):
    rec = load_backup_settings(db)
    
    rec.client_id = s.client_id
    rec.client_secret = s.client_secret
    rec.folder_name = s.folder_name
    rec.schedule_days = s.schedule_days
    rec.schedule_time = s.schedule_time
    rec.retention_days = s.retention_days
    rec.is_enabled = s.is_enabled
    
    db.commit()
    setup_backup_schedule(rec) 
    return {"message": "Settings saved"}

@app.get("/api/backup/google/authorize", dependencies=[Depends(verify_session)])
async def google_authorize(request: Request, db=Depends(get_db)):
    s = load_backup_settings(db)
    if not s.client_id or not s.client_secret:
        raise HTTPException(400, "Brak Client ID lub Client Secret")
    
    redirect_uri = get_redirect_uri(request)
    
    logging.info(get_log("auth_url_gen", redirect_uri))
    logging.info(get_log("auth_url_warn"))
    
    client_config = {
        "web": {
            "client_id": s.client_id,
            "client_secret": s.client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token"
        }
    }
    
    flow = Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri=redirect_uri
    )
    
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'
    )
    
    return {"auth_url": authorization_url}

@app.get("/api/backup/google/callback")
async def google_callback(request: Request, db=Depends(get_db), code: Optional[str] = None, error: Optional[str] = None):
    logging.info(get_log("callback_params", 'Yes' if code else 'No', error))
    logging.info(get_log("callback_full", request.query_params))

    target_url = "/backup.html?auth=error"

    if error:
        logging.error(get_log("google_err", error))
        target_url = f"/backup.html?auth=error&msg={error}"
    
    elif not code:
        logging.warning(get_log("no_code"))
        target_url = "/backup.html?auth=error&msg=no_code"

    else:
        s = load_backup_settings(db)
        redirect_uri = get_redirect_uri(request)
        
        client_config = {
            "web": {
                "client_id": s.client_id,
                "client_secret": s.client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token"
            }
        }
        
        flow = Flow.from_client_config(client_config, scopes=SCOPES, redirect_uri=redirect_uri)
        try:
            flow.fetch_token(code=code)
            creds = flow.credentials
            
            s.token_json = creds.to_json()
            s.is_enabled = True 
            db.commit()
            setup_backup_schedule(s)
            
            target_url = "/backup.html?auth=success"
        except Exception as e:
            logging.error(get_log("auth_callback_err", e))
            target_url = "/backup.html?auth=error"

    # Fix for cookie lost issue on redirect: Return HTML with JS redirect instead of 302
    return HTMLResponse(content=f"""
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8">
                <title>Redirecting...</title>
                <meta http-equiv="refresh" content="0;url={target_url}">
                <script>window.location.href = "{target_url}";</script>
            </head>
            <body>
                <p>Redirecting to application...</p>
            </body>
        </html>
    """)

@app.post("/api/backup/google/revoke", dependencies=[Depends(verify_session)])
async def google_revoke(db=Depends(get_db)):
    s = load_backup_settings(db)
    s.token_json = None
    s.is_enabled = False
    db.commit()
    setup_backup_schedule(s)
    return {"message": "Revoked"}

@app.post("/api/backup/google/trigger", dependencies=[Depends(verify_session)])
async def trigger_google_backup(background_tasks: BackgroundTasks, db=Depends(get_db)):
    background_tasks.add_task(perform_backup_task)
    return {"message": "Backup started"}

@app.get("/")
async def read_root(request: Request):
    if not AUTH_ENABLED or request.cookies.get(SESSION_COOKIE_NAME) == SESSION_SECRET: return FileResponse('index.html')
    return FileResponse('login.html')

@app.get("/{filename}")
async def read_static(filename: str, request: Request):
    allowed = ["index.html", "login.html", "backup.html", "settings.html", "manifest.json", "favicon.ico", "logo.png", "speedtest.png"]
    if filename not in allowed:
        if os.path.exists(f"/app/{filename}"): return FileResponse(f"/app/{filename}")
        raise HTTPException(404)
    if AUTH_ENABLED and request.cookies.get(SESSION_COOKIE_NAME) != SESSION_SECRET and filename in ["index.html", "backup.html", "settings.html"]:
        return FileResponse('login.html')
    return FileResponse(f"/app/{filename}") if os.path.exists(f"/app/{filename}") else HTTPException(404)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
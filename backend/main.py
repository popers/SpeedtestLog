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
from logging.handlers import RotatingFileHandler
from fastapi import FastAPI, HTTPException, Request, Depends, Response, status
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pydantic import BaseModel
from contextlib import asynccontextmanager
from typing import List, Dict, Any

# --- Importy SQLAlchemy i MariaDB ---
from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.dialects.mysql import DATETIME
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.exc import OperationalError
from datetime import datetime

import pymysql

# --- Konfiguracja Logowania ---
# Używamy absolutnej ścieżki wewnątrz kontenera
LOG_DIR = '/app/data/logs'
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, 'app.log')

log_formatter = logging.Formatter('%(asctime)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s')
file_handler = RotatingFileHandler(LOG_FILE, maxBytes=5 * 1024 * 1024, backupCount=5, encoding='utf-8')
file_handler.setFormatter(log_formatter)
file_handler.setLevel(logging.INFO)

stream_handler = logging.StreamHandler(sys.stdout)
stream_handler.setFormatter(log_formatter)
stream_handler.setLevel(logging.INFO)

# Resetujemy handlery, aby uniknąć duplikatów przy reloadzie
root_logger = logging.getLogger()
if root_logger.hasHandlers():
    root_logger.handlers.clear()
    
logging.basicConfig(level=logging.INFO, handlers=[file_handler, stream_handler], force=True)
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("schedule").setLevel(logging.WARNING)

logging.info("Backend starting... Logs should appear in app.log")

# --- Konfiguracja ENV i DB ---
DB_USER = os.getenv("DB_USERNAME")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_DATABASE")

# --- KONFIGURACJA LOGOWANIA ---
# Czytamy zmienną AUTH_ENABLED (domyślnie true)
# Zwracamy True tylko jeśli zmienna to "true", "1" lub "yes"
auth_env = os.getenv("AUTH_ENABLED", "true").lower()
AUTH_ENABLED = auth_env in ["true", "1", "yes"]

APP_USERNAME = os.getenv("APP_USERNAME", "admin")
APP_PASSWORD = os.getenv("APP_PASSWORD", "admin")
SESSION_COOKIE_NAME = "speedtest_session"
SESSION_SECRET = secrets.token_hex(16)

SQLALCHEMY_DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
Base = declarative_base()

# --- Modele ---
class SettingsModel(BaseModel):
    server_id: int | None = None
    schedule_hours: int | None = 1

class DeleteModel(BaseModel):
    ids: list[str]

class LoginModel(BaseModel):
    username: str
    password: str

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

class AppSettings(Base):
    __tablename__ = "app_settings"
    id = Column(Integer, primary_key=True, index=True)
    selected_server_id = Column(Integer, nullable=True)
    schedule_hours = Column(Integer, default=1)

# --- Globalne Zmienne ---
SERVERS_FILE = 'data/servers.json'
os.makedirs('data', exist_ok=True)
test_lock = threading.Lock()
app_state = {"schedule_job": None, "schedule_hours": 1, "engine": None, "SessionLocal": None}

# --- Inicjalizacja DB ---
def initialize_db(max_retries=10, delay=5):
    global engine, SessionLocal
    engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    app_state["engine"] = engine
    app_state["SessionLocal"] = SessionLocal
    for i in range(max_retries):
        try:
            with engine.connect():
                Base.metadata.create_all(bind=engine)
                return
        except OperationalError:
            if i < max_retries - 1: time.sleep(delay)
            else: raise

def get_db():
    db = app_state["SessionLocal"]()
    try: yield db
    finally: db.close()

# --- Helpery ---
def get_closest_servers():
    if not os.path.exists(SERVERS_FILE) or os.stat(SERVERS_FILE).st_size == 0:
        try:
            subprocess.run(['speedtest', '--accept-license', '--accept-gdpr', '--servers', '--format=json'], check=True, stdout=subprocess.DEVNULL)
            res = subprocess.run(['speedtest', '--accept-license', '--accept-gdpr', '--servers', '--format=json'], capture_output=True, text=True)
            with open(SERVERS_FILE, 'w', encoding='utf-8') as f: f.write(res.stdout)
        except Exception as e: logging.error(f"Błąd serwerów: {e}")

def load_settings_from_db(db_session):
    settings = db_session.query(AppSettings).filter(AppSettings.id == 1).first()
    if not settings:
        db_session.add(AppSettings(id=1, selected_server_id=None, schedule_hours=1))
        db_session.commit()
        return {"selected_server_id": None, "schedule_hours": 1}
    return {"selected_server_id": settings.selected_server_id, "schedule_hours": settings.schedule_hours}

def save_settings_to_db(db_session, settings: Dict[str, Any]):
    rec = db_session.query(AppSettings).filter(AppSettings.id == 1).first()
    if not rec: rec = AppSettings(id=1); db_session.add(rec)
    rec.selected_server_id = settings.get("selected_server_id")
    rec.schedule_hours = settings.get("schedule_hours", 1)
    db_session.commit()

def run_speed_test_and_save(server_id=None):
    if not test_lock.acquire(blocking=False): return None
    db_session = app_state["SessionLocal"]()
    try:
        cmd = ['speedtest', '--accept-license', '--accept-gdpr', '--format=json']
        if server_id: cmd.extend(['--server-id', str(server_id)])
        proc = subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=600)
        data = json.loads(proc.stdout)
        if data.get('type') != 'result': return None
        
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
        logging.info(f"Zapisano wynik testu: {res.download} Mbps / {res.upload} Mbps")
        return res
    except Exception as e:
        logging.error(f"Błąd testu: {e}")
        return None
    finally:
        db_session.close()
        test_lock.release()

def run_scheduled_test(job_tag=None):
    if job_tag == 'startup-test': schedule.clear('startup-test')
    db = app_state["SessionLocal"]()
    settings = load_settings_from_db(db)
    db.close()
    run_speed_test_and_save(settings.get("selected_server_id"))

def run_speed_test_and_save_threaded(job_tag=None):
    threading.Thread(target=run_scheduled_test, args=(job_tag,), daemon=True).start()

def run_schedule_loop():
    while True: schedule.run_pending(); time.sleep(1)

# --- FastAPI ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_db()
    threading.Thread(target=get_closest_servers, daemon=True).start()
    db = app_state["SessionLocal"]()
    s = load_settings_from_db(db)
    db.close()
    app_state["schedule_hours"] = s.get("schedule_hours", 1)
    app_state["schedule_job"] = schedule.every(app_state["schedule_hours"]).hours.do(run_speed_test_and_save_threaded, job_tag='hourly-test')
    schedule.every(1).minutes.do(run_speed_test_and_save_threaded, job_tag='startup-test').tag('startup-test')
    threading.Thread(target=run_schedule_loop, daemon=True).start()
    yield
    if app_state["engine"]: app_state["engine"].dispose()

app = FastAPI(lifespan=lifespan)

# --- Auth Dependency ---
async def verify_session(request: Request):
    # Jeśli autoryzacja wyłączona w .env, przepuść wszystkich
    if not AUTH_ENABLED:
        return True
        
    cookie = request.cookies.get(SESSION_COOKIE_NAME)
    if cookie != SESSION_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return True

# --- Endpoints ---

@app.post("/api/login")
async def login(creds: LoginModel, response: Response):
    if not AUTH_ENABLED:
        return {"message": "Auth disabled"}
        
    if creds.username == APP_USERNAME and creds.password == APP_PASSWORD:
        response.set_cookie(key=SESSION_COOKIE_NAME, value=SESSION_SECRET, httponly=True, samesite='strict')
        return {"message": "Logged in"}
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.post("/api/logout")
async def logout(response: Response):
    response.delete_cookie(SESSION_COOKIE_NAME)
    return {"message": "Logged out"}

@app.get("/api/auth-status")
async def auth_status():
    """Helper dla frontendu, żeby wiedział czy pokazać przycisk wylogowania"""
    return {"enabled": AUTH_ENABLED}

# --- Zabezpieczone endpointy ---
@app.get("/api/results", dependencies=[Depends(verify_session)])
async def get_results(db_session=Depends(get_db)):
    results = db_session.query(SpeedtestResult).order_by(SpeedtestResult.timestamp.desc()).limit(1000).all()
    return results

@app.get("/api/results/latest", dependencies=[Depends(verify_session)])
async def get_latest(db_session=Depends(get_db)):
    res = db_session.query(SpeedtestResult).order_by(SpeedtestResult.timestamp.desc()).first()
    if not res: return JSONResponse(content={}, status_code=404)
    return res

@app.get("/api/servers", dependencies=[Depends(verify_session)])
async def get_srv():
    if os.path.exists(SERVERS_FILE):
        with open(SERVERS_FILE, 'r') as f: return json.load(f)
    raise HTTPException(status_code=404)

@app.get("/api/settings", dependencies=[Depends(verify_session)])
async def get_set(db=Depends(get_db)):
    s = load_settings_from_db(db)
    l = db.query(SpeedtestResult).order_by(SpeedtestResult.timestamp.desc()).first()
    s["latest_test_timestamp"] = l.timestamp if l else None
    return s

@app.post("/api/settings", dependencies=[Depends(verify_session)])
async def set_set(s: SettingsModel, db=Depends(get_db)):
    cur = load_settings_from_db(db)
    if s.schedule_hours and s.schedule_hours != cur["schedule_hours"]:
        if app_state["schedule_job"]: schedule.cancel_job(app_state["schedule_job"])
        app_state["schedule_hours"] = s.schedule_hours
        app_state["schedule_job"] = schedule.every(s.schedule_hours).hours.do(run_speed_test_and_save_threaded, job_tag='hourly-test')
    save_settings_to_db(db, {"selected_server_id": s.server_id, "schedule_hours": s.schedule_hours or cur["schedule_hours"]})
    return s

@app.post("/api/trigger-test", dependencies=[Depends(verify_session)])
async def trig_test(s: SettingsModel):
    if test_lock.locked(): raise HTTPException(status_code=429)
    threading.Thread(target=run_speed_test_and_save, args=(s.server_id,), daemon=True).start()
    schedule.clear('startup-test')
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
    headers = ['Timestamp', 'Ping (ms)', 'Jitter (ms)', 'Download (Mbps)', 'Upload (Mbps)', 'Server', 'ISP', 'IP', 'Result URL']
    writer.writerow(headers)
    for r in results:
        writer.writerow([r.timestamp, r.ping, r.jitter, r.download, r.upload, f"{r.server_name} ({r.server_location})", r.isp, r.client_ip, r.result_url])
    output.seek(0)
    response = StreamingResponse(iter([output.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=speedtest_history.csv"
    return response

# 4. Serwowanie plików statycznych z logiką przekierowania
@app.get("/")
async def read_root(request: Request):
    # Jeśli auth wyłączone LUB mamy dobre ciasteczko -> index.html
    if not AUTH_ENABLED:
        return FileResponse('index.html')
        
    cookie = request.cookies.get(SESSION_COOKIE_NAME)
    if cookie == SESSION_SECRET:
        return FileResponse('index.html')
    return FileResponse('login.html')

@app.get("/{filename}")
async def read_file(filename: str, request: Request):
    file_path = os.path.join("/app", filename)
    allowed_public = ["login.html", "style.css", "logo.png", "speedtest.png", "favicon.ico", "manifest.json"]
    
    if filename not in allowed_public and filename != "index.html" and filename != "script.js":
         raise HTTPException(status_code=404)

    # Zabezpieczenie plików aplikacji jeśli auth włączone
    if AUTH_ENABLED and filename in ["index.html", "script.js"]:
        cookie = request.cookies.get(SESSION_COOKIE_NAME)
        if cookie != SESSION_SECRET:
             return FileResponse('login.html')

    if os.path.exists(file_path):
        return FileResponse(file_path)
    raise HTTPException(status_code=404)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
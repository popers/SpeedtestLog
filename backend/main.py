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
from fastapi import FastAPI, HTTPException, Request, Depends, Response, status, UploadFile, File
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from contextlib import asynccontextmanager
from typing import List, Dict, Any
from datetime import datetime, timedelta

# --- Importy SQLAlchemy i MariaDB ---
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean
from sqlalchemy.dialects.mysql import DATETIME
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.exc import OperationalError
import pymysql

# --- Konfiguracja Logowania ---
LOG_DIR = '/app/data/logs'
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, 'app.log')

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

SQLALCHEMY_DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
Base = declarative_base()

# --- Modele Pydantic ---
class SettingsModel(BaseModel):
    server_id: int | None = None
    schedule_hours: int | None = 1
    ping_target: str | None = "8.8.8.8"
    ping_interval: int | None = 30
    # Pola do weryfikacji umowy z ISP
    declared_download: int | None = 0
    declared_upload: int | None = 0

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
    # Kolumny deklarowanych prędkości
    declared_download = Column(Integer, default=0)
    declared_upload = Column(Integer, default=0)

# --- Globalne Zmienne ---
SERVERS_FILE = 'data/servers.json'
os.makedirs('data', exist_ok=True)
test_lock = threading.Lock()
app_state = {
    "schedule_job": None, 
    "engine": None, 
    "SessionLocal": None,
    "watchdog_config": {"target": "8.8.8.8", "interval": 30},
    "latest_ping_status": {"online": False, "latency": 0, "loss": 0, "target": "init"}
}

# --- Inicjalizacja DB ---
def initialize_db(max_retries=10, delay=5):
    logging.info("⏳ Inicjalizacja bazy danych...")
    global engine, SessionLocal
    engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    app_state["engine"] = engine
    app_state["SessionLocal"] = SessionLocal
    for i in range(max_retries):
        try:
            with engine.connect():
                Base.metadata.create_all(bind=engine)
                logging.info("✅ Połączono z bazą danych.")
                return
        except OperationalError:
            logging.warning(f"⚠️ Baza niedostępna... ({i+1}/{max_retries})")
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
        settings = AppSettings(id=1, selected_server_id=None, schedule_hours=1, ping_target="8.8.8.8", ping_interval=30, declared_download=0, declared_upload=0)
        db_session.add(settings)
        db_session.commit()
    return settings

def run_ping_watchdog():
    logging.info("🐶 Uruchamianie Ping Watchdog...")
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
            logging.error(f"Watchdog error: {e}")
        finally:
            db.close()
        
        time.sleep(app_state["watchdog_config"]["interval"])

def get_closest_servers():
    if not os.path.exists(SERVERS_FILE) or os.stat(SERVERS_FILE).st_size == 0:
        try:
            subprocess.run(['speedtest', '--accept-license', '--accept-gdpr', '--servers', '--format=json'], check=True, stdout=subprocess.DEVNULL)
            res = subprocess.run(['speedtest', '--accept-license', '--accept-gdpr', '--servers', '--format=json'], capture_output=True, text=True)
            with open(SERVERS_FILE, 'w', encoding='utf-8') as f: f.write(res.stdout)
        except Exception as e: logging.error(f"Błąd serwerów: {e}")

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
        logging.info(f"✅ Wynik Speedtestu: ↓ {res.download} Mbps")
        return res
    except Exception as e:
        logging.error(f"❌ Błąd Speedtestu: {e}")
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
    hours = s.schedule_hours
    db.close()
    
    app_state["schedule_job"] = schedule.every(hours).hours.do(run_speed_test_and_save_threaded, job_tag='hourly-test')
    schedule.every(1).minutes.do(run_speed_test_and_save_threaded, job_tag='startup-test').tag('startup-test')
    
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

# --- Endpoints ---
@app.post("/api/login")
async def login(creds: LoginModel, response: Response):
    if not AUTH_ENABLED: return {"message": "Auth disabled"}
    if creds.username == APP_USERNAME and creds.password == APP_PASSWORD:
        response.set_cookie(key=SESSION_COOKIE_NAME, value=SESSION_SECRET, httponly=True, samesite='strict')
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
        "latest_test_timestamp": l.timestamp if l else None
    }

@app.post("/api/settings", dependencies=[Depends(verify_session)])
async def set_set(s: SettingsModel, db=Depends(get_db)):
    rec = load_settings_from_db(db)
    if s.schedule_hours and s.schedule_hours != rec.schedule_hours:
        if app_state["schedule_job"]: schedule.cancel_job(app_state["schedule_job"])
        app_state["schedule_job"] = schedule.every(s.schedule_hours).hours.do(run_speed_test_and_save_threaded, job_tag='hourly-test')
    
    rec.selected_server_id = s.server_id
    if s.schedule_hours: rec.schedule_hours = s.schedule_hours
    if s.ping_target: rec.ping_target = s.ping_target
    if s.ping_interval: rec.ping_interval = s.ping_interval
    # Zapis nowych pól ISP
    if s.declared_download is not None: rec.declared_download = s.declared_download
    if s.declared_upload is not None: rec.declared_upload = s.declared_upload
    
    db.commit()
    logging.info(f"⚙️ Ustawienia zaktualizowane.")
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
    return Response(content=stdout, media_type="application/sql", headers={"Content-Disposition": f"attachment; filename=backup.sql"})

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
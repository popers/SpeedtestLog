import os
import shutil
import uuid
import threading
import logging
import subprocess  # <-- Dodano brakujący import
from datetime import datetime # <-- Dodano brakujący import
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Request
from fastapi.responses import Response, HTMLResponse
from sqlalchemy.orm import Session
from google_auth_oauthlib.flow import Flow

from database import get_db
from models import DriveBackupSettings, PingLog
from schemas import BackupSettingsModel, SettingsModel
from dependencies import verify_session, get_redirect_uri
from config import DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, get_log
from backup import perform_backup_task, setup_backup_schedule, SCOPES
from speedtest import run_speed_test_and_save, test_lock
from watchdog import latest_ping_status

router = APIRouter(dependencies=[Depends(verify_session)])

# --- Watchdog Status ---
@router.get("/api/watchdog/status")
async def watchdog_status(db: Session = Depends(get_db)):
    history = db.query(PingLog).order_by(PingLog.timestamp.desc()).limit(60).all()
    history_data = [{"time": log.timestamp.strftime("%H:%M:%S"), "latency": log.latency} for log in reversed(history)]
    return {"current": latest_ping_status, "history": history_data}

# --- Trigger Speedtest ---
@router.post("/api/trigger-test")
async def trig_test(s: SettingsModel):
    if test_lock.locked(): raise HTTPException(status_code=429)
    threading.Thread(target=run_speed_test_and_save, args=(s.server_id, s.app_language), daemon=True).start()
    return {"message": "Started"}

# --- Backup Local ---
@router.get("/api/backup")
async def backup_db():
    env = os.environ.copy(); env["MYSQL_PWD"] = DB_PASSWORD
    cmd = ["mysqldump", "-h", DB_HOST, "-P", str(DB_PORT), "-u", DB_USER, "--no-tablespaces", DB_NAME]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env)
    stdout, stderr = proc.communicate()
    if proc.returncode != 0: raise HTTPException(500)
    
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"backup_{timestamp}.sql"
    return Response(content=stdout, media_type="application/sql", headers={"Content-Disposition": f"attachment; filename={filename}"})

@router.post("/api/restore")
async def restore_db(file: UploadFile = File(...)):
    temp = f"/tmp/{uuid.uuid4()}.sql"
    with open(temp, "wb") as b: shutil.copyfileobj(file.file, b)
    env = os.environ.copy(); env["MYSQL_PWD"] = DB_PASSWORD
    cmd = ["mysql", "-h", DB_HOST, "-P", str(DB_PORT), "-u", DB_USER, DB_NAME]
    with open(temp, "r") as f:
        proc = subprocess.Popen(cmd, stdin=f, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env)
    os.remove(temp)
    if proc.returncode != 0: raise HTTPException(500)
    return {"message": "Restored"}

# --- Google Drive Backup ---
@router.get("/api/backup/settings")
async def get_backup_settings(db: Session = Depends(get_db)):
    s = db.query(DriveBackupSettings).filter(DriveBackupSettings.id == 1).first()
    if not s: s = DriveBackupSettings(id=1); db.add(s); db.commit()
    return {
        "client_id": s.client_id,
        "client_secret": s.client_secret,
        "folder_name": s.folder_name,
        "schedule_days": s.schedule_days,
        "schedule_time": s.schedule_time,
        "retention_days": s.retention_days,
        "is_enabled": s.is_enabled,
        "has_token": bool(s.token_json),
        "last_run": s.last_run,
        "last_status": s.last_status
    }

@router.post("/api/backup/settings")
async def save_backup_settings(s: BackupSettingsModel, db: Session = Depends(get_db)):
    rec = db.query(DriveBackupSettings).filter(DriveBackupSettings.id == 1).first()
    if not rec: rec = DriveBackupSettings(id=1); db.add(rec)
    rec.client_id = s.client_id; rec.client_secret = s.client_secret
    rec.folder_name = s.folder_name; rec.schedule_days = s.schedule_days
    rec.schedule_time = s.schedule_time; rec.retention_days = s.retention_days
    rec.is_enabled = s.is_enabled
    db.commit()
    setup_backup_schedule(rec) 
    return {"message": "Settings saved"}

@router.get("/api/backup/google/authorize")
async def google_authorize(request: Request, db: Session = Depends(get_db)):
    s = db.query(DriveBackupSettings).filter(DriveBackupSettings.id == 1).first()
    if not s or not s.client_id or not s.client_secret: raise HTTPException(400, "Missing Credentials")
    
    client_config = {"web": {"client_id": s.client_id, "client_secret": s.client_secret, "auth_uri": "https://accounts.google.com/o/oauth2/auth", "token_uri": "https://oauth2.googleapis.com/token"}}
    flow = Flow.from_client_config(client_config, scopes=SCOPES, redirect_uri=get_redirect_uri(request))
    url, _ = flow.authorization_url(access_type='offline', include_granted_scopes='true', prompt='consent')
    return {"auth_url": url}

@router.get("/api/backup/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db), code: Optional[str] = None, error: Optional[str] = None):
    target_url = "/backup.html?auth=error"
    if error: target_url += f"&msg={error}"
    elif not code: target_url += "&msg=no_code"
    else:
        s = db.query(DriveBackupSettings).filter(DriveBackupSettings.id == 1).first()
        redirect_uri = get_redirect_uri(request)
        client_config = {"web": {"client_id": s.client_id, "client_secret": s.client_secret, "auth_uri": "https://accounts.google.com/o/oauth2/auth", "token_uri": "https://oauth2.googleapis.com/token"}}
        flow = Flow.from_client_config(client_config, scopes=SCOPES, redirect_uri=redirect_uri)
        try:
            flow.fetch_token(code=code)
            s.token_json = flow.credentials.to_json()
            s.is_enabled = True 
            db.commit()
            setup_backup_schedule(s)
            target_url = "/backup.html?auth=success"
        except Exception as e:
            logging.error(f"Auth Error: {e}")
            target_url = "/backup.html?auth=error"
    return HTMLResponse(content=f'<script>window.location.href = "{target_url}";</script>')

@router.post("/api/backup/google/revoke")
async def google_revoke(db: Session = Depends(get_db)):
    s = db.query(DriveBackupSettings).filter(DriveBackupSettings.id == 1).first()
    s.token_json = None; s.is_enabled = False
    db.commit()
    setup_backup_schedule(s)
    return {"message": "Revoked"}

@router.post("/api/backup/google/trigger")
async def trigger_google_backup(background_tasks: BackgroundTasks):
    background_tasks.add_task(perform_backup_task)
    return {"message": "Backup started"}
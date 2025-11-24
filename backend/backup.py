import os
import json
import subprocess
import threading
import logging
from datetime import datetime, timedelta
import schedule
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from google.auth.transport.requests import Request as GoogleRequest

from config import get_log, DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
import database # ZMIANA: Import modułu
from models import DriveBackupSettings

backup_job = None
SCOPES = ['https://www.googleapis.com/auth/drive.file']

def get_drive_service(settings):
    if not settings.token_json or not settings.client_id or not settings.client_secret:
        return None
    try:
        token_data = json.loads(settings.token_json)
        creds = Credentials.from_authorized_user_info(token_data, SCOPES)
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(GoogleRequest())
            # ZMIANA: Użycie database.SessionLocal()
            db = database.SessionLocal()
            s = db.query(DriveBackupSettings).filter(DriveBackupSettings.id == 1).first()
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
        file_metadata = {'name': folder_name, 'mimeType': 'application/vnd.google-apps.folder'}
        file = service.files().create(body=file_metadata, fields='id').execute()
        return file.get('id')
    else:
        return items[0].get('id')

def perform_backup_task():
    logging.info(get_log("backup_start"))
    # ZMIANA: Użycie database.SessionLocal()
    db = database.SessionLocal()
    try:
        settings = db.query(DriveBackupSettings).filter(DriveBackupSettings.id == 1).first()
        if not settings or not settings.is_enabled or not settings.token_json:
            logging.warning(get_log("backup_skipped"))
            return

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
        
        if settings.retention_days and settings.retention_days > 0:
            cutoff_date = (datetime.now() - timedelta(days=settings.retention_days)).isoformat()
            query = f"'{folder_id}' in parents and createdTime < '{cutoff_date}' and trashed=false"
            results = service.files().list(q=query, fields="files(id, name)").execute()
            for file in results.get('files', []):
                try:
                    service.files().delete(fileId=file.get('id')).execute()
                    logging.info(get_log("backup_old_removed", file.get('name')))
                except: pass

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

def setup_backup_schedule(settings=None):
    global backup_job
    if backup_job:
        try:
            schedule.cancel_job(backup_job)
        except: pass
        backup_job = None

    if not settings:
        # ZMIANA: Użycie database.SessionLocal()
        db = database.SessionLocal()
        settings = db.query(DriveBackupSettings).filter(DriveBackupSettings.id == 1).first()
        db.close()

    if settings and settings.is_enabled and settings.schedule_days and settings.schedule_time:
        days = int(settings.schedule_days)
        if days < 1: days = 1
        backup_job = schedule.every(days).days.at(settings.schedule_time).do(
            lambda: threading.Thread(target=perform_backup_task, daemon=True).start()
        )
        logging.info(get_log("backup_scheduled", days, settings.schedule_time))
import os
import json
import subprocess
import threading
import logging
import time
import schedule
import uuid
from datetime import datetime
from config import get_log, NOTIF_TRANS, SERVERS_FILE
import database 
from models import AppSettings, SpeedtestResult, NotificationSettings
import requests

# Blokady wątków
test_lock = threading.Lock()      # Blokada samego testu speedtest (żeby nie szły dwa naraz)
scheduler_lock = threading.Lock() # Blokada dla operacji na bibliotece schedule

schedule_job = None

# Helper do ładowania ustawień powiadomień (lokalnie, aby uniknąć cykli)
def load_notification_settings(db):
    settings = db.query(NotificationSettings).filter(NotificationSettings.id == 1).first()
    if not settings:
        settings = NotificationSettings(id=1, enabled=False, provider="browser")
        db.add(settings)
        db.commit()
    return settings

def send_system_notification(title: str, message: str, type: str = "info"):
    db = database.SessionLocal()
    try:
        ns = load_notification_settings(db)
        if not ns.enabled or ns.provider == "browser":
            return

        try:
            if ns.provider == "webhook" and ns.webhook_url:
                payload = {"title": title, "message": message, "type": type, "timestamp": datetime.now().isoformat()}
                requests.post(ns.webhook_url, json=payload, timeout=5)
                logging.info(get_log("notify_sent", "Webhook"))

            elif ns.provider == "ntfy" and ns.ntfy_topic:
                server = ns.ntfy_server.rstrip('/') if ns.ntfy_server else "https://ntfy.sh"
                url = f"{server}/{ns.ntfy_topic}"
                headers = {"Title": title.encode('utf-8'), "Tags": "white_check_mark"}
                requests.post(url, data=message.encode('utf-8'), headers=headers, timeout=5)
                logging.info(get_log("notify_sent", "Ntfy"))
        except Exception as e:
            logging.error(f"Notification send error: {e}")
    finally:
        db.close()

def get_closest_servers():
    if not os.path.exists(SERVERS_FILE) or os.stat(SERVERS_FILE).st_size == 0:
        try:
            subprocess.run(['speedtest', '--accept-license', '--accept-gdpr', '--servers', '--format=json'], check=True, stdout=subprocess.DEVNULL)
            res = subprocess.run(['speedtest', '--accept-license', '--accept-gdpr', '--servers', '--format=json'], capture_output=True, text=True)
            with open(SERVERS_FILE, 'w', encoding='utf-8') as f: f.write(res.stdout)
        except Exception as e: logging.error(get_log("servers_err", e))

def run_speed_test_and_save(server_id=None, forced_lang=None):
    # Jeśli test już trwa, nie uruchamiaj kolejnego
    if not test_lock.acquire(blocking=False): return None
    
    db_session = database.SessionLocal()
    schedule_hours_to_reset = None # Zmienna pomocnicza do resetu harmonogramu

    try:
        s = db_session.query(AppSettings).filter(AppSettings.id == 1).first()
        app_lang = forced_lang if forced_lang else (s.app_language or "pl")
        
        # Pobieramy aktualny interwał, aby wiedzieć czy zresetować licznik po teście
        if s.schedule_hours and s.schedule_hours > 0:
            schedule_hours_to_reset = s.schedule_hours

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
        
        down_mbps = round(data.get("download", {}).get("bandwidth", 0) * 8 / 1_000_000, 2)
        up_mbps = round(data.get("upload", {}).get("bandwidth", 0) * 8 / 1_000_000, 2)
        ping_ms = data.get("ping", {}).get("latency", 0)
        
        res = SpeedtestResult(
            id=str(uuid.uuid4()), timestamp=datetime.now(),
            ping=ping_ms, jitter=data.get("ping", {}).get("jitter", 0),
            download=down_mbps,
            upload=up_mbps,
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
        
        trans = NOTIF_TRANS.get(app_lang, NOTIF_TRANS["pl"])
        msg = trans["speedtest_body"].format(dl=down_mbps, ul=up_mbps, ping=ping_ms)
        title = trans["speedtest_title"]
        send_system_notification(title, msg, "speedtest")
        
        return res
    except Exception as e:
        logging.error(get_log("test_crit_err", e))
        return None
    finally:
        db_session.close()
        test_lock.release()
        
        # Synchronizacja harmonogramu po teście
        if schedule_hours_to_reset:
            update_scheduler(schedule_hours_to_reset)

def run_scheduled_test(job_tag=None):
    if job_tag == 'startup-test':
        # Użycie blokady przy modyfikacji harmonogramu
        with scheduler_lock:
            schedule.clear('startup-test')
            
    db = database.SessionLocal()
    s = db.query(AppSettings).filter(AppSettings.id == 1).first()
    srv_id = s.selected_server_id if s else None
    db.close()
    run_speed_test_and_save(srv_id)

def run_speed_test_and_save_threaded(job_tag=None):
    threading.Thread(target=run_scheduled_test, args=(job_tag,), daemon=True).start()

def init_scheduler():
    db = database.SessionLocal()
    s = db.query(AppSettings).filter(AppSettings.id == 1).first()
    if not s: 
        db.close()
        return

    global schedule_job
    hours = s.schedule_hours
    
    # Użycie blokady przy inicjalizacji
    with scheduler_lock:
        if hours and hours > 0:
            # ZMIANA: Dodano .tag('hourly-test'), aby można było znaleźć to zadanie w settings.py
            schedule_job = schedule.every(hours).hours.do(run_speed_test_and_save_threaded, job_tag='hourly-test').tag('hourly-test')
        
        if s.startup_test_enabled:
            logging.info(get_log("startup_test_scheduled"))
            schedule.every(1).minutes.do(run_speed_test_and_save_threaded, job_tag='startup-test').tag('startup-test')
    
    db.close()

def update_scheduler(hours):
    global schedule_job
    # Użycie blokady przy aktualizacji
    with scheduler_lock:
        if schedule_job:
            try:
                schedule.cancel_job(schedule_job)
            except: pass
            schedule_job = None
        
        # Usuwamy stare zadanie 'hourly-test' dla pewności
        schedule.clear('hourly-test')
        
        if hours > 0:
            # ZMIANA: Tutaj również dodano .tag('hourly-test')
            schedule_job = schedule.every(hours).hours.do(run_speed_test_and_save_threaded, job_tag='hourly-test').tag('hourly-test')
            logging.info(f"Scheduler reset: Next run in {hours} hours.")
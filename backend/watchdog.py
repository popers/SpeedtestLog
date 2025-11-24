import subprocess
import logging
import time
import re
import requests
from datetime import datetime, timedelta
from config import get_log, NOTIF_TRANS
import database # ZMIANA: Import modułu
from models import PingLog, AppSettings, NotificationSettings

# Global status do odczytu przez API
latest_ping_status = {"online": None, "latency": 0, "loss": 0, "target": "init", "updated": None}

def send_watchdog_notification(title, message, type_str):
    # ZMIANA: Użycie database.SessionLocal()
    db = database.SessionLocal()
    try:
        ns = db.query(NotificationSettings).filter(NotificationSettings.id == 1).first()
        if not ns or not ns.enabled or ns.provider == "browser": return

        if ns.provider == "webhook" and ns.webhook_url:
            payload = {"title": title, "message": message, "type": type_str, "timestamp": datetime.now().isoformat()}
            requests.post(ns.webhook_url, json=payload, timeout=5)
        elif ns.provider == "ntfy" and ns.ntfy_topic:
            server = ns.ntfy_server.rstrip('/') if ns.ntfy_server else "https://ntfy.sh"
            url = f"{server}/{ns.ntfy_topic}"
            headers = {"Title": title.encode('utf-8'), "Tags": "warning" if "down" in type_str else "white_check_mark"}
            requests.post(url, data=message.encode('utf-8'), headers=headers, timeout=5)
    except Exception: pass
    finally: db.close()

def run_ping_watchdog():
    logging.info(get_log("watchdog_start"))
    global latest_ping_status
    
    while True:
        # ZMIANA: Użycie database.SessionLocal()
        db = database.SessionLocal()
        try:
            s = db.query(AppSettings).filter(AppSettings.id == 1).first()
            if not s: s = AppSettings(id=1); db.add(s); db.commit()
            
            target = s.ping_target
            interval = s.ping_interval if s.ping_interval and s.ping_interval >= 5 else 30
            app_lang = s.app_language or "pl"

            cmd = ["ping", "-c", "3", "-W", "2", target]
            proc = subprocess.run(cmd, capture_output=True, text=True)
            
            latency = None
            packet_loss = 100.0
            is_online = False
            
            loss_match = re.search(r"(\d+)% packet loss", proc.stdout)
            if loss_match: packet_loss = float(loss_match.group(1))
            
            rtt_match = re.search(r"rtt min/avg/max/mdev = ([\d\.]+)/([\d\.]+)", proc.stdout)
            if rtt_match: latency = float(rtt_match.group(2)); is_online = True
            
            log_entry = PingLog(target=target, latency=latency, packet_loss=packet_loss, is_online=is_online)
            db.add(log_entry)
            
            cutoff = datetime.now() - timedelta(hours=24)
            db.query(PingLog).filter(PingLog.timestamp < cutoff).delete()
            db.commit()
            
            prev_status = latest_ping_status["online"]
            if prev_status is not None and is_online != prev_status:
                trans = NOTIF_TRANS.get(app_lang, NOTIF_TRANS["pl"])
                if is_online:
                    title = trans["watchdog_up_title"]
                    msg = trans["watchdog_up_body"].format(target=target)
                    type_str = "watchdog_up"
                else:
                    title = trans["watchdog_down_title"]
                    msg = trans["watchdog_down_body"].format(target=target)
                    type_str = "watchdog_down"
                send_watchdog_notification(title, msg, type_str)

            latest_ping_status = {
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
        
        time.sleep(interval)
import os
import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import AppSettings, NotificationSettings, SpeedtestResult
from schemas import SettingsModel, NotificationSettingsModel, NotificationTestModel
from dependencies import verify_session
from config import get_log, NOTIF_TRANS, SERVERS_FILE
from speedtest import update_scheduler
import requests
from datetime import datetime

router = APIRouter(dependencies=[Depends(verify_session)])

@router.get("/api/servers")
async def get_srv():
    if os.path.exists(SERVERS_FILE):
        with open(SERVERS_FILE, 'r') as f: return json.load(f)
    raise HTTPException(status_code=404)

@router.get("/api/settings")
async def get_set(db: Session = Depends(get_db)):
    s = db.query(AppSettings).filter(AppSettings.id == 1).first()
    if not s:
        s = AppSettings(id=1)
        db.add(s)
        db.commit()
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
        "latest_test_timestamp": l.timestamp if l else None,
        "app_language": s.app_language
    }

@router.post("/api/settings")
async def set_set(s: SettingsModel, db: Session = Depends(get_db)):
    rec = db.query(AppSettings).filter(AppSettings.id == 1).first()
    if not rec: rec = AppSettings(id=1); db.add(rec)
    
    update_sched = (s.schedule_hours is not None and s.schedule_hours != rec.schedule_hours)
    
    rec.selected_server_id = s.server_id
    if s.schedule_hours is not None: rec.schedule_hours = s.schedule_hours
    if s.ping_target: rec.ping_target = s.ping_target
    if s.ping_interval: rec.ping_interval = s.ping_interval
    if s.declared_download is not None: rec.declared_download = s.declared_download
    if s.declared_upload is not None: rec.declared_upload = s.declared_upload
    if s.startup_test_enabled is not None: rec.startup_test_enabled = s.startup_test_enabled
    if s.chart_color_download: rec.chart_color_download = s.chart_color_download
    if s.chart_color_upload: rec.chart_color_upload = s.chart_color_upload
    if s.chart_color_ping: rec.chart_color_ping = s.chart_color_ping
    if s.chart_color_jitter: rec.chart_color_jitter = s.chart_color_jitter
    if s.app_language: rec.app_language = s.app_language

    db.commit()
    if update_sched: update_scheduler(rec.schedule_hours)
    logging.info(get_log("settings_updated"))
    return {"message": "Settings saved"}

@router.get("/api/notifications/settings")
async def get_notif_settings(db: Session = Depends(get_db)):
    ns = db.query(NotificationSettings).filter(NotificationSettings.id == 1).first()
    if not ns: ns = NotificationSettings(id=1); db.add(ns); db.commit()
    return {
        "enabled": ns.enabled,
        "provider": ns.provider,
        "webhook_url": ns.webhook_url,
        "ntfy_topic": ns.ntfy_topic,
        "ntfy_server": ns.ntfy_server
    }

@router.post("/api/notifications/settings")
async def save_notif_settings(s: NotificationSettingsModel, db: Session = Depends(get_db)):
    ns = db.query(NotificationSettings).filter(NotificationSettings.id == 1).first()
    if not ns: ns = NotificationSettings(id=1); db.add(ns)
    ns.enabled = s.enabled
    ns.provider = s.provider
    ns.webhook_url = s.webhook_url
    ns.ntfy_topic = s.ntfy_topic
    ns.ntfy_server = s.ntfy_server
    db.commit()
    return {"message": "Notification settings saved"}

@router.post("/api/notifications/test")
async def test_notif(s: NotificationTestModel):
    lang = s.language or "pl"
    trans = NOTIF_TRANS.get(lang, NOTIF_TRANS["pl"])
    msg = trans["test_body"]
    title = trans["test_title"]

    try:
        if s.provider == "webhook":
            if not s.webhook_url: raise ValueError("Missing Webhook URL")
            payload = {"title": title, "message": msg, "type": "test", "timestamp": datetime.now().isoformat()}
            requests.post(s.webhook_url, json=payload, timeout=5)
        elif s.provider == "ntfy":
            if not s.ntfy_topic: raise ValueError("Missing Ntfy Topic")
            server = s.ntfy_server.rstrip('/') if s.ntfy_server else "https://ntfy.sh"
            url = f"{server}/{s.ntfy_topic}"
            headers = {"Title": title.encode('utf-8'), "Tags": "tada"}
            requests.post(url, data=msg.encode('utf-8'), headers=headers, timeout=5)
        return {"message": "Sent"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
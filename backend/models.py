import uuid
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean
from sqlalchemy.dialects.mysql import DATETIME, MEDIUMTEXT
from database import Base

# --- Modele SQLAlchemy (Tylko struktura bazy danych) ---

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
    app_language = Column(String(5), default="pl")
    # Kolory podstawowe
    chart_color_download = Column(String(20), nullable=True)
    chart_color_upload = Column(String(20), nullable=True)
    chart_color_ping = Column(String(20), nullable=True)
    chart_color_jitter = Column(String(20), nullable=True)
    # Kolory Latency
    chart_color_lat_dl_low = Column(String(20), nullable=True)
    chart_color_lat_dl_high = Column(String(20), nullable=True)
    chart_color_lat_ul_low = Column(String(20), nullable=True)
    chart_color_lat_ul_high = Column(String(20), nullable=True)
    # NOWE: Kolor Ping Watchdog
    chart_color_ping_watchdog = Column(String(20), nullable=True)

class NotificationSettings(Base):
    __tablename__ = "notification_settings"
    id = Column(Integer, primary_key=True, index=True)
    enabled = Column(Boolean, default=False)
    provider = Column(String(50), default="browser") # browser, webhook, ntfy
    webhook_url = Column(String(500), nullable=True)
    ntfy_topic = Column(String(255), nullable=True)
    ntfy_server = Column(String(255), default="https://ntfy.sh")

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

# NOWE: Ustawienia OIDC
class OIDCSettings(Base):
    __tablename__ = "oidc_settings"
    id = Column(Integer, primary_key=True, index=True)
    enabled = Column(Boolean, default=False)
    display_name = Column(String(50), default="SSO Login")
    client_id = Column(String(255), nullable=True)
    client_secret = Column(String(255), nullable=True)
    discovery_url = Column(String(500), nullable=True) # .well-known/openid-configuration
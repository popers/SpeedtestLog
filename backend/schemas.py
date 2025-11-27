from pydantic import BaseModel
from typing import Optional, List

# --- Modele Pydantic (Walidacja danych API) ---

class SettingsModel(BaseModel):
    server_id: int | None = None
    schedule_hours: int | None = None
    ping_target: str | None = None
    ping_interval: int | None = None
    declared_download: int | None = None
    declared_upload: int | None = None
    startup_test_enabled: bool | None = None
    app_language: str | None = None 
    chart_color_download: str | None = None
    chart_color_upload: str | None = None
    chart_color_ping: str | None = None
    chart_color_jitter: str | None = None
    chart_color_lat_dl_low: str | None = None
    chart_color_lat_dl_high: str | None = None
    chart_color_lat_ul_low: str | None = None
    chart_color_lat_ul_high: str | None = None
    chart_color_ping_watchdog: str | None = None

class NotificationSettingsModel(BaseModel):
    enabled: bool | None = False
    provider: str | None = "browser"
    webhook_url: str | None = ""
    ntfy_topic: str | None = ""
    ntfy_server: str | None = "https://ntfy.sh"

class NotificationTestModel(BaseModel):
    provider: str
    webhook_url: str | None = None
    ntfy_topic: str | None = None
    ntfy_server: str | None = None
    language: str | None = "pl" 

class BackupSettingsModel(BaseModel):
    client_id: str | None = None
    client_secret: str | None = None
    folder_name: str | None = "SpeedtestLog_Backup"
    schedule_days: int | None = 1
    schedule_time: str | None = "03:00"
    retention_days: int | None = 30
    is_enabled: bool | None = False

# NOWE: Model dla ustawień OIDC
class OIDCSettingsModel(BaseModel):
    enabled: bool | None = False
    display_name: str | None = "SSO Login"
    client_id: str | None = None
    client_secret: str | None = None
    discovery_url: str | None = None

class DeleteModel(BaseModel):
    ids: list[str]

class LoginModel(BaseModel):
    username: str
    password: str
import os
import threading
import time
import schedule
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

# Nasze moduły
from config import setup_logging, AUTH_ENABLED, SESSION_COOKIE_NAME, SESSION_SECRET
from database import initialize_db
from speedtest import get_closest_servers, init_scheduler
from backup import setup_backup_schedule
from watchdog import run_ping_watchdog

# Routery
import auth
import results
import settings
import system

setup_logging()

# --- ZMIANA: Globalne app_state ---
app_state = {
    "schedule_job": None,
    "backup_job": None,
    "engine": None, 
    "SessionLocal": None,
    "watchdog_config": {"target": "8.8.8.8", "interval": 30},
    "latest_ping_status": {"online": None, "latency": 0, "loss": 0, "target": "init"}
}

# --- Wątki tła ---
def run_schedule_loop():
    while True: schedule.run_pending(); time.sleep(1)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start - Inicjalizacja
    # ZMIANA: Przekazujemy poprawne app_state
    initialize_db(app_state, 10, 5) 
    
    threading.Thread(target=get_closest_servers, daemon=True).start()
    threading.Thread(target=run_schedule_loop, daemon=True).start()
    threading.Thread(target=run_ping_watchdog, daemon=True).start()
    
    init_scheduler()
    setup_backup_schedule()
    
    yield
    # Stop (opcjonalne czyszczenie)

app = FastAPI(lifespan=lifespan)
app.mount("/css", StaticFiles(directory="css"), name="css")
app.mount("/js", StaticFiles(directory="js"), name="js")

# Dołączamy routery
app.include_router(auth.router)
app.include_router(results.router)
app.include_router(settings.router)
app.include_router(system.router)

# --- Frontend Root ---
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
import os
import threading
import time
import schedule
import uvicorn
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

# Nasze moduły
from config import setup_logging, AUTH_ENABLED, SESSION_COOKIE_NAME, SESSION_SECRET
from database import initialize_db
from speedtest import get_closest_servers, init_scheduler, scheduler_lock
from backup import setup_backup_schedule
from watchdog import run_ping_watchdog

# Routery
import auth
import results
import settings
import system

setup_logging()

# Używamy tej samej nazwy ciasteczka co w auth.py (wersja v2)
COOKIE_NAME = f"{SESSION_COOKIE_NAME}_v2"

app_state = {
    "schedule_job": None,
    "backup_job": None,
    "engine": None, 
    "SessionLocal": None,
    "watchdog_config": {"target": "8.8.8.8", "interval": 30},
    "latest_ping_status": {"online": None, "latency": 0, "loss": 0, "target": "init"}
}

def run_schedule_loop():
    while True: 
        try:
            with scheduler_lock:
                schedule.run_pending()
        except Exception as e:
            logging.error(f"CRITICAL: Scheduler loop error: {e}")
        time.sleep(1)

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        import jwt
        logging.info("✅ PyJWT loaded.")
    except ImportError:
        logging.error("❌ PyJWT missing.")

    initialize_db(app_state, 10, 5) 
    
    threading.Thread(target=get_closest_servers, daemon=True).start()
    threading.Thread(target=run_schedule_loop, daemon=True).start()
    threading.Thread(target=run_ping_watchdog, daemon=True).start()
    
    init_scheduler()
    setup_backup_schedule()
    
    yield

app = FastAPI(lifespan=lifespan)

app.mount("/css", StaticFiles(directory="css"), name="css")
app.mount("/js", StaticFiles(directory="js"), name="js")

app.include_router(auth.router)
app.include_router(results.router)
app.include_router(settings.router)
app.include_router(system.router)

@app.get("/")
async def read_root(request: Request):
    if not AUTH_ENABLED or request.cookies.get(COOKIE_NAME) == SESSION_SECRET: 
        response = FileResponse('index.html')
    else:
        response = FileResponse('login.html')
    
    # ZMIANA: Wyłączamy cache przeglądarki dla głównego widoku
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.get("/{filename}")
async def read_static(filename: str, request: Request):
    allowed = ["index.html", "login.html", "backup.html", "settings.html", "manifest.json", "favicon.ico", "logo.png", "speedtest.png"]
    if filename not in allowed:
        if os.path.exists(f"/app/{filename}"): return FileResponse(f"/app/{filename}")
        raise HTTPException(404)
    
    response = None
    
    # Sprawdzamy auth dla plików HTML
    if AUTH_ENABLED and request.cookies.get(COOKIE_NAME) != SESSION_SECRET and filename in ["index.html", "backup.html", "settings.html"]:
        # Nieautoryzowany: zwracamy login.html
        response = FileResponse('login.html')
    elif os.path.exists(f"/app/{filename}"):
        # Autoryzowany lub plik publiczny
        response = FileResponse(f"/app/{filename}")
    else:
        raise HTTPException(404)

    # ZMIANA: Wyłączamy cache dla wszystkich plików HTML
    # Dzięki temu przeglądarka zawsze zapyta serwer o aktualną wersję (zalogowany/niezalogowany)
    if filename.endswith(".html"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        
    return response

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
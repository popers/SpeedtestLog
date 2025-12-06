import os
import threading
import time
import schedule
import uvicorn
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import FileResponse, RedirectResponse
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

# --- Pomocnicza funkcja sprawdzania Auth ---
def is_authenticated(request: Request):
    if not AUTH_ENABLED:
        return True
    return request.cookies.get(COOKIE_NAME) == SESSION_SECRET

def prevent_caching(response):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

# --- Routing Stron (Clean URLs) ---

@app.get("/")
async def read_root(request: Request):
    # Jeśli użytkownik wejdzie na /, a nie jest zalogowany -> przekieruj na /login
    if not is_authenticated(request):
        return RedirectResponse("/login")
    
    response = FileResponse('index.html')
    return prevent_caching(response)

@app.get("/login")
async def read_login(request: Request):
    # Jeśli użytkownik jest zalogowany i wchodzi na /login -> przekieruj na /
    if is_authenticated(request):
        return RedirectResponse("/")
        
    response = FileResponse('login.html')
    return prevent_caching(response)

@app.get("/settings")
async def read_settings(request: Request):
    if not is_authenticated(request):
        return RedirectResponse("/login")
    response = FileResponse('settings.html')
    return prevent_caching(response)

@app.get("/backup")
async def read_backup(request: Request):
    if not is_authenticated(request):
        return RedirectResponse("/login")
    response = FileResponse('backup.html')
    return prevent_caching(response)

# --- Obsługa plików statycznych (legacy & assets) ---

@app.get("/{filename}")
async def read_static(filename: str, request: Request):
    # Lista dozwolonych plików w głównym katalogu
    allowed_assets = ["manifest.json", "favicon.ico", "logo.png", "speedtest.png", "openid.png"]
    
    # Obsługa legacy dla .html (gdyby ktoś wpisał ręcznie index.html)
    if filename == "index.html":
        return RedirectResponse("/")
    if filename == "login.html":
        return RedirectResponse("/login")
    if filename == "settings.html":
        return RedirectResponse("/settings")
    if filename == "backup.html":
        return RedirectResponse("/backup")

    if filename in allowed_assets and os.path.exists(f"/app/{filename}"):
        return FileResponse(f"/app/{filename}")
    
    raise HTTPException(404)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
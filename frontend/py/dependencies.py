from fastapi import Request, HTTPException
from .config import AUTH_ENABLED, SESSION_COOKIE_NAME, SESSION_SECRET

# Używamy tej samej nazwy co w auth.py
COOKIE_NAME = f"{SESSION_COOKIE_NAME}_v2"

# --- Dependency: Weryfikacja Sesji ---
async def verify_session(request: Request):
    if not AUTH_ENABLED:
        return True
    # Sprawdzamy nowe ciasteczko
    if request.cookies.get(COOKIE_NAME) != SESSION_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return True

# --- Helper: Generowanie Redirect URI dla Google ---
def get_redirect_uri(request: Request):
    base_url = str(request.base_url).rstrip('/')
    # Obsługa proxy (jeśli aplikacja jest za Nginx/Cloudflare)
    if "localhost" not in base_url and "127.0.0.1" not in base_url and base_url.startswith("http://"):
        base_url = base_url.replace("http://", "https://")
    return f"{base_url}/api/backup/google/callback"
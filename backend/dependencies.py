from fastapi import Request, HTTPException
from config import AUTH_ENABLED, SESSION_COOKIE_NAME, SESSION_SECRET

# --- Dependency: Weryfikacja Sesji ---
async def verify_session(request: Request):
    if not AUTH_ENABLED:
        return True
    if request.cookies.get(SESSION_COOKIE_NAME) != SESSION_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return True

# --- Helper: Generowanie Redirect URI dla Google ---
def get_redirect_uri(request: Request):
    base_url = str(request.base_url).rstrip('/')
    # Obsługa proxy (jeśli aplikacja jest za Nginx/Cloudflare)
    if "localhost" not in base_url and "127.0.0.1" not in base_url and base_url.startswith("http://"):
        base_url = base_url.replace("http://", "https://")
    return f"{base_url}/api/backup/google/callback"
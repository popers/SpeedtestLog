import logging
import secrets
import httpx
import traceback
import jwt
from jwt.algorithms import RSAAlgorithm
import json
from fastapi import APIRouter, Response, HTTPException, Request, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

# ZMIANA: Importy relatywne
from .config import AUTH_ENABLED, APP_USERNAME, APP_PASSWORD, SESSION_COOKIE_NAME, SESSION_SECRET
from .schemas import LoginModel, OIDCSettingsModel
from .database import get_db
from .models import OIDCSettings
from .dependencies import verify_session

router = APIRouter()
COOKIE_NAME = f"{SESSION_COOKIE_NAME}_v2"

# ... reszta pliku bez zmian (importy są najważniejsze) ...
# Pamiętaj o podmianie reszty plików jeśli zawierają 'import config' itp.
# Na przykład 'get_oidc_config', 'login', 'logout' itd. pozostają bez zmian w logice.

async def get_oidc_config(discovery_url: str):
    async with httpx.AsyncClient(verify=False) as client:
        resp = await client.get(discovery_url)
        resp.raise_for_status()
        return resp.json()

@router.post("/api/login")
async def login(creds: LoginModel, response: Response):
    if not AUTH_ENABLED: return {"message": "Auth disabled"}
    
    if creds.username == APP_USERNAME and creds.password == APP_PASSWORD:
        logging.info("✅ Password Login Successful. Setting cookie.")
        response.set_cookie(
            key=COOKIE_NAME, 
            value=SESSION_SECRET, 
            httponly=True, 
            secure=False, 
            samesite='lax',
            path='/',
            max_age=2592000 
        )
        return {"message": "Logged in"}
        
    raise HTTPException(status_code=401, detail="Invalid credentials")

@router.post("/api/logout")
async def logout(response: Response):
    response.delete_cookie(COOKIE_NAME, path='/')
    return {"message": "Logged out"}

@router.get("/api/auth-status")
async def auth_status(db: Session = Depends(get_db)):
    oidc = db.query(OIDCSettings).filter(OIDCSettings.id == 1).first()
    return {
        "enabled": AUTH_ENABLED,
        "oidc_enabled": oidc.enabled if oidc else False,
        "oidc_name": oidc.display_name if oidc else "SSO Login"
    }

@router.get("/api/settings/oidc")
async def get_oidc_settings(db: Session = Depends(get_db), authorized: bool = Depends(verify_session)):
    s = db.query(OIDCSettings).filter(OIDCSettings.id == 1).first()
    if not s: s = OIDCSettings(id=1); db.add(s); db.commit()
    return {
        "enabled": s.enabled,
        "display_name": s.display_name,
        "client_id": s.client_id,
        "client_secret": s.client_secret, 
        "discovery_url": s.discovery_url
    }

@router.post("/api/settings/oidc")
async def save_oidc_settings(s: OIDCSettingsModel, db: Session = Depends(get_db), authorized: bool = Depends(verify_session)):
    rec = db.query(OIDCSettings).filter(OIDCSettings.id == 1).first()
    if not rec: rec = OIDCSettings(id=1); db.add(rec)
    
    if s.enabled is not None: rec.enabled = s.enabled
    if s.display_name: rec.display_name = s.display_name
    if s.client_id: rec.client_id = s.client_id
    if s.client_secret: rec.client_secret = s.client_secret
    if s.discovery_url: rec.discovery_url = s.discovery_url
    
    db.commit()
    return {"message": "OIDC settings saved"}

@router.get("/api/auth/oidc/login")
async def oidc_login(request: Request, db: Session = Depends(get_db)):
    if not AUTH_ENABLED: return RedirectResponse("/")
    
    settings = db.query(OIDCSettings).filter(OIDCSettings.id == 1).first()
    if not settings or not settings.enabled or not settings.discovery_url:
        raise HTTPException(status_code=400, detail="OIDC not configured")

    try:
        config = await get_oidc_config(settings.discovery_url)
        auth_endpoint = config.get("authorization_endpoint")
        
        state = secrets.token_urlsafe(16)
        
        base_url = str(request.base_url).rstrip('/')
        if "localhost" not in base_url and "127.0.0.1" not in base_url and base_url.startswith("http://"):
            base_url = base_url.replace("http://", "https://")
        redirect_uri = f"{base_url}/api/auth/oidc/callback"
        
        auth_url = (
            f"{auth_endpoint}"
            f"?client_id={settings.client_id}"
            f"&response_type=code"
            f"&scope=openid email profile"
            f"&redirect_uri={redirect_uri}"
            f"&state={state}"
        )
        
        resp = RedirectResponse(url=auth_url)
        resp.set_cookie("oidc_state", state, max_age=300, path='/', httponly=True, secure=False, samesite='lax')
        return resp
        
    except Exception as e:
        logging.error(f"OIDC Login Start Error: {e}")
        return RedirectResponse(url="/login.html?error=oidc_config_error")

@router.get("/api/auth/oidc/callback")
async def oidc_callback(request: Request, code: str, state: str, db: Session = Depends(get_db)):
    if not AUTH_ENABLED: return RedirectResponse("/")
    
    cookie_state = request.cookies.get("oidc_state")
    if not cookie_state or cookie_state != state:
        logging.error("OIDC State mismatch")
        return RedirectResponse(url="/login.html?error=oidc_invalid_state")

    settings = db.query(OIDCSettings).filter(OIDCSettings.id == 1).first()
    
    try:
        config = await get_oidc_config(settings.discovery_url)
        token_endpoint = config.get("token_endpoint")
        jwks_uri = config.get("jwks_uri")
        
        base_url = str(request.base_url).rstrip('/')
        if "localhost" not in base_url and "127.0.0.1" not in base_url and base_url.startswith("http://"):
            base_url = base_url.replace("http://", "https://")
        redirect_uri = f"{base_url}/api/auth/oidc/callback"

        async with httpx.AsyncClient(verify=False) as client:
            token_resp = await client.post(token_endpoint, data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
                "client_id": settings.client_id,
                "client_secret": settings.client_secret
            })
            token_resp.raise_for_status()
            tokens = token_resp.json()
            
        id_token = tokens.get("id_token")
        if not id_token: raise Exception("No id_token in response")

        header = jwt.get_unverified_header(id_token)
        alg = header.get("alg")
        
        if alg and alg.startswith("RSA-OAEP"):
            logging.error("❌ OIDC Error: Authentik is sending an ENCRYPTED token (JWE).")
            return RedirectResponse(url="/login.html?error=oidc_encrypted_token")

        async with httpx.AsyncClient(verify=False) as client:
            jwks_resp = await client.get(jwks_uri)
            jwks_data = jwks_resp.json()

        kid = header.get("kid")
        public_key = None
        for key in jwks_data["keys"]:
            if key["kid"] == kid:
                public_key = RSAAlgorithm.from_jwk(json.dumps(key))
                break
        
        if not public_key:
            logging.error(f"Public key not found for kid: {kid}")
            raise Exception("Invalid JWKS key")

        payload = jwt.decode(
            id_token,
            public_key,
            algorithms=[alg], 
            audience=settings.client_id,
            options={"verify_at_hash": False}
        )
        
        user_email = payload.get("email") or payload.get("sub") or "User"
        logging.info(f"✅ OIDC Success! User: {user_email}")

        response = RedirectResponse(url="/")
        response.set_cookie(
            key=COOKIE_NAME, 
            value=SESSION_SECRET, 
            httponly=True, 
            secure=False, 
            samesite='lax',
            path='/',
            max_age=2592000 
        )
        response.delete_cookie("oidc_state")
        return response

    except Exception as e:
        logging.error(f"❌ OIDC Callback Error: {e}")
        logging.error(traceback.format_exc())
        return RedirectResponse(url="/login.html?error=oidc_failed")
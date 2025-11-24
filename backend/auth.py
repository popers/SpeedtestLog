from fastapi import APIRouter, Response, HTTPException
from config import AUTH_ENABLED, APP_USERNAME, APP_PASSWORD, SESSION_COOKIE_NAME, SESSION_SECRET
from schemas import LoginModel

router = APIRouter()

@router.post("/api/login")
async def login(creds: LoginModel, response: Response):
    if not AUTH_ENABLED: return {"message": "Auth disabled"}
    if creds.username == APP_USERNAME and creds.password == APP_PASSWORD:
        response.set_cookie(
            key=SESSION_COOKIE_NAME, 
            value=SESSION_SECRET, 
            httponly=True, 
            samesite='lax',
            max_age=2592000 
        )
        return {"message": "Logged in"}
    raise HTTPException(status_code=401, detail="Invalid credentials")

@router.post("/api/logout")
async def logout(response: Response):
    response.delete_cookie(SESSION_COOKIE_NAME)
    return {"message": "Logged out"}

@router.get("/api/auth-status")
async def auth_status():
    return {"enabled": AUTH_ENABLED}
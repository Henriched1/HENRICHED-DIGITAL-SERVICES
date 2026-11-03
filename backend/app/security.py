from datetime import datetime, timedelta, timezone
import bcrypt
from jose import jwt, JWTError
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .config import settings

ALGORITHM = "HS256"
bearer = HTTPBearer(auto_error=False)

def verify_admin(email: str, password: str) -> bool:
    if email.lower() != settings.admin_email.lower():
        return False
    try:
        return bcrypt.checkpw(
            password.encode("utf-8"),
            settings.admin_password.encode("utf-8")
        )
    except ValueError:
        return False

def create_token(email: str) -> str:
    payload = {
        "sub": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12)
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)

def require_admin(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Admin authentication required")
    try:
        payload = jwt.decode(credentials.credentials, settings.secret_key, algorithms=[ALGORITHM])
        if payload.get("sub") != settings.admin_email:
            raise HTTPException(status_code=401, detail="Invalid admin session")
        return payload["sub"]
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired admin session")

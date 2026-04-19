from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.config import get_settings

settings = get_settings()
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        user_id = payload.get("userId")
        role = payload.get("role")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return {"user_id": user_id, "role": role}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def require_role(*roles):
    def checker(user=Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return checker

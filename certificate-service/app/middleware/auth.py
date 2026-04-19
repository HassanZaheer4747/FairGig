from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import os

JWT_SECRET = os.getenv("JWT_SECRET", "fairgig_super_secret_jwt_key_2024_production")
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("userId")
        role = payload.get("role")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return {"user_id": user_id, "role": role}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

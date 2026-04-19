import uvicorn
import os
from app.config import get_settings

settings = get_settings()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8001))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)

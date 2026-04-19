from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    port: int = 8001
    mongodb_uri: str = "mongodb://localhost:27017/fairgig_earnings"
    jwt_secret: str = "fairgig_super_secret_jwt_key_2024_production"
    anomaly_service_url: str = "http://localhost:8002"
    analytics_service_url: str = "http://localhost:8003"
    upload_dir: str = "./uploads"

    # Railway specific internal networking or public URLs
    class Config:
        env_file = ".env"
        env_prefix = "" # Allow direct env variable names like ANOMALY_SERVICE_URL

@lru_cache()
def get_settings():
    return Settings()

import httpx
import logging
from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

async def get_city_median(city: str, platform: str) -> dict:
    fallback = {
        "median": 0,
        "sample_size": 0,
        "zone": "unknown",
        "message": "Service temporarily unavailable"
    }
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{settings.analytics_service_url}/city-median",
                params={"city": city, "platform": platform}
            )
            if response.status_code == 200:
                return response.json()
            logger.warning(f"Analytics service returned {response.status_code}")
            return fallback
    except (httpx.ConnectError, httpx.TimeoutException) as e:
        logger.warning(f"Analytics service unavailable: {e}")
        return fallback
    except Exception as e:
        logger.error(f"Analytics client error: {e}")
        return fallback

async def get_platform_trends() -> dict:
    fallback = {"trends": [], "message": "Service temporarily unavailable"}
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{settings.analytics_service_url}/platform-trends")
            if response.status_code == 200:
                return response.json()
            return fallback
    except Exception as e:
        logger.warning(f"Analytics platform trends unavailable: {e}")
        return fallback

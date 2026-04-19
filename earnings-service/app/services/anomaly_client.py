import httpx
import logging
from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

async def analyze_earning_trend(earning_data: dict, historical_data: list) -> dict:
    fallback = {
        "is_anomaly": False,
        "score": 0.0,
        "type": "unavailable",
        "explanation": "Service temporarily unavailable"
    }
    try:
        payload = {
            "current_earning": earning_data,
            "historical_earnings": historical_data[-10:] if historical_data else []
        }
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                f"{settings.anomaly_service_url}/analyze-trend",
                json=payload
            )
            if response.status_code == 200:
                return response.json()
            logger.warning(f"Anomaly service returned {response.status_code}")
            return fallback
    except (httpx.ConnectError, httpx.TimeoutException) as e:
        logger.warning(f"Anomaly service unavailable: {e}")
        return fallback
    except Exception as e:
        logger.error(f"Anomaly client error: {e}")
        return fallback

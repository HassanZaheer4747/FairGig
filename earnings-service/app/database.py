from motor.motor_asyncio import AsyncIOMotorClient
from app.config import get_settings

settings = get_settings()

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_instance = Database()

async def connect_db():
    db_instance.client = AsyncIOMotorClient(settings.mongodb_uri)
    db_instance.db = db_instance.client.get_default_database()
    await db_instance.db.earnings.create_index([("worker_id", 1)])
    await db_instance.db.earnings.create_index([("date", -1)])
    await db_instance.db.earnings.create_index([("platform", 1)])
    await db_instance.db.earnings.create_index([("city", 1)])
    await db_instance.db.earnings.create_index([("verification_status", 1)])
    print("MongoDB connected (earnings-service)")

async def close_db():
    if db_instance.client:
        db_instance.client.close()

def get_db():
    return db_instance.db
